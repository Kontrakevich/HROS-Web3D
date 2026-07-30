# HROS v1.2 — Domain Ontology

Product version: `1.2.0`  
Domain schema version: `1.0.0`

## Общий контракт доменной записи

Каждая HROS-запись содержит:

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
    "kind": "user|voice|message|document|ai|system|ai_diary|hros_messenger|user_confirmation",
    "label": "...",
    "sessionId": "diary-session-id",
    "messageId": "message-id",
    "conversationId": "messenger-thread-id",
    "agentId": "agent-id"
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

## Application Layer: Messenger

Messenger entities are operational objects, not automatically domain records.

### MessengerThread

```json
{
  "id": "thread-id",
  "agentId": "diary|relationship|memory|navigator|avatar",
  "title": "...",
  "pinned": false,
  "muted": false,
  "archived": false,
  "unread": 0,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "messages": []
}
```

### MessengerMessage

```json
{
  "id": "message-id",
  "role": "user|assistant",
  "text": "...",
  "at": "ISO-8601",
  "status": "delivered|read|error",
  "editedAt": "ISO-8601|null",
  "replyToId": "message-id|null",
  "attachments": [],
  "memoryRefs": [],
  "runtime": {}
}
```

A MessengerMessage is not Evidence or Fact until the user explicitly transfers the conversation into a DiarySession and confirms the Change Set.

### AgentProfile

```json
{
  "id": "relationship",
  "title": "Аналитик отношений",
  "purpose": "...",
  "modelPolicy": "server-configured",
  "memoryAccess": "read_only_filtered",
  "writeAccess": "none"
}
```

### MemoryContextEnvelope

Ephemeral request object:

```json
{
  "conversationId": "thread-id",
  "agentId": "agent-id",
  "query": "...",
  "memoryRefs": [
    {
      "id": "record-id",
      "kind": "perspective",
      "status": "confirmed",
      "confidence": 1,
      "statement": "...",
      "source": {}
    }
  ],
  "createdAt": "ISO-8601",
  "expiresAfterRequest": true
}
```

Context Envelope is not stored as Living Memory by default.

### AgentResponse

```json
{
  "conversationId": "thread-id",
  "agentId": "agent-id",
  "reply": "... [HROS:record-id]",
  "memoryRefs": [],
  "runtime": {
    "provider": "openai|openrouter|local",
    "model": "..."
  },
  "writeApplied": false,
  "confirmationRequired": true
}
```

AgentResponse is an AI output, not a confirmed DomainRecord.

## Diary Session Layer

Diary Session является единственным текущим переходом из Messenger conversation в доменную память.

### DiarySession

```json
{
  "id": "diary-session-id",
  "state": "active|analyzing|review|awaiting_confirmation|committed|saved_as_draft|rejected|cancelled",
  "participantId": "person-id",
  "topic": "...",
  "startedAt": "ISO-8601",
  "endedAt": "ISO-8601|null",
  "source": {
    "kind": "hros_messenger|direct_diary",
    "conversationId": "thread-id|null",
    "agentId": "agent-id|null"
  }
}
```

До появления отдельной таблицы committed session хранится как `kind=interview_session` с `data.channel=ai_diary`.

### DiaryMessage

Дословная реплика пользователя или агента. Полный набор сообщений хранится в `original_memory.data.messages`. Ответы пользователя дополнительно могут сохраняться как `interview_answer`.

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

Проверяемое предположение. Обязательны основания, confidence и проверочный вопрос или план проверки.

### Verification

Результат проверки гипотезы: подтверждено, опровергнуто, частично подтверждено или недостаточно данных.

### Pattern

Повторяющаяся последовательность, подтверждённая несколькими независимыми моментами или источниками.

### Principle

Осмысленный вывод или правило. Может быть личным, парным или универсальным. Должен ссылаться на Pattern, Fact или Perspective.

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

Восприятия и последствия не записываются в Action как единая истина; они создаются отдельными Perspective и Fact.

## Модель личности

Person остаётся идентификатором человека. Изменяемые характеристики хранятся как `kind=person_facet`:

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

## Память

- `original_memory` — неизменяемый подтверждённый исходник;
- `semantic_memory` — извлечённые сущности и связи;
- `living_memory` — актуальное понимание с датой, perspective owner и основаниями.

Living Memory не удаляет Original Memory и не является фактом без подтверждения.

## Invariants

- Messenger data and Domain data are separated.
- AgentResponse cannot become Fact directly.
- `memoryRefs` point only to records visible to the current owner.
- Different Perspective owners cannot be merged implicitly.
- Agent runtime has no direct Repository write operation.
- Product version can change without changing domain schema version.
