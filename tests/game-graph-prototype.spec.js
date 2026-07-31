import { test, expect } from '@playwright/test';

test('HROS game graph prototype exposes relationship details and relation page', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('prototypes/HROS_GameGraph_UI_v0.1/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Граф взаимосвязей' })).toBeVisible();
  await expect(page.locator('#graphSvg')).toBeVisible();
  await expect(page.locator('.edge-group')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Открыть аватар' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ИИ-дневник' })).toBeVisible();

  const partnershipEdge = page.locator('[data-edge-id="rel-snezha"] .edge-hit');
  await partnershipEdge.click({ position: { x: 30, y: 8 } });
  await expect(page.locator('#relationPreview')).toContainText('Партнёрство');
  await expect(page.locator('#relationPreview')).toContainText('Близость · любовь');

  await partnershipEdge.dblclick({ position: { x: 30, y: 8 } });
  await expect(page.locator('#relationPage')).toBeVisible();
  await expect(page.locator('#relationTitle')).toHaveText('Партнёрство');
  await expect(page.locator('#relationHistory .timeline-item')).toHaveCount(3);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
