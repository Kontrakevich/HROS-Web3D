# Skill: hros-messenger-agent-runtime

## Назначение

Создавать и поддерживать полноэкранный мессенджер HROS с несколькими GPT-агентами, которые получают ограниченный, проверяемый и приватно отфильтрованный контекст из памяти HROS.

Skill отвечает за единый цикл:

```text
Открытие чата
→ выбор агента
→ ввод сообщения
→ поиск релевантной памяти HROS
→ формирование Context Envelope
→ запуск GPT-агента или честного local fallback
→ ответ с source references
→ ручное действие пользователя
→ при необходимости Diary Change Set
→ подтверждение
→ commit в HROS
```

## Входы

### UI input

- `conversationId: string`;
- `agentId: diary | relationship | memory | navigator | avatar`;
- `message: string`;
- `history: AgentHistoryItem[]`;
- `replyToMessageId?: string`;
- `attachments?: AttachmentMeta[]`;
- `activePersonId?: string`;
- `activeRelationshipId?: string`;
- `activeMomentId?: string`.

### HROS input

- `Snapshot`;
- `People`;
- `Relationships`;
- `Moments`;
- `DomainRecords`;
- `visibility`;
- `perspectiveOwnerId`;
- `status`;
- `confidence`;
- `source`;
- `evidenceIds`.

### Runtime input

- `OPENAI_API_KEY` или `OPENROUTER_API_KEY`;
- `OPENAI_MODEL` или `OPENROUTER_MODEL`;
- `OPENROUTER_BASE_URL`;
- `OPENAI_TRACING_ENABLED`;
- `memoryLimit`.

## Выходы

### Agent response

```json
{
  "conversationId": "thread-id",
  "agentId": "diary",
  "reply": "Текст ответа [HROS:record-id]",
  "memoryRefs": [
    {
      "id": "record-id",
      "kind": "perspective",
      "statement": "...",
      "status": "confirmed",
      "confidence": 1,
      "source": {}
    }
  ],
  "runtime": {
    "configured": true,
    "provider": "openai",
    "model": "gpt-5.4-mini",
    "runtime": "openai-agents-python"
  },
  "writeApplied": false,
  "confirmationRequired": true
}
```

### UI output

- полноэкранный messenger shell;
- список бесед;
- активный чат;
- сообщения и статусы;
- typing indicator;
- memory source panel;
- runtime status;
- export JSON;
- переход к Diary Change Set.

## Агентные роли

### diary

- принимает свободный рассказ;
- отделяет факт от интерпретации;
- задаёт один вопрос за ответ;
- не создаёт canonical record автоматически;
- подготавливает материал для Change Set.

### relationship

- анализирует действия и последствия;
- разделяет перспективы;
- не предполагает позицию другого участника;
- маркирует гипотезы;
- предлагает вопросы для проверки.

### memory

- ищет источники;
- показывает статус и confidence;
- обнаруживает противоречия;
- не объединяет несовместимые версии.

### navigator

- находит релевантные разделы HROS;
- предлагает следующее действие;
- учитывает незавершённые Change Sets;
- не превращает рекомендацию в обязательство.

### avatar

- анализирует подтверждённые роли и интересы;
- предлагает обратимые visual modifiers;
- сохраняет Identity Core;
- не меняет ценность персонажа из-за отношений.

## Memory Gateway

### Подготовка кандидатов

1. загрузить Snapshot;
2. определить центрального `Person.isSelf`;
3. собрать People, Relationships, Moments и Records;
4. исключить приватные записи с `perspectiveOwnerId`, принадлежащим другому человеку;
5. нормализовать текст;
6. токенизировать запрос;
7. оценить совпадение;
8. добавить boost типа, статуса и confidence;
9. удалить дубликаты;
10. ограничить Context Envelope.

### Приоритеты

- `original_memory`: максимальный приоритет исходного содержания;
- `living_memory`: актуальная подтверждённая модель;
- `semantic_memory`: сжатое значение;
- `principle`, `fact`, `perspective`: высокий приоритет;
- `relationship_state`, `person_facet`: контекстный приоритет;
- `observation`: средний приоритет;
- `hypothesis`: передавать только с явной маркировкой;
- `draft`, `disputed`: снижать вес.

