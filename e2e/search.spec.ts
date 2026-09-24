import { expect, test } from '@playwright/test';

test('busca pelo topo leva aos resultados', async ({ page }) => {
  await page.goto('/sobre');
  const box = page.getByRole('banner').getByRole('searchbox', { name: 'Buscar filme' });
  await box.fill('corra');
  await box.press('Enter');
  await expect(page).toHaveURL('/busca?q=corra');
  await expect(page.getByRole('heading', { level: 1, name: 'Resultados para “corra”' })).toBeVisible();
  await expect(page.getByTestId('movie-card')).toHaveCount(1);
  await expect(box).toHaveValue('corra');
});

test('busca sem acento acha o título acentuado', async ({ page }) => {
  await page.goto('/busca?q=hereditario');
  await expect(page.getByTestId('movie-card')).toContainText('Hereditário');
});

test('resultados longos usam Carregar mais', async ({ page }) => {
  await page.goto('/busca?q=filme%20extra');
  await expect(page.getByText('30 filmes')).toBeVisible();
  const cards = page.getByTestId('movie-card');
  await expect(cards).toHaveCount(24);
  await page.getByRole('button', { name: 'Carregar mais' }).click();
  await expect(cards).toHaveCount(30);
});

test('nenhum resultado e termo curto mostram mensagens', async ({ page }) => {
  await page.goto('/busca?q=xyzxyz');
  await expect(page.getByText('Nenhum filme encontrado para “xyzxyz”.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver o catálogo' })).toHaveAttribute('href', '/catalogo');
  await page.goto('/busca?q=%20a%20');
  await expect(page.getByText('Digite pelo menos 2 letras para buscar.')).toBeVisible();
  await page.goto('/busca?q=%25');
  await expect(page.getByText('Digite pelo menos 2 letras para buscar.')).toBeVisible();
  await page.goto('/busca?q=%25%25');
  await expect(page.getByText('Nenhum filme encontrado para “%%”.')).toBeVisible();
});
