import { expect, test, type Page } from '@playwright/test';

test('mostra detalhes, onde assistir e trailer embutido', async ({ page }) => {
  await page.goto('/filme/1');
  await expect(page.getByRole('heading', { level: 1, name: 'Corra!' })).toBeVisible();
  const info = page.getByRole('list', { name: 'Informações' });
  await expect(info.getByRole('listitem')).toHaveText(['★ 7,6', '2017', '1h44']);
  await expect(page.getByRole('list', { name: 'Gêneros' }).getByRole('listitem')).toHaveText(['Terror', 'Thriller']);
  await expect(page.getByRole('heading', { level: 2, name: 'Onde assistir' })).toBeVisible();
  await expect(page.getByTestId('watch-flatrate')).toContainText('Netflix');
  await expect(page.getByTestId('watch-rent')).toContainText('Amazon Prime Video');
  await expect(page.getByTestId('watch-buy')).toContainText('Amazon Prime Video');
  await expect(page.getByText('Dados de disponibilidade:')).toBeVisible();
  await expect(page).toHaveTitle(/Corra! \(2017\)/);

  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reproduzir trailer de Corra!' }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/sRfnevzM9kQ"]')).toBeAttached();
});

test('filme sem trailer não mostra a seção de trailer', async ({ page }) => {
  await page.goto('/filme/2');
  await expect(page.getByRole('heading', { level: 1, name: 'Hereditário' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Trailer' })).toHaveCount(0);
});

test('filme fora de streaming e id inválido mostram não encontrado', async ({ page }) => {
  await page.goto('/filme/9');
  await expect(page.getByText('Filme não encontrado')).toBeVisible();
  await page.goto('/filme/abc');
  await expect(page.getByText('Filme não encontrado')).toBeVisible();
});

test('voltar ao catálogo mantém os filtros', async ({ page }) => {
  await page.goto('/catalogo?streaming=8');
  await page.getByTestId('movie-card').filter({ hasText: 'Corra!' }).click();
  await expect(page).toHaveURL('/filme/1');
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await expect(page).toHaveURL('/catalogo?streaming=8');
});

test('voltar leva de volta à vitrine quando o filme foi aberto por ela', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Terror' }).getByTestId('movie-card').filter({ hasText: 'Corra!' }).click();
  await expect(page).toHaveURL('/filme/1');
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('filme aberto por link de fora: voltar vai para a vitrine sem sair do site', async ({ page }) => {
  await page.goto('/filme/1');
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Em alta agora' })).toBeVisible();
});

test('no celular o pôster fica acima das informações', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/filme/1');
  const poster = await page.getByTestId('movie-poster').boundingBox();
  const title = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(poster && title && poster.y + poster.height <= title.y).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

async function openFilmFromSecondBlock(page: Page) {
  await page.goto('/catalogo');
  const cards = page.getByTestId('movie-card');
  await expect(cards).toHaveCount(24);
  await page.getByRole('button', { name: 'Carregar mais' }).click();
  await expect(cards).toHaveCount(38);
  const last = cards.last();
  const title = (await last.locator('h3').textContent()) ?? '';
  const href = (await last.getAttribute('href')) ?? '';
  await last.scrollIntoViewIfNeeded();
  await last.click();
  await expect(page).toHaveURL(href);
  return { title, href };
}

async function expectCatalogRestored(page: Page, href: string) {
  await expect(page).toHaveURL('/catalogo');
  const cards = page.getByTestId('movie-card');
  await expect(cards).toHaveCount(38);
  await expect(page.locator(`a[data-testid="movie-card"][href="${href}"]`)).toBeInViewport();
}

test('link voltar mantém os blocos carregados e a rolagem', async ({ page }) => {
  const { href } = await openFilmFromSecondBlock(page);
  const historyLength = await page.evaluate(() => history.length);
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await expectCatalogRestored(page, href);
  // Voltou pelo histórico em vez de empilhar uma nova entrada.
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test('botão voltar do navegador mantém os blocos carregados e a rolagem', async ({ page }) => {
  const { href } = await openFilmFromSecondBlock(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goBack();
  await expectCatalogRestored(page, href);
});
