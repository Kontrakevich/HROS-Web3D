import './diary-v1.css';
import { createRepository } from './repository.js';
import { normalizeRecord } from './domain-v1.js';

const DRAFT='hros.diary.active.v1', HISTORY='hros.diary.history.v1';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const id=p=>`${p}-${crypto.randomUUID()}`, iso=()=>new Date().toISOString();
let repo,snapshot,session,isOpen=false;

const questions=[
  'Кто участвовал и что именно было сделано или сказано?',
  'Что является наблюдаемым фактом, а что — вашей интерпретацией?',
  'Что вы почувствовали и какие потребности или границы оказались затронуты?',
  'Как это повлияло на отношения и к чему привело?',
  'Что известно о позиции другого человека точно, а что пока остаётся неизвестным?',
  'Какую формулировку вы хотели бы сохранить в HROS после проверки?'
];

function waitReady(){return new Promise((resolve,reject)=>{const started=Date.now(),timer=setInterval(()=>{if(window.__HROS_V1__?.ready&&document.querySelector('.topbar nav')){clearInterval(timer);resolve()}else if(Date.now()-started>12000){clearInterval(timer);reject(new Error('HROS v1 не готов'))}},50)})}
function load(){try{return JSON.parse(localStorage.getItem(DRAFT)||'null')}catch{return null}}
function save(){session?localStorage.setItem(DRAFT,JSON.stringify(session)):localStorage.removeItem(DRAFT)}
function history(entry){let list=[];try{list=JSON.parse(localStorage.getItem(HISTORY)||'[]')}catch{}list.unshift(entry);localStorage.setItem(HISTORY,JSON.stringify(list.slice(0,100)))}
function self(){return snapshot.people.find(x=>x.isSelf)||snapshot.people[0]}
function makeSession(){const owner=self();return{id:id('diary-session'),state:'active',topic:'',participantId:owner?.id||null,relationshipId:'',momentId:'',startedAt:iso(),messages:[{id:id('diary-message'),role:'assistant',text:'Что сегодня произошло и почему это важно для вас?',at:iso()}],changeSet:null,confirmation:null,commitResult:null}}
function addNav(){const nav=document.querySelector('.topbar nav');if(!nav)return;let b=nav.querySelector('[data-diary-view]');if(!b){nav.insertAdjacentHTML('afterbegin','<button type="button" data-diary-view>ИИ-дневник</button>');b=nav.querySelector('[data-diary-view]');b.addEventListener('click',openDiary)}if(!nav.dataset.diaryBound){nav.dataset.diaryBound='1';nav.addEventListener('click',e=>{if(!e.target.closest('[data-diary-view]'))isOpen=false})}}
function activeNav(){document.querySelectorAll('.topbar nav button').forEach(b=>b.classList.toggle('active',Boolean(b.dataset.diaryView)))}
async function openDiary(){isOpen=true;snapshot=await repo.getSnapshot();session=load();activeNav();render()}
function root(){return document.querySelector('#viewRoot')}
function render(){if(!isOpen)return;if(!session)return welcome();if(session.state==='review')return review();if(session.state==='committed')return committed();active()}

function welcome(){
  root().innerHTML=`<section class="content-panel glass diary-view">
    <div class="content-header diary-hero"><div><span class="eyebrow">PRIMARY INPUT · AI DIARY</span><h1>Живой диалог — основной источник HROS</h1><p>Граф и связи производны от разговора. Изменения попадают в модель только после просмотра, ручной правки и явного подтверждения.</p></div><button class="primary" id="diaryStart">Начать сессию</button></div>
    <blockquote class="foundation-quote">«Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит».</blockquote>
    <div class="diary-principles"><article><b>Диалог первичен</b><p>Естественный рассказ вместо заполнения графа.</p></article><article><b>Источник сохраняется</b><p>Транскрипт становится Original Memory.</p></article><article><b>ИИ предлагает</b><p>Факты и гипотезы не смешиваются.</p></article><article><b>Человек подтверждает</b><p>Change Set можно исправить или отклонить.</p></article></div>
    <div class="diary-status-note"><b>Текущий режим</b><span>Работает безопасный guided-dialogue. Внешняя LLM-оркестрация не имитируется и подключается отдельным skill.</span></div>
  </section>`;
  document.querySelector('#diaryStart').onclick=()=>{session=makeSession();save();render()}
}

