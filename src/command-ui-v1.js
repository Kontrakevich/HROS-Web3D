import './command-ui-v1.css';
import { createRepository } from './repository.js';

const SETTINGS_KEY = 'hros.command.ui.v1';
const DIARY_KEY = 'hros.diary.active.v1';
const APPEARANCE_HISTORY_KEY = 'hros.avatar.appearance.history.v1';

const DEFAULT_SETTINGS = {
  theme: 'strategy',
  reducedMotion: false,
  activePath: 'creator',
  avatar: {
    base: 'explorer',
    role: 'creator',
    palette: 'cyan',
    modifiers: ['ai-orbit'],
    relationshipContext: 'neutral'
  }
};

const PATHS = [
  { id: 'creator', title: 'AI-создатель', icon: '✦', keywords: ['ai', 'hros', 'проект', 'автомат', 'визуал', 'дизайн'], description: 'Продукты, визуальные системы и агентная архитектура.' },
  { id: 'athlete', title: 'Физическая форма', icon: '◆', keywords: ['спорт', 'волейбол', 'трениров', 'зал', 'сильн'], description: 'Сила, здоровье и регулярное движение.' },
  { id: 'partner', title: 'Партнёрство', icon: '∞', keywords: ['снеж', 'пара', 'отношен', 'близост', 'разговор'], description: 'Осознанность влияния и бережный диалог.' },
  { id: 'father', title: 'Отцовство', icon: '△', keywords: ['дочь', 'василис', 'отцов', 'семь'], description: 'Присутствие, забота и передача опыта.' }
];

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clone = (value) => structuredClone(value);
const iso = () => new Date().toISOString();

let repository;
let snapshot;
let settings = loadSettings();
let currentCommandView = 'today';
let commandOpen = true;

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function loadSettings() {
  const saved = loadJSON(SETTINGS_KEY, {});
  return {
    ...clone(DEFAULT_SETTINGS),
    ...saved,
    avatar: { ...clone(DEFAULT_SETTINGS.avatar), ...(saved.avatar || {}) }
  };
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyPreferences();
}

function waitForReady(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.__HROS_V1__?.ready && window.__HROS_DIARY__?.ready && document.querySelector('.topbar nav')) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error('Основные модули HROS не готовы'));
      }
    }, 50);
  });
}

function applyPreferences() {
  document.body.dataset.commandTheme = settings.theme;
  document.body.classList.toggle('command-reduced-motion', Boolean(settings.reducedMotion));
  document.querySelectorAll('[data-command-theme]').forEach((button) => {
    button.classList.toggle('active', button.dataset.commandTheme === settings.theme);
    button.setAttribute('aria-pressed', String(button.dataset.commandTheme === settings.theme));
  });
}

function hiddenRoute(selector) {
  const button = document.querySelector(`.topbar nav ${selector}`);
  if (!button) return false;
  commandOpen = false;
  button.click();
  return true;
}

function stopUniverseBeforeCustomRender(callback) {
  const safeButton = document.querySelector('.topbar nav [data-view="people"]');
  if (safeButton) safeButton.click();
  requestAnimationFrame(() => requestAnimationFrame(callback));
}

