# HROS 1.1 — Canonical Blueprint

## Назначение

HROS — Human Relationship Operating System: система, помогающая человеку понимать себя, других людей и динамику отношений без подмены фактов интерпретациями.

Центральный принцип:

> Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.

HROS не является обычным дневником, CRM, рейтингом людей или психологическим диагнозом. **Живой диалог с ИИ-дневником является основным интерфейсом ввода**, а граф, карточки, игровой персонаж и аналитические выводы — производными представлениями подтверждённых данных.

## Главный пользовательский цикл

```text
Живой диалог с ИИ-дневником
→ неизменяемый транскрипт
→ извлечение фактов, перспектив и связей
→ черновой Change Set
→ ручная проверка и редактирование
→ явное подтверждение пользователя
→ атомарное обновление HROS
→ персонаж / мир / пути / хроника / точные редакторы
```

Без подтверждения производные изменения не попадают в основную модель.

## Продуктовые контуры

1. **ИИ-дневник** — основной источник данных и подтверждаемый Diary Change Set.
2. **COMMAND UI** — user-friendly игровой слой с одним главным действием.
3. **Личная вселенная** — человек, роли, ценности, потребности, границы, цели и жизненные периоды.
4. **Вселенная отношений** — участники, взаимность, доверие, безопасность, близость, напряжение и история.
5. **Living Avatar** — ручная базовая форма, подтверждённые ролевые оболочки, модификаторы и история форм.
6. **Пути развития** — направления ролей, навыков и проектов без общего рейтинга человека.
7. **Моменты** — события, действия, намерения, восприятия, эмоции и последствия.
8. **Контур знания** — источник → evidence → fact → perspective → observation → hypothesis → verification → pattern → principle.
9. **Три уровня памяти** — Original, Semantic и Living Memory.
10. **Интервью** — уточнение данных, проверка гипотез и фиксация несогласия.
11. **Хроника и книга отношений** — моменты, версии, главы и принципы.
12. **Режим пары** — личное пространство каждого и совместное пространство с согласием.
13. **Web3D** — пространственная навигация; 2D — ввод, review, редактирование и аудит.

## Интерфейсные режимы

```text
Сегодня
→ одно главное действие и актуальный контекст

Дневник
→ основной ввод и подтверждение Diary Change Set

Мир
→ люди, отношения и области жизни

Аватар
→ 3D preview, источники, Avatar Change Set и история форм

Пути
→ repository-backed направления развития

Хроника
→ подтверждённые моменты и Appearance Versions

Система
→ точные редакторы, source, privacy, revisions и diagnostics
```

Игровой интерфейс не является источником истины и не скрывает профессиональные редакторы.

## Базовый причинный контур

```text
Действие
→ намерение действующего
→ восприятие другого человека
→ эмоциональная реакция
→ затронутые потребности и границы
→ изменение состояния отношений
→ последствие
→ возможное восстановительное действие
```

Каждый элемент хранится отдельно и может иметь разные перспективы участников.

## Канонические сущности

- DiarySession
- DiaryMessage
- ChangeSet
- ChangeItem
- UserConfirmation
- Person
- PersonProfileFacet
- Relationship
- RelationshipState
- Moment
- Action
- Perspective
- Evidence
- Fact
- Observation
- Hypothesis
- Verification
- Pattern
- Principle
- MemoryRecord
- InterviewSession
- InterviewAnswer
- BookChapter
- ConsentPolicy
- Revision
- AvatarProfile
- AvatarAppearance
- AvatarChangeSet
- AvatarConfirmation
- DevelopmentPath

DiarySession, ChangeSet и UserConfirmation могут храниться как специализированные records до введения отдельных таблиц, но их состояния и provenance обязательны.

Avatar contract определён в `docs/HROS_AVATAR_ONTOLOGY_v1.1.md`.

## Avatar lifecycle

```text
Person / Identity Core
→ current Avatar Profile
→ draft preview
→ Avatar Change Set
→ review before / proposed / evidence
→ explicit confirmation
→ atomic commit
   ├── update Avatar Profile
   ├── create immutable Avatar Appearance
   ├── create Avatar Confirmation
   └── finalize Change Set
```

Reject оставляет профиль неизменным. Restore старой формы создаёт новый Change Set.

## Неприкосновенные правила

- Живой диалог является основным источником для анализа и построения связей.
- Исходная запись не перезаписывается выводом системы.
- Observation, Hypothesis и confirmed conclusion — разные сущности.
- AI-оценка маркируется как AI и имеет confidence.
- Несогласие участников сохраняется, а не усредняется.
- Финализация не уничтожает историю.
- Privacy и visibility являются частью каждой записи.
- Diary и Avatar proposals не применяются скрытно.
- Автоматический avatar modifier требует evidence.
- Relationship Context меняет окружение, но не лицо, тело, идентичность или ценность.
- Игровой прогресс не применяется к ценности человека, качеству партнёра или силе любви.
- Система не использует FOMO, streak penalty, loot box или награду за private disclosure.
- Web3D не является ядром данных.
- Любой новый модуль сначала фиксируется в Blueprint, ontology, lifecycle и skill contract.

## Архитектура

```text
AI Diary / Manual Editor / Imports
                ↓
        Session & Change Set Layer
                ↓
        Application Services
                ↓
        Repository Service
          ↙                  ↘
 LocalStorage 1.1        FastAPI 1.1
                              ↓
                         PostgreSQL
                ↓
       HROS Domain Records
                ↓
        HROS COMMAND UI
       ├── Today
       ├── Diary
       ├── Living World
       ├── Avatar 3D
       ├── Paths
       ├── Chronicle
       └── System Editors
```

## Контракты

- UI/UX: `docs/HROS_UI_UX_GAME_DESIGN_v1.md`
- Working release: `docs/HROS_COMMAND_PRODUCTION_v1.1.md`
- Avatar: `docs/HROS_AVATAR_ONTOLOGY_v1.1.md`
- Game UI skill: `skills/hros-game-interface-director/SKILL.md`
- Avatar skill: `skills/avatar-evolution/SKILL.md`

## Порядок развития

```text
Blueprint
→ ontology
→ lifecycle/privacy
→ skill contract
→ schema/API
→ migration
→ UI
→ AI orchestration
→ browser/backend tests
→ deploy
```

Изменение кода без обновления соответствующего контрактного документа считается нарушением процесса.
