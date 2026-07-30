import './messenger-v1.css';
import { createRepository, recordEvent } from './repository.js';

const THREADS_KEY = 'hros.messenger.threads.v1';
const SETTINGS_KEY = 'hros.messenger.settings.v1';
const ACTIVE_KEY = 'hros.messenger.active.v1';
const MAX_THREADS = 80;
const MAX_MESSAGES = 600;

const AGENTS = [
  { id: 'diary', title: 'ИИ-дневник', subtitle: 'Живой диалог и Change Set', avatar: '✎', accent: 'cyan' },
  { id: 'relationship', title: 'Аналитик отношений', subtitle: 'Перспективы и влияние действий', avatar: '∞', accent: 'violet' },
  { id: 'memory', title: 'Хранитель памяти', subtitle: 'Поиск и сопоставление HROS', avatar: '◫', accent: 'amber' },
  { id: 'navigator', title: 'Навигатор HROS', subtitle: 'Люди, моменты и следующие шаги', avatar: '◈', accent: 'green' },
  { id: 'avatar', title: 'Агент аватара', subtitle: 'Роли, увлечения и образ', avatar: '♙', accent: 'blue' },
];

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));
const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const iso = () => new Date().toISOString();
const clone = (value) => structuredClone(value);

let repository;
let snapshot;
let threads = [];
let activeThreadId = null;
let isOpen = false;
let isTyping = false;
let runtime = { configured: false, provider: 'local', model: 'HROS Memory Gateway', runtime: 'local' };
let replyTargetId = null;
let editingMessageId = null;
let pendingAttachments = [];
let searchText = '';
let infoOpen = true;
let agentPickerOpen = false;

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

function saveThreads() {
  threads.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if (threads.length > MAX_THREADS) threads.splice(MAX_THREADS);
  for (const thread of threads) {
    if (!Array.isArray(thread.messages)) thread.messages = [];
    if (thread.messages.length > MAX_MESSAGES) thread.messages.splice(0, thread.messages.length - MAX_MESSAGES);
  }
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  localStorage.setItem(ACTIVE_KEY, activeThreadId || '');
}

function agentById(agentId) {
  return AGENTS.find((agent) => agent.id === agentId) || AGENTS[0];
}

function welcomeMessage(agent) {
  const text = {
    diary: 'Расскажите, что произошло. Я помогу отделить факты от интерпретаций и подготовить изменения только после вашей проверки.',
    relationship: 'Опишите ситуацию или назовите человека. Я сопоставлю подтверждённые перспективы и не стану додумывать позицию другого человека.',
    memory: 'Спросите о человеке, моменте, принципе или прошлой записи. Я покажу релевантные источники из памяти HROS.',
    navigator: 'Опишите, что сейчас важно. Я помогу найти нужный раздел HROS и выбрать следующее практическое действие.',
    avatar: 'Назовите роль, увлечение или направление развития. Я предложу обратимое изменение образа с указанием оснований.',
  }[agent.id];
  return { id: uid('message'), role: 'assistant', text, at: iso(), status: 'delivered', memoryRefs: [], systemGenerated: true };
}

function createThread(agentId = 'diary', title = '') {
  const agent = agentById(agentId);
  const thread = {
    id: uid('thread'), agentId: agent.id, title: title || agent.title, pinned: agent.id === 'diary',
    muted: false, archived: false, unread: 0, createdAt: iso(), updatedAt: iso(), messages: [welcomeMessage(agent)],
  };
  threads.unshift(thread);
  activeThreadId = thread.id;
  saveThreads();
  return thread;
}

function ensureThreads() {
  threads = readJSON(THREADS_KEY, []);
  for (const agent of AGENTS) {
    if (!threads.some((thread) => thread.agentId === agent.id && !thread.archived)) createThread(agent.id);
  }
  const saved = localStorage.getItem(ACTIVE_KEY);
  activeThreadId = threads.some((thread) => thread.id === saved) ? saved : threads[0]?.id;
  saveThreads();
}

