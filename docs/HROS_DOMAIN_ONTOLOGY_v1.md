# HROS v1 — Domain Ontology

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
    "kind": "user|voice|message|document|ai|system|ai_diary|user_confirmation",
    "label": "...",
    "sessionId": "diary-session-id",
    "messageId": "diary-message-id"
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

До появления отдельной таблицы committed session хранится как `kind=interview_session` с `data.channel=ai_diary`.

### DiaryMessage

Дословная реплика пользователя или вопрос ИИ. Полный набор сообщений хранится в `original_memory.data.messages`. Ответы пользователя дополнительно могут сохраняться как `interview_answer`.

### ChangeSet

Изолированный список Proposed Changes. Не является подтверждённым знанием.

### UserConfirmation

Фиксирует, кто, когда и какие Change Items принял или отклонил. Может храниться как `kind=consent_policy` с `source.kind=user_confirmation`.

## Уровни знания

### Evidence

Первичный материал: текст, голос, фотография, переписка, документ, ссылка или метаданные файла. Evidence не содержит окончательного вывода.

### Fact

Минимальное проверяемое утверждение о произошедшем. Факт ссылается на Evidence и может быть `disputed`.

### Perspective

Описание намерения, восприятия, чувства или значения от лица конкретного участника. Обязателен `perspectiveOwnerId`.

### Observation

Осторожное описание повторяемого или значимого признака без причинного вывода.

### Hypothesis

Проверяемое предположение. Обязательны основания, уровень уверенности и проверочный вопрос или план проверки.

### Verification

Результат проверки гипотезы: подтверждено, опровергнуто, частично подтверждено или недостаточно данных.

### Pattern

Повторяющаяся последовательность, подтверждённая несколькими независимыми моментами или источниками.

### Principle

Осмысленный вывод или правило. Может быть личным, парным или универсальным. Должен ссылаться на Pattern/Fact/Perspective.

## Модель действия

Action — запись `kind=action` с полями `data`:

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

Восприятия и последствия не записываются в Action как единая истина; они создаются отдельными Perspective/Fact-записями.

## Модель личности

Person остаётся идентификатором человека. Изменяемые характеристики хранятся как `kind=person_facet`:

- value
- need
- boundary
- belief
- role
- goal
- preference
- trigger
- care_language
- protection_strategy
- contradiction
- life_period

Это позволяет хранить источник, перспективу и историю каждого свойства отдельно.

## Состояние отношений

`kind=relationship_state`:

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

Значения являются оценками конкретного владельца перспективы или совместно подтверждённой оценкой.

## Интервью

- `interview_session` — тема, участники, сценарий, состояние и канал `ai_diary|structured_interview`.
- `interview_question` — вопрос, цель, связь с гипотезой.
- `interview_answer` — исходный ответ и владелец перспективы.
- `verification` — результат проверки.

## Книга

- `book_chapter` — глава и её scope.
- `principle` — принцип, включаемый в главу.
- `narrative_fragment` — фрагмент истории с provenance.

## Память

- `original_memory` — неизменяемый исходник.
- `semantic_memory` — извлечённые сущности и связи.
- `living_memory` — актуальное понимание с датой и основаниями.

Living Memory не удаляет Original Memory и не является фактом без подтверждения.
