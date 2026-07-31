import './command-full-v2.css';
import { createRepository } from './repository.js';

const FULL_SETTINGS_KEY = 'hros.command.full.v2';
const INBOX_KEY = 'hros.command.inbox.v2';
const FEEDBACK_KEY = 'hros.command.feedback.v2';
const COMMAND_SETTINGS_KEY = 'hros.command.ui.v1';
const DOMAIN_KEY = 'hros.snapshot.v1';

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));
const clone = (value) => structuredClone(value);
const iso = () => new Date().toISOString();

let repository;
let snapshot;
let selectedWorldPersonId = null;
let enhancementTimer = null;

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fullSettings() {
  return {
    tourSeen: false,
    lastWorldArea: 'all',
    lastOpenedAt: null,
    ...loadJSON(FULL_SETTINGS_KEY, {})
  };
}

function updateFullSettings(patch) {
  saveJSON(FULL_SETTINGS_KEY, { ...fullSettings(), ...patch, lastOpenedAt: iso() });
}

function waitForReady(timeout = 20000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.__HROS_COMMAND_UI__?.ready && document.querySelector('#viewRoot')) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error('HROS COMMAND не готов к расширению playtest'));
      }
    }, 80);
  });
}

async function refreshSnapshot() {
  snapshot = await repository.getSnapshot();
  return snapshot;
}

function currentSelf() {
  return (snapshot.people || []).find((person) => person.isSelf) || snapshot.people?.[0] || { id: '', name: 'Пользователь' };
}

function inboxItems() {
  return loadJSON(INBOX_KEY, []);
}

function saveInbox(items) {
  saveJSON(INBOX_KEY, items);
  updateInboxBadges();
}

function feedbackData() {
  return loadJSON(FEEDBACK_KEY, {});
}

