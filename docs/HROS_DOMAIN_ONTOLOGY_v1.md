# HROS 1.1 — Domain Ontology

## Общий контракт записи

Каждая доменная запись содержит:

```json
{
  "id": "record-uuid",
  "kind": "observation",
  "statement": "...",
  "subjectIds": ["person-id"],
  "relationshipIds": ["relationship-id"],
  "momentIds": ["moment-id"],
  "perspectiveOwnerId": "person-id|null",
  "status": "draft|observed|hypothesis|confirmed|finalized|archived|disputed",
  "confidence": 0.0,
  "visibility": "private|shared_with_partner|shared|group",
  "source": {
    "kind": "user|voice|message|document|ai|system|ai_diary|user_confirmation|migration",
    "label": "...",
    "sessionId": "session-id",
    "messageId": "message-id",
    "changeSetId": "change-set-id"
  },
  "evidenceIds": [],
  "supportsIds": [],
  "contradictsIds": [],
  "data": {},
  "version": 1,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

## Diary Session Layer

Diary Session является первичным входным контуром HROS.

### DiarySession

```json
{
  "id": "diary-session-id",
  "state": "active|analyzing|review|awaiting_confirmation|committed|saved_as_draft|rejected|cancelled",
  "participantId": "person-id",
  "topic": "...",
  "startedAt": "ISO-8601",
  "endedAt": "ISO-8601|null"
}
```

Committed session может храниться как `kind=interview_session` с `data.channel=ai_diary`.

### DiaryMessage

Дословная реплика пользователя или вопрос ИИ. Полный набор сообщений хранится в `original_memory.data.messages`. Ответы пользователя дополнительно сохраняются как `interview_answer`.

### Diary ChangeSet

Изолированный список Proposed Changes. Не является подтверждённым знанием.

### UserConfirmation

Фиксирует, кто, когда и какие Change Items принял или отклонил. Может храниться как `kind=consent_policy` с `source.kind=user_confirmation`.

## Уровни знания

### Evidence

Первичный материал: текст, голос, фотография, переписка, документ, ссылка или метаданные файла. Evidence не содержит окончательного вывода.

### Fact

Минимальное проверяемое утверждение о произошедшем. Ссылается на Evidence и может быть `disputed`.

### Perspective

Описание намерения, восприятия, чувства или значения от лица конкретного участника. Обязателен `perspectiveOwnerId`.

### Observation

Осторожное описание признака без причинного вывода.

### Hypothesis

Проверяемое предположение. Обязательны основания, confidence и проверочный вопрос или план.

### Verification

Результат проверки гипотезы: confirmed, rejected, partial или insufficient data.

### Pattern

Повторяющаяся последовательность, подтверждённая несколькими независимыми моментами или источниками.

### Principle

Осмысленный вывод или правило. Должен ссылаться на Pattern, Fact или Perspective.

## Модель действия

`kind=action`:

```json
{
  "actorId": "person-id",
  "recipientIds": ["person-id"],
  "intent": "...",
  "observableBehavior": "...",
  "needsTouched": ["близость", "автономия"],
  "boundariesTouched": ["..."],
  "repairOptions": ["..."]
}
```

Восприятия и последствия создаются отдельными Perspective/Fact records.

## Модель личности

Person остаётся идентификатором человека. Изменяемые характеристики хранятся как `person_facet`:

- value;
- need;
- boundary;
- belief;
- role;
- goal;
- preference;
- trigger;
- care_language;
- protection_strategy;
- contradiction;
- life_period.

## Состояние отношений

`relationship_state` хранит временную оценку конкретной перспективы или совместно подтверждённую оценку:

```json
{
  "closeness": -1.0,
  "trust": -1.0,
  "safety": -1.0,
  "reciprocity": -1.0,
  "availability": -1.0,
  "boundaryRespect": -1.0,
  "tension": -1.0,
  "period": "..."
}
```

## Avatar Domain

Канонический подробный контракт: `docs/HROS_AVATAR_ONTOLOGY_v1.1.md`.

### `avatar_profile`

Текущая подтверждённая конфигурация владельца. Обязателен `perspectiveOwnerId`. Содержит base, role, palette, modifiers, relationshipContext и activePathId.

### `avatar_appearance`

Неизменяемая версия формы со статусом `finalized`, связанная с Change Set и confirmation.

### `avatar_change_set`

Изолированное предложение со статусом `draft`. Содержит previousAvatar, proposedAvatar, reason, proposedBy и state.

### `avatar_confirmation`

Аудиторское решение пользователя со статусом `finalized` и `source.kind=user_confirmation`.

### `development_path`

Подтверждённое направление роли, навыка или проекта. Одновременно активна максимум одна запись на владельца.

Avatar records по умолчанию `private`. Relationship Context является контекстом окружения, а не свойством человека.

## Avatar invariants

- Avatar Profile не изменяется до confirmation.
- AI/system proposal требует evidence IDs.
- Appearance Version immutable.
- Restore создаёт новую версию.
- Confirm идемпотентен.
- Reject не меняет profile.
- Avatar records не меняют Person/Identity Core.

## Интервью

- `interview_session` — тема, сценарий, состояние и канал;
- `interview_question` — вопрос и цель;
- `interview_answer` — исходный ответ и владелец;
- `verification` — результат проверки.

## Книга

- `book_chapter` — глава и scope;
- `principle` — проверяемый принцип;
- `narrative_fragment` — фрагмент с provenance.

## Память

- `original_memory` — неизменяемый исходник;
- `semantic_memory` — извлечённые сущности и связи;
- `living_memory` — актуальное понимание с датой и основаниями.

Living Memory не удаляет Original Memory и не становится фактом без подтверждения.