function addCommandShell() {
  const shell = document.querySelector('.shell');
  const topbar = document.querySelector('.topbar');
  if (!shell || !topbar) return;

  document.body.classList.add('hros-command-enabled');

  if (!topbar.querySelector('.command-context')) {
    const status = topbar.querySelector('#storageMode');
    topbar.insertAdjacentHTML('beforeend', `
      <div class="command-context" aria-label="Режим тестирования интерфейса">
        <span class="command-release-badge">COMMAND PLAYTEST</span>
        <div class="command-theme-switch" role="group" aria-label="Визуальная тема">
          <button type="button" data-command-theme="family" title="Светлая семейная тема">Семья</button>
          <button type="button" data-command-theme="adventure" title="Тёмная приключенческая тема">Приключение</button>
          <button type="button" data-command-theme="strategy" title="Нейтральная стратегическая тема">Стратегия</button>
        </div>
        <label class="command-motion-switch"><input type="checkbox" id="commandReducedMotion"> Меньше движения</label>
      </div>`);
    if (status) topbar.querySelector('.command-context')?.prepend(status);
  }

  if (!shell.querySelector('.command-rail')) {
    topbar.insertAdjacentHTML('afterend', `
      <aside class="command-rail glass" aria-label="Основная игровая навигация">
        ${commandButton('today', '⌂', 'Сегодня')}
        ${commandButton('diary', '✎', 'Дневник')}
        ${commandButton('world', '◈', 'Мир')}
        ${commandButton('avatar', '♙', 'Аватар')}
        ${commandButton('paths', '⌁', 'Пути')}
        ${commandButton('chronicle', '◫', 'Хроника')}
        <span class="command-rail-spacer"></span>
        ${commandButton('library', '☷', 'Система')}
      </aside>`);
  }

  if (!document.querySelector('.command-mobile-nav')) {
    document.body.insertAdjacentHTML('beforeend', `
      <nav class="command-mobile-nav glass" aria-label="Мобильная игровая навигация">
        ${mobileButton('today', '⌂', 'Сегодня')}
        ${mobileButton('diary', '✎', 'Дневник')}
        ${mobileButton('world', '◈', 'Мир')}
        ${mobileButton('avatar', '♙', 'Аватар')}
        ${mobileButton('paths', '⌁', 'Пути')}
        ${mobileButton('library', '☷', 'Ещё')}
      </nav>`);
  }

  document.querySelectorAll('[data-command-view]').forEach((button) => {
    if (button.dataset.commandBound) return;
    button.dataset.commandBound = '1';
    button.addEventListener('click', () => openCommandView(button.dataset.commandView));
  });

  document.querySelectorAll('[data-command-theme]').forEach((button) => {
    if (button.dataset.commandThemeBound) return;
    button.dataset.commandThemeBound = '1';
    button.addEventListener('click', () => {
      settings.theme = button.dataset.commandTheme;
      saveSettings();
      if (commandOpen) renderCurrentCommandView();
    });
  });

  const motion = document.querySelector('#commandReducedMotion');
  if (motion && !motion.dataset.commandBound) {
    motion.dataset.commandBound = '1';
    motion.checked = settings.reducedMotion;
    motion.addEventListener('change', () => {
      settings.reducedMotion = motion.checked;
      saveSettings();
    });
  }

  const nativeNav = document.querySelector('.topbar nav');
  if (nativeNav && !nativeNav.dataset.commandObserverBound) {
    nativeNav.dataset.commandObserverBound = '1';
    nativeNav.addEventListener('click', (event) => {
      if (!event.target.closest('button')) return;
      if (commandOpen) return;
      setActiveCommand(null);
    });
  }

  applyPreferences();
}

function commandButton(view, icon, label) {
  return `<button type="button" data-command-view="${view}" aria-label="${label}" title="${label}"><span>${icon}</span><small>${label}</small></button>`;
}

function mobileButton(view, icon, label) {
  return `<button type="button" data-command-view="${view}" aria-label="${label}"><span>${icon}</span><small>${label}</small></button>`;
}

