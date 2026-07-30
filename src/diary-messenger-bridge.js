import { createRepository } from './repository.js';

const DRAFT_KEY = 'hros.diary.active.v1';
const iso = () => new Date().toISOString();
const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

function waitForDiary(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.__HROS_DIARY__?.ready) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error('ИИ-дневник не готов'));
      }
    }, 50);
  });
}

async function importConversation(payload) {
  const repository = await createRepository();
  const snapshot = await repository.getSnapshot();
  const owner = (snapshot.people || []).find((person) => person.isSelf) || snapshot.people?.[0];
  const messages = (payload.messages || [])
    .filter((message) => ['user', 'assistant'].includes(message.role) && String(message.text || '').trim())
    .map((message) => ({
      id: message.id || newId('diary-message'),
      role: message.role,
      text: String(message.text).trim(),
      at: message.at || iso(),
      sourceConversationId: payload.conversationId || null,
      sourceAgentId: payload.sourceAgentId || null,
    }));
  if (!messages.some((message) => message.role === 'user')) throw new Error('В беседе нет сообщений пользователя');

  const session = {
    id: newId('diary-session'),
    state: 'active',
    topic: payload.topic || 'Диалог с GPT-агентом HROS',
    participantId: owner?.id || null,
    relationshipId: payload.relationshipId || '',
    momentId: payload.momentId || '',
    startedAt: messages[0]?.at || iso(),
    messages,
    changeSet: null,
    confirmation: null,
    commitResult: null,
    source: {
      kind: 'hros_messenger',
      conversationId: payload.conversationId || null,
      agentId: payload.sourceAgentId || null,
    },
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(session));
  await window.__HROS_DIARY__.open();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const finish = document.querySelector('#diaryFinish');
  if (!finish) throw new Error('Не удалось открыть проверку Change Set');
  finish.click();
}

waitForDiary()
  .then(() => {
    window.__HROS_DIARY__.importConversation = importConversation;
  })
  .catch((error) => console.error(error));