function options(){
  const people=snapshot.people||[],rels=snapshot.relationships||[],moments=snapshot.moments||[];
  return{
    people:people.map(p=>`<option value="${esc(p.id)}" ${p.id===session.participantId?'selected':''}>${esc(p.name)} · ${esc(p.role)}</option>`).join(''),
    rels:`<option value="">Не выбрано</option>${rels.map(r=>{const a=people.find(p=>p.id===r.sourceId)?.name||r.sourceId,b=people.find(p=>p.id===r.targetId)?.name||r.targetId;return`<option value="${esc(r.id)}" ${r.id===session.relationshipId?'selected':''}>${esc(a)} ↔ ${esc(b)} · ${esc(r.label)}</option>`}).join('')}`,
    moments:`<option value="">Не выбрано</option>${moments.map(m=>`<option value="${esc(m.id)}" ${m.id===session.momentId?'selected':''}>${esc(m.title)} · ${esc(m.date)}</option>`).join('')}`
  }
}

function active(){
  const o=options(),users=session.messages.filter(m=>m.role==='user');
  root().innerHTML=`<section class="content-panel glass diary-view">
    <div class="content-header"><div><span class="eyebrow">DIARY SESSION · ACTIVE</span><h1>Живой диалог с ИИ-дневником</h1><p>Черновик изолирован: основные данные HROS пока не изменяются.</p></div><div class="diary-actions"><button class="secondary" id="diaryDiscard">Удалить черновик</button><button class="primary" id="diaryFinish" ${users.length?'':'disabled'}>Завершить и проверить</button></div></div>
    <div class="diary-layout"><aside class="diary-context"><span class="eyebrow">КОНТЕКСТ</span><label>Тема<input id="diaryTopic" value="${esc(session.topic)}"></label><label>Чья перспектива<select id="diaryParticipant">${o.people}</select></label><label>Связь<select id="diaryRelationship">${o.rels}</select></label><label>Момент<select id="diaryMoment">${o.moments}</select></label><div class="diary-source-contract"><b>Контракт источника</b><span>${users.length} ответов · private · commit только после confirmation</span></div></aside>
    <section class="diary-chat"><div class="diary-messages" id="diaryMessages">${session.messages.map(m=>`<article class="diary-message ${m.role}"><span>${m.role==='user'?'Вы':'ИИ-дневник'}</span><p>${esc(m.text)}</p></article>`).join('')}</div><div class="diary-compose"><label for="diaryMessage">Ваш ответ</label><textarea id="diaryMessage" rows="4" placeholder="Расскажите свободно"></textarea><button class="primary" id="diarySend">Отправить</button></div></section></div>
  </section>`;
  [['diaryTopic','topic'],['diaryParticipant','participantId'],['diaryRelationship','relationshipId'],['diaryMoment','momentId']].forEach(([el,key])=>document.querySelector(`#${el}`).onchange=e=>{session[key]=e.target.value;save()});
  document.querySelector('#diarySend').onclick=send;
  document.querySelector('#diaryMessage').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))send()};
  document.querySelector('#diaryFinish').onclick=finish;
  document.querySelector('#diaryDiscard').onclick=discard;
  requestAnimationFrame(()=>{const box=document.querySelector('#diaryMessages');box.scrollTop=box.scrollHeight;document.querySelector('#diaryMessage').focus()})
}

function send(){
  const input=document.querySelector('#diaryMessage'),text=input.value.trim();if(!text)return;
  session.messages.push({id:id('diary-message'),role:'user',text,at:iso()});
  const n=session.messages.filter(m=>m.role==='user').length;
  session.messages.push({id:id('diary-message'),role:'assistant',text:questions[Math.min(n-1,questions.length-1)],at:iso()});
  save();render()
}

