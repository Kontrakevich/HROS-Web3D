const nodes = [
  { id: 'self', label: 'Михаил', x: 600, y: 360, r: 48, kind: 'self', color: '#36d8ff' },
  { id: 'snezha', label: 'Снежа', x: 360, y: 220, r: 32, kind: 'person', color: '#ff48d5' },
  { id: 'vasilisa', label: 'Василиса', x: 885, y: 195, r: 30, kind: 'person', color: '#bfff48' },
  { id: 'work', label: 'Работа', x: 940, y: 430, r: 28, kind: 'domain', color: '#ffb548' },
  { id: 'hros', label: 'HROS', x: 720, y: 555, r: 28, kind: 'domain', color: '#36d8ff' },
  { id: 'health', label: 'Здоровье', x: 455, y: 560, r: 26, kind: 'domain', color: '#3dff8c' },
  { id: 'memory', label: 'Память', x: 240, y: 440, r: 24, kind: 'domain', color: '#ffef71' }
];

const edges = [
  {
    id: 'rel-snezha',
    from: 'self',
    to: 'snezha',
    name: 'Партнёрство',
    label: 'Близость · любовь',
    quality: 'Тёплая, эмоционально значимая, интимная связь',
    strength: 'Высокая',
    dynamics: 'Пульсирует в зависимости от совместных моментов, близости и диалога',
    summary: 'Связь строится на любви, общем времени, совместных планах, близости и ощущении родства.',
    history: [
      { date: 'Шаг 01', title: 'Формирование пары', text: 'Появилась эмоциональная и личная связь, вокруг которой начали выстраиваться общие смыслы и совместная жизнь.' },
      { date: 'Шаг 02', title: 'Совместные моменты', text: 'Путешествия, отдых, интимная близость, совместные дни и диалоги усиливают связь и делают её более тёплой.' },
      { date: 'Шаг 03', title: 'Осознанное влияние друг на друга', text: 'Связь развивается через понимание того, как действия каждого влияют на чувства, близость и качество отношений.' }
    ]
  },
  {
    id: 'rel-vasilisa',
    from: 'self',
    to: 'vasilisa',
    name: 'Отцовство',
    label: 'Забота · наследие',
    quality: 'Глубокая семейная связь, внимание и передача опыта',
    strength: 'Очень высокая',
    dynamics: 'Укрепляется через присутствие, совместные впечатления и заботу',
    summary: 'Связь объединяет любовь, ответственность, передачу опыта и желание сохранить близость на длинной дистанции жизни.',
    history: [
      { date: 'Шаг 01', title: 'Рождение роли отца', text: 'Связь начинается с безусловной родительской ответственности и близости.' },
      { date: 'Шаг 02', title: 'Совместные воспоминания', text: 'Фотографии, поездки, разговоры и общие моменты становятся фундаментом истории отношений.' },
      { date: 'Шаг 03', title: 'Поддержание доверия', text: 'Связь требует внимания, бережного контакта и уважения к взрослению дочери.' }
    ]
  },
  {
    id: 'rel-work',
    from: 'self',
    to: 'work',
    name: 'Профессиональная реализация',
    label: 'Ответственность · влияние',
    quality: 'Сильная развивающая связь с высоким уровнем вовлечённости',
    strength: 'Высокая',
    dynamics: 'Усиливается проектами, решениями и чувством роста',
    summary: 'Работа является зоной влияния, лидерства, визуальной культуры и стратегических решений.',
    history: [
      { date: 'Этап 01', title: 'Роль руководителя', text: 'Профессиональная связь усилилась через руководство людьми и проектами.' },
      { date: 'Этап 02', title: 'Интеграция ИИ', text: 'Связь углубилась через стремление строить современные AI-системы и новые продукты.' },
      { date: 'Этап 03', title: 'Архитектура и брендинг', text: 'Опыт, вкус и системное мышление сформировали устойчивую профессиональную идентичность.' }
    ]
  },
  {
    id: 'rel-hros',
    from: 'self',
    to: 'hros',
    name: 'Создание продукта',
    label: 'Идея · система',
    quality: 'Творческая, стратегическая, интеллектуальная связь',
    strength: 'Растущая',
    dynamics: 'Растёт через исследование, проектирование и реализацию сборок',
    summary: 'Это связь автора с продуктом, который должен помочь людям лучше понимать себя и друг друга.',
    history: [
      { date: 'Идея', title: 'Замысел', text: 'Появилась идея дневника, графа отношений и ИИ-помощника как системы счастья.' },
      { date: 'Формализация', title: 'Теория и принципы', text: 'Определялись кванты внимания, связи, память, продуктовые принципы и структура интерфейса.' },
      { date: 'Реализация', title: 'UI, граф, игра', text: 'Идея превратилась в интерактивную систему с аватаром, графом и игровым интерфейсом.' }
    ]
  },
  {
    id: 'rel-health',
    from: 'self',
    to: 'health',
    name: 'Физическая форма',
    label: 'Баланс · ресурс',
    quality: 'Поддерживающая, требующая регулярности связь',
    strength: 'Средняя',
    dynamics: 'Укрепляется через тренировки, режим и внимание к телу',
    summary: 'Здоровье выступает опорой для энергии, уверенности и качества жизни.',
    history: [
      { date: 'Цель', title: 'Осознанный фокус', text: 'Сформулировано желание поддерживать красивую форму, здоровье и ресурсность.' },
      { date: 'Практика', title: 'Волейбол и движение', text: 'Связь укрепляется через игровые тренировки и телесную активность.' },
      { date: 'Развитие', title: 'Системность', text: 'Следующий уровень — встроить здоровье в устойчивый образ жизни.' }
    ]
  },
  {
    id: 'rel-memory',
    from: 'self',
    to: 'memory',
    name: 'Память и наследие',
    label: 'Смысл · воспоминания',
    quality: 'Глубокая рефлексивная связь',
    strength: 'Высокая',
    dynamics: 'Питается историями семьи, значимыми фигурами и желанием сохранить след жизни',
    summary: 'Связь объединяет воспоминания, семейное наследие, дедушку, фотографии и желание сохранить важное.',
    history: [
      { date: 'Исток', title: 'Семейная память', text: 'Ключевые люди из прошлого оставили след в ощущении себя и своей линии жизни.' },
      { date: 'Осознание', title: 'Роль воспоминаний', text: 'Память стала не просто архивом, а источником смысла и мотивации.' },
      { date: 'Продукт', title: 'Сохранить и передать', text: 'Идея HROS выросла из потребности сохранять важное и помогать другим не терять связь с близкими.' }
    ]
  }
];

