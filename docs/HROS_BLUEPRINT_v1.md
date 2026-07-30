# HROS v1 — Canonical Blueprint

Продуктовая версия: **1.2.0**  
Версия domain schema: **1.0.0**

## Назначение

HROS — Human Relationship Operating System: система, помогающая человеку понимать себя, других людей и динамику отношений без подмены фактов интерпретациями.

Центральный принцип:

> Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.

HROS не является CRM, психологическим диагнозом или системой оценки людей. **Живой диалог является основным способом ввода**, а граф, карточки, игровой персонаж, GPT-ответы и аналитические выводы — производными представлениями подтверждённых данных.

## Главный пользовательский цикл

```text
Полноэкранный HROS Messenger
→ диалог с выбранным агентом
→ чтение релевантной памяти HROS
→ ответ со ссылками на источники
→ перевод беседы в DiarySession
→ черновой Change Set
→ ручная проверка и редактирование
→ явное подтверждение пользователя
→ атомарное обновление HROS
→ персонаж / мир / пути / хроника / точные редакторы
```

Без подтверждения сообщения и выводы агента не попадают в основную модель.

## Продуктовые контуры

1. **HROS Messenger** — полноэкранный основной интерфейс живого диалога и работы с агентами.
2. **ИИ-дневник** — специализированный агент и Session/Change Set pipeline, превращающий подтверждённый разговор в HROS records.
3. **GPT Agents** — ИИ-дневник, Аналитик отношений, Хранитель памяти, Навигатор HROS и Агент аватара.
4. **HROS Memory Gateway** — privacy-aware поиск и ограниченный Context Envelope для агентов.
5. **COMMAND UI** — игровой слой с одним главным действием, персонажем, путями и доступом к точным данным.
6. **Личная вселенная** — человек, роли, ценности, потребности, границы, цели и жизненные периоды.
7. **Вселенная отношений** — участники, взаимность, доверие, безопасность, близость, напряжение и история изменений.
8. **Living Avatar** — базовая форма, ролевые оболочки, модификаторы и обратимая история форм.
9. **Пути развития** — направления ролей, навыков и проектов без общего рейтинга человека.
10. **Моменты** — события, действия, намерения, восприятия, эмоции и последствия.
11. **Контур знания** — источник → свидетельство → факт → перспектива → наблюдение → гипотеза → проверка → паттерн → принцип.
12. **Три уровня памяти** — Original, Semantic и Living Memory.
13. **Хроника и книга отношений** — главы, истории, правила пары, принципы и версии понимания.
14. **Режим пары** — отдельные личные пространства и совместное пространство с явным согласием.
15. **Web3D** — пространственная навигация; 2D — диалог, проверка, редактирование и аудит.

## Интерфейсные режимы

```text
Сегодня
→ одно главное действие и актуальный контекст

Дневник
→ полноэкранный Messenger
→ список бесед, агенты, сообщения, поиск и память

Мир
→ люди, отношения и области жизни

Аватар
→ базовая форма, роли, модификаторы и версии

Пути
→ развитие ролей, навыков и проектов

Хроника
→ подтверждённые моменты и версии форм

Система
→ точные редакторы, источники, privacy, revisions и diagnostics
```

Messenger скрывает COMMAND только на время разговора. Все точные редакторы остаются доступны после закрытия чата.

## Агентные роли

### ИИ-дневник

- принимает свободный рассказ;
- разделяет факт и интерпретацию;
- задаёт один уточняющий вопрос;
- передаёт разговор в Change Set.

### Аналитик отношений

- анализирует действия, восприятия и последствия;
- сохраняет отдельные перспективы;
- не додумывает позицию другого человека;
- маркирует гипотезы.

### Хранитель памяти

- ищет записи HROS;
- показывает status, confidence и source;
- обнаруживает противоречия;
- не объединяет несовместимые версии.

### Навигатор HROS

- помогает выбрать человека, момент, путь или раздел;
- предлагает следующее действие;
- не превращает рекомендацию в обязательство.

### Агент аватара

- использует подтверждённые роли и интересы;
- предлагает обратимые модификаторы;
- не меняет Identity Core или человеческую ценность.