function finish(){
  const users=session.messages.filter(m=>m.role==='user');if(!users.length)return;
  const joined=users.map(m=>m.text).join('\n\n'),last=users.at(-1).text;
  session.state='review';session.endedAt=iso();session.changeSet={id:id('change-set'),status:'awaiting_confirmation',changes:[
    {id:id('change'),accepted:true,kind:'perspective',statement:joined,status:'observed',confidence:1,visibility:'private',sourceMode:'user'},
    {id:id('change'),accepted:false,kind:'observation',statement:last,status:'observed',confidence:.6,visibility:'private',sourceMode:'ai_draft'},
    {id:id('change'),accepted:false,kind:'hypothesis',statement:'',status:'hypothesis',confidence:.35,visibility:'private',sourceMode:'ai_draft'}
  ]};save();render()
}

const kinds=[['perspective','Перспектива'],['observation','Наблюдение'],['hypothesis','Гипотеза'],['person_facet','Грань личности'],['relationship_state','Состояние отношений'],['semantic_memory','Semantic Memory'],['living_memory','Living Memory']];
function review(){
  const changes=session.changeSet.changes,users=session.messages.filter(m=>m.role==='user');
  root().innerHTML=`<section class="content-panel glass diary-view">
    <div class="content-header"><div><span class="eyebrow">CHANGE SET · REVIEW</span><h1>Проверка изменений</h1><p>Производные записи можно исправить или исключить. До подтверждения snapshot не меняется.</p></div><span class="status-chip review">Ожидает подтверждения</span></div>
    <div class="diary-review-summary"><article><b>${users.length}</b><span>ответов</span></article><article><b id="diaryAccepted">${changes.filter(x=>x.accepted).length}</b><span>выбрано</span></article><article><b>0</b><span>внесено до подтверждения</span></article></div>
    <section class="diary-transcript-preview"><span class="eyebrow">ORIGINAL MEMORY PREVIEW</span><h2>${esc(session.topic||'Сессия без названия')}</h2>${users.map((m,i)=>`<p><b>${i+1}.</b> ${esc(m.text)}</p>`).join('')}</section>
    <section class="diary-change-list"><div class="section-heading"><div><span class="eyebrow">PROPOSED CHANGES</span><h2>Что будет добавлено</h2></div></div>${changes.map((x,i)=>changeCard(x,i)).join('')}</section>
    <label class="diary-confirmation"><input type="checkbox" id="diaryConfirm"> Я проверил формулировки, связи и видимость и подтверждаю внесение выбранных изменений.</label>
    <div class="diary-review-actions"><button class="secondary" id="diaryBack">Вернуться к диалогу</button><button class="danger" id="diaryReject">Отклонить сессию</button><button class="primary" id="diaryCommit" disabled>Подтвердить и внести</button></div><div class="diary-feedback" id="diaryFeedback" aria-live="polite"></div>
  </section>`;
  document.querySelectorAll('[data-change-id]').forEach(card=>{
    const x=changes.find(c=>c.id===card.dataset.changeId);
    card.querySelector('[data-accept]').onchange=e=>{x.accepted=e.target.checked;card.classList.toggle('accepted',x.accepted);document.querySelector('#diaryAccepted').textContent=changes.filter(c=>c.accepted).length;save()};
    card.querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>{x[el.dataset.field]=el.dataset.field==='confidence'?Number(el.value):el.value;save()})
  });
  document.querySelector('#diaryConfirm').onchange=e=>document.querySelector('#diaryCommit').disabled=!e.target.checked;
  document.querySelector('#diaryBack').onclick=()=>{session.state='active';session.changeSet=null;save();render()};
  document.querySelector('#diaryReject').onclick=discard;
  document.querySelector('#diaryCommit').onclick=commit
}
function changeCard(x,i){return`<article class="diary-change ${x.accepted?'accepted':''}" data-change-id="${x.id}"><label class="diary-change-toggle"><input type="checkbox" data-accept ${x.accepted?'checked':''}> Включить изменение ${i+1}</label><div class="diary-change-grid"><label>Тип<select data-field="kind">${kinds.map(([v,l])=>`<option value="${v}" ${v===x.kind?'selected':''}>${l}</option>`).join('')}</select></label><label>Статус<select data-field="status"><option value="observed" ${x.status==='observed'?'selected':''}>Наблюдение</option><option value="hypothesis" ${x.status==='hypothesis'?'selected':''}>Гипотеза</option><option value="draft">Черновик</option><option value="confirmed">Подтверждено</option></select></label><label>Уверенность<input type="number" min="0" max="1" step=".05" value="${x.confidence}" data-field="confidence"></label><label>Видимость<select data-field="visibility"><option value="private">Только мне</option><option value="shared_with_partner">Поделиться с партнёром</option><option value="shared">Совместная запись</option></select></label><label class="wide">Формулировка<textarea rows="4" data-field="statement">${esc(x.statement)}</textarea></label></div><small>${x.sourceMode==='ai_draft'?'Черновая классификация системы: требует проверки.':'Дословная перспектива пользователя.'}</small></article>`}

