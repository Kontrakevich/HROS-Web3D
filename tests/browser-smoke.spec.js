import { test, expect } from '@playwright/test';

async function openCommand(page, view) {
  await page.evaluate((target) => window.__HROS_COMMAND_UI__.open(target), view);
  if (!['diary', 'world'].includes(view)) {
    await expect(page.locator(`[data-command-screen="${view}"]`)).toBeVisible();
  }
}

async function nativeChange(page, selector, value = null) {
  await page.locator(selector).evaluate((element, nextValue) => {
    if (nextValue !== null) element.value = nextValue;
    if (element.type === 'radio' || element.type === 'checkbox') element.checked = true;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test('HROS COMMAND 1.1 stores avatar evolution and paths through the repository', async ({ page }, testInfo) => {
  const browserName = testInfo.project.name;
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`[${browserName}] ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`[${browserName}] ${error.message}`));

  await page.goto('http://127.0.0.1:4173/HROS-Web3D/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__HROS_COMMAND_UI__?.productionReady === true);
  await expect(page.locator('[data-command-screen="today"]')).toBeVisible();

  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  expect(initial.meta.schemaVersion).toBe('1.1.0');
  expect(initial.meta.commandVersion).toBe('production-1.1');
  expect(initial.avatarProfiles).toHaveLength(1);
  expect(initial.developmentPaths).toHaveLength(4);
  expect(initial.records.length).toBeGreaterThan(12);

  await expect(page.getByRole('heading', { name: 'Сегодня', exact: true })).toBeVisible();
  await expect(page.locator('#commandMainAction')).toHaveCount(1);
  await expect(page.locator('.command-release-badge.production').first()).toContainText('COMMAND 1.1');
  await expect(page.getByText('COMMAND PLAYTEST')).toHaveCount(0);

  const snapshotBeforeTheme = await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'));
  await page.locator('[data-command-theme="family"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-command-theme', 'family');
  expect(await page.evaluate(() => localStorage.getItem('hros.snapshot.v1'))).toBe(snapshotBeforeTheme);

  await openCommand(page, 'avatar');
  await expect(page.getByRole('heading', { name: 'Аватар', exact: true })).toBeVisible();
  await expect(page.locator('#avatarThree')).toBeVisible();
  const beforeAvatar = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  const beforeProfile = beforeAvatar.avatarProfiles[0];
  const beforeAppearanceCount = beforeAvatar.avatarAppearances.length;

  await nativeChange(page, 'input[name="avatarRole"][value="athlete"]');
  await nativeChange(page, '.avatar-modifier-check input[value="sport-band"]');
  await page.locator('#avatarRelationshipContext').selectOption('support');
  await page.locator('#reviewAvatarChange').click();
  await expect(page.getByRole('heading', { name: 'Проверка изменения аватара' })).toBeVisible();
  await expect(page.getByText('ПРОВЕРЯЕМЫЕ ОСНОВАНИЯ')).toBeVisible();

  const duringReview = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  expect(duringReview.avatarProfiles[0].version).toBe(beforeProfile.version);
  expect(duringReview.avatarProfiles[0].data.role).toBe(beforeProfile.data.role);
  expect(duringReview.avatarAppearances).toHaveLength(beforeAppearanceCount);
  expect(duringReview.avatarChangeSets.some((item) => item.status === 'draft' && item.data.state === 'awaiting_confirmation')).toBe(true);

  await page.locator('#avatarConfirm').check();
  await page.locator('#avatarReviewCommit').click();
  await expect(page.getByRole('heading', { name: 'Рабочая версия сохранена' })).toBeVisible();

  const afterAvatar = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  expect(afterAvatar.avatarProfiles[0].version).toBe(beforeProfile.version + 1);
  expect(afterAvatar.avatarProfiles[0].data.role).toBe('athlete');
  expect(afterAvatar.avatarProfiles[0].data.relationshipContext).toBe('support');
  expect(afterAvatar.avatarProfiles[0].data.modifiers).toContain('sport-band');
  expect(afterAvatar.avatarAppearances).toHaveLength(beforeAppearanceCount + 1);
  expect(afterAvatar.avatarAppearances[0].data.immutable).toBe(true);
  expect(afterAvatar.avatarConfirmations.length).toBeGreaterThan(0);
  expect(afterAvatar.avatarChangeSets.some((item) => item.data.state === 'committed')).toBe(true);

  await openCommand(page, 'paths');
  await page.locator('[data-select-path="partner"]').click();
  await expect(page.locator('.path-card.active')).toContainText('Партнёрство');
  const afterPath = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  const activePaths = afterPath.developmentPaths.filter((item) => item.data.active);
  expect(activePaths).toHaveLength(1);
  expect(activePaths[0].data.pathId).toBe('partner');
  expect(afterPath.avatarProfiles[0].data.activePathId).toBe('partner');

  await openCommand(page, 'chronicle');
  await expect(page.getByText('ЭВОЛЮЦИЯ АВАТАРА')).toBeVisible();
  await expect(page.getByText(/Спортсмен/).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await openCommand(page, 'today');
  await expect(page.locator('.command-mobile-nav')).toBeVisible();
  await expect(page.locator('.command-rail')).toBeHidden();
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(mobileOverflow).toBeLessThanOrEqual(1);

  const recordsBeforeDiary = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length);
  await page.locator('#commandMainAction').click();
  await expect(page.getByRole('heading', { name: 'Живой диалог — основной источник HROS' })).toBeVisible();
  await page.evaluate(() => document.querySelector('#diaryStart')?.click());
  await expect(page.getByRole('heading', { name: 'Живой диалог с ИИ-дневником' })).toBeVisible();
  await page.locator('#diaryTopic').fill(`Проверка COMMAND 1.1 ${browserName}`);
  const diaryText = `Сегодня произошёл важный разговор в ${browserName}. Я хочу сохранить его как проверяемый источник.`;
  await page.locator('#diaryMessage').fill(diaryText);
  await page.locator('#diarySend').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length)).toBe(recordsBeforeDiary);
  await page.locator('#diaryFinish').click();
  await expect(page.getByRole('heading', { name: 'Проверка изменений' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')).records.length)).toBe(recordsBeforeDiary);
  await page.locator('#diaryConfirm').check();
  await page.locator('#diaryCommit').click();
  await expect(page.getByRole('heading', { name: 'Сессия подтверждена' })).toBeVisible();
  const afterDiary = await page.evaluate(() => JSON.parse(localStorage.getItem('hros.snapshot.v1')));
  expect(afterDiary.records.length).toBeGreaterThan(recordsBeforeDiary);
  expect(afterDiary.originalMemory.some((item) => item.data?.messages?.some((message) => message.text === diaryText))).toBe(true);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCommand(page, 'library');
  await expect(page.getByRole('heading', { name: 'Система и редакторы' })).toBeVisible();
  await expect(page.getByText('HROS COMMAND 1.1')).toBeVisible();
  await page.locator('.library-card').filter({ has: page.getByRole('heading', { name: 'Знания', exact: true }) }).click();
  await expect(page.getByRole('heading', { name: 'Знания без подмены фактов' })).toBeVisible();
  await expect(page.getByText('Три уровня памяти')).toBeVisible();

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
