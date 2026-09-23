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
  await expect(page.getByRole('link', { name: 'Voltar ao catálogo' })).toBeVisible();
});

test('cabeçalho leva ao catálogo', async ({ page }) => {
  await page.goto('/sobre');
  await page.getByRole('link', { name: '🎬 Catálogo' }).click();
  await expect(page).toHaveURL('/');
});