function activeThread() {
  return threads.find((thread) => thread.id === activeThreadId) || threads[0] || createThread();
}

function waitReady(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.__HROS_V1__?.ready && window.__HROS_DIARY__?.ready && document.querySelector('#app')) {
        clearInterval(timer); resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer); reject(new Error('HROS не готов к запуску мессенджера'));
      }
    }, 60);
  });
}

function runtimeLabel() {
  if (runtime.configured) return `${runtime.provider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} · ${runtime.model}`;
  return 'Локальный режим памяти · GPT не подключён';
}

async function loadRuntime() {
  if (repository.mode !== 'api') return;
  try {
    const response = await fetch(`${repository.apiUrl}/agents`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    runtime = (await response.json()).runtime || runtime;
  } catch (error) {
    runtime = { configured: false, provider: 'api-unavailable', model: 'HROS Memory Gateway', runtime: 'local', error: error.message };
  }
}

function root() {
  let element = document.querySelector('#hrosMessenger');
  if (!element) {
    document.body.insertAdjacentHTML('beforeend', '<section id="hrosMessenger" class="hros-messenger" aria-label="HROS Messenger" aria-hidden="true"></section>');
    element = document.querySelector('#hrosMessenger');
  }
  return element;
}

export async function openMessenger(agentId = null) {
  isOpen = true;
  document.body.classList.add('hros-messenger-open');
  snapshot = await repository.getSnapshot();
  if (agentId) {
    const existing = threads.find((thread) => thread.agentId === agentId && !thread.archived);
    activeThreadId = existing?.id || createThread(agentId).id;
  }
  activeThread().unread = 0;
  saveThreads();
  render();
  requestAnimationFrame(() => document.querySelector('#messengerComposer')?.focus());
}

export function closeMessenger() {
  isOpen = false;
  document.body.classList.remove('hros-messenger-open');
  root().setAttribute('aria-hidden', 'true');
}

function formatTime(value) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date);
}

function dateLabel(value) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function formatBytes(size = 0) {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

function linkify(value) {
  return esc(value).replace(/\[HROS:([^\]]+)\]/g, '<button type="button" class="inline-memory-ref" data-memory-ref="$1">HROS:$1</button>').replace(/\n/g, '<br>');
}

function filteredThreads() {
  const query = searchText.trim().toLowerCase();
  return threads.filter((thread) => !thread.archived && (!query || `${thread.title} ${agentById(thread.agentId).title} ${(thread.messages || []).slice(-40).map((item) => item.text).join(' ')}`.toLowerCase().includes(query)));
}

function renderThreadList() {
  const items = filteredThreads();
  if (!items.length) return '<div class="messenger-empty-list">Ничего не найдено</div>';
  return items.map((thread) => {
    const agent = agentById(thread.agentId);
    const last = thread.messages?.at(-1) || { text: '', at: thread.updatedAt };
    return `<button type="button" class="messenger-thread ${thread.id === activeThreadId ? 'active' : ''}" data-thread-id="${esc(thread.id)}">
      <span class="messenger-avatar accent-${esc(agent.accent)}">${esc(agent.avatar)}</span>
      <span class="messenger-thread-content"><span><b>${esc(thread.title)}</b><time>${formatTime(last.at)}</time></span><small>${esc(last.role === 'user' ? `Вы: ${last.text}` : last.text)}</small></span>
      <span class="messenger-thread-flags">${thread.pinned ? '<i title="Закреплено">⌖</i>' : ''}${thread.muted ? '<i title="Без уведомлений">◌</i>' : ''}${thread.unread ? `<em>${thread.unread}</em>` : ''}</span>
    </button>`;
  }).join('');
}