function setActiveCommand(view) {
  document.querySelectorAll('[data-command-view]').forEach((button) => {
    const active = Boolean(view && button.dataset.commandView === view);
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

async function refreshSnapshot() {
  snapshot = await repository.getSnapshot();
  return snapshot;
}

async function openCommandView(view) {
  currentCommandView = view;
  commandOpen = true;
  setActiveCommand(view);

  if (view === 'diary') {
    commandOpen = false;
    hiddenRoute('[data-diary-view]');
    setActiveCommand('diary');
    return;
  }
  if (view === 'world') {
    commandOpen = false;
    hiddenRoute('[data-view="universe"]');
    setActiveCommand('world');
    return;
  }

  await refreshSnapshot();
  stopUniverseBeforeCustomRender(renderCurrentCommandView);
}

function renderCurrentCommandView() {
  if (!commandOpen) return;
  setActiveCommand(currentCommandView);
  if (currentCommandView === 'today') renderToday();
  if (currentCommandView === 'avatar') renderAvatar();
  if (currentCommandView === 'paths') renderPaths();
  if (currentCommandView === 'chronicle') renderChronicle();
  if (currentCommandView === 'library') renderLibrary();
}

function currentSelf() {
  return (snapshot.people || []).find((person) => person.isSelf) || snapshot.people?.[0] || { id: '', name: 'Пользователь', role: '' };
}

function diaryState() {
  return loadJSON(DIARY_KEY, null);
}

function pathEvidence(path) {
  const haystack = [
    ...(snapshot.records || []).map((item) => ({ text: `${item.statement} ${JSON.stringify(item.data || {})}`, status: item.status, sourceId: item.id })),
    ...(snapshot.moments || []).map((item) => ({ text: `${item.title} ${item.description} ${(item.details?.tags || []).join(' ')}`, status: item.status, sourceId: item.id }))
  ];
  const matches = haystack.filter((item) => path.keywords.some((keyword) => item.text.toLowerCase().includes(keyword)));
  const confirmed = matches.filter((item) => ['confirmed', 'finalized'].includes(item.status)).length;
  const observed = matches.length - confirmed;
  const progress = clamp(12 + confirmed * 13 + observed * 6, 12, 96);
  return { confirmed, observed, count: matches.length, progress };
}

function activePath() {
  return PATHS.find((item) => item.id === settings.activePath) || PATHS[0];
}

function renderToday() {
  const root = document.querySelector('#viewRoot');
  const self = currentSelf();
  const diary = diaryState();
  const path = activePath();
  const evidence = pathEvidence(path);
  const latestMoments = [...(snapshot.moments || [])].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);
  const openPerspectives = (snapshot.perspectives || []).filter((item) => item.status === 'draft' || item.confidence === 0);
  const pendingDiary = diary?.state === 'review';
  const activeDiary = diary?.state === 'active';
  const mainAction = pendingDiary ? 'Проверить изменения' : activeDiary ? 'Продолжить диалог' : 'Начать живой диалог';
  const actionNote = pendingDiary ? 'Change Set ожидает вашего решения.' : activeDiary ? 'Черновик сохранён и не изменяет основную модель.' : 'Основной источник новых данных HROS.';

  root.innerHTML = `
    <section class="command-view command-today" data-command-screen="today">
      <header class="command-view-header">
        <div><span class="eyebrow">HROS COMMAND · LIVING WORLD</span><h1>Сегодня</h1><p>Персонаж, дневник, пути и отношения собраны вокруг одного следующего действия.</p></div>
        <div class="command-day-status"><b>${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date())}</b><span>${snapshot.records?.length || 0} записей в памяти</span></div>
      </header>

      <div class="command-dashboard-grid">
        <article class="command-avatar-card command-panel">
          <div class="command-panel-title"><span>ПЕРСОНАЖ</span><button type="button" data-open-command="avatar">Настроить</button></div>
          ${avatarFigure(settings.avatar, true)}
          <div class="command-avatar-name"><h2>${esc(self.name)}</h2><span>${esc(roleLabel(settings.avatar.role))}</span></div>
          <div class="command-progress-label"><span>${esc(path.title)}</span><b>${evidence.progress}%</b></div>
          <div class="command-progress"><i style="--progress:${evidence.progress}%"></i></div>
          <small>${evidence.count} связанных подтверждённых или наблюдаемых источников</small>
        </article>

        <article class="command-main-mission command-panel">
          <span class="command-kicker">ГЛАВНАЯ МИССИЯ</span>
          <h2>${esc(mainAction)}</h2>
          <p>${esc(actionNote)}</p>
          <button class="command-primary-action" type="button" id="commandMainAction"><span>✎</span>${esc(mainAction)}</button>
          <div class="command-safe-note"><b>Без скрытых изменений</b><span>Диалог → Change Set → ручная проверка → подтверждение.</span></div>
        </article>

        <article class="command-world-card command-panel">
          <div class="command-panel-title"><span>ЖИВОЙ МИР</span><button type="button" data-open-command="world">Открыть</button></div>
          <div class="command-world-stats">
            <div><b>${snapshot.people?.length || 0}</b><span>людей</span></div>
            <div><b>${snapshot.relationships?.length || 0}</b><span>связей</span></div>
            <div><b>${openPerspectives.length}</b><span>перспектив ждут проверки</span></div>
          </div>
          <div class="command-relationship-orbit" aria-label="Схематичная карта ближайших связей">
            <span class="orbit-self">Я</span>
            ${(snapshot.people || []).filter((item) => !item.isSelf).slice(0, 5).map((person, index) => `<button type="button" style="--orbit-index:${index}" data-open-native-person="${esc(person.id)}"><b>${esc(person.name.slice(0, 1))}</b><small>${esc(person.name)}</small></button>`).join('')}
          </div>
        </article>
      </div>

      <div class="command-lower-grid">
        <section class="command-panel command-quests">
          <div class="command-panel-title"><div><span>ПУТИ НА СЕГОДНЯ</span><small>Добровольные действия без серии и штрафа</small></div><button type="button" data-open-command="paths">Все пути</button></div>
          ${questRow('Зафиксировать значимый момент', 'Дневник', '+ опыт пути', 'diary')}
          ${questRow(`Продолжить путь «${path.title}»`, `${evidence.count} источников`, 'Без потери прогресса', 'paths')}
          ${questRow('Проверить образ персонажа', roleLabel(settings.avatar.role), 'Тестовая версия', 'avatar')}
        </section>

        <section class="command-panel command-recent">
          <div class="command-panel-title"><div><span>ПОСЛЕДНИЕ ГЛАВЫ</span><small>Подтверждённые моменты, а не автоматический сюжет</small></div><button type="button" data-open-command="chronicle">Хроника</button></div>
          ${latestMoments.length ? latestMoments.map(momentPreview).join('') : '<div class="command-empty">Моменты пока не добавлены.</div>'}
        </section>
      </div>
    </section>`;

  bindCommandLinks(root);
  root.querySelector('#commandMainAction').addEventListener('click', openDiaryFromMainAction);
  root.querySelectorAll('[data-open-native-person]').forEach((button) => button.addEventListener('click', () => {
    const native = document.querySelector(`.topbar nav [data-view="people"]`);
    native?.click();
    requestAnimationFrame(() => document.querySelector(`[data-open-person="${CSS.escape(button.dataset.openNativePerson)}"]`)?.click());
    commandOpen = false;
    setActiveCommand('world');
  }));
}

function questRow(title, meta, reward, target) {
  return `<button type="button" class="command-quest-row" data-open-command="${target}"><span class="command-quest-icon">◇</span><span><b>${esc(title)}</b><small>${esc(meta)}</small></span><em>${esc(reward)}</em></button>`;
}

function momentPreview(moment) {
  return `<article class="command-moment-preview"><time>${esc(moment.date || '')}</time><div><b>${esc(moment.title)}</b><p>${esc(moment.details?.meaning || moment.description || '')}</p></div><span>${Number(moment.significance || 0)}</span></article>`;
}

function openDiaryFromMainAction() {
  hiddenRoute('[data-diary-view]');
  setActiveCommand('diary');
  const diary = diaryState();
  if (!diary || diary.state === 'committed') {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const start = document.querySelector('#diaryStart') || document.querySelector('#diaryNew');
      start?.click();
    }));
  }
}

