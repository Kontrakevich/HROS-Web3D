import { seedSnapshot } from './seed.js';
import {
  DIAGNOSTICS_KEY_V1, HROS_VERSION, STORAGE_KEY_V1,
  ensureSnapshotV1, groupRecords, migrateLocalStorage, normalizeRecord, validateSnapshotV1
} from './domain-v1.js';

const EVENTS_KEY = DIAGNOSTICS_KEY_V1;
const HISTORY_KEY = 'hros.history.v1';
const API_KEY = 'hros.api.url';
const clone = (value) => structuredClone(value);
const isoNow = () => new Date().toISOString();
const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

function normalizeApiUrl(value) { return String(value || '').trim().replace(/\/$/, ''); }
function configuredApiUrl() {
  const runtime = normalizeApiUrl(window.__HROS_CONFIG__?.apiUrl);
  const saved = normalizeApiUrl(localStorage.getItem(API_KEY));
  return saved || runtime;
}

export function recordEvent(level, action, details = {}) {
  let current = [];
  try { current = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]'); } catch { current = []; }
  current.unshift({ id: newId('event'), at: isoNow(), level, action, details });
  localStorage.setItem(EVENTS_KEY, JSON.stringify(current.slice(0, 200)));
}

function addHistory(kind, entityId, action, before, after) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { history = []; }
  history.unshift({ id: newId('revision'), kind, entityId, action, at: isoNow(), before, after });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 1000)));
}

function prepareSnapshot(value) {
  const snapshot = ensureSnapshotV1(value, seedSnapshot);
  const errors = validateSnapshotV1(snapshot);
  if (errors.length) throw new Error(errors.join('; '));
  return snapshot;
}

class LocalRepository {
  mode = 'local';
  label = 'Локальное хранилище HROS v1';
  apiUrl = '';

  constructor() { migrateLocalStorage(seedSnapshot, recordEvent); }

  async getSnapshot() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_V1) || 'null');
    return prepareSnapshot(raw);
  }

  async save(snapshot, action = 'snapshot.save') {
    const normalized = prepareSnapshot(snapshot);
    normalized.meta.updatedAt = isoNow();
    normalized.meta.mode = 'local';
    groupRecords(normalized);
    localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(normalized));
    recordEvent('info', action, this.counts(normalized));
    return clone(normalized);
  }

  async createPerson(payload) {
    const snapshot = await this.getSnapshot();
    const person = {
      id: newId('person'), name: payload.name.trim(), role: payload.role?.trim() || 'Человек',
      type: payload.type || 'other', strength: Number(payload.strength || 70),
      summary: payload.summary?.trim() || 'Описание пока не добавлено.',
      position: this.nextPosition(snapshot.people.length), isSelf: false,
      status: payload.status || 'observed', confidence: Number(payload.confidence ?? 1), version: 1,
      createdAt: isoNow(), updatedAt: isoNow(), source: { kind: 'user', label: 'Добавлено в интерфейсе HROS v1' }
    };
    snapshot.people.push(person);
    const self = snapshot.people.find((item) => item.isSelf) || snapshot.people[0];
    if (self && payload.relationshipLabel) {
      snapshot.relationships.push({
        id: newId('rel'), sourceId: self.id, targetId: person.id,
        type: payload.relationshipType || 'personal', label: payload.relationshipLabel.trim(),
        strength: person.strength, meaning: payload.summary?.trim() || '',
        status: 'observed', confidence: 1, version: 1, createdAt: isoNow(), updatedAt: isoNow(),
        source: { kind: 'user', label: 'Добавлено в интерфейсе HROS v1' }
      });
    }
    await this.save(snapshot, 'person.create');
    return person;
  }

  async createRelationship(payload) {
    const snapshot = await this.getSnapshot();
    if (payload.sourceId === payload.targetId) throw new Error('Нужны разные узлы связи');
    const ids = new Set(snapshot.people.map((item) => item.id));
    if (!ids.has(payload.sourceId) || !ids.has(payload.targetId)) throw new Error('Узел связи не существует');
    const relation = {
      id: newId('rel'), sourceId: payload.sourceId, targetId: payload.targetId,
      type: payload.type || 'personal', label: payload.label?.trim() || 'Связь',
      strength: Number(payload.strength || 70), meaning: payload.meaning?.trim() || '',
      status: payload.status || 'observed', confidence: Number(payload.confidence ?? 1), version: 1,
      createdAt: isoNow(), updatedAt: isoNow(), source: { kind: 'user', label: 'Добавлено в интерфейсе HROS v1' }
    };
    snapshot.relationships.push(relation);
    await this.save(snapshot, 'relationship.create');
    return relation;
  }

  async createMoment(payload) {
    const snapshot = await this.getSnapshot();
    const moment = {
      id: newId('moment'), title: payload.title.trim(), date: payload.date || isoNow().slice(0, 10),
      period: payload.period?.trim() || new Date(payload.date || Date.now()).getFullYear().toString(),
      description: payload.description?.trim() || '', participantIds: payload.participantIds || [],
      emotions: Array.isArray(payload.emotions) ? payload.emotions : String(payload.emotions || '').split(',').map((x) => x.trim()).filter(Boolean),
      significance: Number(payload.significance || 70), relationshipEffect: { closeness: 0, trust: 0, tension: 0, ...(payload.relationshipEffect || {}) },
      details: { meaning: '', place: '', tags: [], attachments: [], ...(payload.details || {}) },
      status: payload.status || 'observed', confidence: Number(payload.confidence ?? 1), version: 1,
      createdAt: isoNow(), updatedAt: isoNow(), source: payload.source || { kind: 'user', label: 'Добавлено в интерфейсе HROS v1' }
    };
    snapshot.moments.push(moment);
    await this.save(snapshot, 'moment.create');
    return moment;
  }

  async createRecord(payload) {
    const snapshot = await this.getSnapshot();
    const record = normalizeRecord({ ...payload, source: payload.source || { kind: 'user', label: 'Добавлено в интерфейсе HROS v1' } });
    if (!record.statement) throw new Error('Содержание записи обязательно');
    if (record.kind === 'perspective' && !record.perspectiveOwnerId) throw new Error('Для перспективы нужен владелец');
    snapshot.records.push(record);
    await this.save(snapshot, `record.${record.kind}.create`);
    return record;
  }

  async updateRecord(id, payload) {
    const snapshot = await this.getSnapshot();
    const index = snapshot.records.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Запись не найдена');
    const before = clone(snapshot.records[index]);
    const next = normalizeRecord({ ...before, ...payload, id, version: (before.version || 1) + 1, updatedAt: isoNow() });
    if (next.kind === 'perspective' && !next.perspectiveOwnerId) throw new Error('Для перспективы нужен владелец');
    snapshot.records[index] = next;
    addHistory('record', id, 'update', before, next);
    await this.save(snapshot, `record.${next.kind}.update`);
    return next;
  }

  async deleteRecord(id) {
    const snapshot = await this.getSnapshot();
    const item = snapshot.records.find((record) => record.id === id);
    if (!item) throw new Error('Запись не найдена');
    addHistory('record', id, 'delete', item, null);
    snapshot.records = snapshot.records.filter((record) => record.id !== id);
    await this.save(snapshot, `record.${item.kind}.delete`);
    return { ok: true };
  }

  async importSnapshot(data) { return this.save(prepareSnapshot(data), 'snapshot.import'); }
  async reset() {
    const snapshot = prepareSnapshot(clone(seedSnapshot));
    localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(snapshot));
    recordEvent('info', 'snapshot.reset', this.counts(snapshot));
    return clone(snapshot);
  }

  revisions(kind, id) {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').filter((item) => item.kind === kind && item.entityId === id);
  }

  diagnostics() {
    return {
      mode: this.mode, label: this.label, apiUrl: this.apiUrl, storageKey: STORAGE_KEY_V1,
      schemaVersion: HROS_VERSION,
      storageBytes: new Blob([localStorage.getItem(STORAGE_KEY_V1) || '']).size,
      events: JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]')
    };
  }

  counts(snapshot) {
    return { people: snapshot.people.length, relationships: snapshot.relationships.length, moments: snapshot.moments.length, records: snapshot.records.length };
  }

  nextPosition(index) {
    const angle = index * 2.399963229728653;
    const radius = 4.2 + (index % 3) * 0.7;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, ((index % 4) - 1.5) * 0.35];
  }
}