function renderMessage(message, thread) {
  const reply = message.replyToId ? thread.messages.find((item) => item.id === message.replyToId) : null;
  const refs = message.memoryRefs?.length ? `<button type="button" class="message-memory-count" data-open-memory="${esc(message.id)}">HROS · ${message.memoryRefs.length}</button>` : '';
  const attachments = message.attachments?.length ? `<div class="message-attachments">${message.attachments.map((file) => `<span><b>⌕</b><small>${esc(file.name)}</small><em>${formatBytes(file.size)}</em></span>`).join('')}</div>` : '';
  return `<article class="messenger-message ${message.role}" data-message-id="${esc(message.id)}"><div class="message-bubble">
    ${reply ? `<div class="message-reply-preview"><b>${reply.role === 'user' ? 'Вы' : agentById(thread.agentId).title}</b><span>${esc(reply.text.slice(0, 140))}</span></div>` : ''}
    <p>${linkify(message.text)}</p>${attachments}${refs}
    <footer><time>${formatTime(message.at)}</time>${message.editedAt ? '<span>изменено</span>' : ''}${message.role === 'user' ? `<i title="${message.status === 'read' ? 'Прочитано' : 'Доставлено'}">${message.status === 'read' ? '✓✓' : '✓'}</i>` : ''}</footer>
    <div class="message-actions"><button type="button" data-reply-message="${esc(message.id)}" title="Ответить">↩</button>${message.role === 'user' ? `<button type="button" data-edit-message="${esc(message.id)}" title="Изменить">✎</button>` : ''}<button type="button" data-copy-message="${esc(message.id)}" title="Копировать">⧉</button><button type="button" data-delete-message="${esc(message.id)}" title="Удалить">×</button></div>
  </div></article>`;
}

function renderMessages(thread) {
  let previousDate = '';
  return thread.messages.map((message) => {
    const currentDate = new Date(message.at).toDateString();
    const divider = currentDate !== previousDate ? `<div class="messenger-date-divider"><span>${dateLabel(message.at)}</span></div>` : '';
    previousDate = currentDate;
    return `${divider}${renderMessage(message, thread)}`;
  }).join('');
}

function composeState(thread) {
  const reply = replyTargetId ? thread.messages.find((message) => message.id === replyTargetId) : null;
  const editing = editingMessageId ? thread.messages.find((message) => message.id === editingMessageId) : null;
  if (!reply && !editing && !pendingAttachments.length) return '';
  return `<div class="messenger-compose-state">
    ${editing ? `<div><b>Редактирование сообщения</b><span>${esc(editing.text.slice(0, 160))}</span></div>` : ''}
    ${reply ? `<div><b>Ответ на сообщение</b><span>${esc(reply.text.slice(0, 160))}</span></div>` : ''}
    ${pendingAttachments.length ? `<div><b>Вложения</b><span>${pendingAttachments.map((file) => esc(file.name)).join(', ')}</span></div>` : ''}
    <button type="button" id="cancelComposerState">×</button>
  </div>`;
}

function memoryCard(ref) {
  return `<button type="button" class="messenger-memory-card" data-memory-ref="${esc(ref.id)}"><span>${esc(ref.kind || 'memory')}</span><b>${esc(ref.title || ref.id)}</b><p>${esc(String(ref.statement || '').slice(0, 180))}</p><small>${esc(ref.status || '')} · ${Math.round(Number(ref.confidence ?? 1) * 100)}%</small></button>`;
}

function renderInfo(thread, agent) {
  const refs = [...thread.messages].reverse().find((message) => message.memoryRefs?.length)?.memoryRefs || [];
  return `<aside class="messenger-info ${infoOpen ? 'open' : ''}" aria-label="Контекст агента">
    <div class="messenger-info-profile"><span class="messenger-avatar large accent-${esc(agent.accent)}">${esc(agent.avatar)}</span><h2>${esc(agent.title)}</h2><p>${esc(agent.subtitle)}</p></div>
    <section><span class="messenger-section-label">РЕЖИМ</span><div class="messenger-runtime-card"><i class="${runtime.configured ? 'online' : 'local'}"></i><div><b>${runtime.configured ? 'GPT-агент подключён' : 'Локальный агент памяти'}</b><span>${esc(runtimeLabel())}</span></div></div></section>
    <section><span class="messenger-section-label">ПРАВИЛА</span><ul class="messenger-rule-list"><li>Память HROS доступна только на чтение</li><li>Нет выдуманных перспектив других людей</li><li>Запись только через Change Set</li><li>Источники показываются у ответа</li></ul></section>
    <section><span class="messenger-section-label">ПОСЛЕДНИЕ ИСТОЧНИКИ · ${refs.length}</span><div class="messenger-memory-list">${refs.length ? refs.slice(0, 12).map(memoryCard).join('') : '<p>Источники появятся после вопроса к агенту.</p>'}</div></section>
    <section class="messenger-info-actions"><button type="button" id="pinThread">${thread.pinned ? 'Открепить чат' : 'Закрепить чат'}</button><button type="button" id="muteThread">${thread.muted ? 'Включить уведомления' : 'Отключить уведомления'}</button><button type="button" id="exportThread">Экспортировать JSON</button></section>
  </aside>`;
}