function avatarFigure(avatar, compact = false) {
  const modifiers = new Set(avatar.modifiers || []);
  return `<div class="living-avatar ${compact ? 'compact' : ''} base-${esc(avatar.base)} role-${esc(avatar.role)} palette-${esc(avatar.palette)} context-${esc(avatar.relationshipContext)}" aria-label="Тестовый игровой аватар">
    <div class="avatar-aura"></div>
    <div class="avatar-orbit orbit-one"></div><div class="avatar-orbit orbit-two"></div>
    ${modifiers.has('ai-orbit') ? '<span class="avatar-modifier modifier-ai">AI</span>' : ''}
    ${modifiers.has('sport-band') ? '<span class="avatar-modifier modifier-sport">◆</span>' : ''}
    ${modifiers.has('family-emblem') ? '<span class="avatar-modifier modifier-family">∞</span>' : ''}
    ${modifiers.has('architecture-grid') ? '<span class="avatar-modifier modifier-grid">▦</span>' : ''}
    <div class="avatar-character"><i class="avatar-head"></i><i class="avatar-body"></i><i class="avatar-arm left"></i><i class="avatar-arm right"></i><i class="avatar-leg left"></i><i class="avatar-leg right"></i></div>
    <span class="avatar-ground"></span>
  </div>`;
}

