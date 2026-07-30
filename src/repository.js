import { seedSnapshot } from './seed.js';
import {
  DIAGNOSTICS_KEY_V1, HROS_VERSION, STORAGE_KEY_V1,
  ensureSnapshotV1, groupRecords, migrateLocalStorage, normalizeRecord, validateSnapshotV1
} from './domain-v1.js';

const EVENTS_KEY = DIAGNOSTICS_KEY_V1;
const HISTORY_KEY = 'hros.history.v1';
const API_KEY = 'hros.api.url';
const PLAYTEST_SETTINGS_KEY = 'hros.command.ui.v1';
const PLAYTEST_APPEARANCE_KEY = 'hros.avatar.appearance.history.v1';
const clone = (value) => structuredClone(value);
const isoNow = () => new Date().toISOString();
const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

export const AVATAR_DEFAULT = Object.freeze({
  base: 'explorer', role: 'creator', palette: 'cyan', modifiers: ['ai-orbit'], relationshipContext: 'neutral'
});
export const DEVELOPMENT_PATHS = Object.freeze([
  { id: 'creator', title: 'AI-создатель' },
  { id: 'athlete', title: 'Физическая форма' },
  { id: 'partner', title: 'Партнёрство' },
  { id: 'father', title: 'Отцовство' }
]);
const AVATAR_VALUES = {
  base: new Set(['explorer', 'creator', 'guardian']),
  role: new Set(['base', 'creator', 'athlete', 'leader', 'father']),
  palette: new Set(['cyan', 'amber', 'violet', 'green']),
  relationshipContext: new Set(['neutral', 'support', 'distance', 'tension']),
  modifiers: new Set(['ai-orbit', 'sport-band', 'family-emblem', 'architecture-grid'])
};

function normalizeApiUrl(value) { return String(value || '').trim().replace(/\/$/, ''); }
function configuredApiUrl() {
  const runtime = normalizeApiUrl(window.__HROS_CONFIG__?.apiUrl);
  const saved = normalizeApiUrl(localStorage.getItem(API_KEY));
  return saved || runtime;
}
function readJson(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
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

function ownerFor(snapshot, ownerId = null) {
  const owner = ownerId ? snapshot.people.find((item) => item.id === ownerId) : snapshot.people.find((item) => item.isSelf);
  return owner || snapshot.people[0] || null;
}

function normalizeAvatar(input = {}) {
  const avatar = { ...clone(AVATAR_DEFAULT), ...(input || {}) };
  if (!AVATAR_VALUES.base.has(avatar.base)) avatar.base = AVATAR_DEFAULT.base;
  if (!AVATAR_VALUES.role.has(avatar.role)) avatar.role = AVATAR_DEFAULT.role;
  if (!AVATAR_VALUES.palette.has(avatar.palette)) avatar.palette = AVATAR_DEFAULT.palette;
  if (!AVATAR_VALUES.relationshipContext.has(avatar.relationshipContext)) avatar.relationshipContext = AVATAR_DEFAULT.relationshipContext;
  avatar.modifiers = [...new Set((Array.isArray(avatar.modifiers) ? avatar.modifiers : []).filter((item) => AVATAR_VALUES.modifiers.has(item)))];
  return avatar;
}

function latest(records) {
  return [...records].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0] || null;
}

