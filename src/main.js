import './style.css';
import { createRepository, exportSnapshot, setApiUrl } from './repository.js';
import { HrosScene } from './scene.js';

const app = document.querySelector('#app');
const state = {
  repository: null,
  snapshot: null,
  selectedId: 'person-mikhail',
  activeView: 'universe',
  scene: null
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

function renderShell() {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar glass">
        <div class="brand"><span></span><div><b>HROS</b><small>Human Relationship Operating System · v0.2</small></div></div>
        <nav aria-label="Разделы">
          <button type="button" data-view="universe" class="active">Вселенная</button>
          <button type="button" data-view="people">Люди</button>
          <button type="button" data-view="moments">Моменты</button>
          <button type="button" data-view="diagnostics">Диагностика</button>
        </nav>
        <div class="top-actions">
          <span id="storageMode" class="status-chip">Подключение…</span>
          <button id="addPerson" type="button" class="primary">+ Человек</button>
        </div>
      </header>
      <section id="viewRoot" class="view-root" aria-live="polite"></section>
    </main>
    ${dialogsMarkup()}
    <div id="toast" class="toast" role="status"></div>
  `;

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  document.querySelector('#addPerson').addEventListener('click', () => openPersonDialog());
  bindDialogs();
}

function dialogsMarkup() {
  return `
    <dialog id="personDialog" class="modal">
      <form method="dialog" id="personForm">
        <header><div><span class="eyebrow">НОВЫЙ УЗЕЛ</span><h2>Добавить человека</h2></div><button type="button" data-close-dialog class="icon-button" aria-label="Закрыть">×</button></header>
        <div class="form-grid">
          <label>Имя<input required name="name" autocomplete="off" placeholder="Например, Анна"></label>
          <label>Роль<input name="role" autocomplete="off" placeholder="Коллега, друг, родственник"></label>
          <label>Категория<select name="type"><option value="family">Семья</option><option value="friend">Друг</option><option value="work">Работа</option><option value="project">Проект</option><option value="legacy">Наследие</option><option value="other">Другое</option></select></label>
          <label>Сила связи<input name="strength" type="number" min="0" max="100" value="70"></label>
          <label class="wide">Краткое значение<textarea name="summary" rows="3" placeholder="Почему этот человек важен"></textarea></label>
          <label>Название связи<input name="relationshipLabel" placeholder="Друг, наставник, коллега"></label>
          <label>Тип связи<select name="relationshipType"><option value="personal">Личная</option><option value="family">Семейная</option><option value="friend">Дружеская</option><option value="work">Рабочая</option><option value="legacy">Преемственность</option></select></label>
        </div>
        <footer><button type="button" data-close-dialog class="secondary">Отмена</button><button type="submit" value="default" class="primary">Сохранить</button></footer>
      </form>
    </dialog>
    <dialog id="momentDialog" class="modal">
      <form method="dialog" id="momentForm">
        <header><div><span class="eyebrow">КВАНТ ВНИМАНИЯ</span><h2>Добавить момент</h2></div><button type="button" data-close-dialog class="icon-button" aria-label="Закрыть">×</button></header>
        <div class="form-grid">
          <label class="wide">Название<input required name="title" autocomplete="off" placeholder="Короткое название события"></label>
          <label>Дата<input name="date" type="date" required></label>
          <label>Период<input name="period" placeholder="Например, лето 2026"></label>
          <label class="wide">Описание<textarea name="description" rows="4" placeholder="Что произошло и почему это имеет значение"></textarea></label>
          <label class="wide">Участники<select name="participantIds" id="momentParticipants" multiple size="5"></select></label>
          <label>Эмоции<input name="emotions" placeholder="близость, радость, тревога"></label>
          <label>Значимость<input name="significance" type="number" min="0" max="100" value="70"></label>
        </div>
        <footer><button type="button" data-close-dialog class="secondary">Отмена</button><button type="submit" value="default" class="primary">Сохранить</button></footer>
      </form>
    </dialog>
    <dialog id="apiDialog" class="modal compact-modal">
      <form method="dialog" id="apiForm">
        <header><div><span class="eyebrow">REPOSITORY SERVICE</span><h2>Подключение API</h2></div><button type="button" data-close-dialog class="icon-button" aria-label="Закрыть">×</button></header>
        <p class="muted">Оставьте поле пустым для локального режима GitHub Pages. Для Docker-сборки используется <code>/api/v1</code>.</p>
        <label>Адрес API<input name="apiUrl" placeholder="http://localhost:8000/api/v1"></label>
        <footer><button type="button" data-close-dialog class="secondary">Отмена</button><button type="submit" value="default" class="primary">Применить</button></footer>
      </form>
    </dialog>
  `;
}

function bindDialogs() {
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });
  document.querySelector('#personForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    try {
      await state.repository.createPerson(payload);
      form.closest('dialog').close();
      form.reset();
      await reloadData('Человек добавлен');
    } catch (error) { showToast(error.message, true); }
  });

  document.querySelector('#momentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data);
    payload.participantIds = data.getAll('participantIds');
    try {
      await state.repository.createMoment(payload);
      form.closest('dialog').close();
      form.reset();
      await reloadData('Момент сохранён');
    } catch (error) { showToast(error.message, true); }
  });

  document.querySelector('#apiForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('apiUrl');
    setApiUrl(value);
    window.location.reload();
  });
}

function setView(view) {
  state.activeView = view;
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  renderView();
}

function renderView() {
  if (!state.snapshot) return;
  const root = document.querySelector('#viewRoot');
  state.scene?.destroy?.();
  state.scene = null;
  if (state.activeView === 'universe') renderUniverse(root);
  if (state.activeView === 'people') renderPeople(root);
  if (state.activeView === 'moments') renderMoments(root);
  if (state.activeView === 'diagnostics') renderDiagnostics(root);
}

function renderUniverse(root) {
  const selected = selectedPerson();
  const relationship = relationshipFor(selected.id);
  const moments = momentsFor(selected.id);
  root.innerHTML = `
    <section class="workspace">
      <aside class="panel glass identity-panel">
        <span class="eyebrow">ВЫБРАННЫЙ УЗЕЛ</span>
        <h1 id="selectedName">${escapeHtml(selected.name)}</h1>
        <p>${escapeHtml(selected.role)}</p>
        <div class="card"><span>ЗНАЧЕНИЕ</span><p id="selectedSummary">${escapeHtml(relationship?.meaning || selected.summary)}</p></div>
        <h2>Состояние данных</h2>
        ${metricRow('Сила связи', selected.strength)}
        ${metricRow('Уверенность', Math.round((selected.confidence ?? 1) * 100))}
        <div class="meta-list">
          <span><b>Статус</b>${statusLabel(selected.status)}</span>
          <span><b>Версия</b>${selected.version || 1}</span>
          <span><b>Источник</b>${escapeHtml(selected.source?.label || 'Не указан')}</span>
        </div>
      </aside>
      <section class="stage glass">
        <div id="three"></div><div id="labels"></div>
        <div class="stage-toolbar"><button id="resetCamera" type="button" class="secondary">Вернуть камеру</button></div>
        <div class="hud">${state.snapshot.people.length} узлов · ${state.snapshot.relationships.length} связей · данные ${state.repository.mode === 'api' ? 'из API' : 'в браузере'}</div>
      </section>
      <aside class="panel glass graph-panel">
        <div class="section-heading"><div><span class="eyebrow">ГРАФ</span><h2>Люди и связи</h2></div><button id="addRelationship" class="icon-button" title="Добавить связь">+</button></div>
        <div id="peopleList" class="people-list">${state.snapshot.people.map(personListItem).join('')}</div>
      </aside>
    </section>
    <section class="timeline glass">
      <div class="section-heading"><div><span class="eyebrow">ЛЕНТА МОМЕНТОВ</span><h2>${escapeHtml(selected.name)} · ${moments.length}</h2></div><button id="addMoment" type="button" class="primary">+ Момент</button></div>
      <div class="moments">${moments.length ? moments.slice().sort(sortMoments).map(momentCard).join('') : '<div class="empty-state">Для этого узла моменты пока не зафиксированы.</div>'}</div>
    </section>
  `;

  root.querySelectorAll('[data-person-id]').forEach((button) => button.addEventListener('click', () => selectPerson(button.dataset.personId)));
  root.querySelector('#addMoment').addEventListener('click', openMomentDialog);
  root.querySelector('#addRelationship').addEventListener('click', openRelationshipPrompt);
  const scene = new HrosScene(root.querySelector('#three'), root.querySelector('#labels'), selectPerson);
  scene.setData(state.snapshot);
  scene.select(selected.id);
  state.scene = scene;
  root.querySelector('#resetCamera').addEventListener('click', () => scene.resetCamera());
}

function renderPeople(root) {
  root.innerHTML = `
    <section class="content-panel glass">
      <div class="content-header"><div><span class="eyebrow">PERSON DATA</span><h1>Люди</h1><p>Структурированные узлы HROS с источником, статусом и уровнем уверенности.</p></div><button id="peopleAdd" class="primary">+ Человек</button></div>
      <div class="stats-row">${statCard('Люди', state.snapshot.people.length)}${statCard('Подтверждено', state.snapshot.people.filter((x) => x.status === 'confirmed').length)}${statCard('Наблюдения', state.snapshot.people.filter((x) => x.status === 'observed').length)}${statCard('Связи', state.snapshot.relationships.length)}</div>
      <div class="entity-grid">${state.snapshot.people.map(personCard).join('')}</div>
    </section>`;
  root.querySelector('#peopleAdd').addEventListener('click', openPersonDialog);
  root.querySelectorAll('[data-open-person]').forEach((button) => button.addEventListener('click', () => {
    state.selectedId = button.dataset.openPerson;
    setView('universe');
  }));
}

function renderMoments(root) {
  const sorted = state.snapshot.moments.slice().sort(sortMoments);
  root.innerHTML = `
    <section class="content-panel glass">
      <div class="content-header"><div><span class="eyebrow">MOMENT ENGINE · BASE</span><h1>Моменты</h1><p>События связаны с участниками, эмоциями, значимостью, источником и состоянием подтверждения.</p></div><button id="momentsAdd" class="primary">+ Момент</button></div>
      <div class="stats-row">${statCard('Моменты', sorted.length)}${statCard('Участники', new Set(sorted.flatMap((x) => x.participantIds || [])).size)}${statCard('Подтверждено', sorted.filter((x) => x.status === 'confirmed').length)}${statCard('Средняя значимость', sorted.length ? Math.round(sorted.reduce((sum, x) => sum + Number(x.significance || 0), 0) / sorted.length) : 0)}</div>
      <div class="moment-list">${sorted.map(momentRow).join('')}</div>
    </section>`;
  root.querySelector('#momentsAdd').addEventListener('click', openMomentDialog);
}

function renderDiagnostics(root) {
  const diagnostics = state.repository.diagnostics();
  const meta = state.snapshot.meta || {};
  root.innerHTML = `
    <section class="content-panel glass">
      <div class="content-header"><div><span class="eyebrow">DIAGNOSTICS</span><h1>Состояние системы</h1><p>Диагностика фиксирует режим хранения, объём данных и последние операции без секретов.</p></div><button id="apiSettings" class="secondary">Настроить API</button></div>
      <div class="stats-row">${statCard('Режим', diagnostics.mode.toUpperCase())}${statCard('Схема', meta.schemaVersion || '—')}${statCard('Люди', state.snapshot.people.length)}${statCard('Моменты', state.snapshot.moments.length)}</div>
      <div class="diagnostic-grid">
        <article class="diagnostic-card"><span class="eyebrow">REPOSITORY</span><h3>${escapeHtml(diagnostics.label)}</h3><dl><dt>API</dt><dd>${escapeHtml(diagnostics.apiUrl || 'не подключён')}</dd><dt>Хранилище</dt><dd>${diagnostics.storageBytes ? `${diagnostics.storageBytes.toLocaleString('ru-RU')} байт` : 'серверное'}</dd><dt>Обновлено</dt><dd>${formatDateTime(meta.updatedAt || meta.generatedAt)}</dd></dl></article>
        <article class="diagnostic-card"><span class="eyebrow">DATA INTEGRITY</span><h3>Проверка ссылок</h3>${integrityMarkup()}</article>
      </div>
      <div class="action-bar"><button id="exportData" class="primary">Экспорт JSON</button><label class="file-button secondary">Импорт JSON<input id="importData" type="file" accept="application/json"></label><button id="resetData" class="danger">Сбросить seed</button></div>
      <section class="event-log"><div class="section-heading"><div><span class="eyebrow">EVENT LOG</span><h2>Последние операции</h2></div></div>${(diagnostics.events || []).length ? diagnostics.events.slice(0, 20).map(eventRow).join('') : '<div class="empty-state">Журнал пока пуст.</div>'}</section>
    </section>`;

  root.querySelector('#apiSettings').addEventListener('click', () => {
    const form = document.querySelector('#apiForm');
    form.elements.apiUrl.value = diagnostics.apiUrl || '';
    form.closest('dialog').showModal();
  });
  root.querySelector('#exportData').addEventListener('click', () => exportSnapshot(state.snapshot));
  root.querySelector('#importData').addEventListener('change', importFile);
  root.querySelector('#resetData').addEventListener('click', async () => {
    if (!window.confirm('Удалить текущие локальные изменения и восстановить демонстрационные данные?')) return;
    await state.repository.reset();
    await reloadData('Данные восстановлены');
  });
}

function integrityMarkup() {
  const ids = new Set(state.snapshot.people.map((x) => x.id));
  const brokenRelationships = state.snapshot.relationships.filter((x) => !ids.has(x.sourceId) || !ids.has(x.targetId));
  const brokenMoments = state.snapshot.moments.filter((x) => (x.participantIds || []).some((id) => !ids.has(id)));
  const ok = brokenRelationships.length === 0 && brokenMoments.length === 0;
  return `<div class="integrity ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Целостность подтверждена' : 'Найдены ошибки ссылок'}</b><span>Связи: ${brokenRelationships.length} · моменты: ${brokenMoments.length}</span></div>`;
}

function personListItem(person) {
  const relation = relationshipFor(person.id);
  return `<button type="button" data-person-id="${person.id}" class="${person.id === state.selectedId ? 'selected' : ''}"><span class="dot ${escapeHtml(person.type)}"></span><span><b>${escapeHtml(person.name)}</b><small>${escapeHtml(relation?.label || person.role)}</small></span><em>${person.strength}</em></button>`;
}

function personCard(person) {
  return `<article class="entity-card"><div class="entity-top"><span class="dot ${escapeHtml(person.type)}"></span><span class="status-tag ${escapeHtml(person.status)}">${statusLabel(person.status)}</span></div><h3>${escapeHtml(person.name)}</h3><p>${escapeHtml(person.role)}</p><div class="entity-summary">${escapeHtml(person.summary)}</div><dl><dt>Сила</dt><dd>${person.strength}</dd><dt>Уверенность</dt><dd>${Math.round((person.confidence ?? 1) * 100)}%</dd><dt>Источник</dt><dd>${escapeHtml(person.source?.label || '—')}</dd></dl><button type="button" class="secondary full" data-open-person="${person.id}">Открыть во вселенной</button></article>`;
}

function momentCard(moment, index) {
  return `<article><b>${String(index + 1).padStart(2, '0')}</b><span>${escapeHtml(moment.period || formatDate(moment.date))}</span><h3>${escapeHtml(moment.title)}</h3><p>${escapeHtml(moment.description)}</p><small>${participantNames(moment).join(' · ')}</small></article>`;
}

function momentRow(moment) {
  return `<article class="moment-row"><time>${formatDate(moment.date)}</time><div><span class="status-tag ${escapeHtml(moment.status)}">${statusLabel(moment.status)}</span><h3>${escapeHtml(moment.title)}</h3><p>${escapeHtml(moment.description)}</p><small>${participantNames(moment).join(' · ')}${moment.emotions?.length ? ` · ${moment.emotions.map(escapeHtml).join(', ')}` : ''}</small></div><strong>${moment.significance}</strong></article>`;
}

function eventRow(event) {
  return `<div class="event-row"><time>${formatDateTime(event.at)}</time><span class="event-level ${escapeHtml(event.level)}">${escapeHtml(event.level)}</span><b>${escapeHtml(event.action)}</b><code>${escapeHtml(JSON.stringify(event.details || {}))}</code></div>`;
}

function metricRow(label, value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="trait"><span>${label}</span><i style="--v:${safe}%"></i><b>${safe}</b></div>`;
}

function statCard(label, value) { return `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`; }
function statusLabel(status) { return ({ draft: 'Черновик', observed: 'Наблюдение', hypothesis: 'Гипотеза', confirmed: 'Подтверждено', finalized: 'Финализировано', archived: 'Архив' }[status] || status || 'Не указан'); }
function sortMoments(a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }
function selectedPerson() { return state.snapshot.people.find((person) => person.id === state.selectedId) || state.snapshot.people[0]; }
function relationshipFor(personId) { return state.snapshot.relationships.find((relationship) => relationship.sourceId === personId || relationship.targetId === personId); }
function momentsFor(personId) { return state.snapshot.moments.filter((moment) => (moment.participantIds || []).includes(personId)); }
function participantNames(moment) { const ids = new Set(moment.participantIds || []); return state.snapshot.people.filter((x) => ids.has(x.id)).map((x) => x.name); }
function formatDate(value) { if (!value) return 'Без даты'; return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)); }
function formatDateTime(value) { if (!value) return '—'; return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }

function selectPerson(id) {
  state.selectedId = id;
  if (state.activeView !== 'universe') return setView('universe');
  renderView();
}

function openPersonDialog() { document.querySelector('#personDialog').showModal(); }
function openMomentDialog() {
  const select = document.querySelector('#momentParticipants');
  select.innerHTML = state.snapshot.people.map((person) => `<option value="${person.id}" ${person.id === state.selectedId ? 'selected' : ''}>${escapeHtml(person.name)} · ${escapeHtml(person.role)}</option>`).join('');
  const form = document.querySelector('#momentForm');
  form.elements.date.value = new Date().toISOString().slice(0, 10);
  document.querySelector('#momentDialog').showModal();
}

async function openRelationshipPrompt() {
  const source = selectedPerson();
  const candidates = state.snapshot.people.filter((person) => person.id !== source.id);
  const targetName = window.prompt(`Создать связь от «${source.name}». Введите точное имя второго узла:\n${candidates.map((x) => x.name).join(', ')}`);
  if (!targetName) return;
  const target = candidates.find((person) => person.name.toLowerCase() === targetName.trim().toLowerCase());
  if (!target) return showToast('Узел с таким именем не найден', true);
  const label = window.prompt('Название связи:', 'Личная связь');
  if (!label) return;
  try {
    await state.repository.createRelationship({ sourceId: source.id, targetId: target.id, label, strength: 70, meaning: '' });
    await reloadData('Связь добавлена');
  } catch (error) { showToast(error.message, true); }
}

async function importFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    await state.repository.importSnapshot(data);
    await reloadData('Данные импортированы');
  } catch (error) { showToast(`Ошибка импорта: ${error.message}`, true); }
  event.target.value = '';
}

async function reloadData(message) {
  state.snapshot = await state.repository.getSnapshot();
  if (!state.snapshot.people.some((person) => person.id === state.selectedId)) state.selectedId = state.snapshot.people[0]?.id;
  updateModeChip();
  renderView();
  if (message) showToast(message);
}

function updateModeChip() {
  const chip = document.querySelector('#storageMode');
  chip.textContent = state.repository.mode === 'api' ? 'API подключён' : 'Локальный режим';
  chip.className = `status-chip ${state.repository.mode}`;
}

let toastTimer;
function showToast(message, isError = false) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.className = `toast visible ${isError ? 'error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

async function boot() {
  renderShell();
  try {
    state.repository = await createRepository();
    state.snapshot = await state.repository.getSnapshot();
    state.selectedId = state.snapshot.people.find((person) => person.isSelf)?.id || state.snapshot.people[0]?.id;
    updateModeChip();
    renderView();
  } catch (error) {
    document.querySelector('#viewRoot').innerHTML = `<section class="fatal glass"><h1>HROS не запущен</h1><p>${escapeHtml(error.message)}</p><button class="primary" onclick="location.reload()">Повторить</button></section>`;
  }
}

boot();
