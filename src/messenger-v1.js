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
const id = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
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
  threads = threads
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, MAX_THREADS)
    .map((thread) => ({ ...thread, messages: (thread.messages || []).slice(-MAX_MESSAGES) }));
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
  return {
    id: id('message'), role: 'assistant', text, at: now(), status: 'delivered',
    memoryRefs: [], systemGenerated: true,
  };
}

function newThread(agentId = 'diary', title = '') {
  const agent = agentById(agentId);
  const thread = {
    id: id('thread'), agentId: agent.id, title: title || agent.title, pinned: agent.id === 'diary',
    muted: false, archived: false, unread: 0, createdAt: now(), updatedAt: now(),
    messages: [welcomeMessage(agent)],
  };
  threads.unshift(thread);
  activeThreadId = thread.id;
  saveThreads();
  return thread;
}

function ensureThreads() {
  threads = readJSON(THREADS_KEY, []);
  for (const agent of AGENTS) {
    if (!threads.some((thread) => thread.agentId === agent.id)) newThread(agent.id);
  }
  const savedActive = localStorage.getItem(ACTIVE_KEY);
  activeThreadId = threads.some((thread) => thread.id === savedActive) ? savedActive : threads[0]?.id;
  saveThreads();
}

function activeThread() {
  return threads.find((thread) => thread.id === activeThreadId) || threads[0] || newThread();
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
  if (runtime.configured) {
    return `${runtime.provider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} · ${runtime.model}`;
  }
  return 'Локальный режим памяти · GPT не подключён';
}