const svg = document.getElementById('graphSvg');
const tooltip = document.getElementById('edgeTooltip');
const preview = document.getElementById('relationPreview');
const relationPage = document.getElementById('relationPage');
const relationTitle = document.getElementById('relationTitle');
const relationSubtitle = document.getElementById('relationSubtitle');
const relationStats = document.getElementById('relationStats');
const relationNarrative = document.getElementById('relationNarrative');
const relationHistory = document.getElementById('relationHistory');
const closeRelationPage = document.getElementById('closeRelationPage');

const nodeById = Object.fromEntries(nodes.map(node => [node.id, node]));
const edgeById = Object.fromEntries(edges.map(edge => [edge.id, edge]));

function createSvgEl(tag, attrs = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function edgeStyle(edge) {
  if (edge.id === 'rel-snezha') return { color: '#ff48d5', width: 5.5 };
  if (edge.id === 'rel-vasilisa') return { color: '#bfff48', width: 5.2 };
  if (edge.id === 'rel-work') return { color: '#ffb548', width: 4.8 };
  if (edge.id === 'rel-hros') return { color: '#36d8ff', width: 4.8 };
  if (edge.id === 'rel-health') return { color: '#3dff8c', width: 4.5 };
  return { color: '#ffef71', width: 4.2 };
}

function edgePath(from, to, curve = 0.16) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const nx = -dy;
  const ny = dx;
  const normalLength = Math.max(Math.hypot(nx, ny), 1);
  const controlX = midX + (nx / normalLength) * (Math.hypot(dx, dy) * curve);
  const controlY = midY + (ny / normalLength) * (Math.hypot(dx, dy) * curve);
  return { d: `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`, labelX: midX * 0.25 + controlX * 0.5 + midX * 0.25, labelY: midY * 0.25 + controlY * 0.5 + midY * 0.25 };
}

