import { test, expect } from '@playwright/test';

const consoleErrors = [];

for (const browserName of ['chromium', 'webkit']) {
  test.describe(browserName, () => {
    test.use({ browserName });

    test('HROS renders and stays interactive', async ({ page }) => {
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(`[${browserName}] ${message.text()}`);
      });
      page.on('pageerror', (error) => consoleErrors.push(`[${browserName}] ${error.message}`));

      await page.goto('http://127.0.0.1:4173/HROS-Web3D/', { waitUntil: 'networkidle' });
      await expect(page.locator('.topbar')).toBeVisible();
      await expect(page.locator('.brand')).toContainText('HROS');
      await expect(page.locator('#viewRoot')).not.toBeEmpty();
      await expect(page.locator('.workspace, .content-panel')).toBeVisible();

      await page.getByRole('button', { name: 'Люди' }).click();
      await expect(page.getByRole('heading', { name: 'Люди' })).toBeVisible();
      await expect(page.locator('.entity-card').first()).toBeVisible();

      expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
    });
  });
}