function discard(){if(!confirm('Удалить черновик сессии? Основные данные HROS не изменятся.'))return;history({sessionId:session?.id,state:'rejected',at:iso()});session=null;save();render()}
function rec({kind,statement,status='observed',confidence=1,visibility='private',perspectiveOwnerId=null,subjectIds=[],relationshipIds=[],momentIds=[],evidenceIds=[],source,data={}}){return{id:id('record'),kind,statement,status,confidence,visibility,perspectiveOwnerId,subjectIds,relationshipIds,momentIds,evidenceIds,supportsIds:[],contradictsIds:[],source,data,version:1,createdAt:iso(),updatedAt:iso()}}

function bundle(){
  const accepted=session.changeSet.changes.filter(x=>x.accepted),users=session.messages.filter(m=>m.role==='user'),links={subjectIds:session.participantId?[session.participantId]:[],relationshipIds:session.relationshipId?[session.relationshipId]:[],momentIds:session.momentId?[session.momentId]:[]},source={kind:'ai_diary',label:'Живой диалог с ИИ-дневником · подтверждено пользователем',sessionId:session.id};
  const s=rec({kind:'interview_session',statement:`Сессия ИИ-дневника: ${session.topic||'без названия'}`,status:'confirmed',perspectiveOwnerId:session.participantId,...links,source,data:{channel:'ai_diary',state:'committed',startedAt:session.startedAt,endedAt:session.endedAt,confirmedAt:iso(),changeSetId:session.changeSet.id}});
  const original=rec({kind:'original_memory',statement:`Дословный транскрипт сессии «${session.topic||'без названия'}»`,status:'finalized',perspectiveOwnerId:session.participantId,...links,source,data:{immutable:true,sessionId:session.id,messages:session.messages}});
  const answers=users.map((m,i)=>rec({kind:'interview_answer',statement:m.text,status:'confirmed',perspectiveOwnerId:session.participantId,...links,evidenceIds:[original.id],source:{...source,messageId:m.id},data:{sessionId:session.id,order:i+1,originalMemoryId:original.id}}));
  const derived=accepted.map(x=>rec({kind:x.kind,statement:x.statement.trim(),status:x.kind==='hypothesis'?'hypothesis':x.status,confidence:Number(x.confidence),visibility:x.visibility,perspectiveOwnerId:['perspective','person_facet','relationship_state','living_memory'].includes(x.kind)?session.participantId:null,...links,evidenceIds:[original.id],source:{...source,kind:x.sourceMode==='ai_draft'?'ai_diary':'user',label:x.sourceMode==='ai_draft'?'ИИ-дневник · черновая классификация, подтверждённая пользователем':'ИИ-дневник · дословная перспектива пользователя'},data:{sessionId:session.id,changeSetId:session.changeSet.id,proposedBy:x.sourceMode==='ai_draft'?'ai':'user',confirmedBy:session.participantId}}));
  const confirmation=rec({kind:'consent_policy',statement:'Пользователь просмотрел и подтвердил выбранные изменения сессии ИИ-дневника.',status:'finalized',perspectiveOwnerId:session.participantId,...links,evidenceIds:[original.id],source:{kind:'user_confirmation',label:'Явное подтверждение в конце сессии',sessionId:session.id},data:{sessionId:session.id,changeSetId:session.changeSet.id,confirmedBy:session.participantId,confirmedAt:iso(),acceptedChangeIds:accepted.map(x=>x.id),rejectedChangeIds:session.changeSet.changes.filter(x=>!x.accepted).map(x=>x.id)}});
  return{records:[s,original,...answers,...derived,confirmation],original,accepted}
}

