import { expect, test } from '@playwright/test';

test('mostra os primeiros 24 filmes e carrega o resto', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(page.getByText('38 filmes')).toBeVisible();
  const cards = page.getByTestId('movie-card');
  await expect(cards).toHaveCount(24);
  await expect(cards.first()).toContainText('Mad Max: Estrada da Fúria');
  await expect(cards.first()).toContainText('2015 · 2h');
  await expect(cards.first()).toContainText('★ 7,6');

  await page.getByRole('button', { name: 'Carregar mais' }).click();
  await expect(cards).toHaveCount(38);
  await expect(page.getByRole('button', { name: 'Carregar mais' })).toHaveCount(0);
});

test('filtro sem resultado mostra estado vazio e limpa', async ({ page }) => {
  await page.goto('/catalogo?idioma=zz');
  await expect(page.getByText('Nenhum filme encontrado')).toBeVisible();
  await page.getByRole('link', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL('/catalogo');
  await expect(page.getByText('38 filmes')).toBeVisible();
});

test('parâmetro inválido é ignorado', async ({ page }) => {
  await page.goto('/catalogo?nota=abc&ordem=xyz');
  await expect(page.getByText('38 filmes')).toBeVisible();
});

test('card leva à página do filme', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByTestId('movie-card').filter({ hasText: 'Corra!' }).click();
  await expect(page).toHaveURL('/filme/1');
});

test('links antigos com filtros em / vão para /catalogo', async ({ page }) => {
  await page.goto('/?streaming=8,abc&x=1');
  await expect(page).toHaveURL('/catalogo?streaming=8');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);
});

test('o link Catálogo do topo abre o catálogo', async ({ page }) => {
  await page.goto('/sobre');
  await page.getByRole('banner').getByRole('link', { name: 'Catálogo', exact: true }).click();
  await expect(page).toHaveURL('/catalogo');
  await expect(page.getByText('38 filmes')).toBeVisible();
});
