# Skill: Interview Engine

## Назначение

Проводит управляемое интервью по одной теме: задаёт один вопрос, сохраняет исходный ответ, извлекает структуры, формирует проверяемые гипотезы и фиксирует согласие или несогласие участника.

## Входы

- `sessionId`, `topic`, `participantId`;
- текущий вопрос и цель вопроса;
- Original/Semantic/Living Memory;
- связанные hypotheses и unresolved conflicts;
- privacy/consent context;
- `traceId`, `idempotencyKey`.

## Выходы

- `interview_answer` и `original_memory`;
- Evidence/Perspective/Observation records;
- следующий один вопрос;
- Verification для проверяемой гипотезы;
- состояние session и diagnostics.

## Ограничения

- Один шаг — один вопрос.
- Не подсказывать участнику желаемый ответ.
- Не превращать ответ одного человека в перспективу другого.
- Не переводить hypothesis в confirmed без Verification.
- Сохранять «не знаю», отказ и несогласие как допустимые результаты.
- Не использовать private-записи другого участника без согласия.

## Критерии качества

- исходный ответ сохранён дословно;
- каждый извлечённый элемент ссылается на ответ;
- следующий вопрос объясним целью проверки;
- противоречащие сведения не удалены;
- session можно безопасно продолжить после повторного запуска.

## Диагностика

`SESSION_NOT_FOUND`, `PARTICIPANT_NOT_FOUND`, `CONSENT_REQUIRED`, `LEADING_QUESTION`, `HYPOTHESIS_PROMOTION_DENIED`, `IDEMPOTENCY_CONFLICT`.

## n8n

Вход: `skill=interview-engine`, `input.sessionId`, `input.answer`.
Выход: `result.records`, `result.nextQuestion`, `result.sessionState`, `diagnostics`.