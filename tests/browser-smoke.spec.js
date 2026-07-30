import { test, expect } from '@playwright/test';

test('HROS v1 preserves moments and exposes knowledge, couple and book layers', async ({ page }, testInfo) => {
  const browserName = testInfo.project.name;
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`[${browserName}] ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`[${browserName}] ${error.message}`));

  await page.goto('', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.brand')).toContainText('v1.0');
  await page.waitForFunction(() => window.__HROS_V1__?.ready === true);

  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  expect(initial.meta.schemaVersion).toBe('1.0.0');
  expect(initial.records.length).toBeGreaterThan(8);
  expect(initial.perspectives.length).toBeGreaterThan(0);
  expect(initial.principles.length).toBeGreaterThan(0);
  expect(initial.originalMemory.length).toBeGreaterThan(0);
  expect(initial.semanticMemory.length).toBeGreaterThan(0);
  expect(initial.livingMemory.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Моменты' }).click();
  await expect(page.getByRole('heading', { name: 'Моменты' })).toBeVisible();
  const editButton = page.locator('[data-v04-edit]').first();
  await expect(editButton).toBeVisible();
  const momentId = await editButton.getAttribute('data-v04-edit');
  const versionBefore = await page.evaluate((id) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v1'));
    return snapshot.moments.find((item) => item.id === id)?.version ?? 1;
  }, momentId);
  await editButton.click();
  await expect(page.locator('#v04')).toBeVisible();
  await page.locator('textarea[name="meaning"]').fill(`HROS v1 smoke ${browserName}`);
  const reload = page.waitForEvent('load', { timeout: 12_000 });
  await page.getByRole('button', { name: 'Сохранить версию', exact: true }).click({ noWaitAfter: true });
  await reload;
  await page.waitForFunction(() => window.__HROS_V1__?.ready === true);
  await expect.poll(async () => page.evaluate(({ id, before }) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v1'));
    return snapshot.moments.find((item) => item.id === id)?.version ?? before;
  }, { id: momentId, before: versionBefore })).toBe(versionBefore + 1);

  await page.getByRole('button', { name: 'Знания' }).click();
  await expect(page.getByRole('heading', { name: 'Знания без подмены фактов' })).toBeVisible();
  await expect(page.getByText('Три уровня памяти')).toBeVisible();
  const recordsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length);
  await page.getByRole('button', { name: '+ Запись' }).click();
  await expect(page.locator('#recordDialog')).toBeVisible();
  await page.locator('#recordForm select[name="kind"]').selectOption('perspective');
  await page.locator('#recordForm textarea[name="statement"]').fill(`Перспектива browser smoke ${browserName}`);
  await page.locator('#recordForm select[name="perspectiveOwnerId"]').selectOption('person-mikhail');
  await page.locator('#recordForm select[name="subjectId"]').selectOption('person-mikhail');
  await page.locator('#recordForm select[name="visibility"]').selectOption('private');
  await page.getByRole('button', { name: 'Сохранить запись' }).click();
  await expect(page.getByText(`Перспектива browser smoke ${browserName}`)).toBeVisible();
  await expect.poll(async () => page.evaluate((before) => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length, recordsBefore)).toBe(recordsBefore + 1);

  await page.getByRole('button', { name: 'Пара' }).click();
  await expect(page.getByRole('heading', { name: 'Три пространства пары' })).toBeVisible();
  await expect(page.getByText('Совместное пространство')).toBeVisible();
  await expect(page.getByText(/Перспектива Снежи.*не зафиксирована/)).toBeVisible();

  await page.getByRole('button', { name: 'Книга' }).click();
  await expect(page.getByRole('heading', { name: 'Книга отношений' })).toBeVisible();
  await expect(page.getByText('Понимать, как мы влияем друг на друга')).toBeVisible();
  await expect(page.getByText('Бережные отношения требуют понимания')).toBeVisible();

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
