import { test, expect } from '@playwright/test';

async function openCommand(page, view) {
  await page.evaluate((target) => window.__HROS_COMMAND_UI__.open(target), view);
  if (!['diary', 'world'].includes(view)) {
    await expect(page.locator(`[data-command-screen="${view}"]`)).toBeVisible();
  }
}

async function openSystemSection(page, title) {
  await openCommand(page, 'library');
  await page.locator('.library-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).click();
}

test('HROS v1.2 Messenger reads HROS memory and preserves confirmation contracts', async ({ page }, testInfo) => {
  const browserName = testInfo.project.name;
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`[${browserName}] ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`[${browserName}] ${error.message}`));

  await page.goto('', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.topbar')).toBeVisible();
  await page.waitForFunction(() => window.__HROS_V1__?.ready === true);
  await page.waitForFunction(() => window.__HROS_DIARY__?.ready === true);
  await page.waitForFunction(() => window.__HROS_COMMAND_UI__?.ready === true);
  await page.waitForFunction(() => window.__HROS_MESSENGER__?.ready === true);
  await page.waitForFunction(() => window.__HROS_MESSENGER_BRIDGE__?.ready === true);
  await expect(page.locator('.brand')).toContainText('v1.2');

  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  expect(initial.meta.schemaVersion).toBe('1.0.0');
  expect(initial.records.length).toBeGreaterThan(8);
  expect(initial.perspectives.length).toBeGreaterThan(0);
  expect(initial.principles.length).toBeGreaterThan(0);
  expect(initial.originalMemory.length).toBeGreaterThan(0);
  expect(initial.semanticMemory.length).toBeGreaterThan(0);
  expect(initial.livingMemory.length).toBeGreaterThan(0);

  await expect(page.locator('[data-command-screen="today"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сегодня', exact: true })).toBeVisible();
  await expect(page.locator('#commandMainAction')).toHaveCount(1);
  await expect(page.locator('.command-rail [data-command-view]')).toHaveCount(7);

  const snapshotBeforeTheme = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('[data-command-theme="family"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-command-theme', 'family');
  const themeResult = await page.evaluate(() => ({
    snapshot: localStorage.getItem('hros.snapshot.v1'),
    settings: JSON.parse(localStorage.getItem('hros.command.ui.v1')),
  }));
  expect(themeResult.snapshot).toBe(snapshotBeforeTheme);
  expect(themeResult.settings.theme).toBe('family');

  await openCommand(page, 'avatar');
  const snapshotBeforeAvatar = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.evaluate(() => {
    const role = document.querySelector('input[name="avatarRole"][value="athlete"]');
    const modifier = document.querySelector('.avatar-modifier-check input[value="sport-band"]');
    if (!role || !modifier) throw new Error('Avatar controls are missing');
    role.checked = true;
    role.dispatchEvent(new Event('change', { bubbles: true }));
    modifier.checked = true;
    modifier.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hros.command.ui.v1')).avatar.role)).toBe('athlete');
  await page.locator('#avatarRelationshipContext').selectOption('support');
  await page.locator('#saveAvatarAppearance').click();
  await expect(page.locator('.avatar-history-list [data-restore-avatar]')).toHaveCount(1);
  const avatarResult = await page.evaluate(() => ({
    snapshot: localStorage.getItem('hros.snapshot.v1'),
    settings: JSON.parse(localStorage.getItem('hros.command.ui.v1')),
    history: JSON.parse(localStorage.getItem('hros.avatar.appearance.history.v1')),
  }));
  expect(avatarResult.snapshot).toBe(snapshotBeforeAvatar);
  expect(avatarResult.settings.avatar.role).toBe('athlete');
  expect(avatarResult.settings.avatar.modifiers).toContain('sport-band');
  expect(avatarResult.history).toHaveLength(1);
  await page.locator('.avatar-history-list [data-restore-avatar]').first().click();

  await openCommand(page, 'paths');
  const snapshotBeforePath = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('[data-select-path="partner"]').click();
  await expect(page.locator('.path-card.active')).toContainText('Партнёрство');
  expect(await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'))).toBe(snapshotBeforePath);

  await page.setViewportSize({ width: 1440, height: 960 });
  await openCommand(page, 'today');
  const snapshotBeforeMessenger = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('#commandMainAction').click();
  await expect(page.locator('body')).toHaveClass(/hros-messenger-open/);
  await expect(page.locator('#hrosMessenger')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.messenger-sidebar')).toBeVisible();
  await expect(page.locator('.messenger-chat')).toBeVisible();
  await expect(page.locator('.messenger-info')).toBeVisible();
  await expect(page.locator('.messenger-thread')).toHaveCount(5);
  await expect(page.locator('#messengerComposer')).toBeFocused();
  await expect(page.getByText('Локальный агент памяти', { exact: true })).toBeVisible();

  const diaryText = `Разбери базовый принцип отношений Михаила и Снежи в ${browserName}.`;
  await page.locator('#messengerComposer').fill(diaryText);
  await page.locator('#sendMessengerMessage').click();
  await expect(page.locator('.messenger-message.user').filter({ hasText: diaryText })).toBeVisible();
  await expect(page.locator('.messenger-message.assistant .message-memory-count').last()).toBeVisible();
  await expect(page.locator('.messenger-memory-card').first()).toBeVisible();

  const messengerState = await page.evaluate(() => ({
    snapshot: localStorage.getItem('hros.snapshot.v1'),
    threads: JSON.parse(localStorage.getItem('hros.messenger.threads.v1')),
    runtime: window.__HROS_MESSENGER__.getRuntime(),
  }));
  expect(messengerState.snapshot).toBe(snapshotBeforeMessenger);
  expect(messengerState.threads.length).toBeGreaterThanOrEqual(5);
  expect(messengerState.runtime.configured).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  const messengerOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(messengerOverflow).toBeLessThanOrEqual(1);
  await expect(page.locator('.messenger-chat')).toBeVisible();
  await page.locator('#messengerMobileBack').click();
  await expect(page.locator('#hrosMessenger')).toHaveClass(/show-sidebar/);
  await page.locator('.messenger-thread.active').click();
  await expect(page.locator('#hrosMessenger')).not.toHaveClass(/show-sidebar/);

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('#prepareChangeSet').click();
  await expect(page.locator('body')).not.toHaveClass(/hros-messenger-open/);
  await expect(page.getByRole('heading', { name: 'Проверка изменений' })).toBeVisible();
  await expect(page.locator('.diary-transcript-preview p').filter({ hasText: diaryText })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length)).toBe(initial.records.length);

  await page.locator('#diaryConfirm').check();
  await page.getByRole('button', { name: 'Подтвердить и внести' }).click();
  await expect(page.getByRole('heading', { name: 'Сессия подтверждена' })).toBeVisible();

  const committedDiary = await page.evaluate((text) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v1'));
    const original = snapshot.originalMemory.find((item) => item.source?.kind === 'ai_diary' && item.data?.messages?.some((message) => message.text === text));
    const confirmation = snapshot.consentPolicies.find((item) => item.source?.kind === 'user_confirmation' && item.data?.sessionId === original?.data?.sessionId);
    const perspective = snapshot.perspectives.find((item) => item.data?.sessionId === original?.data?.sessionId && item.statement.includes(text));
    return {
      recordCount: snapshot.records.length,
      original: original ? { id: original.id, status: original.status, messages: original.data.messages.length } : null,
      confirmation: confirmation ? {
        accepted: confirmation.data.acceptedChangeIds?.length || 0,
        rejected: confirmation.data.rejectedChangeIds?.length || 0,
      } : null,
      perspective: perspective ? { id: perspective.id, evidenceIds: perspective.evidenceIds } : null,
    };
  }, diaryText);
  expect(committedDiary.recordCount).toBeGreaterThan(initial.records.length);
  expect(committedDiary.original).not.toBeNull();
  expect(committedDiary.original.status).toBe('finalized');
  expect(committedDiary.original.messages).toBeGreaterThanOrEqual(2);
  expect(committedDiary.confirmation).not.toBeNull();
  expect(committedDiary.confirmation.accepted).toBeGreaterThan(0);
  expect(committedDiary.confirmation.rejected).toBeGreaterThan(0);
  expect(committedDiary.perspective).not.toBeNull();
  expect(committedDiary.perspective.evidenceIds).toContain(committedDiary.original.id);

  await openSystemSection(page, 'Моменты');
  await expect(page.getByRole('heading', { name: 'Моменты', exact: true })).toBeVisible();
  const editButton = page.locator('[data-v04-edit]').first();
  await expect(editButton).toBeVisible();
  const momentId = await editButton.getAttribute('data-v04-edit');
  const versionBefore = await page.evaluate((entityId) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v1'));
    return snapshot.moments.find((item) => item.id === entityId)?.version ?? 1;
  }, momentId);
  await editButton.click();
  await page.locator('textarea[name="meaning"]').fill(`HROS Messenger smoke ${browserName}`);
  const reload = page.waitForEvent('load', { timeout: 12_000 });
  await page.getByRole('button', { name: 'Сохранить версию', exact: true }).click({ noWaitAfter: true });
  await reload;
  await page.waitForFunction(() => window.__HROS_MESSENGER__?.ready === true);
  await expect.poll(async () => page.evaluate(({ entityId, before }) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v1'));
    return snapshot.moments.find((item) => item.id === entityId)?.version ?? before;
  }, { entityId: momentId, before: versionBefore })).toBe(versionBefore + 1);

  await openSystemSection(page, 'Знания');
  await expect(page.getByRole('heading', { name: 'Знания без подмены фактов' })).toBeVisible();
  await expect(page.getByText('Три уровня памяти')).toBeVisible();
  await openSystemSection(page, 'Пара');
  await expect(page.getByRole('heading', { name: 'Три пространства пары' })).toBeVisible();
  await openSystemSection(page, 'Книга');
  await expect(page.getByRole('heading', { name: 'Книга отношений' })).toBeVisible();

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
