import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('HROS v1.2 full-screen Messenger reads memory and commits only after confirmation', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const browserName = testInfo.project.name;
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[console:${browserName}] ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`[page:${browserName}] ${error.message}`));

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__HROS_V1__?.ready === true, null, { timeout: 20_000 });
  await page.waitForFunction(() => window.__HROS_DIARY__?.ready === true, null, { timeout: 20_000 });
  await page.waitForFunction(() => window.__HROS_COMMAND_UI__?.ready === true, null, { timeout: 20_000 });
  await page.waitForFunction(() => window.__HROS_MESSENGER__?.ready === true, null, { timeout: 20_000 });
  await page.waitForFunction(() => window.__HROS_MESSENGER_BRIDGE__?.ready === true, null, { timeout: 20_000 });

  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('[data-command-screen="today"]')).toBeVisible();

  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  expect(initial.meta.version).toBe('1.2.0');
  expect(initial.meta.schemaVersion).toBe('1.0.0');
  expect(initial.records.length).toBeGreaterThan(8);

  const snapshotBeforeChat = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('#commandMainAction').click();
  await expect(page.locator('body')).toHaveClass(/hros-messenger-open/);
  await expect(page.locator('#hrosMessenger')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.messenger-sidebar')).toBeVisible();
  await expect(page.locator('.messenger-chat')).toBeVisible();
  await expect(page.locator('.messenger-info')).toBeVisible();
  await expect(page.locator('.messenger-thread')).toHaveCount(5);
  await expect(page.locator('#messengerComposer')).toBeFocused();
  await expect(page.getByText('Локальный агент памяти', { exact: true })).toBeVisible();

  const text = `Разбери базовый принцип отношений Михаила и Снежи в ${browserName}.`;
  const assistantMessagesBefore = await page.locator('.messenger-message.assistant').count();
  await page.locator('#messengerComposer').fill(text);
  await page.locator('#sendMessengerMessage').click();
  await expect(page.locator('.messenger-message.user').filter({ hasText: text })).toBeVisible();
  await expect(page.locator('.messenger-message.assistant')).toHaveCount(assistantMessagesBefore + 1);
  await expect(page.locator('.messenger-message.assistant .message-memory-count').last()).toBeVisible();
  await expect(page.locator('.messenger-memory-card').first()).toBeVisible();

  const localResult = await page.evaluate(() => ({
    snapshot: localStorage.getItem('hros.snapshot.v1'),
    threads: JSON.parse(localStorage.getItem('hros.messenger.threads.v1')),
    runtime: window.__HROS_MESSENGER__.getRuntime(),
  }));
  expect(localResult.snapshot).toBe(snapshotBeforeChat);
  expect(localResult.threads.length).toBeGreaterThanOrEqual(5);
  expect(localResult.runtime.configured).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.messenger-chat')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.locator('#messengerMobileBack').click();
  await expect(page.locator('#hrosMessenger')).toHaveClass(/show-sidebar/);
  await page.locator('.messenger-thread.active').click();
  await expect(page.locator('#hrosMessenger')).not.toHaveClass(/show-sidebar/);

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('#prepareChangeSet').click();
  await expect(page.locator('body')).not.toHaveClass(/hros-messenger-open/);
  await expect(page.getByRole('heading', { name: 'Проверка изменений' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.diary-transcript-preview p').filter({ hasText: text })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length)).toBe(initial.records.length);

  await page.locator('#diaryConfirm').check();
  await page.getByRole('button', { name: 'Подтвердить и внести' }).click();
  await expect(page.getByRole('heading', { name: 'Сессия подтверждена' })).toBeVisible();

  const committed = await page.evaluate((messageText) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v1'));
    const original = snapshot.originalMemory.find((item) => item.source?.kind === 'ai_diary' && item.data?.messages?.some((message) => message.text === messageText));
    const confirmation = snapshot.consentPolicies.find((item) => item.source?.kind === 'user_confirmation' && item.data?.sessionId === original?.data?.sessionId);
    return {
      recordCount: snapshot.records.length,
      original: original ? { id: original.id, status: original.status, messageCount: original.data.messages.length } : null,
      confirmation: confirmation ? {
        accepted: confirmation.data.acceptedChangeIds?.length || 0,
        rejected: confirmation.data.rejectedChangeIds?.length || 0,
      } : null,
    };
  }, text);
  expect(committed.recordCount).toBeGreaterThan(initial.records.length);
  expect(committed.original?.status).toBe('finalized');
  expect(committed.original?.messageCount).toBeGreaterThanOrEqual(2);
  expect(committed.confirmation?.accepted).toBeGreaterThan(0);
  expect(committed.confirmation?.rejected).toBeGreaterThan(0);

  await page.evaluate(() => window.__HROS_COMMAND_UI__.open('library'));
  await expect(page.locator('[data-command-screen="library"]')).toBeVisible();
  await expect(page.locator('.library-card')).toHaveCount(6);
  await page.locator('.library-card').filter({ has: page.getByRole('heading', { name: 'Знания', exact: true }) }).click();
  await expect(page.getByRole('heading', { name: 'Знания без подмены фактов' })).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});
