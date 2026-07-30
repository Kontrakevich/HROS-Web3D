# HROS — Human Relationship Operating System

## HROS COMMAND 1.1 — Working Baseline

HROS — живая система понимания людей, памяти и отношений. Она превращает добровольный диалог человека с ИИ-дневником в проверяемую, редактируемую и развивающуюся карту людей, моментов, перспектив, ролей и взаимного влияния.

> Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.

## Главный пользовательский цикл

```text
Живой диалог с ИИ-дневником
→ неизменяемый транскрипт
→ предлагаемые факты, перспективы и связи
→ редактируемый Change Set
→ явное подтверждение пользователя
→ атомарное обновление HROS
→ персонаж / мир / пути / хроника / точные редакторы
```

ИИ-дневник остаётся основным источником данных. HROS COMMAND помогает увидеть следующее действие и исследовать подтверждённые данные, но не выполняет скрытых изменений.

## Что означает рабочая версия

HROS COMMAND 1.1 переводит playtest в рабочий baseline:

- Avatar Profile и активный Development Path входят в основной snapshot;
- изменение аватара проходит через отдельный Avatar Change Set;
- профиль не меняется до явного подтверждения;
- подтверждение создаёт неизменяемую Avatar Appearance Version и аудиторскую запись;
- предыдущая форма восстанавливается через новый Change Set без уничтожения истории;
- API подтверждает Avatar Change Set одной транзакцией;
- LocalStorage adapter выполняет эквивалентный атомарный snapshot commit;
- старые playtest-настройки автоматически мигрируют в доменную модель;
- процедурный low-poly-аватар отображается через Three.js;
- пути развития сохраняются в Repository Service и синхронизируются в API-режиме;
- темы и reduced motion остаются локальными UI-настройками.

## Рабочие разделы

- **Сегодня** — одно главное действие и актуальный контекст.
- **Дневник** — основной ввод, Change Set и подтверждение.
- **Мир** — Web3D-карта людей и отношений.
- **Аватар** — 3D-предпросмотр, источники, Change Set и история форм.
- **Пути** — подтверждённые направления развития без рейтинга человека.
- **Хроника** — моменты и версии аватара.
- **Система** — люди, моменты, знания, пара, книга и диагностика.

## Аватар: рабочий контракт

```text
Person / Identity Core
→ Avatar Profile
→ Draft Configuration
→ Avatar Change Set
→ Review
→ Explicit Confirmation
→ Avatar Appearance Version
→ Current Profile
```

Relationship Context может менять ауру, окружение и совместные символы. Он не меняет лицо, тело, личность или ценность человека.

Любое автоматическое предложение модификатора обязано иметь источник. Ручной выбор разрешён и помечается как ручной.

## Безопасная геймификация

Прогресс допустим для роли, навыка, проекта, пути, привычки и подтверждённого действия.

HROS не создаёт:

- общий уровень человека;
- рейтинг партнёра или родителя;
- силу любви одной цифрой;
- штраф за паузу;
- лутбоксы и FOMO;
- награду за раскрытие приватных данных;
- автоматическое подтверждение AI-вывода.

## Канонические документы

- `docs/HROS_COMMAND_PRODUCTION_v1.1.md`
- `docs/HROS_AVATAR_ONTOLOGY_v1.1.md`
- `docs/HROS_UI_UX_GAME_DESIGN_v1.md`
- `docs/HROS_IDEOLOGY_AI_DIARY_v1.md`
- `docs/HROS_BLUEPRINT_v1.md`
- `docs/HROS_PRODUCT_PRINCIPLES_v1.md`
- `docs/HROS_DOMAIN_ONTOLOGY_v1.md`
- `docs/HROS_DATA_LIFECYCLE_v1.md`
- `docs/HROS_PRIVACY_AND_CONSENT_v1.md`
- `docs/HROS_SKILL_ARCHITECTURE_v1.md`
- `docs/HROS_VISUAL_SEMANTICS_v1.md`
- `docs/HROS_ACCEPTANCE_CRITERIA_v1.md`

Skills:

- `skills/ai-diary-session/SKILL.md`
- `skills/hros-game-interface-director/SKILL.md`
- `skills/avatar-evolution/SKILL.md`

## Архитектура

```text
AI Diary / Manual Editor / Imports
                ↓
        Session & Change Set Layer
                ↓
        Repository Service
          ↙                 ↘
 LocalStorage 1.1         FastAPI 1.1
                                ↓
                           PostgreSQL
                ↓
HROS COMMAND
├── Today
├── Diary
├── Living World
├── Avatar 3D + Change Set
├── Development Paths
├── Chronicle
└── System Editors
```

## Режимы запуска

### GitHub Pages

https://kontrakevich.github.io/HROS-Web3D/

Данные сохраняются в браузере пользователя. Это рабочий однопользовательский режим, но не защищённое совместное хранилище пары.

### Docker

1. Скопировать `.env.example` в `.env`.
2. Заменить `POSTGRES_PASSWORD` на длинный случайный пароль.
3. Запустить `START_HROS.ps1`.

- приложение: http://localhost:8088
- API: http://localhost:8000/docs

## API 1.1

- `/api/v1/people`
- `/api/v1/relationships`
- `/api/v1/moments`
- `/api/v1/records`
- `/api/v1/snapshot`
- `/api/v1/avatar/state`
- `/api/v1/avatar/change-sets`
- `/api/v1/avatar/change-sets/{id}/confirm`
- `/api/v1/avatar/change-sets/{id}/reject`
- `/api/v1/paths/{path_id}/activate`
- `/api/v1/{person|relationship|moment|record}/{id}/revisions`
- `/api/v1/diagnostics`

## Проверка

Pipeline выполняет:

1. pytest для API, ontology и атомарного Avatar Change Set;
2. проверку канонических документов и skill contracts;
3. production build Vite;
4. browser tests Chromium и WebKit;
5. проверку отсутствия изменения avatar profile до confirmation;
6. проверку Appearance Version, audit confirmation и idempotency;
7. проверку пути развития и мобильного layout;
8. полный цикл ИИ-дневника без скрытых изменений;
9. проверку прежних редакторов и console errors;
10. deploy только после успешного прохождения всех этапов.

## Честные ограничения

- внешний LLM пока не подключён: ИИ-дневник работает в guided-dialogue режиме;
- GitHub Pages использует локальное браузерное хранилище;
- авторизация, защищённое пространство пары и синхронизация между устройствами ещё не реализованы;
- аватар процедурный, без GLB/VRM и фотореалистичного цифрового двойника;
- Diary API пока использует compatibility commit, отдельный server-side batch endpoint остаётся следующим инфраструктурным этапом.
