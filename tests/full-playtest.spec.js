import { test, expect } from '@playwright/test';

test('HROS Full Playtest 2 expands the experience without hidden domain mutations', async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`[${testInfo.project.name}] ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`[${testInfo.project.name}] ${error.message}`));

  await page.goto('', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__HROS_FULL_PLAYTEST__?.ready === true);
  await expect(page.getByText('FULL PLAYTEST 2')).toBeVisible();
  await expect(page.locator('.full-today-strip')).toBeVisible();

  const snapshotBeforeCapture = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('.full-today-strip [data-full-action="capture"]').click();
  await expect(page.locator('#fullCaptureDialog')).toBeVisible();
  await page.locator('#fullCaptureForm select[name="kind"]').selectOption('moment');
  await page.locator('#fullCaptureForm textarea[name="text"]').fill('Тестовая входящая запись о важном разговоре.');
  await page.getByRole('button', { name: 'Сохранить во входящие' }).click();
  await expect(page.locator('#fullCaptureDialog')).toBeHidden();

  const afterCapture = await page.evaluate(() => ({
    snapshot: localStorage.getItem('hros.snapshot.v1'),
    inbox: JSON.parse(localStorage.getItem('hros.command.inbox.v2') || '[]'),
  }));
  expect(afterCapture.snapshot).toBe(snapshotBeforeCapture);
  expect(afterCapture.inbox).toHaveLength(1);
  expect(afterCapture.inbox[0].status).toBe('draft');

  await page.locator('.full-today-strip [data-full-action="inbox"]').click();
  await expect(page.getByRole('heading', { name: 'Входящие', exact: true })).toBeVisible();
  await expect(page.getByText('Тестовая входящая запись о важном разговоре.')).toBeVisible();
  await page.locator('[data-inbox-text]').fill('Исправленная тестовая запись для дневника.');
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('hros.command.inbox.v2'))[0].text)).toBe('Исправленная тестовая запись для дневника.');

  await page.locator('.command-mobile-nav [data-command-view="world"]').click();
  await expect(page.getByRole('heading', { name: 'Мир людей и областей жизни' })).toBeVisible();
  await expect(page.locator('.full-world-area')).toHaveCount(6);
  const firstPerson = page.locator('.full-world-person').first();
  await expect(firstPerson).toBeVisible();
  await firstPerson.click();
  await expect(page.locator('#fullWorldDetail')).toBeVisible();

  const inspectorTrigger = page.locator('#fullWorldDetail [data-full-inspect]').first();
  if (await inspectorTrigger.count()) {
    await inspectorTrigger.click();
    await expect(page.locator('#fullInspectorDialog')).toBeVisible();
    await expect(page.locator('#fullInspectorBody')).toContainText('Источник');
    await page.locator('#fullInspectorDialog [data-full-close]').click();
  }

  await page.locator('.command-mobile-nav [data-command-view="avatar"]').click();
  await expect(page.getByRole('heading', { name: 'Аватар', exact: true })).toBeVisible();
  await expect(page.locator('.full-avatar-suggestions')).toBeVisible();
  const snapshotBeforeSuggestion = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  const suggestion = page.locator('[data-full-apply-mod]:not([disabled])').first();
  if (await suggestion.count()) await suggestion.click();
  expect(await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'))).toBe(snapshotBeforeSuggestion);

  await page.locator('.command-mobile-nav [data-command-view="library"]').click();
  await expect(page.getByRole('heading', { name: 'Система и редакторы' })).toBeVisible();
  await expect(page.locator('.full-data-operations')).toBeVisible();
  await page.locator('.full-data-operations [data-full-action="feedback"]').click();
  await expect(page.locator('#fullFeedbackDialog')).toBeVisible();
  await page.locator('#fullFeedbackForm input[name="clarity"][value="4"]').check();
  await page.locator('#fullFeedbackForm input[name="mainAction"][value="5"]').check();
  await page.locator('#fullFeedbackForm textarea[name="keep"]').fill('Оставить Living World и Source Inspector.');
  await page.getByRole('button', { name: 'Сохранить отзыв' }).click();
  const feedback = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.command.feedback.v2')));
  expect(feedback.clarity).toBe('4');
  expect(feedback.mainAction).toBe('5');
  expect(feedback.build).toBe('full-playtest-2');

  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(mobileOverflow).toBeLessThanOrEqual(1);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
