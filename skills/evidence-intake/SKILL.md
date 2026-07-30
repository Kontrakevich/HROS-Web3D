# Skill: Evidence Intake

## Назначение

Принимает исходный текст, голосовую расшифровку, сообщение, документ, фотографию или ссылку и сохраняет неизменяемый Original Memory плюс Evidence с provenance.

## Входы

- `content` или file metadata/reference;
- `source.kind`, `source.label`, timestamp;
- author/owner;
- subjectIds, momentIds;
- visibility и consent context;
- optional checksum/idempotency key.

## Выходы

- `original_memory` record;
- `evidence` record;
- checksum, provenance, warnings;
- diagnostics.

## Ограничения

- Не переписывать и не «улучшать» исходник.
- Бинарные файлы на GitHub Pages не сохранять в LocalStorage; только безопасные метаданные и ссылки.
- Не извлекать Fact без отдельного шага.
- Не включать private content в diagnostics.

## Критерии качества

- источник и время сохранены;
- immutable original отделён от semantic extraction;
- дубликаты определяются по checksum/idempotency key;
- visibility не шире исходного разрешения.

## Диагностика

`UNSUPPORTED_SOURCE`, `CONTENT_MISSING`, `FILE_STORAGE_UNAVAILABLE`, `CHECKSUM_CONFLICT`, `CONSENT_REQUIRED`.

## n8n

Вход: `skill=evidence-intake`, `input.content|file`, `privacy.visibility`.
Выход: `result.originalMemory`, `result.evidence`, `diagnostics`.