class ApiRepository {
  mode = 'api';
  label = 'HROS API v1';
  constructor(apiUrl) { this.apiUrl = apiUrl; }

  async request(path, options = {}) {
    const started = performance.now();
    const response = await fetch(`${this.apiUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
    if (!response.ok) {
      recordEvent('error', 'api.request', { path, status: response.status, message: payload?.detail || null });
      throw new Error(payload?.detail || `HTTP ${response.status}`);
    }
    recordEvent('info', 'api.request', { path, status: response.status, ms: Math.round(performance.now() - started) });
    return payload;
  }

  async health() { return this.request('/health'); }
  async getSnapshot() { return prepareSnapshot(await this.request('/snapshot')); }
  async createPerson(payload) { return this.request('/people', { method: 'POST', body: JSON.stringify(payload) }); }
  async createRelationship(payload) { return this.request('/relationships', { method: 'POST', body: JSON.stringify(payload) }); }
  async createMoment(payload) { return this.request('/moments', { method: 'POST', body: JSON.stringify(payload) }); }
  async createRecord(payload) { return this.request('/records', { method: 'POST', body: JSON.stringify(payload) }); }
  async updateRecord(id, payload) { return this.request(`/records/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
  async deleteRecord(id) { return this.request(`/records/${id}`, { method: 'DELETE' }); }
  async reset() { return this.request('/reset', { method: 'POST' }); }
  async importSnapshot() { throw new Error('Импорт в API требует административного endpoint.'); }
  diagnostics() { return { mode: this.mode, label: this.label, apiUrl: this.apiUrl, schemaVersion: HROS_VERSION, events: JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]') }; }
}

export async function createRepository() {
  const apiUrl = configuredApiUrl();
  if (apiUrl) {
    const api = new ApiRepository(apiUrl);
    try {
      await Promise.race([api.health(), new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 1800))]);
      return api;
    } catch (error) { recordEvent('warning', 'api.fallback', { apiUrl, message: error.message }); }
  }
  return new LocalRepository();
}

export function setApiUrl(value) {
  const normalized = normalizeApiUrl(value);
  if (normalized) localStorage.setItem(API_KEY, normalized); else localStorage.removeItem(API_KEY);
  recordEvent('info', 'api.configure', { apiUrl: normalized || null });
}

export function exportSnapshot(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hros-v1-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
