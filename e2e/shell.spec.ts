import { expect, test } from '@playwright/test';

test('página sobre mostra os créditos obrigatórios', async ({ page }) => {
  await page.goto('/sobre');
  await expect(
    page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'JustWatch' })).toBeVisible();
});

test('rota inexistente mostra a página de não encontrado', async ({ page }) => {
  await page.goto('/nao-existe');
  await expect(page.getByText('Não encontramos essa página')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');
});

test('topo tem logo, links e busca', async ({ page }) => {
  await page.goto('/sobre');
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
  await expect(header.getByRole('link', { name: 'Catálogo', exact: true })).toHaveAttribute('href', '/catalogo');
  await expect(header.getByRole('searchbox', { name: 'Buscar filme' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'CineCatálogo' })).toHaveAttribute('href', '/');
});

test('no celular a busca abre por um botão de lupa', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/sobre');
  const header = page.getByRole('banner');
  await expect(header.getByRole('searchbox', { name: 'Buscar filme' })).toBeHidden();
  await header.getByRole('button', { name: 'Abrir busca' }).click();
  await expect(header.getByRole('searchbox', { name: 'Buscar filme' })).toBeFocused();
});