function roleLabel(role) {
  return ({ base: 'Базовая форма', creator: 'AI-создатель', athlete: 'Спортсмен', father: 'Отец', leader: 'Руководитель' })[role] || 'Базовая форма';
}

function renderAvatar() {
  const root = document.querySelector('#viewRoot');
  const history = loadJSON(APPEARANCE_HISTORY_KEY, []);
  root.innerHTML = `
    <section class="command-view command-avatar-workshop" data-command-screen="avatar">
      <header class="command-view-header"><div><span class="eyebrow">CREATE A SELF · PLAYTEST</span><h1>Аватар</h1><p>Базовая форма выбирается вручную. Роли, увлечения и контексты отношений предлагают обратимые изменения.</p></div><span class="command-release-badge">LOCAL PREVIEW</span></header>
      <div class="avatar-workshop-grid">
        <section class="command-panel avatar-preview-panel">
          <div class="command-panel-title"><span>ПРЕДПРОСМОТР</span><small>Core не изменяется</small></div>
          <div id="avatarPreview">${avatarFigure(settings.avatar)}</div>
          <div class="avatar-core-note"><b>Identity Core</b><span>Память, принципы и personId не зависят от выбранной оболочки.</span></div>
          <button type="button" class="command-primary-action" id="saveAvatarAppearance">Сохранить тестовую версию</button>
          <p id="avatarSaveFeedback" class="command-feedback" aria-live="polite"></p>
        </section>

        <section class="command-panel avatar-controls-panel">
          ${optionGroup('БАЗОВЫЙ ВИД', 'avatarBase', [['explorer','Исследователь'],['creator','Создатель'],['guardian','Хранитель']], settings.avatar.base)}
          ${optionGroup('АКТИВНАЯ РОЛЬ', 'avatarRole', [['base','Базовая'],['creator','AI-создатель'],['athlete','Спортсмен'],['leader','Руководитель'],['father','Отец']], settings.avatar.role)}
          ${optionGroup('ПАЛИТРА', 'avatarPalette', [['cyan','Циан'],['amber','Янтарь'],['violet','Фиолетовый'],['green','Зелёный']], settings.avatar.palette)}
          <fieldset class="avatar-option-group"><legend>МОДИФИКАТОРЫ</legend>
            ${modifierCheck('ai-orbit','AI-орбита','Подтверждённое направление AI и автоматизации')}
            ${modifierCheck('sport-band','Спортивный модуль','Волейбол, тренировки и физическая форма')}
            ${modifierCheck('family-emblem','Семейный символ','Отцовство, партнёрство и память')}
            ${modifierCheck('architecture-grid','Архитектурная сетка','Визуальные системы и архитектура')}
          </fieldset>
          <label class="avatar-context-select">Контекст отношений
            <select id="avatarRelationshipContext">
              ${[['neutral','Нейтральный'],['support','Поддержка'],['distance','Дистанция'],['tension','Напряжение']].map(([value,label])=>`<option value="${value}" ${settings.avatar.relationshipContext===value?'selected':''}>${label}</option>`).join('')}
            </select>
            <small>Меняет ауру и пространство, но не лицо, тело или ценность персонажа.</small>
          </label>
        </section>
      </div>
      <section class="command-panel avatar-history-panel">
        <div class="command-panel-title"><div><span>ГАЛЕРЕЯ ЭВОЛЮЦИИ</span><small>Старые формы не удаляются</small></div><b>${history.length} версий</b></div>
        <div class="avatar-history-list">${history.length ? history.slice(0, 8).map((item) => `<button type="button" data-restore-avatar="${esc(item.id)}"><span>${avatarFigure(item.avatar, true)}</span><b>${esc(roleLabel(item.avatar.role))}</b><small>${new Intl.DateTimeFormat('ru-RU', { dateStyle:'short', timeStyle:'short' }).format(new Date(item.createdAt))}</small></button>`).join('') : '<div class="command-empty">Сохраните первую тестовую версию образа.</div>'}</div>
      </section>
    </section>`;

  bindAvatarControls(root);
}

