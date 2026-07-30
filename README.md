# HROS — Human Relationship Operating System

## v1.0 AI Diary Foundation

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
→ Web3D / timeline / книга
```

ИИ-дневник является основным источником данных. Ручные формы и импорт остаются дополнительными каналами.

## Что работает

- отдельный первичный раздел `ИИ-дневник`;
- естественный пошаговый диалог;
- изолированный session draft без скрытых изменений основной модели;
- редактируемый Change Set в конце сессии;
- включение, исправление и отклонение отдельных предложений;
- обязательное подтверждение перед commit;
- Original Memory с полным транскриптом;
- Interview Answer с дословными ответами пользователя;
- provenance до session и исходных сообщений;
- User Confirmation с accepted/rejected change IDs;
- атомарный snapshot commit в LocalStorage-режиме;
- Web3D-вселенная людей и связей;
- редакторы Person, Relationship и Moment;
- контур знаний: Evidence → Fact → Perspective → Observation → Hypothesis → Verification → Pattern → Principle;
- три уровня памяти: Original, Semantic и Living Memory;
- режим пары с двумя личными и одним совместным пространством;
- Privacy by default;
- книга отношений;
- revisions и diagnostics;
- LocalStorage adapter и FastAPI/PostgreSQL adapter;
- backend tests и browser acceptance tests Chromium/WebKit перед deploy.

## Честное ограничение текущей версии

Внешняя LLM-оркестрация пока не подключена. Интерфейс работает в безопасном guided-dialogue режиме и не имитирует автоматический интеллектуальный анализ. Подключение извлечения людей, моментов, отношений, наблюдений и гипотез выполняется через `ai-diary-session` и специализированные skills.

Локальный Change Set сохраняется атомарно. API-режим пока использует последовательный compatibility commit через `/api/v1/records`; production-этап требует отдельного server-side batch transaction endpoint.

## Канонические документы

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

Изменение функциональности без синхронного изменения Blueprint, ontology, lifecycle и skill contract считается нарушением процесса.

## Архитектура

```text
AI Diary / Manual Editor / Imports
                ↓
        Session & Change Set Layer
                ↓
        Application Services
                ↓
        Repository Service
          ↙                 ↘
 LocalStorage v1          FastAPI v1
                                ↓
                           PostgreSQL
                ↓
 Web3D + 2D Workspace + Book
```

Web3D отвечает за исследование и навигацию. ИИ-дневник отвечает за основной ввод. 2D-интерфейс — за проверку, ручное редактирование, privacy и аудит. Ядро данных не зависит от визуальной сцены.

## Режимы запуска

### GitHub Pages

https://kontrakevich.github.io/HROS-Web3D/

Данные сохраняются в браузере пользователя. Этот режим предназначен для демонстрации и личного использования, а не для защищённого совместного хранения пары.

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
5. проверку отсутствия snapshot-изменений до diary confirmation;
6. commit подтверждённой diary session;
7. проверку Original Memory и User Confirmation;
8. проверку Knowledge, Couple Mode и Book;
9. проверку отсутствия console errors;
10. deploy только после успешного прохождения всех этапов.