function renderAgentPicker() {
  if (!agentPickerOpen) return '';
  return `<div class="messenger-modal-backdrop" data-close-agent-picker><section class="messenger-agent-picker" role="dialog" aria-modal="true" aria-label="Новый чат"><header><div><span>НОВЫЙ ЧАТ</span><h2>Выберите GPT-агента</h2></div><button type="button" data-close-agent-picker>×</button></header>${AGENTS.map((agent) => `<button type="button" data-create-agent-chat="${agent.id}"><span class="messenger-avatar accent-${agent.accent}">${agent.avatar}</span><div><b>${esc(agent.title)}</b><small>${esc(agent.subtitle)}</small></div><i>›</i></button>`).join('')}</section></div>`;
}

function render() {
  if (!isOpen) return;
  const element = root();
  const thread = activeThread();
  const agent = agentById(thread.agentId);
  element.setAttribute('aria-hidden', 'false');
  element.innerHTML = `<div class="messenger-shell ${infoOpen ? 'info-visible' : ''}">
    <aside class="messenger-sidebar"><header class="messenger-sidebar-header"><button type="button" id="messengerClose" aria-label="Закрыть мессенджер">‹</button><div><b>HROS</b><span>Messenger</span></div><button type="button" id="newAgentChat" aria-label="Новый чат">＋</button></header>
      <label class="messenger-search"><span>⌕</span><input id="messengerSearch" value="${esc(searchText)}" placeholder="Поиск" autocomplete="off"><button type="button" id="clearMessengerSearch" ${searchText ? '' : 'hidden'}>×</button></label>
      <nav class="messenger-folders"><button class="active" type="button">Все</button><button type="button" data-folder-agent="diary">Дневник</button><button type="button" data-folder-agents>Агенты</button></nav>
      <div class="messenger-thread-list">${renderThreadList()}</div><footer><span>${snapshot?.records?.length || 0} записей HROS</span><b>${repository.mode === 'api' ? 'API' : 'LOCAL'}</b></footer></aside>
    <main class="messenger-chat"><header class="messenger-chat-header"><button type="button" id="messengerMobileBack" class="mobile-only">‹</button><span class="messenger-avatar accent-${agent.accent}">${agent.avatar}</span><div><h1>${esc(thread.title)}</h1><span><i class="${runtime.configured ? 'online' : 'local'}"></i>${esc(runtimeLabel())}</span></div><div class="messenger-header-actions"><button type="button" id="prepareChangeSet">Зафиксировать</button><button type="button" id="toggleMessengerInfo">ⓘ</button><button type="button" id="messengerMenu">⋮</button></div></header>
      <div class="messenger-chat-background"><section class="messenger-messages" id="messengerMessages">${renderMessages(thread)}${isTyping ? '<article class="messenger-message assistant"><div class="message-bubble typing"><i></i><i></i><i></i></div></article>' : ''}</section></div>
      ${composeState(thread)}<footer class="messenger-composer"><button type="button" id="attachMessage">⌕</button><input type="file" id="messengerFileInput" multiple hidden><textarea id="messengerComposer" rows="1" placeholder="Сообщение" aria-label="Сообщение"></textarea><button type="button" id="messengerEmoji">☺</button><button type="button" id="sendMessengerMessage" aria-label="Отправить">➤</button></footer></main>
    ${renderInfo(thread, agent)}</div>${renderAgentPicker()}`;
  bindEvents(element);
  requestAnimationFrame(() => {
    const messages = element.querySelector('#messengerMessages');
    if (messages) messages.scrollTop = messages.scrollHeight;
    resizeComposer();
  });
}

