import { expect, test } from '@playwright/test';

test('marcar Netflix filtra e atualiza a URL', async ({ page }) => {
  await page.goto('/catalogo');
  const netflix = page.getByRole('button', { name: 'Netflix', exact: true });
  await netflix.click();
  await expect(page).toHaveURL('/catalogo?streaming=8');
  await expect(netflix).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);

  await page.goBack();
  await expect(page).toHaveURL('/catalogo');
  await expect(page.getByText('38 filmes')).toBeVisible();
});

test('tipo de acesso Compra', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByRole('button', { name: 'Compra' }).click();
  await expect(page).toHaveURL('/catalogo?acesso=buy');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);
});

test('gaveta Mais filtros aplica idioma e gênero', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByRole('button', { name: 'Mais filtros' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await drawer.getByLabel('Idioma').selectOption('pt');
  await drawer.getByRole('button', { name: 'Thriller' }).click();
  await drawer.getByRole('button', { name: 'Aplicar' }).click();

  await expect(page).toHaveURL('/catalogo?genero=53&idioma=pt');
  await expect(page.getByTestId('movie-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Mais filtros (2)' })).toBeVisible();
});

test('gaveta: Limpar zera os filtros da gaveta', async ({ page }) => {
  await page.goto('/catalogo?streaming=8&nota=8');
  await page.getByRole('button', { name: 'Mais filtros (1)' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await drawer.getByRole('button', { name: 'Limpar' }).click();
  await drawer.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page).toHaveURL('/catalogo?streaming=8');
});

test('ordenar por A–Z', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByLabel('Ordenar por').selectOption('az');
  await expect(page).toHaveURL('/catalogo?ordem=az');
  await expect(page.getByTestId('movie-card').first()).toContainText('Bacurau');
});

test('gaveta: Escape fecha e devolve o foco ao gatilho', async ({ page }) => {
  await page.goto('/catalogo');
  const trigger = page.getByRole('button', { name: 'Mais filtros' });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('gaveta: ano inválido mostra erro e não aplica', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByRole('button', { name: 'Mais filtros' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await drawer.getByLabel('Ano (de)').fill('50');
  await drawer.getByRole('button', { name: 'Aplicar' }).click();
  await expect(drawer.getByText('Informe um ano entre 1870 e 2100')).toBeVisible();
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL('/catalogo');
});

test('gaveta: valores da URL fora da lista aparecem nos selects', async ({ page }) => {
  await page.goto('/catalogo?nota=7.5');
  await page.getByRole('button', { name: 'Mais filtros (1)' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await expect(drawer.getByLabel('Nota mínima')).toHaveValue('7.5');
  await expect(drawer.getByLabel('Nota mínima').locator('option:checked')).toHaveText('★ 7,5+');

  await page.goto('/catalogo?duracao_max=100&idioma=sv');
  await page.getByRole('button', { name: 'Mais filtros (2)' }).click();
  await expect(drawer.getByLabel('Duração máxima')).toHaveValue('100');
  await expect(drawer.getByLabel('Duração máxima').locator('option:checked')).toHaveText('Até 1h40');
  await expect(drawer.getByLabel('Idioma')).toHaveValue('sv');
});
