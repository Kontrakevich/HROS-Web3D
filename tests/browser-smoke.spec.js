import { test, expect, chromium, webkit } from '@playwright/test';

const engines = { chromium, webkit };

for (const [browserName, engine] of Object.entries(engines)) {
  test(`HROS v0.4 renders and Moment Engine works in ${browserName}`, async () => {
    const browser = await engine.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const consoleErrors = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`[${browserName}] ${message.text()}`);
    });
    page.on('pageerror', (error) => consoleErrors.push(`[${browserName}] ${error.message}`));

    try {
      await page.goto('http://127.0.0.1:4173/HROS-Web3D/', { waitUntil: 'networkidle' });
      await expect(page.locator('.topbar')).toBeVisible();
      await expect(page.locator('.brand')).toContainText('HROS');
      await expect(page.locator('#viewRoot')).not.toBeEmpty();

      await page.getByRole('button', { name: 'Моменты' }).click();
      await expect(page.getByRole('heading', { name: 'Моменты' })).toBeVisible();
      await expect(page.locator('.moment-row').first()).toBeVisible();
      await expect(page.locator('[data-v04-edit]').first()).toBeVisible();

      await page.locator('[data-v04-edit]').first().click();
      await expect(page.locator('#v04')).toBeVisible();
      await expect(page.locator('#v04t')).toContainText('Редактировать');
      await expect(page.locator('input[name="closeness"]')).toBeVisible();
      await expect(page.locator('textarea[name="meaning"]')).toBeVisible();
      await expect(page.locator('select[name="sourceKind"]')).toBeVisible();

      await page.locator('textarea[name="meaning"]').fill(`Browser smoke ${browserName}`);
      await page.locator('#v04f button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Моменты' }).click();
      await expect(page.locator('.version-badge').first()).toContainText('v2');

      expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
    } finally {
      await browser.close();
    }
  });
}
