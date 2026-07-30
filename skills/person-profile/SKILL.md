# Skill: Person Profile

## Назначение

Создаёт и обновляет профиль человека без превращения карточки в набор постоянных ярлыков. Изменяемые характеристики сохраняются отдельными `person_facet` records с источником, перспективой, уверенностью и версией.

## Входы

- `person`: идентификатор, имя, роль и базовая категория;
- `facets[]`: value, need, boundary, belief, goal, preference, trigger, care_language, protection_strategy, contradiction, life_period;
- `perspectiveOwnerId`;
- `source`;
- `visibility`;
- `traceId`.

## Выходы

- Person;
- список созданных/обновлённых `person_facet` records;
- revisions;
- diagnostics.

## Ограничения

- Не записывать диагноз, мотив или устойчивую черту как факт без подтверждения.
- Не объединять разные перспективы в одно свойство.
- Не изменять Original Memory.
- Новая запись по умолчанию `private`.
- Удаление Person не должно молча уничтожать Evidence; ссылки помечаются как orphaned/disputed.

## Критерии качества

- каждый facet имеет `facetType`, statement, source, confidence и perspective owner;
- отсутствующие данные явно остаются неизвестными;
- contradictory facets могут сосуществовать;
- повторный запуск с тем же idempotency key не создаёт дубль.

## Диагностика

Коды: `PERSON_NOT_FOUND`, `INVALID_FACET_TYPE`, `MISSING_PERSPECTIVE_OWNER`, `VISIBILITY_ESCALATION_DENIED`, `DUPLICATE_IDEMPOTENCY_KEY`.

Логировать traceId, этап, IDs и код ошибки без текста private-записей.

## n8n

Вход: JSON envelope `skill=person-profile`, `contractVersion=1.0.0`, `input.person`, `input.facets`.

Выход: `result.person`, `result.records`, `diagnostics.status`, `diagnostics.warnings`.