function bindEvents(element) {
  element.querySelector('#messengerClose')?.addEventListener('click', closeMessenger);
  element.querySelector('#messengerMobileBack')?.addEventListener('click', () => element.classList.toggle('show-sidebar'));
  element.querySelector('#newAgentChat')?.addEventListener('click', () => { agentPickerOpen = true; render(); });
  element.querySelectorAll('[data-close-agent-picker]').forEach((item) => item.addEventListener('click', (event) => { if (!event.target.closest('[data-create-agent-chat]')) { agentPickerOpen = false; render(); } }));
  element.querySelectorAll('[data-create-agent-chat]').forEach((button) => button.addEventListener('click', () => { createThread(button.dataset.createAgentChat); agentPickerOpen = false; render(); }));
  element.querySelectorAll('[data-thread-id]').forEach((button) => button.addEventListener('click', () => { activeThreadId = button.dataset.threadId; activeThread().unread = 0; replyTargetId = editingMessageId = null; pendingAttachments = []; saveThreads(); element.classList.remove('show-sidebar'); render(); }));
  element.querySelector('#messengerSearch')?.addEventListener('input', (event) => { searchText = event.target.value; render(); requestAnimationFrame(() => { const input = document.querySelector('#messengerSearch'); input?.focus(); input?.setSelectionRange(searchText.length, searchText.length); }); });
  element.querySelector('#clearMessengerSearch')?.addEventListener('click', () => { searchText = ''; render(); });
  element.querySelector('[data-folder-agent]')?.addEventListener('click', () => { searchText = 'ИИ-дневник'; render(); });
  element.querySelector('[data-folder-agents]')?.addEventListener('click', () => { searchText = ''; agentPickerOpen = true; render(); });
  element.querySelector('#sendMessengerMessage')?.addEventListener('click', sendMessage);
  element.querySelector('#messengerComposer')?.addEventListener('input', resizeComposer);
  element.querySelector('#messengerComposer')?.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
  element.querySelector('#attachMessage')?.addEventListener('click', () => element.querySelector('#messengerFileInput')?.click());
  element.querySelector('#messengerFileInput')?.addEventListener('change', (event) => { pendingAttachments.push(...[...event.target.files].map((file) => ({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified }))); render(); });
  element.querySelector('#messengerEmoji')?.addEventListener('click', () => { const input = element.querySelector('#messengerComposer'); input.value += input.value ? ' 🙂' : '🙂'; input.focus(); resizeComposer(); });
  element.querySelector('#toggleMessengerInfo')?.addEventListener('click', () => { infoOpen = !infoOpen; localStorage.setItem(SETTINGS_KEY, JSON.stringify({ infoOpen })); render(); });
  element.querySelector('#prepareChangeSet')?.addEventListener('click', prepareChangeSet);
  element.querySelector('#cancelComposerState')?.addEventListener('click', () => { replyTargetId = editingMessageId = null; pendingAttachments = []; render(); });
  element.querySelectorAll('[data-reply-message]').forEach((button) => button.addEventListener('click', () => { replyTargetId = button.dataset.replyMessage; editingMessageId = null; render(); document.querySelector('#messengerComposer')?.focus(); }));
  element.querySelectorAll('[data-edit-message]').forEach((button) => button.addEventListener('click', () => { const message = activeThread().messages.find((item) => item.id === button.dataset.editMessage); if (!message) return; editingMessageId = message.id; replyTargetId = null; render(); const input = document.querySelector('#messengerComposer'); input.value = message.text; input.focus(); resizeComposer(); }));
  element.querySelectorAll('[data-copy-message]').forEach((button) => button.addEventListener('click', async () => { const message = activeThread().messages.find((item) => item.id === button.dataset.copyMessage); if (message) await navigator.clipboard?.writeText(message.text); }));
  element.querySelectorAll('[data-delete-message]').forEach((button) => button.addEventListener('click', () => { if (!confirm('Удалить сообщение из этого чата?')) return; const thread = activeThread(); thread.messages = thread.messages.filter((item) => item.id !== button.dataset.deleteMessage); thread.updatedAt = iso(); saveThreads(); render(); }));
  element.querySelectorAll('[data-open-memory],[data-memory-ref]').forEach((button) => button.addEventListener('click', () => { infoOpen = true; render(); }));
  element.querySelector('#pinThread')?.addEventListener('click', () => { const thread = activeThread(); thread.pinned = !thread.pinned; saveThreads(); render(); });
  element.querySelector('#muteThread')?.addEventListener('click', () => { const thread = activeThread(); thread.muted = !thread.muted; saveThreads(); render(); });
  element.querySelector('#exportThread')?.addEventListener('click', exportThread);
}

