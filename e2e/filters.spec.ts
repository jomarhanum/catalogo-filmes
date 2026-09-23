import { expect, test } from '@playwright/test';

test('marcar Netflix filtra e atualiza a URL', async ({ page }) => {
  await page.goto('/');
  const netflix = page.getByRole('button', { name: 'Netflix', exact: true });
  await netflix.click();
  await expect(page).toHaveURL('/?streaming=8');
  await expect(netflix).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);

  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('38 filmes')).toBeVisible();
});

test('tipo de acesso Compra', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compra' }).click();
  await expect(page).toHaveURL('/?acesso=buy');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);
});

test('gaveta Mais filtros aplica idioma e gênero', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mais filtros' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await drawer.getByLabel('Idioma').selectOption('pt');
  await drawer.getByRole('button', { name: 'Thriller' }).click();
  await drawer.getByRole('button', { name: 'Aplicar' }).click();

  await expect(page).toHaveURL('/?genero=53&idioma=pt');
  await expect(page.getByTestId('movie-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Mais filtros (2)' })).toBeVisible();
});

test('gaveta: Limpar zera os filtros da gaveta', async ({ page }) => {
  await page.goto('/?streaming=8&nota=8');
  await page.getByRole('button', { name: 'Mais filtros (1)' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await drawer.getByRole('button', { name: 'Limpar' }).click();
  await drawer.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page).toHaveURL('/?streaming=8');
});

test('ordenar por A–Z', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Ordenar por').selectOption('az');
  await expect(page).toHaveURL('/?ordem=az');
  await expect(page.getByTestId('movie-card').first()).toContainText('Bacurau');
});
