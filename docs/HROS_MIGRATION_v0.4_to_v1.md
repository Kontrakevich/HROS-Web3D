# HROS — Migration v0.4 → v1

## Цель

Сохранить существующие Person, Relationship, Moment и revisions, устранить рассинхронизацию версий и добавить канонический контур знаний.

## Изменения

- storage key: `hros.snapshot.v0.2` → `hros.snapshot.v1`;
- diagnostics key: `hros.diagnostics.v0.2` → `hros.diagnostics.v1`;
- `meta.version` и `meta.schemaVersion` → `1.0.0`;
- существующие `observations`, `hypotheses`, `patterns` переносятся в `records` с соответствующим kind;
- добавляются collections: evidence, facts, perspectives, verifications, principles, memoryRecords, bookChapters, consentPolicies;
- Moment остаётся событием, а намерения/перспективы/выводы выносятся в records;
- старая `relationshipEffect` сохраняется как legacy aggregate и маркируется как оценка пользователя.

## Алгоритм локальной миграции

1. Прочитать `hros.snapshot.v1`.
2. Если отсутствует — прочитать `hros.snapshot.v0.2`.
3. Скопировать исходный объект без удаления старого ключа.
4. Нормализовать все массивы и метаданные.
5. Преобразовать старые knowledge arrays в records.
6. Добавить seed-записи v1 только при отсутствии эквивалентных ID.
7. Проверить ссылки на people/relationships/moments.
8. Записать `hros.snapshot.v1`.
9. Записать событие `migration.v0.4_to_v1`.

## Обратимость

Старый ключ не удаляется автоматически. Экспорт snapshot доступен до и после миграции.

## API/DB

Добавляется универсальная таблица `domain_records`. Старые таблицы не удаляются. Миграция создаёт таблицу идемпотентно через metadata/create_all. Snapshot API группирует records по kind.

## Критерии успешности

- число people/relationships/moments не уменьшается;
- ID существующих сущностей сохраняются;
- `schemaVersion=1.0.0`;
- есть минимум по одной Perspective, Principle и MemoryRecord;
- browser test проходит в Chromium и WebKit;
- backend test подтверждает CRUD DomainRecord и группировку snapshot.