### Source reference

Использованная запись обозначается:

```text
[HROS:<record-id>]
```

Интерфейс обязан позволять открыть карточку источника или показать её в боковой панели.

## Ограничения

- API-ключ запрещено передавать во frontend.
- GPT-агент не имеет прямого write tool к HROS Repository.
- Agent response не является подтверждённой памятью.
- Нельзя скрывать local fallback под маркировкой GPT.
- Нельзя передавать агенту private perspective другого человека.
- Нельзя вычислять единый рейтинг человека, партнёра, родителя или отношений.
- Нельзя автоматически менять visibility.
- Нельзя автоматически публиковать private данные.
- Нельзя выполнять commit без UserConfirmation.
- Нельзя использовать весь Snapshot без ограничения объёма и фильтрации.

## UI contract

### Desktop

- messenger занимает `100dvh` и весь viewport;
- три колонки при достаточной ширине;
- список бесед не блокирует прокрутку сообщений;
- context panel закрывается;
- composer закреплён снизу;
- главное поле получает focus после открытия.

### Mobile

- одна панель одновременно;
- список бесед открывается через back control;
- composer учитывает `env(safe-area-inset-bottom)`;
- touch target не меньше 38 CSS px;
- нет горизонтальной прокрутки;
- текст и действия доступны без hover.

### Message behavior

- Enter отправляет;
- Shift+Enter создаёт новую строку;
- reply сохраняет `replyToId`;
- edit сохраняет `editedAt`;
- delete требует явного действия;
- attachment хранит metadata, пока не подключено файловое хранилище;
- export формирует JSON без секретов.

## State model

```text
MessengerThread
├── id
├── agentId
├── title
├── pinned
├── muted
├── archived
├── unread
├── createdAt
├── updatedAt
└── messages[]

MessengerMessage
├── id
├── role
├── text
├── at
├── status
├── editedAt
├── replyToId
├── attachments[]
├── memoryRefs[]
└── runtime
```

## Diary bridge

Messenger не записывает выводы напрямую.

```text
Выбранная беседа
→ immutable transcript draft
→ DiarySession
→ proposed Perspective / Observation / Hypothesis
→ review
→ include / edit / reject
→ UserConfirmation
→ atomic commit
```

## Диагностика

Фиксировать без приватного содержания:

- `conversationId`;
- `agentId`;
- runtime provider;
- model;
- duration;
- HTTP status;
- number of memory refs;
- error class;
- trace ID;
- fallback reason.

Не фиксировать:

- API key;
- полные private сообщения в системном диагностическом пакете;
- полный Context Envelope;
- персональные данные в URL.

## n8n compatibility

### Trigger

```json
{
  "event": "hros.messenger.message.created",
  "conversationId": "...",
  "agentId": "...",
  "messageId": "...",
  "text": "..."
}
```

### Agent request

```json
{
  "agentId": "relationship",
  "conversationId": "...",
  "message": "...",
  "history": [],
  "memoryLimit": 18
}
```

### Agent response

Использовать стандартный Agent response из раздела «Выходы».

### Confirmation event

```json
{
  "event": "hros.diary.change_set.confirmed",
  "conversationId": "...",
  "changeSetId": "...",
  "acceptedChangeIds": [],
  "rejectedChangeIds": []
}
```

## Критерии качества

- чат открывается на весь экран;
- пользователь находит composer без обучения;
- агент и runtime видимы;
- локальный и GPT-режимы различимы;
- HROS sources отображаются рядом с ответом;
- отсутствие source не маскируется;
- privacy filter покрыт тестом;
- отсутствие API key даёт контролируемый fallback/503;
- изменение памяти невозможно до confirmation;
- mobile layout проверен на 390×844;
- Chromium и WebKit не показывают console errors;
- backend tests и production build успешны.

## Совместимость

- HROS v1 Snapshot;
- `ai-diary-session`;
- `memory-projection`;
- `perspective-capture`;
- `relationship-state`;
- `avatar-profile` после его канонизации;
- FastAPI;
- SQLAlchemy;
- OpenAI Agents SDK;
- OpenRouter OpenAI-compatible API;
- n8n HTTP Request / Webhook nodes.