function productionDefaults(snapshot) {
  const owner = ownerFor(snapshot);
  if (!owner) return { snapshot, changed: false };
  let changed = false;
  const now = isoNow();
  const settings = readJson(PLAYTEST_SETTINGS_KEY, {});
  const migratedAvatar = normalizeAvatar(settings?.avatar || AVATAR_DEFAULT);
  const activePath = DEVELOPMENT_PATHS.some((path) => path.id === settings?.activePath) ? settings.activePath : 'creator';

  const profiles = (snapshot.records || []).filter((item) => item.kind === 'avatar_profile' && item.perspectiveOwnerId === owner.id && item.status !== 'archived');
  if (!profiles.length) {
    snapshot.records.push(normalizeRecord({
      id: `avatar-profile-${owner.id}`, kind: 'avatar_profile',
      statement: `Рабочий профиль аватара ${owner.name}.`, subjectIds: [owner.id], perspectiveOwnerId: owner.id,
      status: 'confirmed', confidence: 1, visibility: 'private',
      source: { kind: 'migration', label: settings?.avatar ? 'Миграция HROS COMMAND Playtest' : 'HROS COMMAND Production default' },
      evidenceIds: ['facet-mikhail-value-awareness', 'principle-mutual-impact'].filter((id) => snapshot.records.some((item) => item.id === id)),
      data: { ...migratedAvatar, activePathId: activePath, production: true, confirmedAt: now }
    }));
    changed = true;
  }

  const appearances = (snapshot.records || []).filter((item) => item.kind === 'avatar_appearance' && item.perspectiveOwnerId === owner.id);
  const playtestHistory = readJson(PLAYTEST_APPEARANCE_KEY, []);
  if (!appearances.length && Array.isArray(playtestHistory) && playtestHistory.length) {
    for (const item of [...playtestHistory].reverse()) {
      snapshot.records.push(normalizeRecord({
        id: item.id || newId('avatar-appearance'), kind: 'avatar_appearance',
        statement: `Сохранённая форма аватара: ${item.avatar?.role || 'base'}.`,
        subjectIds: [owner.id], perspectiveOwnerId: owner.id, status: 'finalized', confidence: 1, visibility: 'private',
        source: { kind: 'migration', label: 'Миграция галереи HROS COMMAND Playtest' },
        data: { avatar: normalizeAvatar(item.avatar), immutable: true, confirmedAt: item.createdAt || now, migratedFromPlaytest: true },
        createdAt: item.createdAt || now, updatedAt: item.createdAt || now
      }));
    }
    changed = true;
  }

  for (const path of DEVELOPMENT_PATHS) {
    const exists = (snapshot.records || []).some((item) => item.kind === 'development_path' && item.perspectiveOwnerId === owner.id && item.data?.pathId === path.id);
    if (!exists) {
      snapshot.records.push(normalizeRecord({
        id: `development-path-${owner.id}-${path.id}`, kind: 'development_path', statement: `Путь развития: ${path.title}.`,
        subjectIds: [owner.id], perspectiveOwnerId: owner.id, status: 'confirmed', confidence: 1, visibility: 'private',
        source: { kind: settings?.activePath ? 'migration' : 'system', label: settings?.activePath ? 'Миграция HROS COMMAND Playtest' : 'HROS COMMAND Production default' },
        data: { pathId: path.id, title: path.title, active: path.id === activePath, activatedAt: path.id === activePath ? now : null }
      }));
      changed = true;
    }
  }

  if (snapshot.meta.commandVersion !== 'production-1.1') {
    snapshot.meta.commandVersion = 'production-1.1';
    snapshot.meta.commandMigratedAt = now;
    changed = true;
  }

  if (changed) groupRecords(snapshot);
  return { snapshot, changed };
}

function cleanPlaytestKeys() {
  const settings = readJson(PLAYTEST_SETTINGS_KEY, null);
  if (settings && (settings.avatar || settings.activePath)) {
    const { avatar, activePath, ...uiOnly } = settings;
    localStorage.setItem(PLAYTEST_SETTINGS_KEY, JSON.stringify(uiOnly));
  }
  localStorage.removeItem(PLAYTEST_APPEARANCE_KEY);
}

class LocalRepository {
  mode = 'local';
  label = 'Локальное хранилище HROS v1.1';
  apiUrl = '';

