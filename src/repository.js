import { seedSnapshot } from './seed.js';

const STORAGE_KEY = 'hros.snapshot.v0.2';
const EVENTS_KEY = 'hros.diagnostics.v0.2';
const API_KEY = 'hros.api.url';

const clone = (value) => structuredClone(value);
const isoNow = () => new Date().toISOString();
const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

function normalizeApiUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function configuredApiUrl() {
  const runtime = normalizeApiUrl(window.__HROS_CONFIG__?.apiUrl);
  const saved = normalizeApiUrl(localStorage.getItem(API_KEY));
  return saved || runtime;
}

function recordEvent(level, action, details = {}) {
  const current = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  current.unshift({ id: newId('event'), at: isoNow(), level, action, details });
  localStorage.setItem(EVENTS_KEY, JSON.stringify(current.slice(0, 100)));
}

function ensureSnapshot(snapshot) {
  const base = clone(seedSnapshot);
  const merged = {
    ...base,
    ...snapshot,
    meta: { ...base.meta, ...(snapshot?.meta || {}) },
    people: Array.isArray(snapshot?.people) ? snapshot.people : base.people,
    relationships: Array.isArray(snapshot?.relationships) ? snapshot.relationships : base.relationships,
    moments: Array.isArray(snapshot?.moments) ? snapshot.moments : base.moments,
    observations: Array.isArray(snapshot?.observations) ? snapshot.observations : [],
    hypotheses: Array.isArray(snapshot?.hypotheses) ? snapshot.hypotheses : [],
    patterns: Array.isArray(snapshot?.patterns) ? snapshot.patterns : []
  };
  merged.meta.version = '0.2.0';
  merged.meta.schemaVersion = '0.2.0';
  return merged;
}

class LocalRepository {
  mode = 'local';
  label = 'Локальное хранилище';
  apiUrl = '';

  constructor() {
    if (!localStorage.getItem(STORAGE_KEY)) this.reset();
  }

  async getSnapshot() {
    return ensureSnapshot(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  }

  async save(snapshot, action = 'snapshot.save') {
    snapshot.meta.updatedAt = isoNow();
    snapshot.meta.mode = 'local';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    recordEvent('info', action, this.counts(snapshot));
    return clone(snapshot);
  }

  async createPerson(payload) {
    const snapshot = await this.getSnapshot();
    const person = {
      id: newId('person'),
      name: payload.name.trim(),
      role: payload.role.trim() || 'Человек',
      type: payload.type || 'other',
      strength: Number(payload.strength || 70),
      summary: payload.summary?.trim() || 'Описание пока не добавлено.',
      position: this.nextPosition(snapshot.people.length),
      isSelf: false,
      status: payload.status || 'observed',
      confidence: Number(payload.confidence ?? 1),
      version: 1,
      createdAt: isoNow(),
      updatedAt: isoNow(),
      source: { kind: 'user', label: 'Добавлено в интерфейсе' }
    };
    snapshot.people.push(person);
    const self = snapshot.people.find((item) => item.isSelf) || snapshot.people[0];
    if (self && payload.relationshipLabel) {
      snapshot.relationships.push({
        id: newId('rel'), sourceId: self.id, targetId: person.id,
        type: payload.relationshipType || 'personal', label: payload.relationshipLabel.trim(),
        strength: person.strength, meaning: payload.summary?.trim() || '',
        status: 'observed', confidence: 1, version: 1,
        createdAt: isoNow(), updatedAt: isoNow(),
        source: { kind: 'user', label: 'Добавлено в интерфейсе' }
      });
    }
    await this.save(snapshot, 'person.create');
    return person;
  }

  async createRelationship(payload) {
    const snapshot = await this.getSnapshot();
    const relation = {
      id: newId('rel'), sourceId: payload.sourceId, targetId: payload.targetId,
      type: payload.type || 'personal', label: payload.label?.trim() || 'Связь',
      strength: Number(payload.strength || 70), meaning: payload.meaning?.trim() || '',
      status: payload.status || 'observed', confidence: Number(payload.confidence ?? 1), version: 1,
      createdAt: isoNow(), updatedAt: isoNow(),
      source: { kind: 'user', label: 'Добавлено в интерфейсе' }
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
      description: payload.description?.trim() || '',
      participantIds: payload.participantIds || [],
      emotions: String(payload.emotions || '').split(',').map((x) => x.trim()).filter(Boolean),
      significance: Number(payload.significance || 70),
      relationshipEffect: { closeness: 0, trust: 0, tension: 0 },
      status: payload.status || 'observed', confidence: Number(payload.confidence ?? 1), version: 1,
      createdAt: isoNow(), updatedAt: isoNow(),
      source: { kind: 'user', label: 'Добавлено в интерфейсе' }
    };
    snapshot.moments.push(moment);
    await this.save(snapshot, 'moment.create');
    return moment;
  }

  async importSnapshot(data) {
    const snapshot = ensureSnapshot(data);
    await this.save(snapshot, 'snapshot.import');
    return snapshot;
  }

  async reset() {
    const snapshot = ensureSnapshot(clone(seedSnapshot));
    snapshot.meta.updatedAt = isoNow();
    snapshot.meta.mode = 'local';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    recordEvent('info', 'snapshot.reset', this.counts(snapshot));
    return clone(snapshot);
  }

  diagnostics() {
    return {
      mode: this.mode,
      label: this.label,
      apiUrl: this.apiUrl,
      storageKey: STORAGE_KEY,
      storageBytes: new Blob([localStorage.getItem(STORAGE_KEY) || '']).size,
      events: JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]')
    };
  }

