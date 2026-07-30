import { createRepository } from './repository.js';
import { HROS_VERSION, KIND_COLLECTIONS, RECORD_KINDS } from './domain-v1.js';

const labels = {
  evidence: 'Свидетельство', fact: 'Факт', perspective: 'Перспектива', action: 'Действие',
  person_facet: 'Грань личности', relationship_state: 'Состояние отношений', observation: 'Наблюдение',
  hypothesis: 'Гипотеза', verification: 'Проверка', pattern: 'Паттерн', principle: 'Принцип',
  original_memory: 'Original Memory', semantic_memory: 'Semantic Memory', living_memory: 'Living Memory',
  interview_session: 'Интервью', interview_question: 'Вопрос', interview_answer: 'Ответ',
  book_chapter: 'Глава', narrative_fragment: 'Фрагмент книги', consent_policy: 'Согласие'
};
const statusLabels = { draft:'черновик', observed:'наблюдение', hypothesis:'гипотеза', confirmed:'подтверждено', disputed:'оспаривается', finalized:'финализировано', archived:'архив' };
const visibilityLabels = { private:'только мне', shared_with_partner:'поделиться с партнёром', shared:'совместная запись', group:'группа' };
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[character]));
const byId = (items = []) => new Map(items.map((item) => [item.id, item]));

let repository;
let snapshot;
let currentView = null;

function waitFor(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    const observer = new MutationObserver(() => {
      const item = document.querySelector(selector);
      if (item) { observer.disconnect(); resolve(item); }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error(`Не найден ${selector}`)); }, timeout);
  });
}