function optionGroup(legend, name, options, selected) {
  return `<fieldset class="avatar-option-group"><legend>${legend}</legend><div class="avatar-choice-grid">${options.map(([value,label])=>`<label><input type="radio" name="${name}" value="${value}" ${value===selected?'checked':''}><span>${label}</span></label>`).join('')}</div></fieldset>`;
}

function modifierCheck(value, title, note) {
  const checked = settings.avatar.modifiers.includes(value);
  return `<label class="avatar-modifier-check"><input type="checkbox" value="${value}" ${checked?'checked':''}><span><b>${title}</b><small>${note}</small></span></label>`;
}

function bindAvatarControls(root) {
  const redraw = () => {
    root.querySelector('#avatarPreview').innerHTML = avatarFigure(settings.avatar);
    saveSettings();
  };
  root.querySelectorAll('input[name="avatarBase"]').forEach((input) => input.addEventListener('change', () => { settings.avatar.base = input.value; redraw(); }));
  root.querySelectorAll('input[name="avatarRole"]').forEach((input) => input.addEventListener('change', () => { settings.avatar.role = input.value; redraw(); }));
  root.querySelectorAll('input[name="avatarPalette"]').forEach((input) => input.addEventListener('change', () => { settings.avatar.palette = input.value; redraw(); }));
  root.querySelectorAll('.avatar-modifier-check input').forEach((input) => input.addEventListener('change', () => {
    settings.avatar.modifiers = input.checked ? [...new Set([...settings.avatar.modifiers, input.value])] : settings.avatar.modifiers.filter((item) => item !== input.value);
    redraw();
  }));
  root.querySelector('#avatarRelationshipContext').addEventListener('change', (event) => { settings.avatar.relationshipContext = event.target.value; redraw(); });
  root.querySelector('#saveAvatarAppearance').addEventListener('click', () => {
    const history = loadJSON(APPEARANCE_HISTORY_KEY, []);
    const entry = { id: `appearance-${crypto.randomUUID()}`, createdAt: iso(), avatar: clone(settings.avatar), source: 'manual_playtest_confirmation' };
    history.unshift(entry);
    localStorage.setItem(APPEARANCE_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    const feedback = root.querySelector('#avatarSaveFeedback');
    feedback.textContent = 'Тестовая версия сохранена локально. Данные HROS и Identity Core не изменены.';
    renderAvatar();
  });
  root.querySelectorAll('[data-restore-avatar]').forEach((button) => button.addEventListener('click', () => {
    const history = loadJSON(APPEARANCE_HISTORY_KEY, []);
    const item = history.find((entry) => entry.id === button.dataset.restoreAvatar);
    if (!item) return;
    settings.avatar = clone(item.avatar);
    saveSettings();
    renderAvatar();
  }));
}

function renderPaths() {
  const root = document.querySelector('#viewRoot');
  const cards = PATHS.map((path) => ({ ...path, evidence: pathEvidence(path) }));
  root.innerHTML = `
    <section class="command-view command-paths-view" data-command-screen="paths">
      <header class="command-view-header"><div><span class="eyebrow">ASPIRATIONS × TECH TREE</span><h1>Пути развития</h1><p>Можно переключить активный путь без потери накопленной истории. Прогресс относится к действиям и ролям, а не к ценности человека.</p></div><span class="command-release-badge">1 ACTIVE PATH</span></header>
      <div class="paths-layout">
        <section class="paths-map command-panel">
          <div class="path-core"><b>CORE</b><span>Михаил</span></div>
          <div class="path-branches">${cards.map(pathCard).join('')}</div>
        </section>
        <aside class="command-panel path-rules">
          <span class="command-kicker">ПРАВИЛА ПРОГРЕССА</span>
          <h2>Осмысленная геймификация</h2>
          <ul><li>Опыт получает роль, навык, проект или путь.</li><li>Переключение пути не сбрасывает историю.</li><li>Каждый уровень показывает источники.</li><li>Нет штрафа за паузу и обязательной серии.</li><li>Нет общего уровня человека или отношений.</li></ul>
          <div class="command-safe-note"><b>Текущая формула playtest</b><span>Только число связанных confirmed/observed записей. Это интерфейсный индикатор, не психологическая оценка.</span></div>
        </aside>
      </div>
    </section>`;
  root.querySelectorAll('[data-select-path]').forEach((button) => button.addEventListener('click', () => {
    settings.activePath = button.dataset.selectPath;
    saveSettings();
    renderPaths();
  }));
}

function pathCard(path) {
  const active = settings.activePath === path.id;
  return `<article class="path-card ${active ? 'active' : ''}"><div class="path-icon">${path.icon}</div><div><span>${active ? 'АКТИВНЫЙ ПУТЬ' : 'ДОСТУПНЫЙ ПУТЬ'}</span><h2>${esc(path.title)}</h2><p>${esc(path.description)}</p><div class="command-progress-label"><span>${path.evidence.count} источников</span><b>${path.evidence.progress}%</b></div><div class="command-progress"><i style="--progress:${path.evidence.progress}%"></i></div><small>${path.evidence.confirmed} подтверждено · ${path.evidence.observed} наблюдается</small></div><button type="button" data-select-path="${path.id}" ${active ? 'disabled' : ''}>${active ? 'Выбран' : 'Сделать активным'}</button></article>`;
}

function renderChronicle() {
  const root = document.querySelector('#viewRoot');
  const moments = [...(snapshot.moments || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const appearances = loadJSON(APPEARANCE_HISTORY_KEY, []);
  root.innerHTML = `
    <section class="command-view command-chronicle" data-command-screen="chronicle">
      <header class="command-view-header"><div><span class="eyebrow">LIFE STORY · CONFIRMED SOURCES</span><h1>Хроника</h1><p>История собирается из подтверждённых моментов и сохранённых форм аватара. Неопределённость остаётся видимой.</p></div><button class="secondary" type="button" data-open-native="book">Открыть книгу отношений</button></header>
      <div class="chronicle-grid">
        <section class="command-panel chronicle-timeline"><div class="command-panel-title"><span>ГЛАВЫ ЖИЗНИ</span><b>${moments.length}</b></div>${moments.length ? moments.map((moment, index) => chronicleMoment(moment, index)).join('') : '<div class="command-empty">Подтверждённых моментов пока нет.</div>'}</section>
        <aside class="command-panel chronicle-evolution"><div class="command-panel-title"><span>ЭВОЛЮЦИЯ АВАТАРА</span><b>${appearances.length}</b></div>${appearances.length ? appearances.slice(0, 5).map((item) => `<article>${avatarFigure(item.avatar, true)}<div><b>${esc(roleLabel(item.avatar.role))}</b><small>${new Intl.DateTimeFormat('ru-RU', { dateStyle:'medium' }).format(new Date(item.createdAt))}</small></div></article>`).join('') : '<div class="command-empty">Формы появятся после ручного сохранения в редакторе аватара.</div>'}</aside>
      </div>
    </section>`;
  root.querySelector('[data-open-native="book"]').addEventListener('click', () => {
    hiddenRoute('[data-v1-view="book"]');
    setActiveCommand('chronicle');
  });
}

function chronicleMoment(moment, index) {
  const people = (moment.participantIds || []).map((id) => snapshot.people.find((person) => person.id === id)?.name).filter(Boolean);
  return `<article class="chronicle-entry"><span class="chronicle-index">${String(index + 1).padStart(2, '0')}</span><time>${esc(moment.date)}</time><div><h2>${esc(moment.title)}</h2><p>${esc(moment.details?.meaning || moment.description || '')}</p><small>${esc(people.join(' · '))} · ${esc(moment.status)} · источник: ${esc(moment.source?.label || 'не указан')}</small></div><b>${Number(moment.significance || 0)}</b></article>`;
}

function renderLibrary() {
  const root = document.querySelector('#viewRoot');
  const sections = [
    ['people','Люди','Карточки людей, источники и версии.','data-view'],
    ['moments','Моменты','События, участники и влияние.','data-view'],
    ['knowledge','Знания','Факты, перспективы, гипотезы и память.','data-v1-view'],
    ['couple','Пара','Личные и совместное пространства.','data-v1-view'],
    ['book','Книга','Главы и проверяемые принципы.','data-v1-view'],
    ['diagnostics','Диагностика','Хранилище, версии и целостность.','data-view']
  ];
  root.innerHTML = `
    <section class="command-view command-library" data-command-screen="library">
      <header class="command-view-header"><div><span class="eyebrow">BUILD MODE · SYSTEM</span><h1>Система и редакторы</h1><p>Точные данные остаются доступны в 2D-редакторах. Игровой слой не скрывает источники, статусы и версии.</p></div><span class="command-release-badge">ADVANCED</span></header>
      <div class="library-grid">${sections.map(([id,title,note,attribute]) => `<button type="button" class="library-card" data-native-selector="[${attribute}=&quot;${id}&quot;]"><span>${libraryIcon(id)}</span><div><h2>${title}</h2><p>${note}</p></div><b>→</b></button>`).join('')}</div>
      <section class="command-panel command-playtest-notes"><div><span class="command-kicker">PLAYTEST</span><h2>Что проверить</h2></div><ol><li>Понятно ли главное действие на экране «Сегодня».</li><li>Не перегружена ли навигация.</li><li>Работает ли переключение трёх визуальных тем.</li><li>Понятна ли граница между персонажем, ролью и отношениями.</li><li>Не воспринимается ли прогресс как оценка человека.</li><li>Удобно ли возвращаться к точным редакторам и источникам.</li></ol></section>
    </section>`;
  root.querySelectorAll('[data-native-selector]').forEach((button) => button.addEventListener('click', () => {
    commandOpen = false;
    hiddenRoute(button.dataset.nativeSelector);
    setActiveCommand('library');
  }));
}

function libraryIcon(id) {
  return ({ people:'●', moments:'◷', knowledge:'◇', couple:'∞', book:'▤', diagnostics:'⌘' })[id] || '•';
}

function bindCommandLinks(root) {
  root.querySelectorAll('[data-open-command]').forEach((button) => button.addEventListener('click', () => openCommandView(button.dataset.openCommand)));
}

async function boot() {
  await waitForReady();
  repository = await createRepository();
  snapshot = await repository.getSnapshot();
  addCommandShell();
  const observer = new MutationObserver(() => addCommandShell());
  observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  window.__HROS_COMMAND_UI__ = {
    ready: true,
    version: 'playtest-1',
    open: openCommandView,
    getSettings: () => clone(settings),
    settingsKey: SETTINGS_KEY,
    appearanceHistoryKey: APPEARANCE_HISTORY_KEY
  };
  await openCommandView('today');
}

boot().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('beforeend', `<div class="alignment-fatal">HROS COMMAND: ${esc(error.message)}</div>`);
});
