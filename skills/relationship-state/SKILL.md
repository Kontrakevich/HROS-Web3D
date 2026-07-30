# Skill: Relationship State

## Назначение

Фиксирует динамическое состояние отношений в конкретный период и с конкретной перспективы. Не сводит отношение к одной постоянной «силе».

## Входы

- `relationshipId`;
- `perspectiveOwnerId` или `joint=true`;
- `period`;
- оценки `closeness`, `trust`, `safety`, `reciprocity`, `availability`, `boundaryRespect`, `tension` в диапазоне -1..1;
- `source`, `confidence`, `visibility`, `momentIds`.

## Выходы

- `relationship_state` record;
- изменение временного ряда;
- revisions и diagnostics.

## Ограничения

- Joint-состояние допустимо только при подтверждении обоих участников или явном основании.
- Перспектива одного человека не публикуется как состояние другого.
- Отрицательная оценка не превращается в моральный ярлык человека.
- AI-оценка маркируется как `source.kind=ai`.

## Критерии качества

- указан период;
- указан владелец перспективы либо совместный режим;
- все шкалы находятся в допустимом диапазоне;
- присутствует минимум одно основание;
- новое состояние создаёт версию, а не перезаписывает историю.

## Диагностика

`RELATIONSHIP_NOT_FOUND`, `MISSING_PERIOD`, `MISSING_PERSPECTIVE`, `JOINT_STATE_WITHOUT_CONSENT`, `SCALE_OUT_OF_RANGE`.

## n8n

Вход: `skill=relationship-state`, `input.relationshipId`, `input.metrics`, `input.period`.
Выход: `result.record`, `result.timeline`, `diagnostics`.