async function loadRuntime() {
  if (repository.mode !== 'api') {
    runtime = { configured: false, provider: 'local', model: 'HROS Memory Gateway', runtime: 'local' };
    return;
  }
  try {
    const response = await fetch(`${repository.apiUrl}/agents`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    runtime = payload.runtime || runtime;
  } catch (error) {
    runtime = { configured: false, provider: 'api-unavailable', model: 'HROS Memory Gateway', runtime: 'local', error: error.message };
  }
}

function createRoot() {
  let root = document.querySelector('#hrosMessenger');
  if (!root) {
    document.body.insertAdjacentHTML('beforeend', '<section id="hrosMessenger" class="hros-messenger" aria-label="HROS Messenger" aria-hidden="true"></section>');
    root = document.querySelector('#hrosMessenger');
  }
  return root;
}

export async function openMessenger(agentId = null) {
  isOpen = true;
  document.body.classList.add('hros-messenger-open');
  snapshot = await repository.getSnapshot();
  if (agentId) {
    const existing = threads.find((thread) => thread.agentId === agentId && !thread.archived);
    activeThreadId = existing?.id || newThread(agentId).id;
  }
  activeThread().unread = 0;
  saveThreads();
  render();
  requestAnimationFrame(() => document.querySelector('#messengerComposer')?.focus());
}

export function closeMessenger() {
  isOpen = false;
  document.body.classList.remove('hros-messenger-open');
  const root = document.querySelector('#hrosMessenger');
  root?.setAttribute('aria-hidden', 'true');
}

function filteredThreads() {
  const query = searchText.trim().toLowerCase();
  if (!query) return threads.filter((thread) => !thread.archived);
  return threads.filter((thread) => {
    const agent = agentById(thread.agentId);
    const messages = (thread.messages || []).slice(-40).map((message) => message.text).join(' ');
    return `${thread.title} ${agent.title} ${messages}`.toLowerCase().includes(query);
  });
}

function lastMessage(thread) {
  return thread.messages?.at(-1) || { text: '', at: thread.updatedAt };
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

function renderThreadList() {
  const items = filteredThreads();
  return items.length ? items.map((thread) => {
    const agent = agentById(thread.agentId);
    const last = lastMessage(thread);
    return `<button type="button" class="messenger-thread ${thread.id === activeThreadId ? 'active' : ''}" data-thread-id="${esc(thread.id)}">
      <span class="messenger-avatar accent-${esc(agent.accent)}">${esc(agent.avatar)}</span>
      <span class="messenger-thread-content"><span><b>${esc(thread.title)}</b><time>${formatTime(last.at)}</time></span><small>${esc(last.role === 'user' ? `Вы: ${last.text}` : last.text)}</small></span>
      <span class="messenger-thread-flags">${thread.pinned ? '<i title="Закреплено">⌖</i>' : ''}${thread.muted ? '<i title="Без уведомлений">◌</i>' : ''}${thread.unread ? `<em>${thread.unread}</em>` : ''}</span>
    </button>`;
  }).join('') : '<div class="messenger-empty-list">Ничего не найдено</div>';
}

function renderMessage(message, thread) {
  const reply = message.replyToId ? thread.messages.find((item) => item.id === message.replyToId) : null;
  const refs = message.memoryRefs?.length ? `<button type="button" class="message-memory-count" data-open-memory="${esc(message.id)}">HROS · ${message.memoryRefs.length}</button>` : '';
  const attachments = message.attachments?.length ? `<div class="message-attachments">${message.attachments.map((file) => `<span><b>⌕</b><small>${esc(file.name)}</small><em>${formatBytes(file.size)}</em></span>`).join('')}</div>` : '';
  return `<article class="messenger-message ${message.role}" data-message-id="${esc(message.id)}">
    <div class="message-bubble">
      ${reply ? `<div class="message-reply-preview"><b>${reply.role === 'user' ? 'Вы' : agentById(thread.agentId).title}</b><span>${esc(reply.text.slice(0, 140))}</span></div>` : ''}
      <p>${linkify(message.text)}</p>${attachments}${refs}
      <footer><time>${formatTime(message.at)}</time>${message.editedAt ? '<span>изменено</span>' : ''}${message.role === 'user' ? `<i title="${message.status === 'read' ? 'Прочитано' : 'Доставлено'}">${message.status === 'read' ? '✓✓' : '✓'}</i>` : ''}</footer>
      <div class="message-actions"><button type="button" data-reply-message="${esc(message.id)}" title="Ответить">↩</button>${message.role === 'user' ? `<button type="button" data-edit-message="${esc(message.id)}" title="Изменить">✎</button>` : ''}<button type="button" data-copy-message="${esc(message.id)}" title="Копировать">⧉</button><button type="button" data-delete-message="${esc(message.id)}" title="Удалить">×</button></div>
    </div>
  </article>`;
}

function renderMessages(thread) {
  let previousDate = '';
  return (thread.messages || []).map((message) => {
    const currentDate = new Date(message.at).toDateString();
    const divider = currentDate !== previousDate ? `<div class="messenger-date-divider"><span>${dateLabel(message.at)}</span></div>` : '';
    previousDate = currentDate;
    return `${divider}${renderMessage(message, thread)}`;
  }).join('');
}

function linkify(value) {
  return esc(value).replace(/\[HROS:([^\]]+)\]/g, '<button type="button" class="inline-memory-ref" data-memory-ref="$1">HROS:$1</button>').replace(/\n/g, '<br>');
}

function formatBytes(size = 0) {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

function renderComposerState(thread) {
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

function lastMemoryRefs(thread) {
  return [...(thread.messages || [])].reverse().find((message) => message.memoryRefs?.length)?.memoryRefs || [];
}

function renderInfo(thread, agent) {
  const refs = lastMemoryRefs(thread);
  return `<aside class="messenger-info ${infoOpen ? 'open' : ''}" aria-label="Контекст агента">
    <div class="messenger-info-profile"><span class="messenger-avatar large accent-${esc(agent.accent)}">${esc(agent.avatar)}</span><h2>${esc(agent.title)}</h2><p>${esc(agent.subtitle)}</p></div>
    <section><span class="messenger-section-label">РЕЖИМ</span><div class="messenger-runtime-card"><i class="${runtime.configured ? 'online' : 'local'}"></i><div><b>${runtime.configured ? 'GPT-агент подключён' : 'Локальный агент памяти'}</b><span>${esc(runtimeLabel())}</span></div></div></section>
    <section><span class="messenger-section-label">ПРАВИЛА</span><ul class="messenger-rule-list"><li>Память HROS доступна только на чтение</li><li>Нет выдуманных перспектив других людей</li><li>Запись только через Change Set</li><li>Источники показываются у ответа</li></ul></section>
    <section><span class="messenger-section-label">ПОСЛЕДНИЕ ИСТОЧНИКИ · ${refs.length}</span><div class="messenger-memory-list">${refs.length ? refs.slice(0, 12).map(memoryCard).join('') : '<p>Источники появятся после вопроса к агенту.</p>'}</div></section>
    <section class="messenger-info-actions"><button type="button" id="pinThread">${thread.pinned ? 'Открепить чат' : 'Закрепить чат'}</button><button type="button" id="muteThread">${thread.muted ? 'Включить уведомления' : 'Отключить уведомления'}</button><button type="button" id="exportThread">Экспортировать JSON</button></section>
  </aside>`;
}

function memoryCard(ref) {
  return `<button type="button" class="messenger-memory-card" data-memory-ref="${esc(ref.id)}"><span>${esc(ref.kind || 'memory')}</span><b>${esc(ref.title || ref.id)}</b><p>${esc(String(ref.statement || '').slice(0, 180))}</p><small>${esc(ref.status || '')} · ${Math.round(Number(ref.confidence ?? 1) * 100)}%</small></button>`;
}

function renderAgentPicker() {
  if (!agentPickerOpen) return '';
  return `<div class="messenger-modal-backdrop" data-close-agent-picker><section class="messenger-agent-picker" role="dialog" aria-modal="true" aria-label="Новый чат"><header><div><span>НОВЫЙ ЧАТ</span><h2>Выберите GPT-агента</h2></div><button type="button" data-close-agent-picker>×</button></header>${AGENTS.map((agent) => `<button type="button" data-create-agent-chat="${esc(agent.id)}"><span class="messenger-avatar accent-${esc(agent.accent)}">${esc(agent.avatar)}</span><div><b>${esc(agent.title)}</b><small>${esc(agent.subtitle)}</small></div><i>›</i></button>`).join('')}</section></div>`;
}

function render() {
  if (!isOpen) return;
  const root = createRoot();
  const thread = activeThread();
  const agent = agentById(thread.agentId);
  root.setAttribute('aria-hidden', 'false');
  root.innerHTML = `<div class="messenger-shell ${infoOpen ? 'info-visible' : ''}">
    <aside class="messenger-sidebar">
      <header class="messenger-sidebar-header"><button type="button" id="messengerClose" aria-label="Закрыть мессенджер">‹</button><div><b>HROS</b><span>Messenger</span></div><button type="button" id="newAgentChat" aria-label="Новый чат">＋</button></header>
      <label class="messenger-search"><span>⌕</span><input id="messengerSearch" value="${esc(searchText)}" placeholder="Поиск" autocomplete="off"><button type="button" id="clearMessengerSearch" ${searchText ? '' : 'hidden'}>×</button></label>
      <nav class="messenger-folders"><button class="active" type="button">Все</button><button type="button" data-folder-agent="diary">Дневник</button><button type="button" data-folder-agents>Агенты</button></nav>
      <div class="messenger-thread-list">${renderThreadList()}</div>
      <footer><span>${snapshot?.records?.length || 0} записей HROS</span><b>${repository.mode === 'api' ? 'API' : 'LOCAL'}</b></footer>
    </aside>

    <main class="messenger-chat">
      <header class="messenger-chat-header"><button type="button" id="messengerMobileBack" class="mobile-only">‹</button><span class="messenger-avatar accent-${esc(agent.accent)}">${esc(agent.avatar)}</span><div><h1>${esc(thread.title)}</h1><span><i class="${runtime.configured ? 'online' : 'local'}"></i>${esc(runtimeLabel())}</span></div><div class="messenger-header-actions"><button type="button" id="prepareChangeSet" title="Подготовить Change Set">Зафиксировать</button><button type="button" id="toggleMessengerInfo" aria-label="Информация">ⓘ</button><button type="button" id="messengerMenu" aria-label="Меню">⋮</button></div></header>
      <div class="messenger-chat-background"><section class="messenger-messages" id="messengerMessages">${renderMessages(thread)}${isTyping ? `<article class="messenger-message assistant"><div class="message-bubble typing"><i></i><i></i><i></i></div></article>` : ''}</section></div>
      ${renderComposerState(thread)}
      <footer class="messenger-composer"><button type="button" id="attachMessage" aria-label="Прикрепить файл">⌕</button><input type="file" id="messengerFileInput" multiple hidden><textarea id="messengerComposer" rows="1" placeholder="Сообщение" aria-label="Сообщение"></textarea><button type="button" id="messengerEmoji" aria-label="Эмодзи">☺</button><button type="button" id="sendMessengerMessage" aria-label="Отправить">➤</button></footer>
    </main>
    ${renderInfo(thread, agent)}
  </div>${renderAgentPicker()}`;
  bindEvents(root);
  requestAnimationFrame(() => {
    const messages = root.querySelector('#messengerMessages');
    if (messages) messages.scrollTop = messages.scrollHeight;
    resizeComposer();
  });
}

function bindEvents(root) {
  root.querySelector('#messengerClose')?.addEventListener('click', closeMessenger);
  root.querySelector('#messengerMobileBack')?.addEventListener('click', () => root.classList.toggle('show-sidebar'));
  root.querySelector('#newAgentChat')?.addEventListener('click', () => { agentPickerOpen = true; render(); });
  root.querySelectorAll('[data-close-agent-picker]').forEach((element) => element.addEventListener('click', (event) => {
    if (event.target.closest('[data-create-agent-chat]')) return;
    agentPickerOpen = false; render();
  }));
  root.querySelectorAll('[data-create-agent-chat]').forEach((button) => button.addEventListener('click', () => {
    newThread(button.dataset.createAgentChat); agentPickerOpen = false; render();
  }));
  root.querySelectorAll('[data-thread-id]').forEach((button) => button.addEventListener('click', () => {
    activeThreadId = button.dataset.threadId; activeThread().unread = 0; replyTargetId = editingMessageId = null; pendingAttachments = []; saveThreads(); root.classList.remove('show-sidebar'); render();
  }));
  const search = root.querySelector('#messengerSearch');
  search?.addEventListener('input', () => { searchText = search.value; render(); requestAnimationFrame(() => { const next = document.querySelector('#messengerSearch'); next?.focus(); next?.setSelectionRange(searchText.length, searchText.length); }); });
  root.querySelector('#clearMessengerSearch')?.addEventListener('click', () => { searchText = ''; render(); });
  root.querySelector('[data-folder-agent]')?.addEventListener('click', () => { searchText = agentById(root.querySelector('[data-folder-agent]').dataset.folderAgent).title; render(); });
  root.querySelector('[data-folder-agents]')?.addEventListener('click', () => { searchText = ''; agentPickerOpen = true; render(); });
  root.querySelector('#sendMessengerMessage')?.addEventListener('click', sendMessage);
  const composer = root.querySelector('#messengerComposer');
  composer?.addEventListener('input', resizeComposer);
  composer?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  });
  root.querySelector('#attachMessage')?.addEventListener('click', () => root.querySelector('#messengerFileInput')?.click());
  root.querySelector('#messengerFileInput')?.addEventListener('change', (event) => {
    pendingAttachments.push(...[...event.target.files].map((file) => ({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified })));
    render();
  });
  root.querySelector('#messengerEmoji')?.addEventListener('click', () => {
    const composerElement = root.querySelector('#messengerComposer');
    composerElement.value += composerElement.value ? ' 🙂' : '🙂'; composerElement.focus(); resizeComposer();
  });
  root.querySelector('#toggleMessengerInfo')?.addEventListener('click', () => { infoOpen = !infoOpen; localStorage.setItem(SETTINGS_KEY, JSON.stringify({ infoOpen })); render(); });
  root.querySelector('#prepareChangeSet')?.addEventListener('click', prepareChangeSet);
  root.querySelector('#cancelComposerState')?.addEventListener('click', () => { replyTargetId = editingMessageId = null; pendingAttachments = []; render(); });
  root.querySelectorAll('[data-reply-message]').forEach((button) => button.addEventListener('click', () => { replyTargetId = button.dataset.replyMessage; editingMessageId = null; render(); document.querySelector('#messengerComposer')?.focus(); }));
  root.querySelectorAll('[data-edit-message]').forEach((button) => button.addEventListener('click', () => {
    const message = activeThread().messages.find((item) => item.id === button.dataset.editMessage); if (!message) return;
    editingMessageId = message.id; replyTargetId = null; render(); const input = document.querySelector('#messengerComposer'); input.value = message.text; input.focus(); resizeComposer();
  }));
  root.querySelectorAll('[data-copy-message]').forEach((button) => button.addEventListener('click', async () => {
    const message = activeThread().messages.find((item) => item.id === button.dataset.copyMessage); if (message) await navigator.clipboard?.writeText(message.text);
  }));
  root.querySelectorAll('[data-delete-message]').forEach((button) => button.addEventListener('click', () => {
    if (!confirm('Удалить сообщение из этого чата?')) return;
    const thread = activeThread(); thread.messages = thread.messages.filter((item) => item.id !== button.dataset.deleteMessage); thread.updatedAt = now(); saveThreads(); render();
  }));
  root.querySelectorAll('[data-open-memory],[data-memory-ref]').forEach((button) => button.addEventListener('click', () => { infoOpen = true; render(); }));
  root.querySelector('#pinThread')?.addEventListener('click', () => { const thread = activeThread(); thread.pinned = !thread.pinned; saveThreads(); render(); });
  root.querySelector('#muteThread')?.addEventListener('click', () => { const thread = activeThread(); thread.muted = !thread.muted; saveThreads(); render(); });
  root.querySelector('#exportThread')?.addEventListener('click', exportThread);
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
    if (message) { message.text = text; message.editedAt = now(); }
    editingMessageId = null; pendingAttachments = []; thread.updatedAt = now(); saveThreads(); render(); return;
  }
  const userMessage = {
    id: id('message'), role: 'user', text: text || 'Вложение', at: now(), status: 'delivered',
    replyToId: replyTargetId, attachments: clone(pendingAttachments), memoryRefs: [],
  };
  thread.messages.push(userMessage); thread.updatedAt = userMessage.at; replyTargetId = null; pendingAttachments = []; saveThreads(); isTyping = true; render();
  try {
    const result = await askAgent(thread, userMessage.text);
    userMessage.status = 'read';
    thread.messages.push({
      id: id('message'), role: 'assistant', text: result.reply, at: now(), status: 'delivered',
      memoryRefs: result.memoryRefs || [], runtime: result.runtime || runtime,
    });
    thread.updatedAt = now();
  } catch (error) {
    thread.messages.push({ id: id('message'), role: 'assistant', text: `Не удалось получить ответ GPT-агента. ${error.message}`, at: now(), status: 'error', memoryRefs: [] });
    recordEvent('error', 'messenger.agent', { agentId: thread.agentId, message: error.message });
  } finally {
    isTyping = false; saveThreads(); render();
  }
}

