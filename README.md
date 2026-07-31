# HROS — Human Relationship Operating System

## HROS COMMAND: Full Living World Playtest 2

HROS — живая система понимания людей, памяти и отношений. Она превращает добровольный диалог человека с ИИ-дневником в проверяемую, редактируемую и развивающуюся карту людей, моментов, перспектив и взаимного влияния.

> Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.

## Главный пользовательский цикл

```text
Быстрая запись или живой диалог
→ локальный черновик / неизменяемый транскрипт
→ ИИ-дневник
→ предлагаемые факты, перспективы и связи
→ редактируемый Change Set
→ явное подтверждение пользователя
→ обновление HROS
→ персонаж / Living World / пути / хроника / точные редакторы
```

ИИ-дневник остаётся основным источником данных. Quick Capture, игровой интерфейс и аватар помогают начать действие и исследовать подтверждённую модель, но не изменяют её скрытно.

## Full Playtest 2

Вторая тестовая сборка проверяет полный продуктовый цикл, а не отдельные экраны.

### Сегодня

- один главный diary CTA;
- Quick Capture;
- локальные входящие;
- состояние подтверждённых данных, гипотез и черновиков;
- Relationship Pulse с последними подтверждёнными моментами;
- встроенный сценарий тестирования.

### Quick Capture и Inbox

```text
Быстрая запись
→ локальный inbox draft
→ ручная правка
→ передача в форму ИИ-дневника
→ Change Set
→ подтверждение
→ commit
```

Quick Capture не пишет напрямую в `hros.snapshot.v1`.

### Living World v2

- шесть областей жизни;
- люди внутри областей;
- поиск и фильтрация;
- карточка выбранного человека;
- значение связи;
- последние моменты;
- перспективы и действия;
- Source Inspector;
- переход в Web3D.

### Source Inspector

Показывает:

- entity type и kind;
- statement или meaning;
- ID;
- status;
- confidence;
- visibility;
- version;
- source label и source kind;
- timestamps;
- связанные ID.

### Аватар

- базовая форма, роль, палитра и модификаторы;
- relationship-context preview;
- локальная галерея Appearance Versions;
- предложения из существующих records;
- просмотр оснований до примерки;
- отсутствие скрытых изменений Identity Core.

### Пути и хроника

- переключение пути без удаления истории;
- открываемые основания прогресса;
- поиск и фильтры хроники;
- экспорт подтверждённых моментов и форм аватара;
- гипотезы не становятся сюжетными фактами.

### Система и playtest

- точные редакторы People, Moments, Knowledge, Couple, Book и Diagnostics;
- экспорт полного snapshot;
- безопасный сброс только playtest-настроек;
- структурированный feedback;
- экспорт feedback в JSON.

## Навигация

```text
Сегодня · Дневник · Мир · Аватар · Пути · Хроника · Система
```

Desktop использует command rail. Mobile использует нижнюю навигацию без горизонтальной прокрутки.

## Правила геймификации

Прогресс допустим для роли, навыка, проекта, пути, привычки и подтверждённого действия.

HROS не создаёт:

- общий уровень человека;
- рейтинг партнёра или родителя;
- силу любви одной цифрой;
- штраф за паузу;
- FOMO и лутбоксы;
- награду за раскрытие приватных данных;
- скрытое подтверждение AI-вывода.

## Источники интерфейсных принципов

Используются общие UX-принципы, а не визуальные материалы игр:

- The Sims — персонаж, режимы, прямое редактирование и история жизни;
- Brawl Stars — один главный CTA, короткие действия и мобильная ясность;
- The Battle of Polytopia — low-poly-мир, карта и дерево направлений;
- Hero Wars — многослойная карточка персонажа и разделение внешности от накопленного развития.

## Что работает в ядре

