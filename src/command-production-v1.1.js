import { AvatarScene } from './avatar-scene-v1.js';
import { AVATAR_DEFAULT, DEVELOPMENT_PATHS, createRepository } from './repository.js';

const DIARY_KEY = 'hros.diary.active.v1';
const PATH_META = {
  creator: { icon: '✦', title: 'AI-создатель', description: 'Продукты, визуальные системы и агентная архитектура.', keywords: ['ai', 'hros', 'проект', 'автомат', 'визуал', 'дизайн'] },
  athlete: { icon: '◆', title: 'Физическая форма', description: 'Сила, здоровье и регулярное движение.', keywords: ['спорт', 'волейбол', 'трениров', 'зал', 'сильн', 'здоров'] },
  partner: { icon: '∞', title: 'Партнёрство', description: 'Осознанность влияния и бережный диалог.', keywords: ['снеж', 'пара', 'отношен', 'близост', 'разговор'] },
  father: { icon: '△', title: 'Отцовство', description: 'Присутствие, забота и передача опыта.', keywords: ['дочь', 'василис', 'отцов', 'семь'] },
};
const MODIFIERS = [
  { id: 'ai-orbit', title: 'AI-орбита', note: 'AI, автоматизация и HROS', keywords: ['ai', 'hros', 'автомат', 'агент', 'визуал'] },
  { id: 'sport-band', title: 'Спортивный модуль', note: 'Тренировки, сила и здоровье', keywords: ['спорт', 'волейбол', 'трениров', 'зал', 'здоров'] },
  { id: 'family-emblem', title: 'Семейный символ', note: 'Партнёрство, отцовство и память', keywords: ['снеж', 'пара', 'отношен', 'дочь', 'василис', 'семь', 'памят'] },
  { id: 'architecture-grid', title: 'Архитектурная сетка', note: 'Архитектура и визуальные системы', keywords: ['архитект', 'дизайн', 'фасад', 'визуал'] },
];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));
const clone = (value) => structuredClone(value);
const roleLabel = (role) => ({
  base: 'Базовая форма', creator: 'AI-создатель', athlete: 'Спортсмен', leader: 'Руководитель', father: 'Отец',
}[role] || 'Базовая форма');
const readJson = (key, fallback = null) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
};

let repository;
let snapshot;
let avatarState;
let workingAvatar = clone(AVATAR_DEFAULT);
let originalOpen;
let avatarScene;
let feedback = '';

function waitForCommand(timeout = 15_000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.__HROS_COMMAND_UI__?.ready && window.__HROS_DIARY__?.ready) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error('HROS COMMAND не готов'));
      }
    }, 50);
  });
}

function stopAvatarScene() {
  avatarScene?.destroy?.();
  avatarScene = null;
}

function viewRoot() {
  return document.querySelector('#viewRoot');
}

function owner() {
  return avatarState?.owner || snapshot?.people?.find((item) => item.isSelf) || snapshot?.people?.[0];
}

function normalizeAvatar(input = {}) {
  return {
    base: input.base || AVATAR_DEFAULT.base,
    role: input.role || AVATAR_DEFAULT.role,
    palette: input.palette || AVATAR_DEFAULT.palette,
    modifiers: Array.isArray(input.modifiers) ? [...input.modifiers] : [],
    relationshipContext: input.relationshipContext || AVATAR_DEFAULT.relationshipContext,
  };
}

async function refreshData({ keepWorking = false } = {}) {
  snapshot = await repository.getSnapshot();
  avatarState = await repository.getAvatarState();
  if (!keepWorking) workingAvatar = normalizeAvatar(avatarState.profile?.data || AVATAR_DEFAULT);
}

function setActiveNavigation(view) {
  document.querySelectorAll('[data-command-view]').forEach((button) => {
    const active = button.dataset.commandView === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

function applyProductionChrome() {
  document.body.classList.add('hros-command-production');
  const brand = document.querySelector('.brand small');
  const brandText = 'Human Relationship Operating System · v1.1.0';
  if (brand && brand.textContent !== brandText) brand.textContent = brandText;
  document.title = 'HROS COMMAND 1.1 — Living World';
}

function renderAfterNativeCleanup(callback) {
  return new Promise((resolve) => {
    stopAvatarScene();
    document.querySelector('.topbar nav [data-view="people"]')?.click();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      callback();
      applyProductionChrome();
      resolve();
    }));
  });
}