function ensureDialog() {
  if (document.querySelector('#recordDialog')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="recordDialog" class="modal record-dialog">
      <form id="recordForm">
        <header><div><span class="eyebrow">HROS v1 · KNOWLEDGE RECORD</span><h2>Новая смысловая запись</h2></div><button type="button" class="icon-button" data-record-close>×</button></header>
        <div class="form-grid record-form-grid">
          <label>Тип<select name="kind">${RECORD_KINDS.map((kind) => `<option value="${kind}">${esc(labels[kind] || kind)}</option>`).join('')}</select></label>
          <label>Статус<select name="status"><option value="draft">Черновик</option><option value="observed" selected>Наблюдение</option><option value="hypothesis">Гипотеза</option><option value="confirmed">Подтверждено</option><option value="disputed">Оспаривается</option><option value="finalized">Финализировано</option></select></label>
          <label class="wide">Содержание<textarea required name="statement" rows="5" placeholder="Отделяйте произошедшее от интерпретации"></textarea></label>
          <label>Владелец перспективы<select name="perspectiveOwnerId" id="recordPerspectiveOwner"><option value="">Не указан</option></select></label>
          <label>Человек<select name="subjectId" id="recordSubject"><option value="">Не связан</option></select></label>
          <label>Отношение<select name="relationshipId" id="recordRelationship"><option value="">Не связано</option></select></label>
          <label>Момент<select name="momentId" id="recordMoment"><option value="">Не связан</option></select></label>
          <label>Видимость<select name="visibility"><option value="private" selected>Только мне</option><option value="shared_with_partner">Поделиться с партнёром</option><option value="shared">Совместная запись</option><option value="group">Группа</option></select></label>
          <label>Уверенность<input type="number" name="confidence" min="0" max="1" step="0.05" value="1"></label>
          <label>Источник<select name="sourceKind"><option value="user">Пользователь</option><option value="voice">Голос</option><option value="message">Переписка</option><option value="document">Документ</option><option value="ai">AI-оценка</option><option value="system">Система</option></select></label>
          <label>Название источника<input name="sourceLabel" value="Добавлено пользователем"></label>
          <label class="wide">Структурированные данные JSON<textarea name="dataJson" rows="4" placeholder='{"verificationQuestion":"..."}'></textarea></label>
        </div>
        <footer><button type="button" class="secondary" data-record-close>Отмена</button><button type="submit" class="primary">Сохранить запись</button></footer>
      </form>
    </dialog>`);
  document.querySelectorAll('[data-record-close]').forEach((button) => button.addEventListener('click', () => document.querySelector('#recordDialog').close()));
  document.querySelector('#recordForm').addEventListener('submit', saveRecord);
}

function populateRecordSelectors() {
  const people = snapshot.people || [];
  const peopleOptions = people.map((person) => `<option value="${person.id}">${esc(person.name)} · ${esc(person.role)}</option>`).join('');
  document.querySelector('#recordPerspectiveOwner').innerHTML = `<option value="">Не указан</option>${peopleOptions}`;
  document.querySelector('#recordSubject').innerHTML = `<option value="">Не связан</option>${peopleOptions}`;
  const names = byId(people);
  document.querySelector('#recordRelationship').innerHTML = `<option value="">Не связано</option>${(snapshot.relationships || []).map((rel) => `<option value="${rel.id}">${esc(names.get(rel.sourceId)?.name)} ↔ ${esc(names.get(rel.targetId)?.name)} · ${esc(rel.label)}</option>`).join('')}`;
  document.querySelector('#recordMoment').innerHTML = `<option value="">Не связан</option>${(snapshot.moments || []).map((moment) => `<option value="${moment.id}">${esc(moment.title)} · ${esc(moment.date)}</option>`).join('')}`;
}

async function saveRecord(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  let structured = {};
  const raw = String(data.get('dataJson') || '').trim();
  if (raw) {
    try { structured = JSON.parse(raw); } catch { throw new Error('Структурированные данные должны быть корректным JSON'); }
  }
  const payload = {
    kind: data.get('kind'), statement: String(data.get('statement') || '').trim(), status: data.get('status'),
    confidence: Number(data.get('confidence')), visibility: data.get('visibility'),
    perspectiveOwnerId: data.get('perspectiveOwnerId') || null,
    subjectIds: data.get('subjectId') ? [data.get('subjectId')] : [],
    relationshipIds: data.get('relationshipId') ? [data.get('relationshipId')] : [],
    momentIds: data.get('momentId') ? [data.get('momentId')] : [], data: structured,
    source: { kind: data.get('sourceKind'), label: String(data.get('sourceLabel') || '').trim() || 'Не указан' }
  };
  await repository.createRecord(payload);
  snapshot = await repository.getSnapshot();
  document.querySelector('#recordDialog').close();
  event.currentTarget.reset();
  renderCurrent();
}

function addNavigation() {
  const nav = document.querySelector('.topbar nav');
  if (!nav || nav.querySelector('[data-v1-view]')) return;
  const diagnostics = nav.querySelector('[data-view="diagnostics"]');
  const buttons = [
    ['knowledge', 'Знания'], ['couple', 'Пара'], ['book', 'Книга']
  ].map(([view, label]) => `<button type="button" data-v1-view="${view}">${label}</button>`).join('');
  diagnostics?.insertAdjacentHTML('beforebegin', buttons);
  nav.querySelectorAll('[data-v1-view]').forEach((button) => button.addEventListener('click', () => openView(button.dataset.v1View)));
  nav.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    currentView = null;
    nav.querySelectorAll('[data-v1-view]').forEach((item) => item.classList.remove('active'));
  }));
}

function setActive(view) {
  const nav = document.querySelector('.topbar nav');
  nav?.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button.dataset.v1View === view));
}

async function openView(view) {
  snapshot = await repository.getSnapshot();
  currentView = view;
  setActive(view);
  document.querySelector('#viewRoot').innerHTML = '';
  renderCurrent();
}

function renderCurrent() {
  if (currentView === 'knowledge') renderKnowledge();
  if (currentView === 'couple') renderCouple();
  if (currentView === 'book') renderBook();
}

function recordCard(item) {
  const people = byId(snapshot.people);
  const owner = item.perspectiveOwnerId ? people.get(item.perspectiveOwnerId) : null;
  return `<article class="knowledge-card" data-record-id="${item.id}">
    <div class="knowledge-card-head"><span class="kind-chip kind-${item.kind}">${esc(labels[item.kind] || item.kind)}</span><span class="visibility-chip visibility-${item.visibility}">${esc(visibilityLabels[item.visibility] || item.visibility)}</span></div>
    <p>${esc(item.statement)}</p>
    <div class="record-meta"><span>${esc(statusLabels[item.status] || item.status)}</span><span>уверенность ${Math.round((item.confidence ?? 1) * 100)}%</span>${owner ? `<span>перспектива: ${esc(owner.name)}</span>` : ''}<span>v${item.version || 1}</span></div>
    <small>Источник: ${esc(item.source?.label || 'не указан')}</small>
  </article>`;
}

function renderKnowledge() {
  const records = snapshot.records || [];
  const root = document.querySelector('#viewRoot');
  const groups = ['evidence','fact','perspective','action','person_facet','relationship_state','observation','hypothesis','verification','pattern','principle'];
  root.innerHTML = `<section class="content-panel glass alignment-view">
    <div class="content-header"><div><span class="eyebrow">KNOWLEDGE PIPELINE · HROS v1</span><h1>Знания без подмены фактов</h1><p>Источник → свидетельство → факт → перспектива → наблюдение → гипотеза → проверка → паттерн → принцип.</p></div><button class="primary" data-add-record>+ Запись</button></div>
    <div class="stats-row">${[['Записей',records.length],['Перспектив',snapshot.perspectives?.length||0],['Гипотез',snapshot.hypotheses?.length||0],['Принципов',snapshot.principles?.length||0]].map(([label,value])=>`<div class="stat-card"><b>${value}</b><span>${label}</span></div>`).join('')}</div>
    <div class="knowledge-pipeline">${groups.map((kind,index)=>`<div class="pipeline-step"><span>${String(index+1).padStart(2,'0')}</span><b>${esc(labels[kind])}</b><small>${records.filter((item)=>item.kind===kind).length}</small></div>`).join('')}</div>
    <section class="memory-layers"><div><span class="eyebrow">THREE-LEVEL MEMORY</span><h2>Три уровня памяти</h2></div>
      <div class="memory-grid">${['original_memory','semantic_memory','living_memory'].map((kind)=>`<article><b>${esc(labels[kind])}</b>${records.filter((item)=>item.kind===kind).map((item)=>`<p>${esc(item.statement)}</p>`).join('')||'<p>Нет записей</p>'}</article>`).join('')}</div>
    </section>
    <div class="knowledge-list">${records.filter((item)=>groups.includes(item.kind)).map(recordCard).join('')}</div>
  </section>`;
  root.querySelector('[data-add-record]').addEventListener('click', () => { populateRecordSelectors(); document.querySelector('#recordDialog').showModal(); });
}

function renderCouple() {
  const root = document.querySelector('#viewRoot');
  const people = byId(snapshot.people);
  const privateMikhail = (snapshot.records||[]).filter((item)=>item.visibility==='private'&&item.perspectiveOwnerId==='person-mikhail');
  const privateSnezha = (snapshot.records||[]).filter((item)=>item.visibility==='private'&&item.perspectiveOwnerId==='person-snezha');
  const shared = (snapshot.records||[]).filter((item)=>['shared','shared_with_partner'].includes(item.visibility)&&((item.subjectIds||[]).includes('person-snezha')||(item.relationshipIds||[]).includes('rel-mikhail-snezha')));
  root.innerHTML = `<section class="content-panel glass alignment-view">
    <div class="content-header"><div><span class="eyebrow">COUPLE MODE</span><h1>Три пространства пары</h1><p>Личные перспективы не смешиваются с совместно подтверждёнными записями.</p></div><button class="primary" data-add-record>+ Перспектива</button></div>
    <div class="couple-layout">
      <section class="privacy-space private-space"><span class="eyebrow">PRIVATE</span><h2>${esc(people.get('person-mikhail')?.name||'Михаил')}</h2><p>Только владелец пространства.</p>${privateMikhail.map(recordCard).join('')||'<div class="empty-state">Нет приватных записей.</div>'}</section>
      <section class="privacy-space shared-space"><span class="eyebrow">SHARED</span><h2>Совместное пространство</h2><p>Только явно опубликованные или совместные записи.</p>${shared.map(recordCard).join('')||'<div class="empty-state">Нет совместных записей.</div>'}</section>
      <section class="privacy-space private-space"><span class="eyebrow">PRIVATE</span><h2>${esc(people.get('person-snezha')?.name||'Снежа')}</h2><p>HROS не предполагает содержание отсутствующей перспективы.</p>${privateSnezha.map(recordCard).join('')||'<div class="empty-state">Перспектива не зафиксирована.</div>'}</section>
    </div>
    <section class="interview-panel"><span class="eyebrow">INTERVIEW ENGINE · CONTRACT</span><h2>Следующий проверочный вопрос</h2>${(snapshot.interviewSessions||[]).map((item)=>`<article><p>${esc(item.statement)}</p><b>${esc(item.data?.nextQuestion||'Вопрос не задан')}</b><small>${esc(item.data?.state||item.status)}</small></article>`).join('')}</section>
  </section>`;
  root.querySelector('[data-add-record]').addEventListener('click', () => { populateRecordSelectors(); const form=document.querySelector('#recordForm');form.elements.kind.value='perspective';form.elements.visibility.value='private';document.querySelector('#recordDialog').showModal(); });
}

function renderBook() {
  const root = document.querySelector('#viewRoot');
  const records = byId(snapshot.records);
  const chapters = snapshot.bookChapters || [];
  root.innerHTML = `<section class="content-panel glass alignment-view book-view">
    <div class="content-header"><div><span class="eyebrow">RELATIONSHIP BOOK</span><h1>Книга отношений</h1><p>Главы создаются из проверяемой цепочки источников, перспектив, паттернов и принципов.</p></div><button class="primary" data-add-record>+ Принцип</button></div>
    <blockquote class="foundation-quote">«${esc(snapshot.meta?.principle)}»</blockquote>
    <div class="book-chapters">${chapters.map((chapter)=>{
      const principles=(chapter.supportsIds||[]).map((id)=>records.get(id)).filter(Boolean);
      const fragments=(snapshot.narrativeFragments||[]).filter((item)=>item.data?.chapterId===chapter.id);
      return `<article class="book-chapter"><span class="eyebrow">ГЛАВА ${esc(chapter.data?.order||'')}</span><h2>${esc(chapter.data?.title||chapter.statement)}</h2><p>${esc(chapter.statement)}</p>${principles.map((item)=>`<div class="principle-card"><b>Принцип</b><p>${esc(item.statement)}</p><small>${item.evidenceIds?.length||0} свидетельств · ${item.supportsIds?.length||0} оснований · ${esc(visibilityLabels[item.visibility]||item.visibility)}</small></div>`).join('')}${fragments.map((item)=>`<blockquote>${esc(item.statement)}</blockquote>`).join('')}</article>`;}).join('')}</div>
  </section>`;
  root.querySelector('[data-add-record]').addEventListener('click', () => { populateRecordSelectors();const form=document.querySelector('#recordForm');form.elements.kind.value='principle';form.elements.visibility.value='private';document.querySelector('#recordDialog').showModal(); });
}

function enforceVersionLabel() {
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = `Human Relationship Operating System · v${HROS_VERSION}`;
  document.title = `HROS v${HROS_VERSION} — Human Relationship Operating System`;
}

async function boot() {
  await waitFor('.topbar');
  repository = await createRepository();
  snapshot = await repository.getSnapshot();
  ensureDialog();
  addNavigation();
  enforceVersionLabel();
  const observer = new MutationObserver(() => { addNavigation(); enforceVersionLabel(); });
  observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  window.__HROS_V1__ = { ready: true, version: HROS_VERSION, repositoryMode: repository.mode, openView };
}

boot().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('beforeend', `<div class="alignment-fatal">HROS v1: ${esc(error.message)}</div>`);
});