  constructor() {
    migrateLocalStorage(seedSnapshot, recordEvent);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_V1) || 'null');
    const { snapshot, changed } = productionDefaults(prepareSnapshot(raw));
    if (changed) {
      snapshot.meta.updatedAt = isoNow();
      localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(snapshot));
      cleanPlaytestKeys();
      recordEvent('info', 'command.production.migrate', this.counts(snapshot));
    }
  }

  async getSnapshot() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_V1) || 'null');
    const prepared = prepareSnapshot(raw);
    const { snapshot, changed } = productionDefaults(prepared);
    if (changed) localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(snapshot));
    return clone(snapshot);
  }

  async save(snapshot, action = 'snapshot.save') {
    const normalized = prepareSnapshot(snapshot);
    productionDefaults(normalized);
    normalized.meta.updatedAt = isoNow();
    normalized.meta.mode = 'local';
    groupRecords(normalized);
    const errors = validateSnapshotV1(normalized);
    if (errors.length) throw new Error(errors.join('; '));
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
      createdAt: isoNow(), updatedAt: isoNow(), source: { kind: 'user', label: 'Добавлено в интерфейсе HROS v1.1' }
    };
    snapshot.people.push(person);
    const self = snapshot.people.find((item) => item.isSelf) || snapshot.people[0];
    if (self && payload.relationshipLabel) {
      snapshot.relationships.push({
        id: newId('rel'), sourceId: self.id, targetId: person.id,
        type: payload.relationshipType || 'personal', label: payload.relationshipLabel.trim(),
        strength: person.strength, meaning: payload.summary?.trim() || '',
        status: 'observed', confidence: 1, version: 1, createdAt: isoNow(), updatedAt: isoNow(),
        source: { kind: 'user', label: 'Добавлено в интерфейсе HROS v1.1' }
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
      createdAt: isoNow(), updatedAt: isoNow(), source: { kind: 'user', label: 'Добавлено в интерфейсе HROS v1.1' }
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
      createdAt: isoNow(), updatedAt: isoNow(), source: payload.source || { kind: 'user', label: 'Добавлено в интерфейсе HROS v1.1' }
    };
    snapshot.moments.push(moment);
    await this.save(snapshot, 'moment.create');
    return moment;
  }

  async createRecord(payload) {
    const snapshot = await this.getSnapshot();
    const record = normalizeRecord({ ...payload, source: payload.source || { kind: 'user', label: 'Добавлено в интерфейсе HROS v1.1' } });
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

  async getAvatarState(ownerId = null) {
    const snapshot = await this.getSnapshot();
    const owner = ownerFor(snapshot, ownerId);
    if (!owner) throw new Error('Владелец аватара не найден');
    const owned = (kind) => (snapshot.records || []).filter((item) => item.kind === kind && item.perspectiveOwnerId === owner.id);
    const profile = latest(owned('avatar_profile').filter((item) => item.status !== 'archived'));
    const appearances = owned('avatar_appearance').filter((item) => item.status === 'finalized').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const pendingChangeSet = latest(owned('avatar_change_set').filter((item) => item.status === 'draft' && item.data?.state === 'awaiting_confirmation'));
    const paths = owned('development_path').sort((a, b) => String(a.data?.pathId).localeCompare(String(b.data?.pathId)));
    return { owner, profile, appearances, pendingChangeSet, paths, repositoryMode: this.mode };
  }

  async createAvatarChangeSet(payload) {
    const snapshot = await this.getSnapshot();
    const owner = ownerFor(snapshot, payload.ownerId);
    if (!owner) throw new Error('Владелец аватара не найден');
    const proposedAvatar = normalizeAvatar(payload.avatar);
    const current = latest((snapshot.avatarProfiles || []).filter((item) => item.perspectiveOwnerId === owner.id && item.status !== 'archived'));
    const evidenceIds = [...new Set((payload.evidenceIds || []).filter((id) => snapshot.records.some((item) => item.id === id && ['confirmed', 'finalized', 'observed'].includes(item.status))))];
    for (const old of (snapshot.avatarChangeSets || []).filter((item) => item.perspectiveOwnerId === owner.id && item.status === 'draft')) {
      old.status = 'archived'; old.updatedAt = isoNow(); old.version = (old.version || 1) + 1;
    }
    const changeSet = normalizeRecord({
      id: newId('avatar-change-set'), kind: 'avatar_change_set',
      statement: `Предлагаемое изменение аватара: ${proposedAvatar.role}.`,
      subjectIds: [owner.id], perspectiveOwnerId: owner.id, status: 'draft', confidence: 1, visibility: 'private',
      source: { kind: 'user', label: 'Редактор аватара HROS COMMAND' }, evidenceIds,
      data: { state: 'awaiting_confirmation', proposedAvatar, previousAvatar: current?.data ? normalizeAvatar(current.data) : clone(AVATAR_DEFAULT), reason: String(payload.reason || '').trim(), createdAt: isoNow() }
    });
    snapshot.records.push(changeSet);
    await this.save(snapshot, 'avatar.change_set.create');
    return changeSet;
  }

  async confirmAvatarChangeSet(changeSetId, payload = {}) {
    if (payload.confirmed !== true) throw new Error('Требуется явное подтверждение');
    const snapshot = await this.getSnapshot();
    const changeSet = snapshot.records.find((item) => item.id === changeSetId && item.kind === 'avatar_change_set');
    if (!changeSet || changeSet.status !== 'draft' || changeSet.data?.state !== 'awaiting_confirmation') throw new Error('Change Set не найден или уже обработан');
    const owner = ownerFor(snapshot, changeSet.perspectiveOwnerId);
    if (!owner) throw new Error('Владелец аватара не найден');
    const proposedAvatar = normalizeAvatar(changeSet.data?.proposedAvatar);
    const confirmedAt = isoNow();
    let profile = latest((snapshot.avatarProfiles || []).filter((item) => item.perspectiveOwnerId === owner.id && item.status !== 'archived'));
    if (profile) {
      const before = clone(profile);
      profile.data = { ...profile.data, ...proposedAvatar, production: true, confirmedAt, lastChangeSetId: changeSet.id };
      profile.evidenceIds = [...new Set([...(profile.evidenceIds || []), ...(changeSet.evidenceIds || [])])];
      profile.source = { kind: 'user_confirmation', label: 'Подтверждено в Avatar Change Set', changeSetId: changeSet.id };
      profile.version = (profile.version || 1) + 1;
      profile.updatedAt = confirmedAt;
      addHistory('record', profile.id, 'avatar_profile.update', before, profile);
    } else {
      profile = normalizeRecord({
        id: `avatar-profile-${owner.id}`, kind: 'avatar_profile', statement: `Рабочий профиль аватара ${owner.name}.`,
        subjectIds: [owner.id], perspectiveOwnerId: owner.id, status: 'confirmed', visibility: 'private', confidence: 1,
        source: { kind: 'user_confirmation', label: 'Подтверждено в Avatar Change Set', changeSetId: changeSet.id },
        evidenceIds: changeSet.evidenceIds || [], data: { ...proposedAvatar, production: true, confirmedAt, lastChangeSetId: changeSet.id }
      });
      snapshot.records.push(profile);
    }
    const appearance = normalizeRecord({
      id: newId('avatar-appearance'), kind: 'avatar_appearance', statement: `Подтверждённая форма аватара: ${proposedAvatar.role}.`,
      subjectIds: [owner.id], perspectiveOwnerId: owner.id, status: 'finalized', confidence: 1, visibility: 'private',
      source: { kind: 'user_confirmation', label: 'Подтверждённая версия внешности', changeSetId: changeSet.id },
      evidenceIds: changeSet.evidenceIds || [], supportsIds: [profile.id],
      data: { avatar: proposedAvatar, immutable: true, confirmedAt, changeSetId: changeSet.id, reason: changeSet.data?.reason || '' }
    });
    const confirmation = normalizeRecord({
      id: newId('avatar-confirmation'), kind: 'avatar_confirmation', statement: 'Пользователь проверил источники и подтвердил изменение аватара.',
      subjectIds: [owner.id], perspectiveOwnerId: owner.id, status: 'finalized', confidence: 1, visibility: 'private',
      source: { kind: 'user_confirmation', label: 'Явное подтверждение Avatar Change Set', changeSetId: changeSet.id },
      evidenceIds: [changeSet.id, ...(changeSet.evidenceIds || [])], supportsIds: [profile.id, appearance.id],
      data: { changeSetId: changeSet.id, confirmedBy: payload.confirmedBy || owner.id, confirmedAt, accepted: true }
    });
    changeSet.status = 'finalized';
    changeSet.version = (changeSet.version || 1) + 1;
    changeSet.updatedAt = confirmedAt;
    changeSet.data = { ...changeSet.data, state: 'committed', confirmedAt, confirmationId: confirmation.id, appearanceId: appearance.id, profileId: profile.id };
    snapshot.records.push(appearance, confirmation);
    await this.save(snapshot, 'avatar.change_set.commit');
    return { profile: clone(profile), appearance: clone(appearance), confirmation: clone(confirmation), changeSet: clone(changeSet) };
  }

  async rejectAvatarChangeSet(changeSetId, payload = {}) {
    const snapshot = await this.getSnapshot();
    const changeSet = snapshot.records.find((item) => item.id === changeSetId && item.kind === 'avatar_change_set');
    if (!changeSet || changeSet.status !== 'draft') throw new Error('Change Set не найден или уже обработан');
    changeSet.status = 'archived'; changeSet.version = (changeSet.version || 1) + 1; changeSet.updatedAt = isoNow();
    changeSet.data = { ...changeSet.data, state: 'rejected', rejectedAt: isoNow(), reason: String(payload.reason || '') };
    await this.save(snapshot, 'avatar.change_set.reject');
    return clone(changeSet);
  }

  async activateDevelopmentPath(pathId, ownerId = null) {
    if (!DEVELOPMENT_PATHS.some((item) => item.id === pathId)) throw new Error('Неизвестный путь развития');
    const snapshot = await this.getSnapshot();
    const owner = ownerFor(snapshot, ownerId);
    if (!owner) throw new Error('Владелец пути не найден');
    const now = isoNow();
    for (const record of (snapshot.developmentPaths || []).filter((item) => item.perspectiveOwnerId === owner.id)) {
      const active = record.data?.pathId === pathId;
      if (Boolean(record.data?.active) === active) continue;
      const before = clone(record);
      record.data = { ...record.data, active, activatedAt: active ? now : record.data?.activatedAt || null };
      record.updatedAt = now; record.version = (record.version || 1) + 1;
      record.source = { kind: 'user', label: 'Выбор активного пути HROS COMMAND' };
      addHistory('record', record.id, 'development_path.activate', before, record);
    }
    const profile = latest((snapshot.avatarProfiles || []).filter((item) => item.perspectiveOwnerId === owner.id && item.status !== 'archived'));
    if (profile) { profile.data = { ...profile.data, activePathId: pathId }; profile.updatedAt = now; profile.version = (profile.version || 1) + 1; }
    await this.save(snapshot, 'development_path.activate');
    return this.getAvatarState(owner.id);
  }

  async importSnapshot(data) { return this.save(prepareSnapshot(data), 'snapshot.import'); }
  async reset() {
    const snapshot = prepareSnapshot(clone(seedSnapshot));
    productionDefaults(snapshot);
    localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(snapshot));
    recordEvent('info', 'snapshot.reset', this.counts(snapshot));
    return clone(snapshot);
  }
  revisions(kind, id) { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').filter((item) => item.kind === kind && item.entityId === id); }
  diagnostics() {
    return { mode: this.mode, label: this.label, apiUrl: this.apiUrl, storageKey: STORAGE_KEY_V1, schemaVersion: HROS_VERSION,
      storageBytes: new Blob([localStorage.getItem(STORAGE_KEY_V1) || '']).size, events: JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]') };
  }
  counts(snapshot) { return { people: snapshot.people.length, relationships: snapshot.relationships.length, moments: snapshot.moments.length, records: snapshot.records.length }; }
  nextPosition(index) { const angle = index * 2.399963229728653; const radius = 4.2 + (index % 3) * 0.7; return [Math.cos(angle) * radius, Math.sin(angle) * radius, ((index % 4) - 1.5) * 0.35]; }
}

class ApiRepository {
  mode = 'api';
  label = 'HROS API v1.1';
  constructor(apiUrl) { this.apiUrl = apiUrl; }
  async request(path, options = {}) {
    const started = performance.now();
    const response = await fetch(`${this.apiUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
    if (!response.ok) { recordEvent('error', 'api.request', { path, status: response.status, message: payload?.detail || null }); throw new Error(payload?.detail || `HTTP ${response.status}`); }
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
  async getAvatarState(ownerId = null) { return this.request(`/avatar/state${ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : ''}`); }
  async createAvatarChangeSet(payload) { return this.request('/avatar/change-sets', { method: 'POST', body: JSON.stringify(payload) }); }
  async confirmAvatarChangeSet(id, payload) { return this.request(`/avatar/change-sets/${id}/confirm`, { method: 'POST', body: JSON.stringify(payload) }); }
  async rejectAvatarChangeSet(id, payload = {}) { return this.request(`/avatar/change-sets/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) }); }
  async activateDevelopmentPath(pathId, ownerId = null) { return this.request(`/paths/${encodeURIComponent(pathId)}/activate`, { method: 'POST', body: JSON.stringify({ ownerId }) }); }
  async reset() { return this.request('/reset', { method: 'POST' }); }
  async importSnapshot() { throw new Error('Импорт в API требует административного endpoint.'); }
  diagnostics() { return { mode: this.mode, label: this.label, apiUrl: this.apiUrl, schemaVersion: HROS_VERSION, events: JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]') }; }
}

export async function createRepository() {
  const apiUrl = configuredApiUrl();
  if (apiUrl) {
    const api = new ApiRepository(apiUrl);
    try { await Promise.race([api.health(), new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 1800))]); return api; }
    catch (error) { recordEvent('warning', 'api.fallback', { apiUrl, message: error.message }); }
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
  link.download = `hros-v1.1-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
