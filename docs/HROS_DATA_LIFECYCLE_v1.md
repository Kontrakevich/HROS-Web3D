# HROS v1 — Data Lifecycle

## Основной поток данных

```text
Live Dialogue
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
→ Living Memory / Book / Web3D
```

## Состояния diary session

- `active` — идёт диалог, данные находятся в изолированном черновике.
- `analyzing` — AI/skills формируют предложения без изменения основной модели.
- `review` — пользователь видит исходник и Proposed Changes.
- `awaiting_confirmation` — Change Set отредактирован и ожидает явного согласия.
- `committed` — подтверждённые изменения внесены.
- `saved_as_draft` — сессия сохранена без commit.
- `rejected` — предложения отклонены; основная модель не изменена.
- `cancelled` — сессия отменена.

## Обязательное подтверждение

UserConfirmation содержит:

```json
{
  "sessionId": "diary-session-id",
  "changeSetId": "change-set-id",
  "confirmedBy": "person-id",
  "confirmedAt": "ISO-8601",
  "acceptedChangeIds": [],
  "rejectedChangeIds": []
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

- `hypothesis → confirmed` только через Verification.
- `observed → confirmed` требует источника и основания.
- `disputed` нельзя автоматически переводить в `confirmed`.
- `finalized` нельзя изменять in-place: создаётся новая версия.
- Удаление создаёт revision/tombstone; связанные Evidence и Original Memory не уничтожаются автоматически.
- Change Set не может быть committed без UserConfirmation.
- AI не может принять собственные Proposed Changes.
- Изменение visibility требует отдельного явного действия пользователя.

## Три уровня памяти

### Original Memory

Дословный ответ, полный diary transcript, импортированное сообщение, голосовая расшифровка или файл. Только append/version.

### Semantic Memory

Нормализованные Person, Relationship, Moment и DomainRecord. Каждый элемент ссылается на Original/Evidence и session provenance.

### Living Memory

Текущее синтетическое понимание. Имеет `validFrom`, `derivedFrom`, `confidence`, `perspectiveOwnerId` и срок следующей проверки.

## Конфликты

При противоречии создаются связи `supportsIds` и `contradictsIds`. Система показывает конфликт и не перезаписывает одну версию другой.

## Транзакционность

В локальном adapter подтверждённый Change Set записывается одним snapshot commit. Production API должен использовать server-side batch transaction; последовательный REST commit считается временным режимом совместимости.

## Миграции

Каждый snapshot имеет `schemaVersion`. Миграции должны быть идемпотентны, сохранять старый storage key до успешной проверки и записывать диагностическое событие.