function resizeComposer() {
  const input = document.querySelector('#messengerComposer');
  if (!input) return;
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 168)}px`;
}

async function sendMessage() {
  if (isTyping) return;
  const input = document.querySelector('#messengerComposer');
  const text = input?.value.trim() || '';
  if (!text && !pendingAttachments.length) return;
  const thread = activeThread();
  if (editingMessageId) {
    const message = thread.messages.find((item) => item.id === editingMessageId);
    if (message) { message.text = text; message.editedAt = iso(); }
    editingMessageId = null; pendingAttachments = []; thread.updatedAt = iso(); saveThreads(); render(); return;
  }
  const userMessage = { id: uid('message'), role: 'user', text: text || 'Вложение', at: iso(), status: 'delivered', replyToId: replyTargetId, attachments: clone(pendingAttachments), memoryRefs: [] };
  thread.messages.push(userMessage);
  thread.updatedAt = userMessage.at;
  replyTargetId = null;
  pendingAttachments = [];
  saveThreads();
  isTyping = true;
  render();
  try {
    const result = await askAgent(thread, userMessage.text);
    userMessage.status = 'read';
    thread.messages.push({ id: uid('message'), role: 'assistant', text: result.reply, at: iso(), status: 'delivered', memoryRefs: result.memoryRefs || [], runtime: result.runtime || runtime });
    thread.updatedAt = iso();
  } catch (error) {
    thread.messages.push({ id: uid('message'), role: 'assistant', text: `Не удалось получить ответ GPT-агента. ${error.message}`, at: iso(), status: 'error', memoryRefs: [] });
    thread.updatedAt = iso();
    recordEvent('error', 'messenger.agent', { agentId: thread.agentId, message: error.message });
  } finally {
    isTyping = false;
    saveThreads();
    render();
  }
}

async function askAgent(thread, message) {
  const history = thread.messages.slice(-24, -1).filter((item) => ['user', 'assistant'].includes(item.role)).map((item) => ({ role: item.role, text: item.text }));
  if (repository.mode === 'api' && runtime.configured) {
    const response = await fetch(`${repository.apiUrl}/agents/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: thread.agentId, conversationId: thread.id, message, history, memoryLimit: 18 }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || `HTTP ${response.status}`);
    return payload;
  }
  return localAgentReply(thread.agentId, message);
}

