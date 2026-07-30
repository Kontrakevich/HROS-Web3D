# Skill: Perspective Capture

## Назначение

Сохраняет намерение, восприятие, чувство или смысл от лица конкретного человека, не превращая его перспективу в общий факт.

## Входы

- `perspectiveOwnerId`;
- `statement`;
- subjectIds, relationshipIds, momentIds;
- source/evidenceIds;
- status, confidence, visibility;
- optional `perspectiveType`: intent, perception, emotion, meaning, need, boundary.

## Выходы

- `perspective` record;
- ссылки на Evidence/Moment/Relationship;
- conflicts с другими перспективами;
- diagnostics.

## Ограничения

- `perspectiveOwnerId` обязателен.
- Нельзя создавать перспективу за другого человека на основании догадки.
- Пересказ пользователя о другом человеке хранится как перспектива пользователя, а не другого человека.
- Несогласие сохраняется через `contradictsIds` и статус `disputed`.

## Критерии качества

- владелец перспективы однозначен;
- statement не сформулирован как объективный факт без основания;
- visibility не повышена;
- источник и confidence указаны;
- связанные противоречия не удаляются.

## Диагностика

`MISSING_PERSPECTIVE_OWNER`, `OWNER_NOT_FOUND`, `UNSUPPORTED_PERSPECTIVE_TYPE`, `IMPERSONATION_RISK`, `CONSENT_REQUIRED`.

## n8n

Вход: `skill=perspective-capture`, `input.ownerId`, `input.statement`, `input.links`.
Выход: `result.record`, `result.conflicts`, `diagnostics`.