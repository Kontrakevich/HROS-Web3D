# Skill: Consent and Visibility

## Назначение

Управляет пространствами `private`, `shared_with_partner`, `shared` и `group`, фиксирует версионируемое согласие и отзыв согласия.

## Входы

- ownerId, subjectIds;
- recordId или category scope;
- current/target visibility;
- recipients, purpose, expiresAt;
- consent action: grant, revoke, inspect;
- traceId.

## Выходы

- `consent_policy` record/revision;
- решение `allowed|denied`;
- обновлённая visibility только при разрешении;
- список затронутых Living Memory/AI projections;
- diagnostics.

## Ограничения

- Новая запись по умолчанию private.
- AI не может повышать visibility.
- Отзыв прекращает дальнейшее использование в новых выводах.
- Согласие одного человека не заменяет согласие другого субъекта.
- Diagnostics не содержит private content.

## Критерии качества

- решение объяснимо policy IDs;
- указаны цель, получатели и срок;
- отзыв версионируется;
- доступ проверяется server-side в production;
- повторный grant/revoke идемпотентен.

## Диагностика

`OWNER_MISSING`, `SUBJECT_CONSENT_REQUIRED`, `VISIBILITY_ESCALATION_DENIED`, `CONSENT_EXPIRED`, `CONSENT_REVOKED`, `POLICY_CONFLICT`.

## n8n

Вход: `skill=consent-visibility`, `input.action`, `input.policy`, `input.recordId`.
Выход: `result.decision`, `result.policy`, `result.affectedRecords`, `diagnostics`.