function localMemory(query, limit = 12) {
  const tokens = new Set(query.toLowerCase().match(/[0-9a-zа-яё_-]{3,}/gi) || []);
  const selfId = snapshot.people?.find((person) => person.isSelf)?.id;
  const items = [
    ...(snapshot.people || []).map((item) => ({ id: item.id, kind: 'person', title: item.name, statement: `${item.name}: ${item.role}. ${item.summary}`, status: item.status, confidence: item.confidence, source: item.source })),
    ...(snapshot.relationships || []).map((item) => ({ id: item.id, kind: 'relationship', title: item.label, statement: `${item.label}. ${item.meaning}`, status: item.status, confidence: item.confidence, source: item.source })),
    ...(snapshot.moments || []).map((item) => ({ id: item.id, kind: 'moment', title: item.title, statement: `${item.date} ${item.title}. ${item.description} ${item.details?.meaning || ''}`, status: item.status, confidence: item.confidence, source: item.source })),
    ...(snapshot.records || []).filter((item) => item.visibility !== 'private' || !item.perspectiveOwnerId || item.perspectiveOwnerId === selfId).map((item) => ({ id: item.id, kind: item.kind, title: item.kind, statement: item.statement, status: item.status, confidence: item.confidence, source: item.source })),
  ];
  return items.map((item) => {
    const text = `${item.title} ${item.statement}`.toLowerCase();
    const overlap = [...tokens].filter((token) => text.includes(token)).length;
    const status = ['confirmed', 'finalized'].includes(item.status) ? 3 : item.status === 'observed' ? 1 : 0;
    return { ...item, score: overlap * 7 + status + Number(item.confidence ?? 0) };
  }).filter((item) => item.score > 1).sort((a, b) => b.score - a.score).slice(0, limit);
}

function localAgentReply(agentId, message) {
  const memoryRefs = localMemory(message);
  const refs = memoryRefs.slice(0, 4).map((item) => `[HROS:${item.id}]`).join(' ');
  const memoryNote = memoryRefs.length ? `Я нашёл ${memoryRefs.length} релевантных записей в памяти HROS. ${refs}` : 'Прямых совпадений в подтверждённой памяти HROS пока не найдено.';
  const reply = {
    diary: `${memoryNote}\n\nЧто в этой ситуации было наблюдаемым действием или высказыванием, а что является вашей интерпретацией?`,
    relationship: `${memoryNote}\n\nДля анализа нужно разделить факты, вашу перспективу, неизвестную перспективу другого человека и гипотезу. Какое действие разобрать первым?`,
    memory: `${memoryNote}\n\nИсточники показаны справа с типом, статусом и уверенностью.`,
    navigator: `${memoryNote}\n\nСледующее безопасное действие — уточнить цель и открыть связанного человека, момент или сессию.`,
    avatar: `${memoryNote}\n\nИзменение образа должно быть обратимым и опираться на подтверждённую роль или увлечение.`,
  }[agentId] || memoryNote;
  return { reply, memoryRefs, runtime: { configured: false, provider: 'local', model: 'HROS Memory Gateway', runtime: 'local' }, confirmationRequired: true, writeApplied: false };
}

async function prepareChangeSet() {
  const thread = activeThread();
  const messages = thread.messages.filter((message) => ['user', 'assistant'].includes(message.role) && !message.systemGenerated).map((message) => ({ id: message.id, role: message.role, text: message.text, at: message.at }));
  if (!messages.some((message) => message.role === 'user')) { alert('Сначала добавьте хотя бы одно сообщение.'); return; }
  closeMessenger();
  if (window.__HROS_DIARY__?.importConversation) await window.__HROS_DIARY__.importConversation({ topic: thread.title, messages, sourceAgentId: thread.agentId, conversationId: thread.id });
  else document.querySelector('.topbar nav [data-diary-view]')?.click();
}

function exportThread() {
  const thread = activeThread();
  const blob = new Blob([JSON.stringify({ product: 'HROS', type: 'messenger_thread', exportedAt: iso(), thread }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hros-chat-${thread.id}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function boot() {
  await waitReady();
  repository = await createRepository();
  snapshot = await repository.getSnapshot();
  infoOpen = readJSON(SETTINGS_KEY, { infoOpen: true }).infoOpen !== false;
  ensureThreads();
  await loadRuntime();
  root();
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isOpen && !agentPickerOpen) closeMessenger(); });
  window.__HROS_MESSENGER__ = { ready: true, open: openMessenger, close: closeMessenger, getThreads: () => clone(threads), getRuntime: () => clone(runtime), storageKey: THREADS_KEY };
}

boot().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('beforeend', `<div class="alignment-fatal">HROS Messenger: ${esc(error.message)}</div>`);
});
