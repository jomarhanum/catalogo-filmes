import { expect, test } from '@playwright/test';
import { serviceDb } from './support/db';

// Os dados de exemplo não têm imagens de fundo; para exibir o destaque, estes testes dão ao
// filme 7 (o mais popular) uma imagem de fundo e um trailer, e desfazem isso no fim.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const { error } = await serviceDb()
    .from('movies')
    .update({ backdrop_path: '/destaque-teste.jpg', trailer_key: 'sRfnevzM9kQ' })
    .eq('id', 7);
  if (error) throw error;
});

test.afterAll(async () => {
  await serviceDb().from('movies').update({ backdrop_path: null, trailer_key: null }).eq('id', 7);
});

test('vitrine mostra o destaque e as fileiras com filmes', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByRole('region', { name: 'Filme em destaque' });
  await expect(hero.getByRole('heading', { level: 1, name: 'Mad Max: Estrada da Fúria' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Em alta agora',
    'Na Netflix',
    'No Disney+',
    'Na Max',
    'Ação',
    'Terror',
    'Drama',
    'Mais bem avaliados',
  ]);
  await expect(page.getByRole('region', { name: 'Terror' }).getByTestId('movie-card')).toHaveCount(3);
});

test('assistir trailer abre o vídeo por cima da página', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Assistir trailer' }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/sRfnevzM9kQ"]')).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('ver detalhes abre a página do filme em destaque', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Filme em destaque' }).getByRole('link', { name: 'Ver detalhes' }).click();
  await expect(page).toHaveURL('/filme/7');
});

test('ver todos leva ao catálogo filtrado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Na Netflix' }).getByRole('link', { name: 'Ver todos' }).click();
  await expect(page).toHaveURL('/catalogo?streaming=8&acesso=flatrate');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);
});

test('links antigos com filtros em / continuam indo para o catálogo', async ({ page }) => {
  await page.goto('/?streaming=8');
  await expect(page).toHaveURL('/catalogo?streaming=8');
});

test('setas da fileira não deixam o foco cair no body ao chegar ao fim', async ({ page }) => {
  await page.goto('/');
  const row = page.getByRole('region', { name: 'Em alta agora' });
  const next = row.getByRole('button', { name: 'Rolar Em alta agora para a direita', includeHidden: true });
  const atEnd = () =>
    row.evaluate((section) => {
      const strip = section.querySelector<HTMLElement>('[data-testid="row-strip"]');
      return !!strip && strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
    });
  expect(await atEnd()).toBe(false);

  await next.focus();
  for (let i = 0; i < 20 && !(await atEnd()); i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
  }
  expect(await atEnd()).toBe(true);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});
