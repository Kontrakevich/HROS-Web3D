const now = '2026-07-29T17:20:00.000Z';

export const seedSnapshot = {
  meta: {
    product: 'HROS',
    version: '0.2.0',
    schemaVersion: '0.2.0',
    generatedAt: now,
    mode: 'seed'
  },
  people: [
    {
      id: 'person-mikhail', name: 'Михаил', role: 'Я', type: 'self', strength: 100,
      summary: 'Центральный узел личной вселенной.', position: [0, 0, 0], isSelf: true,
      status: 'confirmed', confidence: 1, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Профиль владельца' }
    },
    {
      id: 'person-snezha', name: 'Снежа', role: 'Жена', type: 'family', strength: 96,
      summary: 'Любовь, близость и совместная жизнь.', position: [4.6, 1.5, 0.3], isSelf: false,
      status: 'confirmed', confidence: 1, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Личная история' }
    },
    {
      id: 'person-daughter', name: 'Василиса', role: 'Дочь', type: 'family', strength: 94,
      summary: 'Отцовство, забота и передача опыта.', position: [-4.4, 1.4, -0.2], isSelf: false,
      status: 'confirmed', confidence: 1, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Семья' }
    },
    {
      id: 'person-boris', name: 'Борис Александрович', role: 'Дедушка', type: 'legacy', strength: 90,
      summary: 'Преемственность, память и род.', position: [-3.5, -2.7, 0.2], isSelf: false,
      status: 'confirmed', confidence: 0.95, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Семейная память' }
    },
    {
      id: 'person-marins', name: 'Marins Group', role: 'Работа', type: 'work', strength: 82,
      summary: 'Созидание, лидерство и профессия.', position: [0.2, 4.6, -0.8], isSelf: false,
      status: 'confirmed', confidence: 1, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Профессиональная деятельность' }
    },
    {
      id: 'person-hros', name: 'HROS', role: 'Проект', type: 'project', strength: 86,
      summary: 'Исследование отношений, система и наследие.', position: [0, -4.5, 0.8], isSelf: false,
      status: 'observed', confidence: 0.9, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'system', label: 'Проект HROS' }
    }
  ],
  relationships: [
    {
      id: 'rel-mikhail-snezha', sourceId: 'person-mikhail', targetId: 'person-snezha',
      type: 'partner', label: 'Пара', strength: 96,
      meaning: 'Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.',
      status: 'confirmed', confidence: 1, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Базис отношений' }
    },
    {
      id: 'rel-mikhail-daughter', sourceId: 'person-mikhail', targetId: 'person-daughter',
      type: 'parent', label: 'Отец и дочь', strength: 94,
      meaning: 'Забота, присутствие и передача жизненного опыта.',
      status: 'confirmed', confidence: 1, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Семья' }
    },
    {
      id: 'rel-mikhail-boris', sourceId: 'person-mikhail', targetId: 'person-boris',
      type: 'legacy', label: 'Преемственность', strength: 90,
      meaning: 'Связь с родом и сохранение памяти.',
      status: 'confirmed', confidence: 0.95, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Семейная память' }
    },
    {
      id: 'rel-mikhail-marins', sourceId: 'person-mikhail', targetId: 'person-marins',
      type: 'work', label: 'Профессия', strength: 82,
      meaning: 'Создание визуальных систем и управление командами.',
      status: 'confirmed', confidence: 1, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Работа' }
    },
    {
      id: 'rel-mikhail-hros', sourceId: 'person-mikhail', targetId: 'person-hros',
      type: 'project', label: 'Создатель', strength: 86,
      meaning: 'Превращение памяти и отношений в живую систему.',
      status: 'observed', confidence: 0.9, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'system', label: 'Проект HROS' }
    }
  ],
  moments: [
    {
      id: 'moment-childhood', title: 'Семейная преемственность', date: '1995-01-01', period: 'Детство',
      description: 'Память о семье как основа личной идентичности.',
      participantIds: ['person-mikhail', 'person-boris'], emotions: ['тепло', 'уважение'],
      significance: 90, relationshipEffect: { closeness: 0.7, trust: 0.8, tension: 0 },
      status: 'confirmed', confidence: 0.85, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Личная память' }
    },
    {
      id: 'moment-snezha', title: 'Жизнь со Снежей', date: '2026-01-01', period: 'Настоящее',
      description: 'Совместная жизнь, близость и создание общих моментов.',
      participantIds: ['person-mikhail', 'person-snezha'], emotions: ['любовь', 'близость'],
      significance: 98, relationshipEffect: { closeness: 0.9, trust: 0.8, tension: -0.2 },
      status: 'confirmed', confidence: 1, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'user', label: 'Совместная история' }
    },
    {
      id: 'moment-hros', title: 'Создание HROS', date: '2026-07-29', period: '2026',
      description: 'Переход от визуального прототипа к работающему ядру данных.',
      participantIds: ['person-mikhail', 'person-hros'], emotions: ['интерес', 'созидание'],
      significance: 86, relationshipEffect: { closeness: 0.5, trust: 0.4, tension: 0 },
      status: 'observed', confidence: 0.95, version: 1, createdAt: now, updatedAt: now,
      source: { kind: 'system', label: 'HROS v0.2' }
    }
  ],
  observations: [],
  hypotheses: [],
  patterns: []
};
