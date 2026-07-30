# HROS v1 — Data Lifecycle

## Поток данных

```text
Capture
→ Original Memory
→ Evidence
→ Fact/Perspective extraction
→ Observation
→ Hypothesis
→ Verification
→ Pattern
→ Principle
→ Living Memory / Book
```

## Статусы

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

## Три уровня памяти

### Original Memory
Дословный ответ, импортированное сообщение, голосовая расшифровка или файл. Только append/version.

### Semantic Memory
Нормализованные Person, Relationship, Moment и DomainRecord. Каждый элемент ссылается на Original/Evidence.

### Living Memory
Текущее синтетическое понимание. Имеет `validFrom`, `derivedFrom`, `confidence`, `perspectiveOwnerId` и срок следующей проверки.

## Конфликты

При противоречии создаются связи `supportsIds` и `contradictsIds`. Система показывает конфликт и не перезаписывает одну версию другой.

## Миграции

Каждый snapshot имеет `schemaVersion`. Миграции должны быть идемпотентны, сохранять старый storage key до успешной проверки и записывать диагностическое событие.