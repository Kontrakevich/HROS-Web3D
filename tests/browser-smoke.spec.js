import { test, expect } from '@playwright/test';

async function openCommand(page, view) {
  const desktop = page.locator(`.command-rail [data-command-view="${view}"]`);
  const mobile = page.locator(`.command-mobile-nav [data-command-view="${view}"]`);
  if (await desktop.isVisible().catch(() => false)) await desktop.click();
  else await mobile.click();
  if (!['diary', 'world'].includes(view)) {
    await expect(page.locator(`[data-command-screen="${view}"]`)).toBeVisible();
  }
}

async function openSystemSection(page, title) {
  await openCommand(page, 'library');
  await page.locator('.library-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).click();
}

test('HROS COMMAND playtest preserves the AI diary contract and legacy editors', async ({ page }, testInfo) => {
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
  await page.waitForFunction(() => window.__HROS_DIARY__?.ready === true);
  await page.waitForFunction(() => window.__HROS_COMMAND_UI__?.ready === true);

  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  expect(initial.meta.schemaVersion).toBe('1.0.0');
  expect(initial.records.length).toBeGreaterThan(8);
  expect(initial.perspectives.length).toBeGreaterThan(0);
  expect(initial.principles.length).toBeGreaterThan(0);
  expect(initial.originalMemory.length).toBeGreaterThan(0);
  expect(initial.semanticMemory.length).toBeGreaterThan(0);
  expect(initial.livingMemory.length).toBeGreaterThan(0);

  // COMMAND opens with one clear next action.
  await expect(page.locator('[data-command-screen="today"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сегодня', exact: true })).toBeVisible();
  await expect(page.locator('#commandMainAction')).toHaveCount(1);
  await expect(page.locator('#commandMainAction')).toBeVisible();
  await expect(page.locator('.command-rail [data-command-view]')).toHaveCount(7);

  // Theme preferences are UI-only and cannot mutate the HROS domain snapshot.
  const snapshotBeforeTheme = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('[data-command-theme="family"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-command-theme', 'family');
  const themeResult = await page.evaluate(() => ({
    snapshot: localStorage.getItem('hros.snapshot.v1'),
    settings: JSON.parse(localStorage.getItem('hros.command.ui.v1')),
  }));
  expect(themeResult.snapshot).toBe(snapshotBeforeTheme);
  expect(themeResult.settings.theme).toBe('family');

  // Avatar appearance is a reversible local preview, not a domain mutation.
  await openCommand(page, 'avatar');
  const snapshotBeforeAvatar = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('input[name="avatarRole"][value="athlete"]').check({ force: true });
  await page.locator('.avatar-modifier-check input[value="sport-band"]').check();
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
  expect(avatarResult.history[0].source).toBe('manual_playtest_confirmation');
  await page.locator('.avatar-history-list [data-restore-avatar]').first().click();
  await expect(page.locator('input[name="avatarRole"][value="athlete"]')).toBeChecked();

  // A path can be switched without deleting or rewriting HROS records.
  await openCommand(page, 'paths');
  const snapshotBeforePath = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('[data-select-path="partner"]').click();
  await expect(page.locator('.path-card.active')).toContainText('Партнёрство');
  const pathResult = await page.evaluate(() => ({
    snapshot: localStorage.getItem('hros.snapshot.v1'),
    settings: JSON.parse(localStorage.getItem('hros.command.ui.v1')),
  }));
  expect(pathResult.snapshot).toBe(snapshotBeforePath);
  expect(pathResult.settings.activePath).toBe('partner');

  // Mobile navigation remains usable and the page does not overflow horizontally.
  await page.setViewportSize({ width: 390, height: 844 });
  await openCommand(page, 'today');
  await expect(page.locator('.command-mobile-nav')).toBeVisible();
  await expect(page.locator('.command-rail')).toBeHidden();
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(mobileOverflow).toBeLessThanOrEqual(1);

  // AI Diary remains the primary input. No main snapshot mutation before confirmation.
  await page.locator('#commandMainAction').click();
  await expect(page.getByRole('heading', { name: 'Живой диалог — основной источник HROS' })).toBeVisible();
  await page.getByRole('button', { name: 'Начать сессию' }).click();
  await expect(page.getByRole('heading', { name: 'Живой диалог с ИИ-дневником' })).toBeVisible();
  await page.locator('#diaryTopic').fill(`Проверка COMMAND ${browserName}`);
  const diaryText = `Сегодня произошёл важный разговор в ${browserName}. Я почувствовал, что хочу точнее понимать влияние наших действий.`;
  await page.locator('#diaryMessage').fill(diaryText);
  await page.getByRole('button', { name: 'Отправить' }).click();

  const recordsDuringDialogue = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length);
  expect(recordsDuringDialogue).toBe(initial.records.length);

  await page.getByRole('button', { name: 'Завершить и проверить' }).click();
  await expect(page.getByRole('heading', { name: 'Проверка изменений' })).toBeVisible();
  await expect(page.locator('.diary-transcript-preview p').filter({ hasText: diaryText })).toBeVisible();
  const recordsDuringReview = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length);
  expect(recordsDuringReview).toBe(initial.records.length);

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

  // Existing exact editors remain available through System after the redesign.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openSystemSection(page, 'Моменты');
  await expect(page.getByRole('heading', { name: 'Моменты', exact: true })).toBeVisible();
  const editButton = page.locator('[data-v04-edit]').first();
  await expect(editButton).toBeVisible();
  const momentId = await editButton.getAttribute('data-v04-edit');
  const versionBefore = await page.evaluate((id) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v1'));
    return snapshot.moments.find((item) => item.id === id)?.version ?? 1;
  }, momentId);
  await editButton.click();
  await expect(page.locator('#v04')).toBeVisible();
  await page.locator('textarea[name="meaning"]').fill(`HROS COMMAND smoke ${browserName}`);
  const reload = page.waitForEvent('load', { timeout: 12_000 });
  await page.getByRole('button', { name: 'Сохранить версию', exact: true }).click({ noWaitAfter: true });
  await reload;
  await page.waitForFunction(() => window.__HROS_V1__?.ready === true);
  await page.waitForFunction(() => window.__HROS_DIARY__?.ready === true);
  await page.waitForFunction(() => window.__HROS_COMMAND_UI__?.ready === true);
  await expect.poll(async () => page.evaluate(({ id, before }) => {
    const snapshot = JSON.parse(localStorage.getItem('hros.snapshot.v1'));
    return snapshot.moments.find((item) => item.id === id)?.version ?? before;
  }, { id: momentId, before: versionBefore })).toBe(versionBefore + 1);

  await openSystemSection(page, 'Знания');
  await expect(page.getByRole('heading', { name: 'Знания без подмены фактов' })).toBeVisible();
  await expect(page.getByText('Три уровня памяти')).toBeVisible();
  const recordsBeforeManual = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length);
  await page.getByRole('button', { name: '+ Запись' }).click();
  await expect(page.locator('#recordDialog')).toBeVisible();
  await page.locator('#recordForm select[name="kind"]').selectOption('perspective');
  await page.locator('#recordForm textarea[name="statement"]').fill(`Перспектива COMMAND smoke ${browserName}`);
  await page.locator('#recordForm select[name="perspectiveOwnerId"]').selectOption('person-mikhail');
  await page.locator('#recordForm select[name="subjectId"]').selectOption('person-mikhail');
  await page.locator('#recordForm select[name="visibility"]').selectOption('private');
  await page.getByRole('button', { name: 'Сохранить запись' }).click();
  await expect(page.getByText(`Перспектива COMMAND smoke ${browserName}`)).toBeVisible();
  await expect.poll(async () => page.evaluate((before) => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length, recordsBeforeManual)).toBe(recordsBeforeManual + 1);

  await openSystemSection(page, 'Пара');
  await expect(page.getByRole('heading', { name: 'Три пространства пары' })).toBeVisible();
  await expect(page.getByText('Совместное пространство')).toBeVisible();
  await expect(page.getByText(/Перспектива Снежи.*не зафиксирована/)).toBeVisible();

  await openSystemSection(page, 'Книга');
  await expect(page.getByRole('heading', { name: 'Книга отношений' })).toBeVisible();
  await expect(page.getByText('Понимать, как мы влияем друг на друга')).toBeVisible();
  await expect(page.getByText('Бережные отношения требуют понимания')).toBeVisible();

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
