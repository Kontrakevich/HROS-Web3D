# Skill: HROS Game Interface Director

## Назначение

Проектирует, реализует и проверяет игровой пользовательский интерфейс HROS, сохраняя первичность ИИ-дневника, проверяемость данных, приватность и право пользователя подтверждать изменения.

## Контракт

- Skill ID: `hros-game-interface-director`
- Contract version: `1.0.0`
- Execution model: deterministic UI composition + explicit user actions
- n8n compatibility: yes

## Входы

- `productVersion`;
- `screenId`;
- `userGoal`;
- `snapshotSummary` без приватного содержимого, если оно не требуется экрану;
- `diarySessionState`;
- `avatarPreviewSettings`;
- `activePathId`;
- `theme`;
- `viewport`;
- `inputMode`;
- `accessibility.reducedMotion`;
- `traceId`;
- `idempotencyKey`.

## Выходы

- screen information architecture;
- primary CTA;
- secondary actions;
- component tree;
- responsive rules;
- navigation destination map;
- accessibility annotations;
- game mechanic safety result;
- acceptance test cases;
- diagnostics.

## Основные правила

1. На одном экране только одно главное действие.
2. ИИ-дневник остаётся основным источником данных.
3. Игровой UI не выполняет скрытый domain commit.
4. Прогресс не применяется к ценности человека или качеству отношений.
5. Любой путь, модификатор или награда должен иметь объяснимое основание.
6. Web3D не блокирует доступ к данным.
7. Точные редакторы, source, confidence, privacy и revisions остаются доступны.
8. Навигация работает с мышью, клавиатурой и touch.
9. Анимация не должна быть обязательной для понимания.
10. Мобильная версия проектируется одновременно с desktop.

## Запрещённые механики

- общий human score;
- love score как единая истина;
- наказание за пропуск;
- dark patterns;
- FOMO;
- лутбоксы;
- награды за раскрытие приватного;
- автоматическое подтверждение AI-вывода;
- изображение конфликта как визуального уродства человека;
- недоступность данных без Web3D.

## Порядок работы

```text
Получить UX goal
→ определить ответственность экрана
→ выбрать primary CTA
→ построить hierarchy
→ проверить game mechanic safety
→ собрать responsive UI
→ связать с существующими routes
→ выполнить keyboard/touch check
→ выполнить Chromium/WebKit tests
→ сформировать diagnostics
```

## Критерии качества

- главное действие находится за пять секунд;
- не более семи основных разделов;
- на mobile нет горизонтальной прокрутки;
- touch target не менее 44 px для основных действий;
- интерфейс не меняет HROS snapshot без предусмотренного domain confirmation;
- theme switch не меняет информационную архитектуру;
- reduced motion сохраняет всю информацию;
- каждый игровой показатель имеет пояснение;
- старые профессиональные редакторы доступны;
- browser tests не содержат console errors.

## Диагностика

- `PRIMARY_ACTION_MISSING`
- `NAVIGATION_OVERLOAD`
- `HUMAN_SCORE_DETECTED`
- `HIDDEN_COMMIT_ATTEMPT`
- `UNEXPLAINED_REWARD`
- `SOURCE_ACCESS_MISSING`
- `MOBILE_OVERFLOW`
- `FOCUS_PATH_BROKEN`
- `REDUCED_MOTION_UNSUPPORTED`
- `LEGACY_EDITOR_UNREACHABLE`

Диагностика не должна содержать private diary content.

## n8n envelope

```json
{
  "skill": "hros-game-interface-director",
  "contractVersion": "1.0.0",
  "traceId": "uuid",
  "actorId": "person-id",
  "workspaceId": "workspace-id",
  "input": {
    "screenId": "today",
    "userGoal": "continue-diary",
    "theme": "strategy",
    "viewport": "mobile"
  },
  "privacy": {"visibility": "private"},
  "result": {
    "primaryAction": {},
    "componentTree": [],
    "acceptanceTests": []
  },
  "diagnostics": {"status": "ok", "warnings": []}
}
```

## Совместимость

Взаимодействует с:

- `ai-diary-session`;
- `person-profile`;
- `relationship-state`;
- `moment-engine`;
- `memory-projection`;
- `book-builder`;
- будущими avatar skills.
