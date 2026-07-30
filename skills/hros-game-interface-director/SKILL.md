# Skill: HROS Game Interface Director

## Назначение

Проектирует, реализует и проверяет рабочий игровой интерфейс HROS, сохраняя первичность ИИ-дневника, проверяемость данных, privacy, доступ к точным редакторам и право пользователя подтверждать изменения.

## Контракт

- Skill ID: `hros-game-interface-director`
- Contract version: `1.1.0`
- Execution model: deterministic UI composition + repository-backed explicit actions
- n8n compatibility: yes

## Входы

- `productVersion`;
- `screenId`;
- `userGoal`;
- `snapshotSummary`;
- `diarySessionState`;
- `avatarState`;
- `pendingAvatarChangeSet`;
- `activePathId`;
- `theme`;
- `viewport`;
- `accessibility.reducedMotion`;
- `traceId`;
- `idempotencyKey`.

## Выходы

- information architecture;
- primary CTA;
- secondary actions;
- component tree;
- repository commands;
- source inspector;
- responsive rules;
- accessibility annotations;
- game mechanic safety result;
- acceptance tests;
- diagnostics.

## Основные правила

1. На одном экране одно главное действие.
2. ИИ-дневник остаётся основным источником данных.
3. UI не выполняет hidden domain commit.
4. Avatar change проходит через `avatar-evolution`.
5. Прогресс не применяется к ценности человека или качеству отношений.
6. Любой путь или автоматически предложенный модификатор имеет объяснимое основание.
7. Web3D не блокирует доступ к данным.
8. Source, confidence, privacy и revisions доступны.
9. Навигация работает с keyboard, pointer и touch.
10. Reduced motion сохраняет всю информацию.
11. Mobile проектируется одновременно с desktop.
12. Production UI не показывает внутренние playtest-маркеры.

## Запрещённые механики

- human score;
- love score как единая истина;
- наказание за пропуск;
- dark patterns и FOMO;
- loot boxes;
- награда за private disclosure;
- автоматическое подтверждение AI;
- визуальное уродование человека из-за конфликта;
- отсутствие данных без Web3D;
- сохранение Avatar preview напрямую без Change Set.

## Порядок работы

```text
получить UX goal
→ определить ответственность экрана
→ выбрать primary CTA
→ построить hierarchy
→ связать команды с Repository Service
→ проверить safety
→ собрать responsive UI
→ проверить keyboard/touch/reduced motion
→ выполнить Chromium/WebKit tests
→ сформировать diagnostics
```

## Критерии качества

- главное действие находится за пять секунд;
- не более семи основных разделов;
- touch target не менее 44 px;
- mobile без горизонтальной прокрутки;
- theme switch не изменяет domain snapshot;
- Avatar preview не изменяет profile до confirmation;
- source inspector доступен;
- старые редакторы доступны;
- browser tests не содержат console errors.

## Диагностика

- `PRIMARY_ACTION_MISSING`
- `NAVIGATION_OVERLOAD`
- `HUMAN_SCORE_DETECTED`
- `HIDDEN_COMMIT_ATTEMPT`
- `AVATAR_CHANGESET_BYPASSED`
- `UNEXPLAINED_REWARD`
- `SOURCE_ACCESS_MISSING`
- `MOBILE_OVERFLOW`
- `FOCUS_PATH_BROKEN`
- `REDUCED_MOTION_UNSUPPORTED`
- `LEGACY_EDITOR_UNREACHABLE`

Диагностика не содержит private diary content.

## Совместимость

- `ai-diary-session`;
- `avatar-evolution`;
- `person-profile`;
- `relationship-state`;
- `moment-engine`;
- `memory-projection`;
- `book-builder`;
- `consent-visibility`;
- `diagnostic-package`.
