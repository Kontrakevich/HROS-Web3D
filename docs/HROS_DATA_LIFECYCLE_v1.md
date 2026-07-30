# HROS v1.2 — Data Lifecycle

Версия domain schema: `1.0.0`.

## Основной поток данных

```text
Messenger Thread
→ User Message
→ privacy-aware Memory Retrieval
→ bounded Context Envelope
→ GPT Agent or explicit Local Fallback
→ Agent Response + Memory References
→ Diary Draft
→ Original Transcript
→ Analysis Draft
→ Change Set
→ User Review
→ Explicit Confirmation
→ Commit
→ Original Memory
→ Evidence
→ Fact/Perspective extraction
→ Observation
→ Hypothesis
→ Verification
→ Pattern
→ Principle
→ Living Memory / Book / Web3D / Avatar
```

## Состояния Messenger Thread

- `active` — беседа доступна пользователю и принимает сообщения.
- `archived` — скрыта из основного списка, но не удалена.
- `deleted` — удалена локально или через подтверждённую server-side операцию.

Messenger Thread и его сообщения не являются HROS knowledge records. Они становятся источником только после явного действия `Зафиксировать`.

## Состояния Agent Request

```text
created
→ retrieving_memory
→ context_ready
→ running
→ completed | failed | cancelled
```

Обязательные результаты:

- provider и model;
- количество использованных memory references;
- `writeApplied=false`;
- `confirmationRequired=true`;
- контролируемая ошибка без раскрытия ключа или private context.

## Memory Retrieval Lifecycle

```text
Snapshot read
→ identify self person
→ visibility filter
→ perspective-owner filter
→ candidate extraction
→ relevance/status/confidence ranking
→ deduplication
→ memory limit
→ Context Envelope
```

Context Envelope существует только для выполнения запроса и не становится отдельной долговременной памятью по умолчанию.

Приватная запись другого владельца перспективы исключается до ранжирования. Гипотеза передаётся только с её типом и status.

## Состояния Diary Session

- `active` — идёт диалог или импортирована выбранная беседа; данные находятся в изолированном черновике.
- `analyzing` — AI/skills формируют предложения без изменения основной модели.
- `review` — пользователь видит исходник и Proposed Changes.
- `awaiting_confirmation` — Change Set отредактирован и ожидает явного согласия.
- `committed` — подтверждённые изменения внесены.
- `saved_as_draft` — сессия сохранена без commit.
- `rejected` — предложения отклонены; основная модель не изменена.
- `cancelled` — сессия отменена.

Messenger conversation может быть источником Diary Session, но не обходит `review` и `awaiting_confirmation`.

## Обязательное подтверждение

UserConfirmation содержит:

```json
{
  "sessionId": "diary-session-id",
  "changeSetId": "change-set-id",
  "confirmedBy": "person-id",
  "confirmedAt": "ISO-8601",
  "acceptedChangeIds": [],
  "rejectedChangeIds": [],
  "sourceConversationId": "thread-id|null",
  "sourceAgentId": "agent-id|null"
}
```

До появления UserConfirmation производные записи не переходят в Semantic или Living Memory.

## Статусы доменных записей

- `draft` — незавершённая запись.
- `observed` — зафиксировано, но не подтверждено всеми затронутыми сторонами.
- `hypothesis` — проверяемое предположение.
- `confirmed` — подтверждено допустимым источником или участником.
- `disputed` — существует явное несогласие.
- `finalized` — зафиксирована неизменяемая версия.
- `archived` — неактуально, но сохраняется в истории.

## Правила переходов

- Agent Response не имеет перехода напрямую в `confirmed`.
- `[HROS:record-id]` означает использованный источник, а не подтверждение нового вывода.
- `hypothesis → confirmed` только через Verification.
- `observed → confirmed` требует источника и основания.
- `disputed` нельзя автоматически переводить в `confirmed`.
- `finalized` нельзя изменять in-place: создаётся новая версия.
- Удаление создаёт revision/tombstone; связанные Evidence и Original Memory не уничтожаются автоматически.
- Change Set не может быть committed без UserConfirmation.
- AI не может принять собственные Proposed Changes.
- Изменение visibility требует отдельного явного действия пользователя.
- Messenger reply/edit/delete изменяет только беседу, а не committed HROS record.

## Три уровня памяти

### Original Memory

Дословный diary transcript, подтверждённая Messenger conversation, голосовая расшифровка, документ или файл. Только append/version после commit.

### Semantic Memory

Нормализованные Person, Relationship, Moment и DomainRecord. Каждый элемент ссылается на Original/Evidence и session provenance.

### Living Memory

Текущее синтетическое понимание. Имеет `validFrom`, `derivedFrom`, `confidence`, `perspectiveOwnerId` и срок следующей проверки.

## Конфликты

При противоречии создаются связи `supportsIds` и `contradictsIds`. Система показывает конфликт и не перезаписывает одну версию другой. Агент обязан представить конфликт как несколько версий, а не выбрать удобную без основания.

## Транзакционность

В локальном adapter подтверждённый Change Set записывается одним snapshot commit. Production API должен использовать server-side batch transaction; последовательный REST commit считается временным режимом совместимости.

Agent request всегда read-only. Даже при наличии API и GPT provider он не открывает транзакцию записи HROS.

## Диагностика

Разрешено хранить:

- trace ID;
- agent ID;
- provider/model;
- duration;
- HTTP status;
- число memory references;
- класс ошибки.

Запрещено хранить в общем диагностическом потоке:

- API keys;
- полный Context Envelope;
- private message text;
- полный response body;
- персональные данные в URL.

## Миграции

Каждый snapshot имеет `schemaVersion`. Messenger storage использует отдельные ключи и не меняет domain schema. Миграции должны быть идемпотентны, сохранять старый storage key до успешной проверки и записывать диагностическое событие.