async function commit(){
  const feedback=document.querySelector('#diaryFeedback'),accepted=session.changeSet.changes.filter(x=>x.accepted);
  if(!accepted.length||accepted.some(x=>!x.statement.trim())){feedback.textContent='Выберите и заполните хотя бы одно изменение.';feedback.className='diary-feedback error';return}
  document.querySelector('#diaryCommit').disabled=true;feedback.textContent='Вносим подтверждённый Change Set…';
  try{
    const b=bundle(),created=[];
    if(repo.mode==='local'&&typeof repo.save==='function'){const current=await repo.getSnapshot();current.records.push(...b.records.map(normalizeRecord));await repo.save(current,'diary.session.commit');created.push(...b.records)}
    else{let originalId=null;for(const r of b.records){const p={...r};delete p.id;delete p.version;delete p.createdAt;delete p.updatedAt;if(originalId&&p.evidenceIds?.includes(b.original.id)){p.evidenceIds=p.evidenceIds.map(x=>x===b.original.id?originalId:x);p.data={...p.data,originalMemoryId:originalId}}const out=await repo.createRecord(p);if(r.kind==='original_memory')originalId=out.id;created.push(out)}}
    session.state='committed';session.confirmation={confirmedBy:session.participantId,confirmedAt:iso(),changeSetId:session.changeSet.id,acceptedChangeIds:accepted.map(x=>x.id),rejectedChangeIds:session.changeSet.changes.filter(x=>!x.accepted).map(x=>x.id)};session.commitResult={recordCount:created.length,derivedCount:accepted.length,originalMemoryCount:1,repositoryMode:repo.mode};history({sessionId:session.id,state:'committed',confirmedAt:session.confirmation.confirmedAt,recordCount:created.length});save();snapshot=await repo.getSnapshot();render()
  }catch(e){feedback.textContent=`Ошибка commit: ${e.message}`;feedback.className='diary-feedback error';document.querySelector('#diaryCommit').disabled=false}
}

function committed(){
  const r=session.commitResult||{};
  root().innerHTML=`<section class="content-panel glass diary-view diary-committed"><span class="eyebrow">SESSION · COMMITTED</span><h1>Сессия подтверждена</h1><p>Изменения внесены только после явного подтверждения. Транскрипт сохранён отдельно от производных записей.</p><div class="stats-row"><div class="stat-card"><b>${r.originalMemoryCount||1}</b><span>Original Memory</span></div><div class="stat-card"><b>${r.derivedCount||0}</b><span>подтверждённых изменений</span></div><div class="stat-card"><b>${r.recordCount||0}</b><span>создано записей</span></div><div class="stat-card"><b>${esc(r.repositoryMode||repo.mode)}</b><span>хранилище</span></div></div><div class="diary-commit-audit"><b>Аудит подтверждения</b><span>Session ID: <code>${esc(session.id)}</code></span><span>Change Set: <code>${esc(session.changeSet.id)}</code></span></div><div class="diary-review-actions"><button class="secondary" id="diaryKnowledge">Открыть знания</button><button class="primary" id="diaryNew">Новая сессия</button></div></section>`;
  document.querySelector('#diaryNew').onclick=()=>{session=makeSession();save();render()};
  document.querySelector('#diaryKnowledge').onclick=()=>document.querySelector('[data-v1-view="knowledge"]')?.click()
}

async function boot(){await waitReady();repo=await createRepository();snapshot=await repo.getSnapshot();session=load();addNav();new MutationObserver(addNav).observe(document.querySelector('#app'),{childList:true,subtree:true});window.__HROS_DIARY__={ready:true,open:openDiary,getSession:()=>structuredClone(session),draftStorageKey:DRAFT}}
boot().catch(e=>{console.error(e);document.body.insertAdjacentHTML('beforeend',`<div class="alignment-fatal">ИИ-дневник: ${esc(e.message)}</div>`)});