## HROS Memory Gateway

```text
Запрос пользователя
→ privacy filter
→ perspective-owner filter
→ поиск People / Relationships / Moments / Records
→ ranking по совпадению, типу, status и confidence
→ ограниченный Context Envelope
→ GPT Agent
→ ответ с [HROS:record-id]
```

Приоритет памяти:

1. Original Memory;
2. Living Memory;
3. Semantic Memory;
4. Principle, Fact и подтверждённая Perspective;
5. Relationship State и Person Facet;
6. Moment, Person и Relationship;
7. Observation;
8. Hypothesis только с явной маркировкой.

Приватная перспектива другого человека не передаётся агенту владельца HROS.

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

- MessengerThread;
- MessengerMessage;
- AgentProfile;
- AgentResponse;
- MemoryContextEnvelope;
- MemoryReference;
- DiarySession;
- DiaryMessage;
- ChangeSet;
- ChangeItem;
- UserConfirmation;
- Person;
- PersonProfileFacet;
- Relationship;
- RelationshipState;
- Moment;
- Action;
- Perspective;
- Evidence;
- Fact;
- Observation;
- Hypothesis;
- Verification;
- Pattern;
- Principle;
- MemoryRecord;
- InterviewSession;
- InterviewAnswer;
- BookChapter;
- ConsentPolicy;
- Revision.

MessengerThread и MessengerMessage могут храниться локально до введения server-side conversation storage. AgentResponse никогда не является canonical knowledge record без Change Set.

## Неприкосновенные правила

- Живой диалог является основным источником для анализа и построения связей.
- HROS Messenger открывается на полный экран.
- GPT-агент получает память только через HROS Memory Gateway.
- API-ключ хранится только на backend.
- Агент не имеет прямого write tool к Repository.
- Каждый использованный memory record указывается ссылкой `[HROS:record-id]`.
- Исходная запись не перезаписывается выводом системы.
- Наблюдение, гипотеза и подтверждённый вывод — разные сущности.
- AI-вывод маркируется как AI и не становится фактом автоматически.
- Несогласие участников сохраняется, а не усредняется.
- Приватность и visibility являются частью каждой записи.
- В конце сессии пользователь видит и подтверждает Change Set.
- Игровой прогресс не применяется к ценности человека, качеству партнёра или силе любви.
- Система не использует FOMO, штраф за паузу или награду за раскрытие приватных данных.
- Relationship Context может менять окружение аватара, но не ценность, лицо или тело человека.
- Web3D не является ядром данных.
- Любой новый модуль сначала фиксируется в Blueprint, lifecycle, privacy и skill contract.

## Архитектура

```text
HROS Messenger
├── Diary Agent
├── Relationship Agent
├── Memory Agent
├── Navigator Agent
└── Avatar Agent
        ↓
HROS Memory Gateway
├── privacy filter
├── perspective filter
├── relevance ranking
└── Context Envelope
        ↓
OpenAI Agents SDK
├── OpenAI Responses API
└── OpenRouter compatible adapter
        ↓
Agent Response + Memory References
        ↓
DiarySession / Change Set / UserConfirmation
        ↓
Application Services
        ↓
Repository Service
├── LocalStorage adapter
└── FastAPI / PostgreSQL adapter
        ↓
COMMAND / Web3D / Avatar / Paths / Chronicle / System
```

## Runtime modes

### Local Pages mode

- Messenger работает полностью;
- память HROS ищется локально;
- источники показываются;
- Change Set работает;
- ответ не маркируется как GPT.

### Protected backend mode

- OpenAI Agents SDK запускается на FastAPI;
- поддерживается OpenAI или OpenRouter;
- model и provider видны пользователю;
- API-ключ не передаётся браузеру;
- tracing отключён по умолчанию.

## Контрактные документы и skills

- `docs/HROS_MESSENGER_AND_AGENT_RUNTIME_v1.md`;
- `docs/HROS_UI_UX_GAME_DESIGN_v1.md`;
- `skills/hros-messenger-agent-runtime/SKILL.md`;
- `skills/ai-diary-session/SKILL.md`;
- `skills/hros-game-interface-director/SKILL.md`.

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
