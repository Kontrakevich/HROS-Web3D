# Skill: Relationship Book Builder

## Назначение

Формирует главы книги отношений из проверяемых Principle, Pattern, Perspective, Fact и Narrative Fragment, сохраняя происхождение и неопределённость.

## Входы

- scope: personal, couple или general;
- Principle/Pattern/Fact/Perspective IDs;
- chapter outline;
- visibility/consent context;
- tone и language;
- traceId.

## Выходы

- `book_chapter` record;
- связанные `narrative_fragment` records;
- provenance map;
- список спорных и недостающих оснований;
- diagnostics.

## Ограничения

- Не скрывать неопределённость красивой формулировкой.
- Не публиковать private-запись в совместной книге без согласия.
- Не представлять Perspective как общий Fact.
- Универсальный принцип должен быть маркирован как обобщение, если основан только на личной истории.
- Редактирование создаёт новую версию главы.

## Критерии качества

- каждый тезис трассируется до источников;
- область действия принципа указана;
- позиции участников не смешаны;
- глава содержит дату/версию;
- спорные места помечены.

## Диагностика

`PRINCIPLE_NOT_FOUND`, `INSUFFICIENT_PROVENANCE`, `PRIVATE_SOURCE_BLOCKED`, `SCOPE_OVERGENERALIZATION`, `CHAPTER_VERSION_CONFLICT`.

## n8n

Вход: `skill=book-builder`, `input.chapter`, `input.sourceIds`.
Выход: `result.chapter`, `result.fragments`, `result.provenance`, `diagnostics`.