import { expect, test, type Page } from '@playwright/test';

test('mostra detalhes, onde assistir e trailer', async ({ page }) => {
  await page.goto('/filme/1');
  await expect(page.getByRole('heading', { level: 1, name: 'Corra!' })).toBeVisible();
  await expect(page.getByText('2017 · 1h44 · Terror, Thriller')).toBeVisible();
  await expect(page.getByTestId('watch-flatrate').getByTitle('Netflix')).toBeVisible();
  await expect(page.getByTestId('watch-rent').getByTitle('Amazon Prime Video')).toBeVisible();
  await expect(page.getByTestId('watch-buy').getByTitle('Amazon Prime Video')).toBeVisible();
  await expect(page.getByText('Dados de disponibilidade:')).toBeVisible();
  await expect(page).toHaveTitle(/Corra! \(2017\)/);

  await page.getByRole('button', { name: 'Ver trailer' }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/sRfnevzM9kQ"]')).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('filme sem trailer não mostra o botão', async ({ page }) => {
  await page.goto('/filme/2');
  await expect(page.getByRole('heading', { level: 1, name: 'Hereditário' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver trailer' })).toHaveCount(0);
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
  await page.getByRole('link', { name: '← Voltar ao catálogo' }).click();
  await expect(page).toHaveURL('/catalogo?streaming=8');
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
  await page.getByRole('link', { name: '← Voltar ao catálogo' }).click();
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
