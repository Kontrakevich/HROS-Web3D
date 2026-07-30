export const HROS_VERSION = '1.0.0';
export const STORAGE_KEY_V1 = 'hros.snapshot.v1';
export const LEGACY_STORAGE_KEYS = ['hros.snapshot.v0.2'];
export const DIAGNOSTICS_KEY_V1 = 'hros.diagnostics.v1';

export const RECORD_KINDS = [
  'evidence', 'fact', 'perspective', 'action', 'person_facet', 'relationship_state',
  'observation', 'hypothesis', 'verification', 'pattern', 'principle',
  'original_memory', 'semantic_memory', 'living_memory',
  'interview_session', 'interview_question', 'interview_answer',
  'book_chapter', 'narrative_fragment', 'consent_policy'
];

export const KIND_COLLECTIONS = {
  evidence: 'evidence', fact: 'facts', perspective: 'perspectives', action: 'actions',
  person_facet: 'personFacets', relationship_state: 'relationshipStates',
  observation: 'observations', hypothesis: 'hypotheses', verification: 'verifications',
  pattern: 'patterns', principle: 'principles', original_memory: 'originalMemory',
  semantic_memory: 'semanticMemory', living_memory: 'livingMemory',
  interview_session: 'interviewSessions', interview_question: 'interviewQuestions',
  interview_answer: 'interviewAnswers', book_chapter: 'bookChapters',
  narrative_fragment: 'narrativeFragments', consent_policy: 'consentPolicies'
};

const now = () => new Date().toISOString();
const clone = (value) => structuredClone(value);
const arrays = ['people', 'relationships', 'moments', 'records', ...new Set(Object.values(KIND_COLLECTIONS))];

export function normalizeRecord(input = {}) {
  const createdAt = input.createdAt || now();
  return {
    id: input.id || `record-${crypto.randomUUID()}`,
    kind: RECORD_KINDS.includes(input.kind) ? input.kind : 'observation',
    statement: String(input.statement || '').trim(),
    subjectIds: Array.isArray(input.subjectIds) ? [...new Set(input.subjectIds)] : [],
    relationshipIds: Array.isArray(input.relationshipIds) ? [...new Set(input.relationshipIds)] : [],
    momentIds: Array.isArray(input.momentIds) ? [...new Set(input.momentIds)] : [],
    perspectiveOwnerId: input.perspectiveOwnerId || null,
    status: input.status || (input.kind === 'hypothesis' ? 'hypothesis' : 'observed'),
    confidence: Math.max(0, Math.min(1, Number(input.confidence ?? 1))),
    visibility: input.visibility || 'private',
    source: { kind: 'user', label: 'HROS', ...(input.source || {}) },
    evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds : [],
    supportsIds: Array.isArray(input.supportsIds) ? input.supportsIds : [],
    contradictsIds: Array.isArray(input.contradictsIds) ? input.contradictsIds : [],
    data: input.data && typeof input.data === 'object' ? input.data : {},
    version: Number(input.version || 1),
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function groupRecords(snapshot) {
  for (const collection of Object.values(KIND_COLLECTIONS)) snapshot[collection] = [];
  for (const record of snapshot.records || []) {
    const collection = KIND_COLLECTIONS[record.kind];
    if (collection) snapshot[collection].push(record);
  }
  return snapshot;
}

function legacyKnowledge(snapshot) {
  const records = [];
  for (const [collection, kind] of [['observations', 'observation'], ['hypotheses', 'hypothesis'], ['patterns', 'pattern']]) {
    for (const item of snapshot?.[collection] || []) records.push(normalizeRecord({ ...item, kind, statement: item.statement || item.title || item.description || '' }));
  }
  return records;
}

export function ensureSnapshotV1(input, seedSnapshot) {
  const base = clone(seedSnapshot);
  const source = input && typeof input === 'object' ? clone(input) : {};
  const merged = { ...base, ...source, meta: { ...base.meta, ...(source.meta || {}) } };
  for (const key of arrays) merged[key] = Array.isArray(source[key]) ? source[key] : (Array.isArray(base[key]) ? clone(base[key]) : []);

  const directRecords = Array.isArray(source.records) ? source.records : [];
  const converted = legacyKnowledge(source);
  const seedRecords = Array.isArray(base.records) ? base.records : [];
  const byId = new Map();
  [...seedRecords, ...converted, ...directRecords].forEach((item) => {
    const normalized = normalizeRecord(item);
    byId.set(normalized.id, normalized);
  });
  merged.records = [...byId.values()];

  merged.meta.product = 'HROS';
  merged.meta.version = HROS_VERSION;
  merged.meta.schemaVersion = HROS_VERSION;
  merged.meta.updatedAt = now();
  merged.meta.migratedFrom = source.meta?.schemaVersion && source.meta.schemaVersion !== HROS_VERSION ? source.meta.schemaVersion : (source.meta?.migratedFrom || null);
  merged.meta.principle = 'Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.';
  return groupRecords(merged);
}

export function validateSnapshotV1(snapshot) {
  const errors = [];
  if (snapshot?.meta?.schemaVersion !== HROS_VERSION) errors.push('Некорректная версия схемы');
  const people = new Set((snapshot.people || []).map((item) => item.id));
  const relationships = new Set((snapshot.relationships || []).map((item) => item.id));
  const moments = new Set((snapshot.moments || []).map((item) => item.id));
  for (const record of snapshot.records || []) {
    if (record.kind === 'perspective' && !record.perspectiveOwnerId) errors.push(`Perspective ${record.id} не имеет владельца`);
    for (const id of record.subjectIds || []) if (!people.has(id)) errors.push(`Record ${record.id}: неизвестный person ${id}`);
    for (const id of record.relationshipIds || []) if (!relationships.has(id)) errors.push(`Record ${record.id}: неизвестная relationship ${id}`);
    for (const id of record.momentIds || []) if (!moments.has(id)) errors.push(`Record ${record.id}: неизвестный moment ${id}`);
  }
  return errors;
}

export function migrateLocalStorage(seedSnapshot, recordDiagnostic = () => {}) {
  let source = null;
  let sourceKey = STORAGE_KEY_V1;
  try { source = JSON.parse(localStorage.getItem(STORAGE_KEY_V1) || 'null'); } catch { source = null; }
  if (!source) {
    for (const key of LEGACY_STORAGE_KEYS) {
      try { source = JSON.parse(localStorage.getItem(key) || 'null'); } catch { source = null; }
      if (source) { sourceKey = key; break; }
    }
  }
  const snapshot = ensureSnapshotV1(source, seedSnapshot);
  const errors = validateSnapshotV1(snapshot);
  if (errors.length) throw new Error(`HROS v1 migration: ${errors.join('; ')}`);
  localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(snapshot));
  if (sourceKey !== STORAGE_KEY_V1) recordDiagnostic('info', 'migration.v0.4_to_v1', { sourceKey, targetKey: STORAGE_KEY_V1 });
  return snapshot;
}
