# Skill: n8n Workflow Adapter

## Назначение

Преобразует HROS skill envelope в детерминированный n8n workflow contract и обратно без потери provenance, privacy и diagnostics.

## Входы

- `skill`, `contractVersion`, `traceId`, `workspaceId`, `actorId`;
- `input` согласно skill schema;
- privacy envelope;
- idempotency key;
- endpoint credentials только через n8n credentials/environment.

## Выходы

- нормализованный request/response envelope;
- routing metadata;
- retry/dead-letter decision;
- diagnostics без секретов.

## Ограничения

- Не помещать токены, пароли и private content в execution logs.
- Не менять visibility при маршрутизации.
- Нельзя терять traceId, source IDs и idempotency key.
- Повторный webhook/execution не создаёт дубликаты.
- Ошибка внешнего API не преобразуется в успешный результат.

## Критерии качества

- JSON совместим с n8n nodes;
- вход/выход валидируется до записи в HROS;
- поддерживаются retries с backoff и dead-letter пакет;
- execution сохраняет stage, code, request metadata и response status без секретов.

## Диагностика

`CONTRACT_VERSION_UNSUPPORTED`, `SCHEMA_VALIDATION_FAILED`, `CREDENTIAL_REFERENCE_MISSING`, `EXTERNAL_API_ERROR`, `IDEMPOTENCY_CONFLICT`, `PRIVACY_ENVELOPE_MISSING`.

## n8n envelope

```json
{
  "skill":"perspective-capture",
  "contractVersion":"1.0.0",
  "traceId":"uuid",
  "workspaceId":"workspace-id",
  "actorId":"person-id",
  "idempotencyKey":"stable-key",
  "privacy":{"visibility":"private"},
  "input":{},
  "result":{},
  "diagnostics":{"status":"ok","warnings":[]}
}
```