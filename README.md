# HROS — Human Relationship Operating System

## v1.0 Alignment Release

HROS — система понимания людей, памяти и отношений. Она отделяет исходные данные от интерпретаций и показывает, как действия участников влияют друг на друга и к каким последствиям приводят.

> Давай мы оба будем понимать, как наши действия влияют друг на друга и к чему это приводит.

## Что входит в v1

- Web3D-вселенная людей и связей.
- 2D-редакторы Person, Relationship и Moment.
- Контур знаний: Evidence → Fact → Perspective → Observation → Hypothesis → Verification → Pattern → Principle.
- Отдельные Action, Person Facet и Relationship State.
- Три уровня памяти: Original, Semantic и Living Memory.
- Режим пары с личным пространством Михаила, личным пространством Снежи и совместной областью.
- Privacy by default: новая смысловая запись создаётся как `private`.
- Interview Session и проверочный вопрос без предположения отсутствующей перспективы.
- Книга отношений: главы, принципы и narrative fragments с provenance.
- Версионирование и revisions.
- LocalStorage adapter и FastAPI/PostgreSQL adapter.
- Автоматическая миграция `hros.snapshot.v0.2` → `hros.snapshot.v1` без удаления старого ключа.
- Backend tests и browser smoke tests Chromium/WebKit перед deploy.

## Канонические документы

- `docs/HROS_BLUEPRINT_v1.md`
- `docs/HROS_PRODUCT_PRINCIPLES_v1.md`
- `docs/HROS_DOMAIN_ONTOLOGY_v1.md`
- `docs/HROS_DATA_LIFECYCLE_v1.md`
- `docs/HROS_PRIVACY_AND_CONSENT_v1.md`
- `docs/HROS_SKILL_ARCHITECTURE_v1.md`
- `docs/HROS_VISUAL_SEMANTICS_v1.md`
- `docs/HROS_MIGRATION_v0.4_to_v1.md`
- `docs/HROS_ACCEPTANCE_CRITERIA_v1.md`

Изменение функциональности без синхронного изменения Blueprint/ontology/skill contract считается нарушением процесса.

## Режимы запуска

### GitHub Pages

https://kontrakevich.github.io/HROS-Web3D/

Данные сохраняются только в браузере пользователя. Этот режим предназначен для демонстрации и личного локального использования, а не для защищённого совместного хранения пары.

### Docker

1. Скопировать `.env.example` в `.env`.
2. Заменить `POSTGRES_PASSWORD` на длинный случайный пароль.
3. Запустить `START_HROS.ps1`.

- приложение: http://localhost:8088
- API: http://localhost:8000/docs

## Архитектура

```text
Web3D + 2D Workspace
        ↓
Application Services
        ↓
Repository Service
   ↙                 ↘
LocalStorage v1      FastAPI v1
                          ↓
                     PostgreSQL
```

Web3D отвечает за исследование и навигацию. 2D-интерфейс отвечает за ввод, проверку источников, перспективы, privacy и версии. Ядро данных не зависит от визуальной сцены.

## API v1

- `/api/v1/people`
- `/api/v1/relationships`
- `/api/v1/moments`
- `/api/v1/records`
- `/api/v1/snapshot`
- `/api/v1/{person|relationship|moment|record}/{id}/revisions`
- `/api/v1/diagnostics`

## Проверка

Pipeline выполняет:

1. pytest для API и ontology;
2. проверку канонических файлов;
3. production build Vite;
4. browser smoke test в Chromium;
5. browser smoke test в WebKit;
6. проверку миграции и `schemaVersion=1.0.0`;
7. редактирование момента;
8. создание и сохранение Perspective;
9. проверку Couple Mode и Book;
10. deploy только после успешного прохождения всех этапов.
