# Skill: hros-full-playtest-builder

## Назначение

Собирать расширенную тестовую версию HROS, в которой пользователь может пройти полный продуктовый цикл от быстрого захвата мысли до проверки источника, не нарушая обязательный Diary Change Set contract.

## Входы

- HROS snapshot v1;
- HROS COMMAND UI;
- AI Diary module;
- People, Relationships, Moments и Records;
- локальные UI-настройки;
- критерии конкретного playtest;
- ограничения privacy и consent.

## Выходы

- связный full playtest интерфейс;
- Quick Capture;
- локальный Inbox;
- Living World detail mode;
- Source Inspector;
- Avatar Suggestions;
- расширенные Paths и Chronicle;
- data operations;
- feedback form;
- browser acceptance tests;
- диагностируемая сборка.

## Обязательный алгоритм

```text
1. Прочитать Blueprint, UI/UX contract и Acceptance Criteria.
2. Зафиксировать границу domain snapshot и playtest state.
3. Определить полный тестируемый пользовательский цикл.
4. Добавить недостающие промежуточные состояния.
5. Не писать Quick Capture напрямую в domain snapshot.
6. Провести пользователя через Inbox и AI Diary.
7. Добавить provenance/source inspector.
8. Проверить, что avatar/path/game state не оценивает человека.
9. Добавить экспорт, reset и feedback.
10. Протестировать desktop, mobile, Chromium и WebKit.
11. Диагностировать ошибки и повторить цикл.
12. Обновить документы и acceptance criteria.
```

## Состояния Quick Capture

```text
captured
→ draft
→ edited
→ transferred_to_diary | deleted
```

Quick Capture не может иметь состояния `confirmed` без прохождения Diary Session и User Confirmation.

## Правила Living World

- карта является навигацией, а не источником истины;
- выбор человека открывает отношения, моменты и перспективы;
- любой аналитический элемент должен вести к источнику;
- скрытая агрегация перспектив запрещена;
- отсутствие данных отображается явно;
- Web3D и 2D World являются представлениями одной модели.

## Правила Avatar Suggestions

- предложение строится только из доступных records;
- источники показываются до применения;
- применение означает локальную примерку;
- Identity Core не меняется;
- relationship context меняет среду и ауру, а не ценность, лицо или тело;
- автоматическое применение запрещено;
- для domain commit позже требуется отдельный Avatar Change Set.

## Правила Source Inspector

Инспектор обязан показывать:

- ID;
- entity type;
- kind/type;
- statement/meaning;
- status;
- confidence;
- visibility;
- version;
- source label и source kind;
- timestamps;
- linked IDs.

## Ограничения

- не имитировать подключённую LLM;
- не записывать playtest feedback в HROS knowledge graph;
- не создавать скрытые факты;
- не использовать human score;
- не использовать streak penalty, FOMO, loot box;
- не удалять domain snapshot при reset playtest;
- не использовать приватные данные в diagnostics;
- не смешивать разные перспективы.

## Критерии качества

- главный пользовательский цикл можно пройти без ручного открытия developer tools;
- пользователь понимает, какие данные являются черновиками;
- snapshot не меняется после Quick Capture;
- источник доступен максимум за два действия;
- все экраны работают при ширине 390 CSS px;
- нет горизонтальной прокрутки документа;
- нет console errors;
- browser acceptance проходит в Chromium и WebKit;
- экспортированные JSON валидны;
- reset playtest сохраняет `hros.snapshot.v1`.

## Диагностика

При ошибке фиксировать:

- build version;
- active screen;
- action;
- local storage keys без приватного содержимого;
- exception name/message/stack;
- browser and viewport;
- screenshot/trace в CI;
- snapshot record count до и после действия;
- факт возможной domain mutation.

## Совместимость с n8n

Skill должен допускать вызов как последовательности независимых операций:

```json
{
  "skill": "hros-full-playtest-builder",
  "operation": "capture|list_inbox|transfer_to_diary|render_world|inspect_source|suggest_avatar|export_feedback",
  "input": {},
  "output": {},
  "diagnostics": {
    "status": "ok|error",
    "stage": "string",
    "message": "string"
  }
}
```

Webhook-события в будущей n8n-интеграции:

- `hros.capture.created`;
- `hros.capture.transferred`;
- `hros.source.opened`;
- `hros.playtest.feedback_saved`;
- `hros.playtest.exported`.

Webhook не имеет права подтверждать Change Set вместо пользователя.