function recordIndex() {
  return [
    ...(snapshot.records || [])
      .filter((record) => !['avatar_change_set', 'avatar_confirmation'].includes(record.kind))
      .map((record) => ({
        id: record.id, kind: record.kind, status: record.status, confidence: record.confidence,
        statement: record.statement, source: record.source,
        text: `${record.statement} ${JSON.stringify(record.data || {})}`.toLowerCase(),
      })),
    ...(snapshot.moments || []).map((moment) => ({
      id: moment.id, kind: 'moment', status: moment.status, confidence: moment.confidence,
      statement: `${moment.title}: ${moment.details?.meaning || moment.description}`,
      source: moment.source,
      text: `${moment.title} ${moment.description} ${(moment.details?.tags || []).join(' ')}`.toLowerCase(),
    })),
  ];
}

function evidenceFor(keywords) {
  return recordIndex().filter((record) =>
    keywords.some((keyword) => record.text.includes(keyword)) &&
    ['confirmed', 'finalized', 'observed'].includes(record.status));
}

function avatarEvidence(config) {
  const result = [];
  MODIFIERS.filter((modifier) => (config.modifiers || []).includes(modifier.id))
    .forEach((modifier) => result.push(...evidenceFor(modifier.keywords)));
  const role = PATH_META[config.role];
  if (role) result.push(...evidenceFor(role.keywords));
  return [...new Map(result.map((record) => [record.id, record])).values()];
}

function activePathId() {
  return avatarState.paths?.find((record) => record.data?.active)?.data?.pathId ||
    avatarState.profile?.data?.activePathId || 'creator';
}

function pathStats(pathId) {
  const records = evidenceFor(PATH_META[pathId]?.keywords || []);
  const confirmed = records.filter((record) => ['confirmed', 'finalized'].includes(record.status)).length;
  const observed = records.length - confirmed;
  return {
    records, confirmed, observed,
    progress: Math.min(96, 12 + confirmed * 13 + observed * 6),
  };
}

function sourceCards(records) {
  if (!records.length) return '<div class="command-empty">Проверяемые источники не выбраны. Ручной выбор будет помечен как ручной.</div>';
  return records.slice(0, 12).map((record) => `
    <article class="avatar-source-card">
      <div><span>${escapeHtml(record.kind)}</span><b>${escapeHtml(record.status)}</b></div>
      <p>${escapeHtml(record.statement)}</p>
      <small>${Math.round(Number(record.confidence ?? 1) * 100)}% · ${escapeHtml(record.source?.label || 'источник не указан')}</small>
    </article>`).join('');
}

function bindProductionLinks(scope) {
  scope.querySelectorAll('[data-production-view]').forEach((button) => {
    button.addEventListener('click', () => openProductionView(button.dataset.productionView));
  });
}

async function openProductionView(view) {
  setActiveNavigation(view);
  if (view === 'diary' || view === 'world') {
    stopAvatarScene();
    return originalOpen(view);
  }
  await refreshData();
  return renderAfterNativeCleanup(() => {
    if (view === 'today') renderToday();
    if (view === 'avatar') renderAvatar();
    if (view === 'paths') renderPaths();
    if (view === 'chronicle') renderChronicle();
    if (view === 'library') renderLibrary();
  });
}

