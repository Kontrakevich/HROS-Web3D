# HROS — Human Relationship Operating System

## HROS COMMAND: Living World Playtest

HROS — живая система понимания людей, памяти и отношений. Она превращает добровольный диалог человека с ИИ-дневником в проверяемую, редактируемую и развивающуюся карту людей, моментов, перспектив и взаимного влияния.

> Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.

## Главный пользовательский цикл

```text
Живой диалог с ИИ-дневником
→ неизменяемый транскрипт
→ предлагаемые факты, перспективы и связи
→ редактируемый Change Set
→ явное подтверждение пользователя
→ обновление HROS
→ персонаж / мир / пути / хроника / точные редакторы
```

ИИ-дневник является основным источником данных. Игровой интерфейс помогает увидеть следующее действие, но не меняет модель скрытно.

## Что добавлено в playtest

- новая игровая навигация `Сегодня · Дневник · Мир · Аватар · Пути · Хроника · Система`;
- экран `Сегодня` с одним главным CTA;
- автоматический переход к активной diary session или Change Set;
- карточка персонажа и активного пути;
- добровольные миссии без серии и штрафа;
- Living World preview ближайших людей;
- процедурный low-poly avatar editor;
- роли, палитры, модификаторы и relationship context preview;
- локальная галерея Appearance Versions с восстановлением формы;
- пути развития, которые можно переключать без потери истории;
- хроника подтверждённых моментов;
- быстрый доступ ко всем прежним точным редакторам;
- три визуальные темы: `Family`, `Adventure`, `Strategy`;
- режим уменьшенной анимации;
- desktop и mobile layout.

## Правила геймификации

Прогресс допустим для роли, навыка, проекта, пути, привычки и подтверждённого действия.

HROS не создаёт:

- общий уровень человека;
- рейтинг партнёра или родителя;
- силу любви одной цифрой;
- штраф за паузу;
- награду за раскрытие приватных данных;
- скрытое подтверждение AI-вывода.

## Источники интерфейсных принципов

Концепция объединяет общие UX-принципы, а не визуальные материалы игр:

- The Sims — персонаж, режимы, прямое редактирование и история жизни;
- Brawl Stars — один главный CTA, короткие действия и мобильная ясность;
- The Battle of Polytopia — low-poly-мир, карта и дерево направлений;
- Hero Wars — многослойная карточка персонажа и разделение внешности от накопленного развития.

Полный анализ и продуктовый контракт: `docs/HROS_UI_UX_GAME_DESIGN_v1.md`.

## Что работает в ядре

- первичный раздел `ИИ-дневник`;
- естественный пошаговый guided-dialogue;
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

## Ограничения playtest

- настройки аватара и темы хранятся отдельно в LocalStorage;
- avatar settings пока не являются новой доменной онтологией;
- progress path — интерфейсный индикатор количества связанных confirmed/observed записей, а не психологическая оценка;
- внешний LLM пока не подключён;
- real GLB/VRM avatar и server-side Avatar API не реализованы;
- API diary commit пока использует последовательный compatibility flow, а не batch transaction endpoint.

## Канонические документы

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

Интерфейсный skill: `skills/hros-game-interface-director/SKILL.md`.

## Архитектура

```text
AI Diary / Manual Editor / Imports
                ↓
        Session & Change Set Layer
                ↓
        Repository Service
          ↙                 ↘
 LocalStorage v1          FastAPI v1
                                ↓
                           PostgreSQL
                ↓
COMMAND UI
├── Today
├── Diary
├── Living World
├── Avatar Preview
├── Paths
├── Chronicle
└── System Editors
```

## Режимы запуска

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
5. открытие HROS COMMAND и экрана `Сегодня`;
6. переключение тем и пути;
7. сохранение и восстановление Avatar Appearance Version;
8. проверку дневника и отсутствия snapshot-изменений до confirmation;
9. проверку Original Memory и User Confirmation;
10. проверку прежних редакторов и отсутствие console errors;
11. deploy только после успешного прохождения всех этапов.