function setCommandActive(view) {
  document.querySelectorAll('[data-command-view]').forEach((button) => {
    const active = button.dataset.commandView === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

function routeToSafeNativeView(callback) {
  const people = document.querySelector('.topbar nav [data-view="people"]');
  people?.click();
  requestAnimationFrame(() => requestAnimationFrame(callback));
}

function installFullControls() {
  const context = document.querySelector('.command-context');
  if (!context) return;

  const badge = context.querySelector('.command-release-badge');
  if (badge) badge.textContent = 'FULL PLAYTEST 2';

  if (!context.querySelector('[data-full-action="capture"]')) {
    context.insertAdjacentHTML('beforeend', `
      <div class="full-command-actions" aria-label="Расширенный playtest">
        <button type="button" data-full-action="capture">+ Быстрая запись</button>
        <button type="button" data-full-action="inbox">Входящие <b data-full-inbox-count>0</b></button>
        <button type="button" data-full-action="tour">Тур</button>
        <button type="button" data-full-action="feedback">Отзыв</button>
      </div>`);
  }
  updateInboxBadges();
}

function installDialogs() {
  if (document.querySelector('#fullCaptureDialog')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="fullCaptureDialog" class="full-dialog">
      <form id="fullCaptureForm">
        <header><div><span class="eyebrow">QUICK CAPTURE</span><h2>Быстрая запись</h2><p>Запись попадёт во входящие, а не в основную модель HROS.</p></div><button type="button" data-full-close>×</button></header>
        <label>Тип записи<select name="kind"><option value="thought">Мысль</option><option value="moment">Момент</option><option value="action">Действие</option><option value="question">Вопрос</option><option value="person">Человек</option></select></label>
        <label>Связанный человек<select name="personId" id="fullCapturePerson"></select></label>
        <label>Текст<textarea name="text" rows="6" required placeholder="Что важно не потерять?"></textarea></label>
        <footer><button type="button" class="secondary" data-full-close>Отмена</button><button type="submit" class="primary">Сохранить во входящие</button></footer>
      </form>
    </dialog>

    <dialog id="fullInspectorDialog" class="full-dialog full-inspector-dialog">
      <section><header><div><span class="eyebrow">SOURCE INSPECTOR</span><h2>Основание записи</h2></div><button type="button" data-full-close>×</button></header><div id="fullInspectorBody"></div></section>
    </dialog>

    <dialog id="fullTourDialog" class="full-dialog full-tour-dialog">
      <section><header><div><span class="eyebrow">FULL PLAYTEST 2</span><h2>Как тестировать HROS</h2></div><button type="button" data-full-close>×</button></header>
        <div class="full-tour-grid">
          <article><b>01</b><h3>Сегодня</h3><p>Найдите главное действие, сделайте быструю запись и проверьте состояние отношений.</p></article>
          <article><b>02</b><h3>Дневник</h3><p>Пройдите диалог до Change Set. До подтверждения основная модель не должна изменяться.</p></article>
          <article><b>03</b><h3>Живой мир</h3><p>Выберите область жизни и человека. Проверьте моменты, перспективы и источники.</p></article>
          <article><b>04</b><h3>Аватар</h3><p>Примерьте предложенный модификатор. Он меняет оболочку, а не Identity Core.</p></article>
          <article><b>05</b><h3>Пути</h3><p>Сравните основания прогресса. Переключение не должно уничтожать историю.</p></article>
          <article><b>06</b><h3>Отзыв</h3><p>Зафиксируйте понятность, перегрузку, доверие и желаемые изменения.</p></article>
        </div>
        <footer><button type="button" class="primary" data-full-tour-complete>Начать тестирование</button></footer>
      </section>
    </dialog>

    <dialog id="fullFeedbackDialog" class="full-dialog full-feedback-dialog">
      <form id="fullFeedbackForm"><header><div><span class="eyebrow">PLAYTEST FEEDBACK</span><h2>Отзыв о тестовой версии</h2></div><button type="button" data-full-close>×</button></header>
        <div class="full-feedback-grid">
          ${ratingField('clarity', 'Понятность навигации')}
          ${ratingField('mainAction', 'Понятность главного действия')}
          ${ratingField('trust', 'Доверие к данным и подтверждениям')}
          ${ratingField('gameFeel', 'Ощущение живого игрового мира')}
        </div>
        <label>Что мешало?<textarea name="friction" rows="3"></textarea></label>
        <label>Чего не хватило?<textarea name="missing" rows="3"></textarea></label>
        <label>Что оставить обязательно?<textarea name="keep" rows="3"></textarea></label>
        <footer><button type="button" class="secondary" data-full-export-feedback>Экспорт JSON</button><button type="submit" class="primary">Сохранить отзыв</button></footer>
      </form>
    </dialog>`);

  document.querySelectorAll('[data-full-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog')?.close()));
  document.querySelector('#fullCaptureForm').addEventListener('submit', submitCapture);
  document.querySelector('#fullFeedbackForm').addEventListener('submit', submitFeedback);
  document.querySelector('[data-full-export-feedback]').addEventListener('click', exportFeedback);
  document.querySelector('[data-full-tour-complete]').addEventListener('click', () => {
    updateFullSettings({ tourSeen: true });
    document.querySelector('#fullTourDialog').close();
  });
}

function ratingField(name, label) {
  return `<fieldset><legend>${label}</legend><div>${[1,2,3,4,5].map((value) => `<label><input type="radio" name="${name}" value="${value}"><span>${value}</span></label>`).join('')}</div></fieldset>`;
}

function openCaptureDialog() {
  const select = document.querySelector('#fullCapturePerson');
  select.innerHTML = `<option value="">Без привязки</option>${(snapshot.people || []).map((person) => `<option value="${esc(person.id)}">${esc(person.name)}</option>`).join('')}`;
  document.querySelector('#fullCaptureDialog').showModal();
  document.querySelector('#fullCaptureForm textarea').focus();
}

function submitCapture(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const items = inboxItems();
  items.unshift({
    id: `inbox-${crypto.randomUUID()}`,
    kind: data.kind,
    personId: data.personId || null,
    text: String(data.text || '').trim(),
    status: 'draft',
    createdAt: iso(),
    source: 'quick_capture'
  });
  saveInbox(items);
  form.reset();
  form.closest('dialog').close();
  showToast('Запись сохранена во входящих. Основная модель HROS не изменена.');
  enhanceCurrentScreen();
}

function submitFeedback(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  saveJSON(FEEDBACK_KEY, { ...feedbackData(), ...values, updatedAt: iso(), build: 'full-playtest-2' });
  event.currentTarget.closest('dialog').close();
  showToast('Отзыв сохранён локально.');
}

function hydrateFeedbackForm() {
  const saved = feedbackData();
  const form = document.querySelector('#fullFeedbackForm');
  for (const [key, value] of Object.entries(saved)) {
    const control = form.elements[key];
    if (!control) continue;
    if (control instanceof RadioNodeList) control.value = value;
    else control.value = value;
  }
}

function exportFeedback() {
  downloadJSON('hros-full-playtest-feedback.json', {
    exportedAt: iso(),
    build: 'full-playtest-2',
    feedback: feedbackData(),
    uiSettings: loadJSON(COMMAND_SETTINGS_KEY, {}),
    inboxCount: inboxItems().length
  });
}

function updateInboxBadges() {
  const count = inboxItems().filter((item) => item.status === 'draft').length;
  document.querySelectorAll('[data-full-inbox-count]').forEach((node) => { node.textContent = String(count); });
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}

function downloadJSON(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function enhanceCurrentScreen() {
  const root = document.querySelector('#viewRoot');
  if (!root || !snapshot) return;
  if (root.querySelector('[data-command-screen="today"]')) enhanceToday(root);
  if (root.querySelector('[data-command-screen="avatar"]')) enhanceAvatar(root);
  if (root.querySelector('[data-command-screen="paths"]')) enhancePaths(root);
  if (root.querySelector('[data-command-screen="chronicle"]')) enhanceChronicle(root);
  if (root.querySelector('[data-command-screen="library"]')) enhanceLibrary(root);
}

function scheduleEnhancement() {
  clearTimeout(enhancementTimer);
  enhancementTimer = setTimeout(async () => {
    await refreshSnapshot();
    installFullControls();
    enhanceCurrentScreen();
  }, 80);
}

function enhanceToday(root) {
  const screen = root.querySelector('[data-command-screen="today"]');
  if (!screen || screen.querySelector('.full-today-strip')) return;
  const counts = dataHealth();
  screen.querySelector('.command-view-header')?.insertAdjacentHTML('afterend', `
    <section class="full-today-strip command-panel">
      <button type="button" data-full-action="capture"><span>＋</span><div><b>Быстрая запись</b><small>Сначала во входящие</small></div></button>
      <button type="button" data-full-action="inbox"><span>⌁</span><div><b>Входящие</b><small><strong data-full-inbox-count>${inboxItems().length}</strong> черновиков</small></div></button>
      <div><span>✓</span><div><b>${counts.confirmed} подтверждено</b><small>${counts.hypotheses} гипотез · ${counts.drafts} черновиков</small></div></div>
      <button type="button" data-full-action="tour"><span>?</span><div><b>Сценарий теста</b><small>6 шагов</small></div></button>
    </section>`);

  screen.insertAdjacentHTML('beforeend', relationshipPulseMarkup());
  updateInboxBadges();
}

function dataHealth() {
  const records = snapshot.records || [];
  return {
    confirmed: records.filter((record) => ['confirmed', 'finalized'].includes(record.status)).length,
    hypotheses: records.filter((record) => record.kind === 'hypothesis').length,
    drafts: records.filter((record) => ['draft', 'observed'].includes(record.status)).length
  };
}

function relationshipPulseMarkup() {
  const self = currentSelf();
  const relationships = (snapshot.relationships || []).filter((relationship) => relationship.sourceId === self.id || relationship.targetId === self.id).slice(0, 5);
  return `<section class="full-relationship-section command-panel">
    <div class="command-panel-title"><div><span>ОТНОШЕНИЯ СЕЙЧАС</span><small>Последние подтверждённые основания вместо общего рейтинга</small></div><button type="button" data-full-open="world">Открыть мир</button></div>
    <div class="full-relationship-grid">${relationships.map((relationship) => relationshipPulseCard(relationship)).join('') || '<div class="command-empty">Связи пока не зафиксированы.</div>'}</div>
  </section>`;
}

function relationshipPulseCard(relationship) {
  const self = currentSelf();
  const otherId = relationship.sourceId === self.id ? relationship.targetId : relationship.sourceId;
  const person = (snapshot.people || []).find((item) => item.id === otherId);
  const moments = (snapshot.moments || []).filter((moment) => (moment.participantIds || []).includes(otherId)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latest = moments[0];
  return `<button type="button" class="full-relationship-card" data-full-person="${esc(otherId)}">
    <span class="full-person-avatar">${esc((person?.name || '?').slice(0, 1))}</span>
    <div><h3>${esc(person?.name || 'Человек')}</h3><p>${esc(relationship.meaning || relationship.label || '')}</p><small>${latest ? `${esc(latest.date)} · ${esc(latest.title)}` : 'Нет подтверждённых моментов'}</small></div><b>→</b>
  </button>`;
}

function avatarSuggestions() {
  const corpus = (snapshot.records || []).map((record) => ({ id: record.id, text: `${record.statement} ${JSON.stringify(record.data || {})}`.toLowerCase(), record }));
  const suggestions = [
    { id: 'ai-orbit', title: 'AI-орбита', keywords: ['ai', 'автомат', 'агент', 'hros'] },
    { id: 'sport-band', title: 'Спортивный модуль', keywords: ['спорт', 'волейбол', 'трениров', 'физическ'] },
    { id: 'family-emblem', title: 'Семейный символ', keywords: ['семь', 'дочь', 'снеж', 'отцов', 'партнёр'] },
    { id: 'architecture-grid', title: 'Архитектурная сетка', keywords: ['архитект', 'визуал', 'дизайн', 'фасад'] }
  ];
  return suggestions.map((suggestion) => ({
    ...suggestion,
    sources: corpus.filter((item) => suggestion.keywords.some((keyword) => item.text.includes(keyword))).slice(0, 4)
  })).filter((item) => item.sources.length);
}

function enhanceAvatar(root) {
  const screen = root.querySelector('[data-command-screen="avatar"]');
  if (!screen || screen.querySelector('.full-avatar-suggestions')) return;
  const commandSettings = loadJSON(COMMAND_SETTINGS_KEY, {});
  const active = new Set(commandSettings.avatar?.modifiers || []);
  const suggestions = avatarSuggestions();
  screen.insertAdjacentHTML('beforeend', `
    <section class="command-panel full-avatar-suggestions">
      <div class="command-panel-title"><div><span>ПРЕДЛОЖЕНИЯ ИЗ ПАМЯТИ</span><small>Только примерка. Ничего не применяется скрытно.</small></div><b>${suggestions.length}</b></div>
      <div class="full-suggestion-grid">${suggestions.map((item) => `<article class="${active.has(item.id) ? 'active' : ''}"><div><b>${esc(item.title)}</b><p>${item.sources.length} связанных источника</p></div><div class="full-source-chips">${item.sources.map((source) => `<button type="button" data-full-inspect="${esc(source.id)}">${esc(source.record.kind)}</button>`).join('')}</div><button type="button" data-full-apply-mod="${esc(item.id)}" ${active.has(item.id) ? 'disabled' : ''}>${active.has(item.id) ? 'Уже включён' : 'Примерить'}</button></article>`).join('')}</div>
    </section>`);
}

function enhancePaths(root) {
  const screen = root.querySelector('[data-command-screen="paths"]');
  if (!screen || screen.querySelector('.full-path-evidence')) return;
  const records = (snapshot.records || []).filter((record) => ['confirmed', 'finalized', 'observed'].includes(record.status)).slice(0, 12);
  screen.insertAdjacentHTML('beforeend', `
    <section class="command-panel full-path-evidence">
      <div class="command-panel-title"><div><span>ОСНОВАНИЯ ПРОГРЕССА</span><small>Каждый индикатор должен быть проверяемым</small></div><b>${records.length}</b></div>
      <div class="full-evidence-list">${records.map((record) => `<button type="button" data-full-inspect="${esc(record.id)}"><span>${esc(record.kind)}</span><p>${esc(record.statement)}</p><small>${esc(record.status)} · ${Math.round((record.confidence ?? 1) * 100)}%</small></button>`).join('')}</div>
    </section>`);
}

function enhanceChronicle(root) {
  const screen = root.querySelector('[data-command-screen="chronicle"]');
  if (!screen || screen.querySelector('.full-chronicle-tools')) return;
  const people = snapshot.people || [];
  screen.querySelector('.command-view-header')?.insertAdjacentHTML('afterend', `
    <section class="full-chronicle-tools command-panel">
      <label>Поиск<input type="search" id="fullChronicleSearch" placeholder="Момент, человек, источник"></label>
      <label>Участник<select id="fullChroniclePerson"><option value="">Все</option>${people.map((person) => `<option value="${esc(person.name.toLowerCase())}">${esc(person.name)}</option>`).join('')}</select></label>
      <label>Статус<select id="fullChronicleStatus"><option value="">Все</option><option value="confirmed">confirmed</option><option value="finalized">finalized</option><option value="observed">observed</option><option value="draft">draft</option></select></label>
      <button type="button" data-full-export-chronicle>Экспорт хроники</button>
    </section>`);
}

function enhanceLibrary(root) {
  const screen = root.querySelector('[data-command-screen="library"]');
  if (!screen || screen.querySelector('.full-data-operations')) return;
  const counts = dataHealth();
  screen.insertAdjacentHTML('beforeend', `
    <section class="command-panel full-data-operations">
      <div class="command-panel-title"><div><span>ДАННЫЕ И PLAYTEST</span><small>Резервная копия, входящие и отзыв</small></div><span class="command-release-badge">LOCAL SAFE TOOLS</span></div>
      <div class="full-operation-grid">
        <button type="button" data-full-export-snapshot><b>Экспорт HROS</b><span>${snapshot.records?.length || 0} записей · schema ${esc(snapshot.meta?.schemaVersion)}</span></button>
        <button type="button" data-full-action="inbox"><b>Разобрать входящие</b><span>${inboxItems().length} локальных черновиков</span></button>
        <button type="button" data-full-action="feedback"><b>Отзыв о сборке</b><span>${feedbackData().updatedAt ? 'Сохранён' : 'Не заполнен'}</span></button>
        <button type="button" data-full-reset-ui><b>Сбросить только playtest</b><span>Не удаляет ${counts.confirmed} подтверждённых записей HROS</span></button>
      </div>
    </section>`);
}

async function showWorld(personId = null) {
  await refreshSnapshot();
  selectedWorldPersonId = personId || selectedWorldPersonId || currentSelf().id;
  setCommandActive('world');
  routeToSafeNativeView(() => renderWorld());
}

function areaForPerson(person) {
  if (person.isSelf) return 'self';
  if (person.type === 'family' || person.type === 'friend') return 'family';
  if (person.type === 'work') return 'work';
  if (person.type === 'project') return 'creation';
  if (person.type === 'legacy') return 'legacy';
  return 'personal';
}

function renderWorld() {
  const root = document.querySelector('#viewRoot');
  if (!root) return;
  const areas = [
    ['family', 'Семья и близкие', '∞'], ['work', 'Работа', '▦'], ['creation', 'Проекты и творчество', '✦'],
    ['legacy', 'Память и наследие', '◫'], ['personal', 'Личное пространство', '◇'], ['health', 'Здоровье', '◆']
  ];
  const filter = fullSettings().lastWorldArea || 'all';
  const people = (snapshot.people || []).filter((person) => filter === 'all' || areaForPerson(person) === filter || person.isSelf);
  root.innerHTML = `
    <section class="command-view full-world-view" data-command-screen="world-v2">
      <header class="command-view-header"><div><span class="eyebrow">LIVING WORLD · FULL PLAYTEST</span><h1>Мир людей и областей жизни</h1><p>Пространственная навигация показывает контекст. Точные выводы остаются связанными с источниками.</p></div><button type="button" class="secondary" data-full-open-native-world>Открыть Web3D</button></header>
      <div class="full-world-toolbar command-panel">
        <label>Область<select id="fullWorldArea"><option value="all">Весь мир</option>${areas.map(([id, title]) => `<option value="${id}" ${filter === id ? 'selected' : ''}>${title}</option>`).join('')}</select></label>
        <label>Найти человека<input id="fullWorldSearch" type="search" placeholder="Имя или роль"></label>
        <div><b>${snapshot.people?.length || 0}</b><span>людей</span></div><div><b>${snapshot.relationships?.length || 0}</b><span>связей</span></div><div><b>${snapshot.moments?.length || 0}</b><span>моментов</span></div>
      </div>
      <div class="full-world-layout">
        <section class="full-world-map command-panel">
          <div class="full-area-grid">${areas.map(([id, title, icon]) => worldArea(id, title, icon, people)).join('')}</div>
        </section>
        <aside id="fullWorldDetail" class="full-world-detail command-panel">${worldPersonDetail(selectedWorldPersonId)}</aside>
      </div>
    </section>`;

  root.querySelector('#fullWorldArea').addEventListener('change', (event) => {
    updateFullSettings({ lastWorldArea: event.target.value });
    renderWorld();
  });
  root.querySelector('#fullWorldSearch').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    root.querySelectorAll('.full-world-person').forEach((button) => {
      button.hidden = Boolean(query && !button.textContent.toLowerCase().includes(query));
    });
  });
}

function worldArea(id, title, icon, visiblePeople) {
  const people = visiblePeople.filter((person) => areaForPerson(person) === id || (id === 'personal' && person.isSelf));
  return `<article class="full-world-area area-${id}"><header><span>${icon}</span><div><b>${title}</b><small>${people.length} узлов</small></div></header><div>${people.map((person) => `<button type="button" class="full-world-person ${person.id === selectedWorldPersonId ? 'active' : ''}" data-full-person="${esc(person.id)}"><span>${esc(person.name.slice(0, 1))}</span><div><b>${esc(person.name)}</b><small>${esc(person.role || person.type)}</small></div></button>`).join('') || '<p>Область пока не заполнена.</p>'}</div></article>`;
}

function worldPersonDetail(personId) {
  const person = (snapshot.people || []).find((item) => item.id === personId) || currentSelf();
  const self = currentSelf();
  const relationship = (snapshot.relationships || []).find((item) => (item.sourceId === self.id && item.targetId === person.id) || (item.targetId === self.id && item.sourceId === person.id));
  const moments = (snapshot.moments || []).filter((item) => (item.participantIds || []).includes(person.id)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);
  const perspectives = (snapshot.perspectives || []).filter((item) => (item.subjectIds || []).includes(person.id)).slice(0, 4);
  const actions = (snapshot.actions || []).filter((item) => (item.subjectIds || []).includes(person.id)).slice(0, 3);
  return `<div class="full-world-person-head"><span>${esc(person.name.slice(0, 1))}</span><div><small>${esc(person.type)}</small><h2>${esc(person.name)}</h2><p>${esc(person.role || '')}</p></div></div>
    <section><span class="eyebrow">СВЯЗЬ</span><p>${esc(relationship?.meaning || person.summary || 'Описание пока не зафиксировано.')}</p>${relationship ? `<button type="button" data-full-inspect="${esc(relationship.id)}">Источник и версия</button>` : ''}</section>
    <section><span class="eyebrow">ПОСЛЕДНИЕ МОМЕНТЫ</span>${moments.map((moment) => `<button type="button" class="full-detail-row" data-full-inspect="${esc(moment.id)}"><time>${esc(moment.date)}</time><div><b>${esc(moment.title)}</b><small>${esc(moment.status)}</small></div></button>`).join('') || '<p class="command-empty">Моментов нет.</p>'}</section>
    <section><span class="eyebrow">ПЕРСПЕКТИВЫ</span>${perspectives.map((record) => `<button type="button" class="full-detail-row" data-full-inspect="${esc(record.id)}"><div><b>${esc(record.statement)}</b><small>${esc(record.status)} · ${Math.round((record.confidence ?? 1) * 100)}%</small></div></button>`).join('') || '<p class="command-empty">Перспективы не зафиксированы.</p>'}</section>
    ${actions.length ? `<section><span class="eyebrow">ДЕЙСТВИЯ</span>${actions.map((record) => `<button type="button" class="full-detail-row" data-full-inspect="${esc(record.id)}"><div><b>${esc(record.statement)}</b><small>${esc(record.status)}</small></div></button>`).join('')}</section>` : ''}`;
}

function showInbox() {
  const root = document.querySelector('#viewRoot');
  setCommandActive(null);
  routeToSafeNativeView(() => {
    const items = inboxItems();
    root.innerHTML = `
      <section class="command-view full-inbox-view" data-command-screen="inbox-v2">
        <header class="command-view-header"><div><span class="eyebrow">CAPTURE INBOX · NO DOMAIN MUTATION</span><h1>Входящие</h1><p>Черновики можно исправить, передать в ИИ-дневник или удалить. Они не становятся фактами автоматически.</p></div><button type="button" class="primary" data-full-action="capture">+ Запись</button></header>
        <div class="full-inbox-summary command-panel"><div><b>${items.length}</b><span>всего</span></div><div><b>${items.filter((item) => item.kind === 'moment').length}</b><span>моментов</span></div><div><b>${items.filter((item) => item.kind === 'question').length}</b><span>вопросов</span></div><div><b>0</b><span>изменений HROS</span></div></div>
        <div class="full-inbox-list">${items.length ? items.map(inboxCard).join('') : '<div class="command-panel command-empty">Входящие пусты. Используйте «Быстрая запись».</div>'}</div>
      </section>`;
  });
}

function inboxCard(item) {
  const person = (snapshot.people || []).find((value) => value.id === item.personId);
  return `<article class="command-panel full-inbox-card" data-inbox-id="${esc(item.id)}"><header><select data-inbox-kind><option value="thought" ${item.kind === 'thought' ? 'selected' : ''}>Мысль</option><option value="moment" ${item.kind === 'moment' ? 'selected' : ''}>Момент</option><option value="action" ${item.kind === 'action' ? 'selected' : ''}>Действие</option><option value="question" ${item.kind === 'question' ? 'selected' : ''}>Вопрос</option><option value="person" ${item.kind === 'person' ? 'selected' : ''}>Человек</option></select><time>${new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</time></header><textarea data-inbox-text rows="4">${esc(item.text)}</textarea><footer><span>${person ? `Связано: ${esc(person.name)}` : 'Без привязки'}</span><button type="button" class="secondary" data-inbox-delete>Удалить</button><button type="button" class="primary" data-inbox-diary>Передать в дневник</button></footer></article>`;
}

async function transferInboxToDiary(id) {
  const item = inboxItems().find((value) => value.id === id);
  if (!item) return;
  await window.__HROS_COMMAND_UI__.open('diary');
  await waitForElement('#diaryStart, #diaryNew, #diaryMessage');
  const starter = document.querySelector('#diaryStart') || document.querySelector('#diaryNew');
  if (starter && !document.querySelector('#diaryMessage')) starter.click();
  await waitForElement('#diaryMessage');
  const topic = document.querySelector('#diaryTopic');
  const message = document.querySelector('#diaryMessage');
  setNativeValue(topic, `Входящая запись: ${kindLabel(item.kind)}`);
  setNativeValue(message, item.text);
  message.focus();
  showToast('Черновик перенесён в форму дневника. Отправка и подтверждение остаются ручными.');
}

function kindLabel(kind) {
  return ({ thought: 'мысль', moment: 'момент', action: 'действие', question: 'вопрос', person: 'человек' })[kind] || kind;
}

function waitForElement(selector, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) { clearInterval(timer); resolve(element); }
      else if (Date.now() - started > timeout) { clearInterval(timer); reject(new Error(`Не найден элемент ${selector}`)); }
    }, 60);
  });
}

function setNativeValue(element, value) {
  if (!element) return;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function openInspector(id) {
  const entity = findEntity(id);
  const body = document.querySelector('#fullInspectorBody');
  if (!entity) {
    body.innerHTML = '<p>Запись не найдена.</p>';
  } else {
    body.innerHTML = inspectorMarkup(entity);
  }
  document.querySelector('#fullInspectorDialog').showModal();
}

function findEntity(id) {
  for (const [collection, type] of [['records', 'record'], ['moments', 'moment'], ['relationships', 'relationship'], ['people', 'person']]) {
    const value = (snapshot[collection] || []).find((item) => item.id === id);
    if (value) return { ...value, entityType: type };
  }
  return null;
}

function inspectorMarkup(entity) {
  const statement = entity.statement || entity.details?.meaning || entity.description || entity.meaning || entity.summary || '';
  const confidence = entity.confidence == null ? 'не указан' : `${Math.round(entity.confidence * 100)}%`;
  const links = [...(entity.evidenceIds || []), ...(entity.supportsIds || []), ...(entity.momentIds || []), ...(entity.subjectIds || [])];
  return `<div class="full-inspector-statement"><span>${esc(entity.entityType)} · ${esc(entity.kind || entity.type || '')}</span><p>${esc(statement)}</p></div>
    <dl><dt>ID</dt><dd>${esc(entity.id)}</dd><dt>Статус</dt><dd>${esc(entity.status || 'не указан')}</dd><dt>Уверенность</dt><dd>${confidence}</dd><dt>Видимость</dt><dd>${esc(entity.visibility || 'не указана')}</dd><dt>Версия</dt><dd>${esc(entity.version || 1)}</dd><dt>Источник</dt><dd>${esc(entity.source?.label || 'не указан')}</dd><dt>Тип источника</dt><dd>${esc(entity.source?.kind || 'не указан')}</dd><dt>Обновлено</dt><dd>${esc(entity.updatedAt || entity.createdAt || '')}</dd></dl>
    <section><span class="eyebrow">СВЯЗАННЫЕ ID</span><div class="full-source-chips">${links.length ? links.map((id) => `<button type="button" data-full-inspect="${esc(id)}">${esc(id)}</button>`).join('') : '<span>Связей нет</span>'}</div></section>`;
}

function applySuggestedModifier(modifier) {
  const input = document.querySelector(`.avatar-modifier-check input[value="${CSS.escape(modifier)}"]`);
  if (!input) {
    showToast('Откройте редактор аватара для примерки.');
    return;
  }
  if (!input.checked) {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  showToast('Модификатор применён как локальная примерка. Identity Core не изменён.');
}

function filterChronicle() {
  const query = document.querySelector('#fullChronicleSearch')?.value.trim().toLowerCase() || '';
  const person = document.querySelector('#fullChroniclePerson')?.value || '';
  const status = document.querySelector('#fullChronicleStatus')?.value || '';
  document.querySelectorAll('.chronicle-entry').forEach((entry) => {
    const text = entry.textContent.toLowerCase();
    entry.hidden = Boolean((query && !text.includes(query)) || (person && !text.includes(person)) || (status && !text.includes(status)));
  });
}

function exportChronicle() {
  downloadJSON('hros-chronicle.json', {
    exportedAt: iso(),
    moments: snapshot.moments || [],
    appearanceVersions: loadJSON('hros.avatar.appearance.history.v1', [])
  });
}

function resetPlaytestOnly() {
  const accepted = window.confirm('Сбросить входящие, отзыв, настройки расширенного playtest и локальную историю аватара? Основная модель HROS останется без изменений.');
  if (!accepted) return;
  [FULL_SETTINGS_KEY, INBOX_KEY, FEEDBACK_KEY, COMMAND_SETTINGS_KEY, 'hros.avatar.appearance.history.v1'].forEach((key) => localStorage.removeItem(key));
  window.location.reload();
}

function openNativeWorld() {
  const button = document.querySelector('.topbar nav [data-view="universe"]');
  button?.click();
  setCommandActive('world');
}

function handleClick(event) {
  const target = event.target.closest('button, [data-full-action], [data-full-open]');
  if (!target) return;

  const worldNav = target.closest('[data-command-view="world"]');
  if (worldNav) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showWorld();
    return;
  }

  const action = target.dataset.fullAction;
  if (action === 'capture') openCaptureDialog();
  if (action === 'inbox') showInbox();
  if (action === 'tour') document.querySelector('#fullTourDialog').showModal();
  if (action === 'feedback') { hydrateFeedbackForm(); document.querySelector('#fullFeedbackDialog').showModal(); }
  if (target.dataset.fullOpen === 'world') showWorld();
  if (target.dataset.fullPerson) showWorld(target.dataset.fullPerson);
  if (target.dataset.fullInspect) openInspector(target.dataset.fullInspect);
  if (target.dataset.fullApplyMod) applySuggestedModifier(target.dataset.fullApplyMod);
  if (target.hasAttribute('data-full-export-chronicle')) exportChronicle();
  if (target.hasAttribute('data-full-export-snapshot')) downloadJSON('hros-snapshot-v1.json', loadJSON(DOMAIN_KEY, snapshot));
  if (target.hasAttribute('data-full-reset-ui')) resetPlaytestOnly();
  if (target.hasAttribute('data-full-open-native-world')) openNativeWorld();

  const inboxCard = target.closest('[data-inbox-id]');
  if (target.hasAttribute('data-inbox-delete') && inboxCard) {
    saveInbox(inboxItems().filter((item) => item.id !== inboxCard.dataset.inboxId));
    showInbox();
  }
  if (target.hasAttribute('data-inbox-diary') && inboxCard) transferInboxToDiary(inboxCard.dataset.inboxId).catch((error) => showToast(error.message));
}

function handleInput(event) {
  if (event.target.matches('#fullChronicleSearch, #fullChroniclePerson, #fullChronicleStatus')) filterChronicle();
  const card = event.target.closest('[data-inbox-id]');
  if (!card) return;
  const items = inboxItems();
  const item = items.find((value) => value.id === card.dataset.inboxId);
  if (!item) return;
  if (event.target.matches('[data-inbox-kind]')) item.kind = event.target.value;
  if (event.target.matches('[data-inbox-text]')) item.text = event.target.value;
  saveInbox(items);
}

async function boot() {
  await waitForReady();
  repository = await createRepository();
  await refreshSnapshot();
  installFullControls();
  installDialogs();

  document.addEventListener('click', handleClick, true);
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleInput);

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  scheduleEnhancement();

  const settings = fullSettings();
  if (!settings.tourSeen) setTimeout(() => document.querySelector('#fullTourDialog')?.showModal(), 600);
  updateFullSettings({ lastOpenedAt: iso() });

  window.__HROS_FULL_PLAYTEST__ = {
    ready: true,
    version: 'full-playtest-2',
    openWorld: showWorld,
    openInbox: showInbox,
    openCapture: openCaptureDialog,
    inspect: openInspector,
    keys: { fullSettings: FULL_SETTINGS_KEY, inbox: INBOX_KEY, feedback: FEEDBACK_KEY }
  };
}

boot().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('beforeend', `<div class="alignment-fatal">HROS Full Playtest: ${esc(error.message)}</div>`);
});