  counts(snapshot) {
    return {
      people: snapshot.people.length,
      relationships: snapshot.relationships.length,
      moments: snapshot.moments.length
    };
  }

  nextPosition(index) {
    const angle = index * 2.399963229728653;
    const radius = 4.2 + (index % 3) * 0.7;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, ((index % 4) - 1.5) * 0.35];
  }
}

class ApiRepository {
  mode = 'api';
  label = 'HROS API';

  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async request(path, options = {}) {
    const started = performance.now();
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
    if (!response.ok) {
      recordEvent('error', 'api.request', { path, status: response.status, payload });
      throw new Error(payload?.detail || `HTTP ${response.status}`);
    }
    recordEvent('info', 'api.request', { path, status: response.status, ms: Math.round(performance.now() - started) });
    return payload;
  }

  async health() { return this.request('/health'); }
  async getSnapshot() { return ensureSnapshot(await this.request('/snapshot')); }
  async createPerson(payload) { return this.request('/people', { method: 'POST', body: JSON.stringify(payload) }); }
  async createRelationship(payload) { return this.request('/relationships', { method: 'POST', body: JSON.stringify(payload) }); }
  async createMoment(payload) { return this.request('/moments', { method: 'POST', body: JSON.stringify(payload) }); }
  async reset() { return this.request('/reset', { method: 'POST' }); }
  async importSnapshot() { throw new Error('Импорт в API будет добавлен на следующем этапе.'); }
  diagnostics() {
    return { mode: this.mode, label: this.label, apiUrl: this.apiUrl, events: JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]') };
  }
}

export async function createRepository() {
  const apiUrl = configuredApiUrl();
  if (apiUrl) {
    const api = new ApiRepository(apiUrl);
    try {
      await Promise.race([
        api.health(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 1800))
      ]);
      return api;
    } catch (error) {
      recordEvent('warning', 'api.fallback', { apiUrl, message: error.message });
    }
  }
  return new LocalRepository();
}

export function setApiUrl(value) {
  const normalized = normalizeApiUrl(value);
  if (normalized) localStorage.setItem(API_KEY, normalized);
  else localStorage.removeItem(API_KEY);
  recordEvent('info', 'api.configure', { apiUrl: normalized || null });
}

export function exportSnapshot(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hros-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
