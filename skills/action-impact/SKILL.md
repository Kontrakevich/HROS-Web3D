# Skill: Action Impact

## Назначение

Разделяет наблюдаемое действие, намерение действующего, восприятие другого участника, эмоциональную реакцию, затронутые потребности/границы, изменение состояния отношений и восстановительное действие.

## Входы

- `actorId`, `recipientIds[]`, `momentId`;
- `observableBehavior`;
- необязательное `intent` только с указанным perspective owner;
- связанные Perspective/Fact/Evidence;
- `visibility`, `source`, `confidence`, `traceId`.

## Выходы

- Action record;
- связанные Perspective/Observation records;
- предложения `repairOptions` без автоматического назначения виновного;
- diagnostics.

## Ограничения

- Не выводить намерение из поведения как факт.
- Не объединять реакцию получателя с описанием действующего.
- Не рассчитывать «объективный ущерб отношениям» без маркировки перспективы.
- Не повышать visibility.

## Критерии качества

- observableBehavior описывает проверяемое действие;
- intent и perception имеют владельцев перспективы;
- последствия связаны с moment/relationship;
- uncertainty сохранена;
- repairOptions представлены как варианты, не директивы.

## Диагностика

`ACTOR_NOT_FOUND`, `MOMENT_NOT_FOUND`, `INTENT_WITHOUT_OWNER`, `PERSPECTIVE_COLLAPSE`, `VISIBILITY_ESCALATION_DENIED`.

## n8n

Вход: `skill=action-impact`, `input.action`, `input.perspectives`.
Выход: `result.actionRecord`, `result.linkedRecords`, `result.repairOptions`, `diagnostics`.