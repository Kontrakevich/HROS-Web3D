# HROS Web3D UI

Интерактивный Web3D-интерфейс HROS: центральный аватар, редактируемый граф отношений и лента моментов.

## Быстрый импорт в GitHub

1. Создайте пустой публичный репозиторий `HROS-Web3D`.
2. Распакуйте этот архив в локальную папку.
3. Откройте папку в GitHub Desktop.
4. Опубликуйте репозиторий в ветку `main`.
5. В GitHub откройте **Settings → Pages → Build and deployment → Source** и выберите **GitHub Actions**.
6. Workflow `Deploy HROS Web3D to GitHub Pages` опубликует проверенную production-сборку из `dist/`.

Публичный адрес после успешного запуска:

`https://<github-login>.github.io/HROS-Web3D/`

Для аккаунта Kontrakevich:

`https://kontrakevich.github.io/HROS-Web3D/`

## Локальный запуск

```powershell
npm install; npm run dev
```

Откройте адрес, который покажет Vite, обычно `http://localhost:5173`.

## Production-проверка

```powershell
npm ci; npm run build; npm run preview
```

## Структура

- `src/main.js` — приложение и Web3D-сцена.
- `src/style.css` — интерфейс и адаптивность.
- `vite.config.js` — сборка с относительными путями для GitHub Pages.
- `dist/` — готовая проверенная production-сборка.
- `.github/workflows/deploy-pages.yml` — автоматическая публикация без повторной сборки на сервере.
- `docs/skills/github-pages-deployment/SKILL.md` — переиспользуемый deployment skill.

## Данные

Текущая версия сохраняет редактируемое состояние локально в браузере. Перед публикацией персональных данных следует отдельно внедрить аутентификацию и серверное хранилище.