function renderToday() {
  const person = owner();
  const diaryState = readJson(DIARY_KEY, null);
  const pathId = activePathId();
  const path = PATH_META[pathId];
  const stats = pathStats(pathId);
  const profile = normalizeAvatar(avatarState.profile?.data);
  const mainAction = diaryState?.state === 'review'
    ? 'Проверить изменения дневника'
    : diaryState?.state === 'active' ? 'Продолжить диалог' : 'Начать живой диалог';
  const recentMoments = [...(snapshot.moments || [])]
    .sort((left, right) => String(right.date).localeCompare(String(left.date))).slice(0, 3);

  viewRoot().innerHTML = `
    <section class="command-view command-today" data-command-screen="today">
      <header class="command-view-header">
        <div><span class="eyebrow">HROS COMMAND · WORKING BASELINE</span><h1>Сегодня</h1><p>Подтверждённая память, персонаж и пути вокруг одного следующего действия.</p></div>
        <span class="command-release-badge production">COMMAND 1.1</span>
      </header>
      ${avatarState.pendingChangeSet ? '<button class="avatar-pending-banner" data-production-view="avatar"><b>Avatar Change Set ожидает подтверждения</b><span>Проверить →</span></button>' : ''}
      <div class="command-dashboard-grid">
        <article class="command-avatar-card command-panel">
          <div class="command-panel-title"><span>ПЕРСОНАЖ</span><button data-production-view="avatar">Открыть</button></div>
          <div id="todayAvatarThree" class="command-avatar-three compact"></div>
          <div class="command-avatar-name"><h2>${escapeHtml(person?.name || 'Пользователь')}</h2><span>${escapeHtml(roleLabel(profile.role))}</span></div>
          <div class="command-progress-label"><span>${escapeHtml(path.title)}</span><b>${stats.progress}%</b></div>
          <div class="command-progress"><i style="--progress:${stats.progress}%"></i></div>
          <small>${stats.records.length} проверяемых источников</small>
        </article>
        <article class="command-main-mission command-panel">
          <span class="command-kicker">ГЛАВНОЕ ДЕЙСТВИЕ</span><h2>${escapeHtml(mainAction)}</h2>
          <p>Диалог остаётся основным источником HROS.</p>
          <button id="commandMainAction" class="command-primary-action"><span>✎</span>${escapeHtml(mainAction)}</button>
          <div class="command-safe-note"><b>Без скрытых изменений</b><span>Диалог → Change Set → проверка → подтверждение.</span></div>
        </article>
        <article class="command-world-card command-panel">
          <div class="command-panel-title"><span>ЖИВОЙ МИР</span><button data-production-view="world">Открыть</button></div>
          <div class="command-world-stats"><div><b>${snapshot.people.length}</b><span>людей</span></div><div><b>${snapshot.relationships.length}</b><span>связей</span></div><div><b>${snapshot.avatarAppearances.length}</b><span>форм аватара</span></div></div>
          <div class="command-relationship-orbit"><span class="orbit-self">Я</span>${snapshot.people.filter((item) => !item.isSelf).slice(0, 5).map((item, index) => `<button style="--orbit-index:${index}" data-production-view="world"><b>${escapeHtml(item.name[0])}</b><small>${escapeHtml(item.name)}</small></button>`).join('')}</div>
        </article>
      </div>
      <div class="command-lower-grid">
        <section class="command-panel command-quests">
          <div class="command-panel-title"><div><span>НАПРАВЛЕНИЯ</span><small>Без серии и штрафа</small></div><button data-production-view="paths">Все пути</button></div>
          <button class="command-quest-row" data-production-view="diary"><span class="command-quest-icon">◇</span><span><b>Зафиксировать значимый момент</b><small>ИИ-дневник</small></span><em>Подтверждаемая память</em></button>
          <button class="command-quest-row" data-production-view="avatar"><span class="command-quest-icon">♙</span><span><b>Проверить образ персонажа</b><small>${escapeHtml(roleLabel(profile.role))}</small></span><em>Версии и источники</em></button>
        </section>
        <section class="command-panel command-recent">
          <div class="command-panel-title"><div><span>ПОСЛЕДНИЕ ГЛАВЫ</span><small>Только подтверждённые моменты</small></div><button data-production-view="chronicle">Хроника</button></div>
          ${recentMoments.map((moment) => `<article class="command-moment-preview"><time>${escapeHtml(moment.date)}</time><div><b>${escapeHtml(moment.title)}</b><p>${escapeHtml(moment.details?.meaning || moment.description)}</p></div><span>${moment.significance}</span></article>`).join('')}
        </section>
      </div>
    </section>`;

  bindProductionLinks(viewRoot());
  viewRoot().querySelector('#commandMainAction').addEventListener('click', async () => {
    await openProductionView('diary');
    const state = readJson(DIARY_KEY, null);
    if (!state || state.state === 'committed') {
      requestAnimationFrame(() => document.querySelector('#diaryStart,#diaryNew')?.click());
    }
  });
  avatarScene = new AvatarScene(viewRoot().querySelector('#todayAvatarThree'), profile, { compact: true });
}