- AI Diary guided-dialogue;
- изолированный session draft;
- редактируемый Change Set;
- обязательное подтверждение перед commit;
- Original Memory с полным транскриптом;
- Interview Answer с дословными ответами;
- provenance до session и исходных сообщений;
- User Confirmation с accepted/rejected change IDs;
- Web3D-вселенная людей и связей;
- редакторы Person, Relationship и Moment;
- Evidence → Fact → Perspective → Observation → Hypothesis → Verification → Pattern → Principle;
- Original, Semantic и Living Memory;
- режим пары;
- Privacy by default;
- книга отношений;
- revisions и diagnostics;
- LocalStorage adapter и FastAPI/PostgreSQL adapter.

## Локальные ключи Full Playtest

```text
hros.command.full.v2
hros.command.inbox.v2
hros.command.feedback.v2
```

Они отделены от основной модели:

```text
hros.snapshot.v1
```

## Ограничения

- внешний LLM extraction provider пока не подключён;
- Avatar Ontology и Avatar Change Set ещё не канонизированы;
- real GLB/VRM avatar не подключён;
- Inbox, feedback и avatar appearance пока не имеют server-side API;
- multiplayer couple world не реализован;
- API diary commit пока использует compatibility flow вместо batch transaction endpoint.

## Канонические документы

- `docs/HROS_FULL_PLAYTEST_v2.md`
- `docs/HROS_UI_UX_GAME_DESIGN_v1.md`
- `docs/HROS_IDEOLOGY_AI_DIARY_v1.md`
- `docs/HROS_BLUEPRINT_v1.md`
- `docs/HROS_PRODUCT_PRINCIPLES_v1.md`
- `docs/HROS_DOMAIN_ONTOLOGY_v1.md`
- `docs/HROS_DATA_LIFECYCLE_v1.md`
- `docs/HROS_PRIVACY_AND_CONSENT_v1.md`
- `docs/HROS_SKILL_ARCHITECTURE_v1.md`
- `docs/HROS_VISUAL_SEMANTICS_v1.md`
- `docs/HROS_MIGRATION_v0.4_to_v1.md`
- `docs/HROS_ACCEPTANCE_CRITERIA_v1.md`
- `docs/HROS_ALIGNMENT_REPORT_v1.md`

Интерфейсные skills:

- `skills/hros-game-interface-director/SKILL.md`;
- `skills/hros-full-playtest-builder/SKILL.md`.

## Архитектура

```text
Quick Capture ─→ Local Inbox ─┐
                              ├→ AI Diary → Change Set → Confirmation
Live Dialogue ────────────────┘                    ↓
                                          Repository Service
                                            ↙          ↘
                                   LocalStorage v1   FastAPI v1
                                            ↓          PostgreSQL
                                      HROS COMMAND
                                      ├── Today
                                      ├── Diary
                                      ├── Living World
                                      ├── Avatar
                                      ├── Paths
                                      ├── Chronicle
                                      └── System Editors
```

## Запуск

### GitHub Pages

https://kontrakevich.github.io/HROS-Web3D/

Данные сохраняются в браузере пользователя. Режим предназначен для playtest и личного использования, а не для защищённого совместного хранения пары.

### Docker

1. Скопировать `.env.example` в `.env`.
2. Заменить `POSTGRES_PASSWORD` на длинный случайный пароль.
3. Запустить `START_HROS.ps1`.

- приложение: http://localhost:8088
- API: http://localhost:8000/docs

## API v1

- `/api/v1/people`
- `/api/v1/relationships`
- `/api/v1/moments`
- `/api/v1/records`
- `/api/v1/snapshot`
- `/api/v1/{person|relationship|moment|record}/{id}/revisions`
- `/api/v1/diagnostics`

## Автоматическая проверка

Pipeline выполняет:

1. pytest для API и ontology;
2. проверку канонических документов и skill contracts;
3. production build Vite;
4. browser tests Chromium и WebKit;
5. проверку HROS COMMAND и Full Playtest 2;
6. Quick Capture без изменения snapshot;
7. редактирование Inbox;
8. Living World и Source Inspector;
9. Avatar Suggestions без domain mutation;
10. diary confirmation contract;
11. прежние редакторы и отсутствие console errors;
12. deploy только после успешного прохождения всех этапов.
