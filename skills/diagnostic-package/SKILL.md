# Skill: Diagnostic Package

## Назначение

Автоматически формирует диагностический пакет при ошибке HROS или внешнего workflow, позволяя воспроизвести этап без раскрытия секретов и private-содержимого.

## Входы

- traceId, task/workspace ID;
- stage и skill;
- exception class/code;
- sanitized request/response metadata;
- entity IDs, versions и state transitions;
- runtime/build versions;
- browser console/network status при наличии.

## Выходы

- diagnostic manifest;
- sanitized logs;
- reproduction steps;
- integrity checksum;
- classification: code, data, external, permission, privacy или infrastructure.

## Ограничения

- Никогда не включать токены, cookies, пароли, authorization headers и private record content.
- URL query/headers очищаются.
- Пакет не должен менять состояние задачи.
- Содержимое вложений не копируется без отдельного согласия.

## Критерии качества

- указан точный этап отказа;
- сохранены версии приложения, schema и skill contract;
- есть traceId и временная шкала;
- можно отличить исходную ошибку от последующих;
- пакет валиден JSON и пригоден для n8n/GitHub artifact.

## Диагностика

`SANITIZATION_FAILED`, `TRACE_MISSING`, `MANIFEST_INCOMPLETE`, `PRIVATE_DATA_DETECTED`, `ARTIFACT_WRITE_FAILED`.

## n8n

Вход: `skill=diagnostic-package`, `input.failureContext`.
Выход: `result.manifest`, `result.files`, `result.classification`, `diagnostics`.