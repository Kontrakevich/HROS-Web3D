# Skill: AI Diary Session

## Назначение

Оркестрирует живой диалог пользователя с ИИ-дневником как основной источник данных HROS. Сохраняет исходный транскрипт, вызывает специализированные аналитические skills, формирует редактируемый Change Set и передаёт его на явное подтверждение пользователя.

## Версия контракта

`1.0.0`

## Входы

- `sessionId`;
- `participantId`;
- `topic`;
- массив `messages[]` с `id`, `role`, `text`, `at`;
- связанные `personIds`, `relationshipIds`, `momentIds`;
- текущие Original/Semantic/Living Memory;
- privacy/consent context;
- `traceId`;
- `idempotencyKey`.

## Выходы

- `originalTranscript`;
- `interview_session`;
- `interview_answer[]`;
- `proposedChanges[]`;
- `changeSet`;
- `nextQuestion`;
- `sessionState`;
- `diagnostics`.

Skill **не возвращает committed records без отдельного UserConfirmation**.

## Состояния

`active → analyzing → review → awaiting_confirmation → committed`

Альтернативы: `saved_as_draft`, `rejected`, `cancelled`.

## Ограничения

- Один шаг — один вопрос.
- Не подсказывать желаемый ответ.
- Не превращать ответ одного человека в перспективу другого.
- Не объявлять мотив, диагноз или намерение фактом.
- Не повышать visibility.
- Не изменять основной snapshot во время `active|analyzing|review`.
- Не выполнять commit без `confirmedBy`, `confirmedAt`, `acceptedChangeIds`.
- Не удалять отклонённые изменения из audit trail.
- Не модифицировать Original Memory.
- Не использовать private-записи другого участника без согласия.

## Структура Change Set

```json
{
  "id": "change-set-id",
  "sessionId": "diary-session-id",
  "status": "awaiting_confirmation",
  "changes": [
    {
      "id": "change-id",
      "kind": "perspective",
      "statement": "...",
      "accepted": true,
      "confidence": 0.8,
      "visibility": "private",
      "sourceMessageIds": ["message-id"]
    }
  ]
}
```

## User Confirmation

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

## Критерии качества

- исходный пользовательский текст сохранён дословно;
- каждый derived record ссылается на `sessionId` и исходные сообщения;
- Fact, Perspective, Observation и Hypothesis разделены;
- неизвестная перспектива не заполняется догадкой;
- пользователь видит все изменения до commit;
- ручные исправления входят в confirmation audit;
- повторный вызов с тем же `idempotencyKey` не создаёт дубликаты;
- при ошибке commit основная модель остаётся согласованной.

## Диагностика

`SESSION_NOT_FOUND`, `EMPTY_TRANSCRIPT`, `CONSENT_REQUIRED`, `LEADING_QUESTION`, `INVALID_CHANGE_SET`, `UNCONFIRMED_CHANGE_SET`, `VISIBILITY_ESCALATION_DENIED`, `IDEMPOTENCY_CONFLICT`, `PARTIAL_COMMIT`.

Диагностика не должна содержать полный private transcript; допускаются IDs, counts, state и sanitized error.

## Совместимость с n8n

Вход:

```json
{
  "skill": "ai-diary-session",
  "contractVersion": "1.0.0",
  "traceId": "uuid",
  "actorId": "person-id",
  "workspaceId": "workspace-id",
  "input": {
    "sessionId": "diary-session-id",
    "message": {"id":"message-id","role":"user","text":"..."}
  },
  "privacy": {"visibility":"private"}
}
```

Выход:

```json
{
  "result": {
    "sessionState": "review",
    "nextQuestion": "...",
    "changeSet": {},
    "records": []
  },
  "diagnostics": {"status":"ok","warnings":[]}
}
```

## Совместимые skills

- `interview-engine`;
- `evidence-intake`;
- `perspective-capture`;
- `action-impact`;
- `moment-engine`;
- `relationship-state`;
- `memory-projection`;
- `consent-visibility`;
- `diagnostic-package`.
