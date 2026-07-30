# HROS — Human Relationship Operating System

## HROS v1.2 — Messenger & GPT Agents

HROS превращает добровольный диалог человека с ИИ в проверяемую, редактируемую и развивающуюся карту людей, моментов, перспектив, памяти и взаимного влияния.

> Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.

## Главный пользовательский цикл

```text
Полноэкранный HROS Messenger
→ диалог с выбранным GPT-агентом
→ чтение релевантной памяти HROS
→ ответ со ссылками [HROS:record-id]
→ перевод беседы в Diary Change Set
→ ручная проверка и редактирование
→ явное подтверждение пользователя
→ обновление HROS
→ персонаж / мир / пути / хроника / точные редакторы
```

ИИ-дневник остаётся основным источником данных. GPT-агент читает память HROS, но не имеет права записывать выводы напрямую.

## Полноэкранный Messenger

Раздел `Дневник` открывается на весь экран и использует знакомую архитектуру современного мессенджера:

- список бесед;
- поиск;
- закрепление и отключение уведомлений;
- отдельные чаты с агентами;
- сообщения, время и статусы доставки;
- ответ, редактирование, копирование и удаление;
- локальные метаданные вложений;
- typing indicator;
- адаптивный composer;
- desktop и mobile layout;
- правая панель агента и использованной памяти;
- экспорт беседы в JSON;
- кнопка `Зафиксировать`, создающая проверяемый Change Set.

Интерфейс использует общие UX-паттерны Telegram-подобного мессенджера, но не копирует бренд, графику, ассеты или исходный код Telegram.

## GPT-агенты

| Агент | Назначение |
|---|---|
| ИИ-дневник | Свободный рассказ, уточнения и подготовка Change Set |
| Аналитик отношений | Факты, перспективы, влияние действий и гипотезы |
| Хранитель памяти | Поиск и сопоставление записей HROS |
| Навигатор HROS | Люди, моменты, разделы и следующие действия |
| Агент аватара | Роли, увлечения и обратимая визуальная эволюция |

Каждый агент:

- получает только релевантный ограниченный Context Envelope;
- видит статус, confidence и источник записи;
- не получает приватную перспективу другого человека;
- не додумывает отсутствующую позицию;
- отвечает со ссылками `[HROS:record-id]`;
- не изменяет Repository автоматически;
- требует Diary Change Set и User Confirmation для записи.

## Runtime

Backend использует OpenAI Agents SDK.

Поддерживаются два защищённых серверных режима:

### OpenAI

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
```

### OpenRouter

```env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-5.4-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

API-ключи нельзя помещать во frontend, `public/config.js`, LocalStorage или GitHub Pages.

### GitHub Pages

На GitHub Pages работает честный локальный HROS Memory Gateway:

- Messenger полностью доступен;
- беседы сохраняются в браузере;
- выполняется поиск по HROS Snapshot;
- показываются источники;
- работает перевод в Change Set;
- локальный ответ не маркируется как GPT.

Для реального GPT-ответа используется Docker/FastAPI deployment с серверным API-ключом.

## API v1.2

- `GET /api/v1/agents` — каталог агентов и статус runtime;
- `POST /api/v1/agents/chat` — memory-aware agent response;
- `GET /api/v1/snapshot`;
- `GET|POST /api/v1/people`;
- `GET|POST /api/v1/relationships`;
- `GET|POST /api/v1/moments`;
- `GET|POST /api/v1/records`;
- `PATCH|DELETE /api/v1/records/{id}`;
- `/api/v1/{person|relationship|moment|record}/{id}/revisions`;
- `/api/v1/diagnostics`.

## COMMAND UI

Основная навигация сохраняется:

```text
Сегодня · Дневник · Мир · Аватар · Пути · Хроника · Система
```

`Сегодня` показывает одно главное действие. `Дневник` открывает Messenger. При наличии Change Set главный CTA переводит непосредственно к проверке изменений.

Игровой прогресс допустим только для роли, навыка, проекта, пути, привычки и подтверждённого действия. HROS не создаёт общий рейтинг человека, партнёра, родителя, любви или брака.

## Безопасность данных

- Privacy by default;
- Original Memory не перезаписывается выводом модели;
- Fact, Perspective, Observation и Hypothesis остаются разными сущностями;
- GPT-агент имеет read-only доступ к памяти;
- API-ключ хранится только на backend;
- tracing Agents SDK отключён по умолчанию;
- ни один ответ агента не становится фактом без подтверждения;
- Messenger не меняет `hros.snapshot.v1` до commit подтверждённого Change Set.

## Канонические документы

- `docs/HROS_MESSENGER_AND_AGENT_RUNTIME_v1.md`;
- `docs/HROS_UI_UX_GAME_DESIGN_v1.md`;
- `docs/HROS_IDEOLOGY_AI_DIARY_v1.md`;
- `docs/HROS_BLUEPRINT_v1.md`;
- `docs/HROS_PRODUCT_PRINCIPLES_v1.md`;
- `docs/HROS_DOMAIN_ONTOLOGY_v1.md`;
- `docs/HROS_DATA_LIFECYCLE_v1.md`;
- `docs/HROS_PRIVACY_AND_CONSENT_v1.md`;
- `docs/HROS_SKILL_ARCHITECTURE_v1.md`;
- `docs/HROS_VISUAL_SEMANTICS_v1.md`;
- `docs/HROS_ACCEPTANCE_CRITERIA_v1.md`.

Skills:

- `skills/ai-diary-session/SKILL.md`;
- `skills/hros-game-interface-director/SKILL.md`;
- `skills/hros-messenger-agent-runtime/SKILL.md`.

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
├── perspective-owner filter
├── relevance ranking
└── Context Envelope
        ↓
OpenAI Agents SDK
        ↓
Agent Response + [HROS:record-id]
        ↓
Diary Change Set
        ↓
User Confirmation
        ↓
Repository Service
├── LocalStorage v1
└── FastAPI / PostgreSQL
```

## Запуск

### GitHub Pages

https://kontrakevich.github.io/HROS-Web3D/

Этот режим хранит данные в браузере и использует локальный Memory Gateway.

### Docker с GPT-агентами

1. Скопировать `.env.example` в `.env`.
2. Задать длинный `POSTGRES_PASSWORD`.
3. Добавить либо `OPENAI_API_KEY`, либо `OPENROUTER_API_KEY`.
4. Запустить `START_HROS.ps1`.

Адреса:

- приложение: `http://localhost:8088`;
- API: `http://localhost:8000/docs`.

## Автоматическая проверка

Pipeline проверяет:

1. FastAPI, ontology и каталог агентов;
2. контролируемый `503` без API-ключа;
3. канонические документы и skills;
4. production build Vite;
5. полноэкранное открытие Messenger;
6. локальный memory-aware ответ и HROS source references;
7. отсутствие snapshot mutation во время чата;
8. desktop и mobile layout;
9. перевод беседы в Change Set;
10. User Confirmation, Original Memory и provenance;
11. прежние редакторы;
12. Chromium, WebKit и отсутствие console errors;
13. deploy только после успешных проверок.
