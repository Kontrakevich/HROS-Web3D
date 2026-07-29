# HROS — Human Relationship Operating System

HROS v0.2 переводит Web3D-концепт в работающую систему данных: люди, отношения и моменты больше не являются только статичными объектами сцены.

## Что работает

- Web3D-вселенная строится из `Snapshot`, а не из массива внутри сцены.
- Добавление людей, связей и моментов через интерфейс.
- Сохранение данных в браузере на GitHub Pages.
- Repository Service автоматически подключается к HROS API, когда он доступен.
- FastAPI API с SQLite по умолчанию и PostgreSQL через `DATABASE_URL`.
- Docker-сборка: frontend + API + PostgreSQL.
- Статусы данных: `draft`, `observed`, `hypothesis`, `confirmed`, `finalized`, `archived`.
- Источник, уверенность, версия и временные метки у каждой сущности.
- Диагностический журнал frontend и API без записи секретов.
- Экспорт и импорт JSON в локальном режиме.

## Быстрый запуск Windows

Запустите `START_HROS.ps1`. После сборки откроется:

- приложение: `http://localhost:8088`
- OpenAPI: `http://localhost:8000/docs`

Остановка: `STOP_HROS.ps1`.

## Запуск API без Docker

```powershell
cd backend; python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Без `DATABASE_URL` API использует SQLite-файл `backend/hros.db`.

## API v1

- `GET /api/v1/health`
- `GET /api/v1/snapshot`
- `GET|POST /api/v1/people`
- `GET|POST /api/v1/relationships`
- `GET|POST /api/v1/moments`
- `POST /api/v1/reset`
- `GET /api/v1/diagnostics`

## Архитектура

```text
Web3D / 2D UI
      ↓
Repository Service
   ↙       ↘
LocalStorage  HROS API
                 ↓
          SQLAlchemy 2
           ↙       ↘
        SQLite   PostgreSQL
```

GitHub Pages работает автономно в локальном режиме. Docker-сборка автоматически использует API и PostgreSQL.
