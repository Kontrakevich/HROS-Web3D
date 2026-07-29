import { test, expect } from '@playwright/test';

test('HROS v0.4 renders and Moment Engine persists an edit', async ({ page }, testInfo) => {
  const browserName = testInfo.project.name;
  const consoleErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const value = `[${browserName}] ${message.text()}`;
      consoleErrors.push(value);
      console.log(value);
    }
  });
  page.on('pageerror', (error) => {
    const value = `[${browserName}] ${error.message}`;
    consoleErrors.push(value);
    console.log(value);
  });

  console.log(`[${browserName}] open application`);
  await page.goto('', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.brand')).toContainText('HROS');
  await expect(page.locator('#viewRoot')).not.toBeEmpty();

  console.log(`[${browserName}] open moments`);
  await page.getByRole('button', { name: 'Моменты' }).click();
  await expect(page.getByRole('heading', { name: 'Моменты' })).toBeVisible();
  await expect(page.locator('.moment-row').first()).toBeVisible();

  const editButton = page.locator('[data-v04-edit]').first();
  await expect(editButton).toBeVisible();
  const momentId = await editButton.getAttribute('data-v04-edit');
  expect(momentId).toBeTruthy();

  console.log(`[${browserName}] open Moment Engine for ${momentId}`);
  await editButton.click();
  await expect(page.locator('#v04')).toBeVisible();
  await expect(page.locator('#v04t')).toContainText('Редактировать');
  await expect(page.locator('input[name="closeness"]')).toBeVisible();
  await expect(page.locator('textarea[name="meaning"]')).toBeVisible();
  await expect(page.locator('select[name="sourceKind"]')).toBeVisible();

  const versionBefore = await page.evaluate((id) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v0.2'));
    return snapshot.moments.find((item) => item.id === id)?.version ?? 1;
  }, momentId);

  console.log(`[${browserName}] save new version after ${versionBefore}`);
  await page.locator('textarea[name="meaning"]').fill(`Browser smoke ${browserName}`);
  await page.getByRole('button', { name: 'Сохранить версию', exact: true }).click({ noWaitAfter: true });

  await expect.poll(async () => page.evaluate(({ id, before }) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v0.2'));
    return snapshot.moments.find((item) => item.id === id)?.version ?? before;
  }, { id: momentId, before: versionBefore }), { timeout: 12_000 }).toBe(versionBefore + 1);

  await expect(page.locator('.topbar')).toBeVisible();
  await expect.poll(async () => page.evaluate((id) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v0.2'));
    return snapshot.moments.find((item) => item.id === id)?.details?.meaning;
  }, momentId)).toBe(`Browser smoke ${browserName}`);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