async function askAgent(thread, message) {
  const history = thread.messages.slice(-24, -1).filter((item) => ['user', 'assistant'].includes(item.role)).map((item) => ({ role: item.role, text: item.text }));
  if (repository.mode === 'api' && runtime.configured) {
    const response = await fetch(`${repository.apiUrl}/agents/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: thread.agentId, conversationId: thread.id, message, history, memoryLimit: 18 }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || `HTTP ${response.status}`);
    return payload;
  }
  return localAgentReply(thread.agentId, message);
}

function localMemory(query, limit = 12) {
  const tokens = new Set((query.toLowerCase().match(/[0-9a-zа-яё_-]{3,}/gi) || []));
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
  const citations = memoryRefs.slice(0, 4).map((item) => `[HROS:${item.id}]`).join(' ');
  const memoryNote = memoryRefs.length ? `Я нашёл ${memoryRefs.length} релевантных записей в памяти HROS. ${citations}` : 'Прямых совпадений в подтверждённой памяти HROS пока не найдено.';
  const reply = {
    diary: `${memoryNote}\n\nЧто в этой ситуации было наблюдаемым действием или высказыванием, а что является вашей интерпретацией?`,
    relationship: `${memoryNote}\n\nДля анализа нужно разделить четыре слоя: факты, вашу перспективу, неизвестную пока перспективу другого человека и гипотезу о динамике отношений. Какое конкретное действие вы хотите разобрать первым?`,
    memory: `${memoryNote}\n\nОткройте источники справа: там показаны тип, статус и уверенность каждой найденной записи.`,
    navigator: `${memoryNote}\n\nСледующее безопасное действие: уточнить цель, затем открыть соответствующего человека, момент или дневниковую сессию. Что должно измениться после этого разговора?`,
    avatar: `${memoryNote}\n\nИзменение образа должно быть обратимым и опираться на подтверждённую роль или увлечение. Какую форму вы рассматриваете: базовую, профессиональную, спортивную или семейную?`,
  }[agentId] || memoryNote;
  return { reply, memoryRefs, runtime: { configured: false, provider: 'local', model: 'HROS Memory Gateway', runtime: 'local' }, confirmationRequired: true, writeApplied: false };
}

async function prepareChangeSet() {
  const thread = activeThread();
  const messages = thread.messages.filter((message) => ['user', 'assistant'].includes(message.role) && !message.systemGenerated).map((message) => ({
    id: message.id, role: message.role, text: message.text, at: message.at,
  }));
  if (!messages.some((message) => message.role === 'user')) {
    alert('Сначала добавьте хотя бы одно сообщение.'); return;
  }
  closeMessenger();
  if (window.__HROS_DIARY__?.importConversation) {
    await window.__HROS_DIARY__.importConversation({ topic: thread.title, messages, sourceAgentId: thread.agentId, conversationId: thread.id });
  } else {
    document.querySelector('.topbar nav [data-diary-view]')?.click();
  }
}

function exportThread() {
  const thread = activeThread();
  const blob = new Blob([JSON.stringify({ product: 'HROS', type: 'messenger_thread', exportedAt: now(), thread }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `hros-chat-${thread.id}.json`; link.click(); URL.revokeObjectURL(link.href);
}

async function boot() {
  await waitReady();
  repository = await createRepository();
  snapshot = await repository.getSnapshot();
  infoOpen = readJSON(SETTINGS_KEY, { infoOpen: true }).infoOpen !== false;
  ensureThreads();
  await loadRuntime();
  createRoot();
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isOpen && !agentPickerOpen) closeMessenger(); });
  window.__HROS_MESSENGER__ = {
    ready: true,
    open: openMessenger,
    close: closeMessenger,
    getThreads: () => clone(threads),
    getRuntime: () => clone(runtime),
    storageKey: THREADS_KEY,
  };
}

boot().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('beforeend', `<div class="alignment-fatal">HROS Messenger: ${esc(error.message)}</div>`);
});