function optionGroup(title, name, items, value) {
  return `<fieldset class="avatar-option-group"><legend>${title}</legend><div class="avatar-choice-grid">${items.map(([id, label]) => `<label><input type="radio" name="${name}" value="${id}" ${id === value ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div></fieldset>`;
}

function modifierControl(modifier) {
  const records = evidenceFor(modifier.keywords);
  return `<label class="avatar-modifier-check ${records.length ? '' : 'unverified'}"><input type="checkbox" value="${modifier.id}" ${workingAvatar.modifiers.includes(modifier.id) ? 'checked' : ''}><span><b>${escapeHtml(modifier.title)}</b><small>${escapeHtml(modifier.note)} · ${records.length} источников</small></span><button type="button" data-source-modifier="${modifier.id}">Источники</button></label>`;
}

function renderAvatar() {
  if (avatarState.pendingChangeSet) {
    renderAvatarReview(avatarState.pendingChangeSet);
    return;
  }
  const records = avatarEvidence(workingAvatar);
  viewRoot().innerHTML = `
    <section class="command-view command-avatar-workshop" data-command-screen="avatar">
      <header class="command-view-header"><div><span class="eyebrow">AVATAR DOMAIN · REPOSITORY BACKED</span><h1>Аватар</h1><p>Предпросмотр не меняет профиль. Сохранение проходит через Change Set и явное подтверждение.</p></div><span class="command-release-badge production">${escapeHtml(repository.mode.toUpperCase())}</span></header>
      <div class="avatar-workshop-grid">
        <section class="command-panel avatar-preview-panel">
          <div class="command-panel-title"><span>3D-ПРЕДПРОСМОТР</span><small>Identity Core не изменяется</small></div>
          <div id="avatarThree" class="avatar-three-stage"></div>
          <div class="avatar-core-note"><b>Identity Core</b><span>personId, память и принципы не зависят от оболочки.</span></div>
          <button id="reviewAvatarChange" class="command-primary-action">Подготовить изменение</button>
          <p id="avatarSaveFeedback" class="command-feedback">${escapeHtml(feedback)}</p>
        </section>
        <section class="command-panel avatar-controls-panel">
          ${optionGroup('БАЗОВЫЙ ВИД', 'avatarBase', [['explorer', 'Исследователь'], ['creator', 'Создатель'], ['guardian', 'Хранитель']], workingAvatar.base)}
          ${optionGroup('АКТИВНАЯ РОЛЬ', 'avatarRole', [['base', 'Базовая'], ['creator', 'AI-создатель'], ['athlete', 'Спортсмен'], ['leader', 'Руководитель'], ['father', 'Отец']], workingAvatar.role)}
          ${optionGroup('ПАЛИТРА', 'avatarPalette', [['cyan', 'Циан'], ['amber', 'Янтарь'], ['violet', 'Фиолетовый'], ['green', 'Зелёный']], workingAvatar.palette)}
          <fieldset class="avatar-option-group"><legend>МОДИФИКАТОРЫ</legend>${MODIFIERS.map(modifierControl).join('')}</fieldset>
          <label class="avatar-context-select">Контекст отношений<select id="avatarRelationshipContext">${[['neutral', 'Нейтральный'], ['support', 'Поддержка'], ['distance', 'Дистанция'], ['tension', 'Напряжение']].map(([id, label]) => `<option value="${id}" ${id === workingAvatar.relationshipContext ? 'selected' : ''}>${label}</option>`).join('')}</select><small>Меняет ауру и окружение, но не лицо, тело или ценность.</small></label>
        </section>
      </div>
      <section class="command-panel avatar-source-inspector"><div class="command-panel-title"><div><span>ИСТОЧНИКИ ТЕКУЩЕГО ОБРАЗА</span><small>Автоматический символ обязан иметь основание</small></div><b id="avatarSourceCount">${records.length}</b></div><div id="avatarSourceList" class="avatar-source-list">${sourceCards(records)}</div></section>
      <section class="command-panel avatar-history-panel"><div class="command-panel-title"><div><span>ГАЛЕРЕЯ ЭВОЛЮЦИИ</span><small>Immutable Appearance Versions</small></div><b>${avatarState.appearances.length}</b></div><div class="avatar-history-list">${avatarState.appearances.length ? avatarState.appearances.slice(0, 10).map((appearance) => `<button data-restore-appearance="${appearance.id}"><span class="avatar-history-symbol">${escapeHtml(roleLabel(appearance.data?.avatar?.role))}</span><b>${escapeHtml(roleLabel(appearance.data?.avatar?.role))}</b><small>${new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(appearance.data?.confirmedAt || appearance.createdAt))}</small></button>`).join('') : '<div class="command-empty">Первая версия появится после подтверждения.</div>'}</div></section>
    </section>`;

  bindAvatarEditor();
  avatarScene = new AvatarScene(viewRoot().querySelector('#avatarThree'), workingAvatar);
}

function bindAvatarEditor() {
  const redraw = () => {
    avatarScene?.update(workingAvatar);
    const records = avatarEvidence(workingAvatar);
    viewRoot().querySelector('#avatarSourceList').innerHTML = sourceCards(records);
    viewRoot().querySelector('#avatarSourceCount').textContent = records.length;
  };
  viewRoot().querySelectorAll('input[name="avatarBase"]').forEach((input) => input.addEventListener('change', () => { workingAvatar.base = input.value; redraw(); }));
  viewRoot().querySelectorAll('input[name="avatarRole"]').forEach((input) => input.addEventListener('change', () => { workingAvatar.role = input.value; redraw(); }));
  viewRoot().querySelectorAll('input[name="avatarPalette"]').forEach((input) => input.addEventListener('change', () => { workingAvatar.palette = input.value; redraw(); }));
  viewRoot().querySelectorAll('.avatar-modifier-check > input').forEach((input) => input.addEventListener('change', () => {
    workingAvatar.modifiers = input.checked
      ? [...new Set([...workingAvatar.modifiers, input.value])]
      : workingAvatar.modifiers.filter((item) => item !== input.value);
    redraw();
  }));
  viewRoot().querySelector('#avatarRelationshipContext').addEventListener('change', (event) => { workingAvatar.relationshipContext = event.target.value; redraw(); });
  viewRoot().querySelectorAll('[data-source-modifier]').forEach((button) => button.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation();
    const modifier = MODIFIERS.find((item) => item.id === button.dataset.sourceModifier);
    const records = modifier ? evidenceFor(modifier.keywords) : [];
    viewRoot().querySelector('#avatarSourceList').innerHTML = sourceCards(records);
    viewRoot().querySelector('#avatarSourceCount').textContent = records.length;
  }));
  viewRoot().querySelectorAll('[data-restore-appearance]').forEach((button) => button.addEventListener('click', () => {
    const appearance = avatarState.appearances.find((item) => item.id === button.dataset.restoreAppearance);
    if (appearance?.data?.avatar) {
      workingAvatar = normalizeAvatar(appearance.data.avatar);
      feedback = 'Предыдущая форма загружена. Для восстановления требуется новое подтверждение.';
      renderAvatar();
    }
  }));
  viewRoot().querySelector('#reviewAvatarChange').addEventListener('click', async () => {
    const button = viewRoot().querySelector('#reviewAvatarChange');
    button.disabled = true;
    try {
      const records = avatarEvidence(workingAvatar);
      await repository.createAvatarChangeSet({
        ownerId: owner().id, avatar: workingAvatar, evidenceIds: records.map((record) => record.id),
        reason: 'Изменение через рабочий редактор HROS COMMAND',
      });
      await refreshData({ keepWorking: true });
      feedback = '';
      renderAvatar();
    } catch (error) {
      button.disabled = false;
      viewRoot().querySelector('#avatarSaveFeedback').textContent = `Ошибка: ${error.message}`;
    }
  });
}

function renderAvatarReview(changeSet) {
  const before = normalizeAvatar(changeSet.data?.previousAvatar || avatarState.profile?.data);
  const after = normalizeAvatar(changeSet.data?.proposedAvatar);
  const byId = new Map(recordIndex().map((record) => [record.id, record]));
  const records = (changeSet.evidenceIds || []).map((id) => byId.get(id)).filter(Boolean);
  viewRoot().innerHTML = `
    <section class="command-view avatar-change-review" data-command-screen="avatar">
      <header class="command-view-header"><div><span class="eyebrow">AVATAR CHANGE SET · REVIEW</span><h1>Проверка изменения аватара</h1><p>Текущий профиль не изменён.</p></div><span class="status-chip review">Ожидает подтверждения</span></header>
      <div class="avatar-review-grid"><section class="command-panel"><div class="command-panel-title"><span>ПРЕДЫДУЩАЯ ФОРМА</span><small>${escapeHtml(roleLabel(before.role))}</small></div><div id="avatarBeforeThree" class="avatar-three-stage"></div></section><section class="command-panel"><div class="command-panel-title"><span>ПРЕДЛАГАЕМАЯ ФОРМА</span><small>${escapeHtml(roleLabel(after.role))}</small></div><div id="avatarAfterThree" class="avatar-three-stage"></div></section></div>
      <section class="command-panel avatar-change-summary"><div><b>Базовый вид</b><span>${escapeHtml(before.base)} → ${escapeHtml(after.base)}</span></div><div><b>Роль</b><span>${escapeHtml(roleLabel(before.role))} → ${escapeHtml(roleLabel(after.role))}</span></div><div><b>Палитра</b><span>${escapeHtml(before.palette)} → ${escapeHtml(after.palette)}</span></div><div><b>Контекст</b><span>${escapeHtml(before.relationshipContext)} → ${escapeHtml(after.relationshipContext)}</span></div><div><b>Модификаторы</b><span>${escapeHtml(after.modifiers.join(', ') || 'нет')}</span></div></section>
      <section class="command-panel avatar-source-inspector"><div class="command-panel-title"><div><span>ПРОВЕРЯЕМЫЕ ОСНОВАНИЯ</span><small>Попадут в Appearance Version</small></div><b>${records.length}</b></div><div class="avatar-source-list">${sourceCards(records)}</div></section>
      <label class="diary-confirmation avatar-confirmation"><input type="checkbox" id="avatarConfirm"> Я проверил форму, контекст и источники и подтверждаю создание новой версии.</label>
      <div class="diary-review-actions"><button class="secondary" id="avatarReviewEdit">Вернуться</button><button class="danger" id="avatarReviewReject">Отклонить</button><button class="primary" id="avatarReviewCommit" disabled>Подтвердить и сохранить</button></div><div id="avatarReviewFeedback" class="diary-feedback"></div>
    </section>`;

  const beforeScene = new AvatarScene(viewRoot().querySelector('#avatarBeforeThree'), before);
  const afterScene = new AvatarScene(viewRoot().querySelector('#avatarAfterThree'), after);
  avatarScene = { destroy: () => { beforeScene.destroy(); afterScene.destroy(); } };
  viewRoot().querySelector('#avatarConfirm').addEventListener('change', (event) => { viewRoot().querySelector('#avatarReviewCommit').disabled = !event.target.checked; });
  viewRoot().querySelector('#avatarReviewEdit').addEventListener('click', async () => {
    workingAvatar = after;
    await repository.rejectAvatarChangeSet(changeSet.id, { reason: 'Возврат к редактированию' });
    await refreshData({ keepWorking: true });
    renderAvatar();
  });
  viewRoot().querySelector('#avatarReviewReject').addEventListener('click', async () => {
    await repository.rejectAvatarChangeSet(changeSet.id, { reason: 'Отклонено пользователем' });
    await refreshData();
    feedback = 'Изменение отклонено. Профиль не менялся.';
    renderAvatar();
  });
  viewRoot().querySelector('#avatarReviewCommit').addEventListener('click', async () => {
    const button = viewRoot().querySelector('#avatarReviewCommit');
    const output = viewRoot().querySelector('#avatarReviewFeedback');
    button.disabled = true;
    output.textContent = 'Сохраняем профиль, Appearance Version и аудит одной операцией…';
    try {
      await repository.confirmAvatarChangeSet(changeSet.id, { confirmed: true, confirmedBy: owner().id });
      await refreshData();
      renderAvatarCommitted();
    } catch (error) {
      output.textContent = `Ошибка: ${error.message}`;
      button.disabled = false;
    }
  });
}

function renderAvatarCommitted() {
  stopAvatarScene();
  viewRoot().innerHTML = `
    <section class="command-view diary-committed" data-command-screen="avatar">
      <span class="eyebrow">AVATAR CHANGE SET · COMMITTED</span><h1>Рабочая версия сохранена</h1>
      <p>Профиль обновлён только после подтверждения. Appearance Version и аудит сохранены отдельно.</p>
      <div class="stats-row"><div class="stat-card"><b>${avatarState.profile.version}</b><span>версия профиля</span></div><div class="stat-card"><b>${avatarState.appearances.length}</b><span>Appearance Versions</span></div><div class="stat-card"><b>${snapshot.avatarConfirmations.length}</b><span>подтверждений</span></div><div class="stat-card"><b>${escapeHtml(repository.mode)}</b><span>хранилище</span></div></div>
      <div class="diary-review-actions"><button class="primary" data-production-view="avatar">Вернуться к аватару</button><button class="secondary" data-production-view="chronicle">Открыть хронику</button></div>
    </section>`;
  bindProductionLinks(viewRoot());
}

function renderPaths() {
  const active = activePathId();
  viewRoot().innerHTML = `
    <section class="command-view command-paths-view" data-command-screen="paths">
      <header class="command-view-header"><div><span class="eyebrow">DEVELOPMENT PATHS · REPOSITORY BACKED</span><h1>Пути развития</h1><p>Переключение сохраняется в HROS и не удаляет историю других путей.</p></div><span class="command-release-badge production">1 ACTIVE PATH</span></header>
      <div class="paths-layout"><section class="paths-map command-panel"><div class="path-core"><b>CORE</b><span>${escapeHtml(owner().name)}</span></div><div class="path-branches">${DEVELOPMENT_PATHS.map((path) => {
        const meta = PATH_META[path.id]; const stats = pathStats(path.id); const selected = path.id === active;
        return `<article class="path-card ${selected ? 'active' : ''}"><div class="path-icon">${meta.icon}</div><div><span>${selected ? 'АКТИВНЫЙ ПУТЬ' : 'ДОСТУПНЫЙ ПУТЬ'}</span><h2>${escapeHtml(meta.title)}</h2><p>${escapeHtml(meta.description)}</p><div class="command-progress-label"><span>${stats.records.length} источников</span><b>${stats.progress}%</b></div><div class="command-progress"><i style="--progress:${stats.progress}%"></i></div><small>${stats.confirmed} подтверждено · ${stats.observed} наблюдается</small></div><button data-select-path="${path.id}" ${selected ? 'disabled' : ''}>${selected ? 'Выбран' : 'Сделать активным'}</button></article>`;
      }).join('')}</div></section><aside class="command-panel path-rules"><span class="command-kicker">ПРАВИЛА</span><h2>Осмысленная геймификация</h2><ul><li>Путь относится к роли, навыку или проекту.</li><li>История не сбрасывается.</li><li>Источники остаются видимыми.</li><li>Нет уровня человека или отношений.</li></ul></aside></div>
    </section>`;
  viewRoot().querySelectorAll('[data-select-path]').forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    await repository.activateDevelopmentPath(button.dataset.selectPath, owner().id);
    await refreshData();
    renderPaths();
  }));
}

function renderChronicle() {
  const moments = [...(snapshot.moments || [])].sort((left, right) => String(right.date).localeCompare(String(left.date)));
  viewRoot().innerHTML = `
    <section class="command-view command-chronicle" data-command-screen="chronicle">
      <header class="command-view-header"><div><span class="eyebrow">LIFE STORY · CONFIRMED SOURCES</span><h1>Хроника</h1><p>Подтверждённые моменты и неизменяемые версии аватара.</p></div><button class="secondary" data-open-book>Открыть книгу</button></header>
      <div class="chronicle-grid"><section class="command-panel chronicle-timeline"><div class="command-panel-title"><span>ГЛАВЫ ЖИЗНИ</span><b>${moments.length}</b></div>${moments.map((moment, index) => `<article class="chronicle-entry"><span class="chronicle-index">${String(index + 1).padStart(2, '0')}</span><time>${escapeHtml(moment.date)}</time><div><h2>${escapeHtml(moment.title)}</h2><p>${escapeHtml(moment.details?.meaning || moment.description)}</p><small>${escapeHtml(moment.status)} · ${escapeHtml(moment.source?.label || 'источник не указан')}</small></div><b>${moment.significance}</b></article>`).join('')}</section><aside class="command-panel chronicle-evolution"><div class="command-panel-title"><span>ЭВОЛЮЦИЯ АВАТАРА</span><b>${avatarState.appearances.length}</b></div>${avatarState.appearances.length ? avatarState.appearances.slice(0, 8).map((appearance) => `<article><span class="avatar-history-symbol">${escapeHtml(roleLabel(appearance.data?.avatar?.role))}</span><div><b>${escapeHtml(roleLabel(appearance.data?.avatar?.role))}</b><small>${new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(appearance.data?.confirmedAt || appearance.createdAt))}</small></div></article>`).join('') : '<div class="command-empty">Подтверждённых форм пока нет.</div>'}</aside></div>
    </section>`;
  viewRoot().querySelector('[data-open-book]').addEventListener('click', () => {
    document.querySelector('[data-v1-view="book"]')?.click();
    setActiveNavigation('chronicle');
  });
}

function renderLibrary() {
  const sections = [
    ['people', 'Люди', 'Карточки людей, источники и версии.', 'data-view'],
    ['moments', 'Моменты', 'События, участники и влияние.', 'data-view'],
    ['knowledge', 'Знания', 'Факты, перспективы, гипотезы и память.', 'data-v1-view'],
    ['couple', 'Пара', 'Личные и совместное пространства.', 'data-v1-view'],
    ['book', 'Книга', 'Главы и проверяемые принципы.', 'data-v1-view'],
    ['diagnostics', 'Диагностика', 'Хранилище, версии и целостность.', 'data-view'],
  ];
  viewRoot().innerHTML = `
    <section class="command-view command-library" data-command-screen="library">
      <header class="command-view-header"><div><span class="eyebrow">SYSTEM · PROFESSIONAL EDITORS</span><h1>Система и редакторы</h1><p>Точные данные, источники, privacy и revisions.</p></div><span class="command-release-badge production">HROS COMMAND 1.1</span></header>
      <div class="command-production-status"><article><span>Schema</span><b>${escapeHtml(snapshot.meta.schemaVersion)}</b></article><article><span>Repository</span><b>${escapeHtml(repository.mode)}</b></article><article><span>Avatar profile</span><b>v${avatarState.profile.version}</b></article><article><span>Appearance versions</span><b>${avatarState.appearances.length}</b></article></div>
      <div class="library-grid">${sections.map(([id, title, note, attribute]) => `<button class="library-card" data-native-selector="[${attribute}=&quot;${id}&quot;]"><span>◇</span><div><h2>${title}</h2><p>${note}</p></div><b>→</b></button>`).join('')}</div>
      <section class="command-panel command-playtest-notes"><div><span class="command-kicker">РАБОЧИЕ ОГРАНИЧЕНИЯ</span><h2>Подключения</h2></div><ol><li>GitHub Pages хранит данные в этом браузере.</li><li>Docker/API использует PostgreSQL.</li><li>Внешний LLM пока не подключён.</li><li>Защищённый multi-user режим пары ещё не реализован.</li></ol></section>
    </section>`;
  viewRoot().querySelectorAll('[data-native-selector]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector(`.topbar nav ${button.dataset.nativeSelector}`)?.click();
    setActiveNavigation('library');
  }));
}

async function boot() {
  await waitForCommand();
  repository = await createRepository();
  originalOpen = window.__HROS_COMMAND_UI__.open.bind(window.__HROS_COMMAND_UI__);
  window.__HROS_COMMAND_UI__.open = openProductionView;
  window.__HROS_COMMAND_UI__.getAvatarState = () => clone(avatarState);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-command-view]');
    if (!button || !['today', 'avatar', 'paths', 'chronicle', 'library'].includes(button.dataset.commandView)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openProductionView(button.dataset.commandView);
  }, true);

  applyProductionChrome();
  await openProductionView('today');
  window.__HROS_COMMAND_UI__.version = 'production-1.1';
  window.__HROS_COMMAND_UI__.productionReady = true;
}

boot().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('beforeend', `<div class="alignment-fatal">HROS COMMAND 1.1: ${escapeHtml(error.message)}</div>`);
});