function renderGraph() {
  svg.innerHTML = '';
  const glow = createSvgEl('defs');
  glow.innerHTML = `
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur"></feGaussianBlur>
      <feMerge>
        <feMergeNode in="blur"></feMergeNode>
        <feMergeNode in="SourceGraphic"></feMergeNode>
      </feMerge>
    </filter>`;
  svg.appendChild(glow);

  edges.forEach((edge) => {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    const style = edgeStyle(edge);
    const { d, labelX, labelY } = edgePath(from, to, 0.14 + Math.random() * 0.05);

    const group = createSvgEl('g', { class: 'edge-group', 'data-edge-id': edge.id });
    const base = createSvgEl('path', {
      d,
      fill: 'none',
      stroke: style.color,
      'stroke-opacity': '.14',
      'stroke-width': style.width + 10,
      filter: 'url(#glow)'
    });
    const line = createSvgEl('path', {
      d,
      fill: 'none',
      stroke: style.color,
      'stroke-width': style.width,
      'stroke-linecap': 'round'
    });
    const hit = createSvgEl('path', {
      d,
      fill: 'none',
      stroke: 'transparent',
      'stroke-width': 24,
      'stroke-linecap': 'round',
      class: 'edge-hit'
    });
    const label = createSvgEl('text', { x: labelX, y: labelY, class: 'edge-label', 'text-anchor': 'middle' });
    label.textContent = edge.name;

    group.append(base, line, label, hit);
    svg.appendChild(group);

    const activate = (clientX, clientY) => {
      showTooltip(edge, clientX, clientY);
      renderPreview(edge);
    };
    hit.addEventListener('mouseenter', (event) => activate(event.clientX, event.clientY));
    hit.addEventListener('mousemove', (event) => moveTooltip(event.clientX, event.clientY));
    hit.addEventListener('mouseleave', hideTooltip);
    hit.addEventListener('click', (event) => {
      activate(event.clientX, event.clientY);
    });
    hit.addEventListener('dblclick', () => openRelationPage(edge));
  });

  nodes.forEach((node) => {
    const group = createSvgEl('g', { class: 'node-group' });
    const ring = createSvgEl('circle', {
      cx: node.x,
      cy: node.y,
      r: node.r + (node.kind === 'self' ? 20 : 14),
      fill: node.kind === 'self' ? 'rgba(54,216,255,0.09)' : 'rgba(255,255,255,0.03)',
      stroke: node.color,
      'stroke-opacity': node.kind === 'self' ? '.42' : '.18',
      'stroke-dasharray': node.kind === 'self' ? '0' : '6 9'
    });
    const circle = createSvgEl('circle', {
      cx: node.x,
      cy: node.y,
      r: node.r,
      fill: '#0c172c',
      stroke: node.color,
      'stroke-width': node.kind === 'self' ? 4 : 3,
      filter: 'url(#glow)'
    });
    const text = createSvgEl('text', {
      x: node.x,
      y: node.y + 6,
      'text-anchor': 'middle',
      class: 'node-label'
    });
    text.textContent = node.kind === 'self' ? 'Я' : node.label;
    const subtitle = createSvgEl('text', {
      x: node.x,
      y: node.y + node.r + 26,
      'text-anchor': 'middle',
      class: 'node-label',
      'font-size': '12'
    });
    subtitle.textContent = node.kind === 'self' ? 'Михаил' : '';

    group.append(ring, circle, text);
    if (subtitle.textContent) group.append(subtitle);
    svg.appendChild(group);
  });
}

function showTooltip(edge, clientX, clientY) {
  tooltip.innerHTML = `
    <h4>${edge.name}</h4>
    <p>${edge.summary}</p>
    <div class="mini-tags">
      <span>Связь: ${edge.label}</span>
      <span>Сила: ${edge.strength}</span>
      <span>Динамика: ${edge.dynamics}</span>
    </div>`;
  tooltip.classList.remove('hidden');
  moveTooltip(clientX, clientY);
}

function moveTooltip(clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  const left = Math.min(Math.max(clientX - rect.left + 18, 18), rect.width - 320);
  const top = Math.min(Math.max(clientY - rect.top + 18, 18), rect.height - 160);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  tooltip.classList.add('hidden');
}

function renderPreview(edge) {
  preview.className = 'preview-card';
  preview.innerHTML = `
    <h3>${edge.name}</h3>
    <p>${edge.summary}</p>
    <div class="stats-row">
      <span class="stat-pill">${edge.label}</span>
      <span class="stat-pill">Сила: ${edge.strength}</span>
      <span class="stat-pill">Качество: ${edge.quality}</span>
    </div>
    <div class="history-mini">
      ${edge.history.slice(0, 2).map(item => `<div><strong>${item.title}</strong><br><span>${item.text}</span></div>`).join('')}
    </div>
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="action-button primary" onclick="window.__openRelation('${edge.id}')">Открыть страницу связи</button>
    </div>`;
}

function openRelationPage(edge) {
  relationPage.classList.remove('hidden');
  relationTitle.textContent = edge.name;
  relationSubtitle.textContent = `${nodeById[edge.from].label} ↔ ${nodeById[edge.to].label} · ${edge.label}`;
  relationStats.innerHTML = `
    <div class="stat-card"><span>Тип связи</span><b>${edge.label}</b></div>
    <div class="stat-card"><span>Сила</span><b>${edge.strength}</b></div>
    <div class="stat-card"><span>Качество</span><b>${edge.quality}</b></div>
    <div class="stat-card"><span>Динамика</span><b>${edge.dynamics}</b></div>`;
  relationNarrative.innerHTML = `<p>${edge.summary}</p><p>Связь внутри хранит своё название, историю формирования и набор подтверждённых характеристик, которые можно разворачивать в полноценную страницу связи.</p>`;
  relationHistory.innerHTML = edge.history.map(item => `
    <article class="timeline-item">
      <time>${item.date}</time>
      <h4>${item.title}</h4>
      <p>${item.text}</p>
    </article>`).join('');
  relationPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.__openRelation = (edgeId) => openRelationPage(edgeById[edgeId]);
closeRelationPage.addEventListener('click', () => relationPage.classList.add('hidden'));

document.addEventListener('click', (event) => {
  const clickedEdge = event.target.closest('.edge-hit');
  if (!clickedEdge && !event.target.closest('.edge-tooltip')) hideTooltip();
});

renderGraph();
renderPreview(edgeById['rel-snezha']);
