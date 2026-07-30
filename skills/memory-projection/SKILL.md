# Skill: Memory Projection

## Назначение

Строит три раздельных слоя памяти: неизменяемую Original Memory, структурированную Semantic Memory и актуальную Living Memory с основаниями и сроком проверки.

## Входы

- Original Memory/Evidence IDs;
- Fact, Perspective, Observation, Verification, Pattern;
- `perspectiveOwnerId` или joint scope;
- период актуальности;
- privacy/consent context.

## Выходы

- `semantic_memory` records;
- `living_memory` record с `derivedFrom`, confidence, validFrom и reviewAfter;
- список конфликтов и недостаточных оснований;
- diagnostics.

## Ограничения

- Original Memory не изменяется.
- Living Memory не объявляется фактом и всегда ссылается на основания.
- Нельзя смешивать private-перспективы разных людей.
- При конфликте создаётся disputed/uncertain projection, а не усреднение.
- Устаревшая Living Memory архивируется новой версией.

## Критерии качества

- provenance трассируется до исходного материала;
- присутствуют confidence и дата следующей проверки;
- факты и перспективы различимы;
- повторный запуск детерминирован для одного набора оснований.

## Диагностика

`ORIGINAL_MEMORY_MISSING`, `INSUFFICIENT_PROVENANCE`, `PERSPECTIVE_SCOPE_CONFLICT`, `CONSENT_REQUIRED`, `STALE_PROJECTION`.

## n8n

Вход: `skill=memory-projection`, `input.sourceRecordIds`, `input.scope`.
Выход: `result.semanticMemory`, `result.livingMemory`, `result.conflicts`, `diagnostics`.