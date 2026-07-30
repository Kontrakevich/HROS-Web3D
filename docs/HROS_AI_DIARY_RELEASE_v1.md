# HROS v1 — AI Diary Foundation

Дата выпуска: 2026-07-30

## Назначение выпуска

Сборка корректирует главный продуктовый сценарий HROS: первичным источником данных теперь является живой диалог с ИИ-дневником, а Web3D, связи, характеристики и выводы строятся как производные представления подтверждённых записей.

## Реализованный цикл

```text
Живой диалог
→ изолированный session draft
→ Original Transcript
→ редактируемый Change Set
→ ручная проверка
→ явное подтверждение
→ commit
→ Original / Semantic / Living Memory
→ Web3D / знания / книга
```

## Состав сборки

- интерфейс `ИИ-дневник` как первый раздел HROS;
- пошаговый guided dialogue;
- отсутствие изменений основного snapshot во время диалога и review;
- Change Set с включением, редактированием и отклонением предложений;
- обязательный confirmation checkbox;
- Original Memory с полным транскриптом;
- Interview Answer с дословными ответами;
- derived records с `sessionId`, evidence и source;
- User Confirmation с accepted/rejected IDs;
- атомарный LocalStorage commit;
- каноническая идеология и повторный alignment audit;
- `ai-diary-session` skill с n8n-контрактом;
- Chromium/WebKit acceptance test полного сценария.

## Проверяемые инварианты

1. До подтверждения количество records в основном snapshot не меняется.
2. Пользователь видит все proposed changes.
3. Без отдельного подтверждения commit невозможен.
4. После commit исходный транскрипт сохраняется отдельно от производных записей.
5. Perspective и Hypothesis не смешиваются.
6. Отклонённые предложения фиксируются в confirmation audit.
7. AI не повышает visibility самостоятельно.

## Ограничения

- внешняя LLM-оркестрация ещё не подключена;
- автоматическое извлечение людей, отношений, моментов и паттернов будет выполняться через специализированные skills;
- production API требует server-side transactional Change Set endpoint;
- реальная многопользовательская авторизация и consent между аккаунтами остаются следующим защищённым контуром.

## Следующий этап

**HROS AI Orchestration & Transactional Commit**:

- подключение модели через n8n/OpenRouter;
- вызов `ai-diary-session`, `evidence-intake`, `perspective-capture`, `moment-engine`, `relationship-state`;
- schema-validated Change Set;
- серверная транзакция commit/rollback;
- трассировка до конкретной реплики;
- диагностический пакет без private content.
