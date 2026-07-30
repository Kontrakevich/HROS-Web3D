# HROS COMMAND 1.1 — Working Baseline

Дата выпуска: 2026-07-30  
Статус: рабочая однопользовательская версия

## Цель релиза

Перевести `COMMAND: Living World` из UI playtest в рабочую систему, в которой игровые экраны используют Repository Service, а значимые изменения имеют источник, версию, подтверждение и аудит.

## Что стало рабочим

### Repository-backed avatar

- `avatar_profile` хранит текущую подтверждённую форму;
- `avatar_change_set` изолирует предложение;
- профиль не меняется до review и confirmation;
- confirm создаёт `avatar_appearance` и `avatar_confirmation`;
- Appearance Version неизменяема;
- восстановление выполняется через новый Change Set;
- LocalStorage commit сохраняет единый snapshot;
- API commit выполняется одной SQLAlchemy transaction;
- повторный confirm идемпотентен.

### Three.js avatar

Процедурный low-poly humanoid отображает:

- базовый вид;
- активную роль;
- палитру;
- модификаторы;
- relationship-context aura.

WebGL fallback сохраняет доступность интерфейса при недоступности 3D.

### Development Paths

Пути `AI-создатель`, `Физическая форма`, `Партнёрство` и `Отцовство` входят в snapshot как `development_path`. Одновременно активен один путь; история остальных не удаляется.

### Миграция playtest

При первом запуске 1.1:

1. существующий snapshot 1.0 загружается без удаления данных;
2. локальная playtest-конфигурация аватара переносится в `avatar_profile`;
3. сохранённые playtest forms переносятся в `avatar_appearance`;
4. выбранный путь переносится в `development_path`;
5. старые доменные IDs и записи сохраняются;
6. theme/reduced motion остаются UI preferences.

## Пользовательский цикл аватара

```text
Аватар
→ изменить preview
→ проверить найденные источники
→ подготовить Avatar Change Set
→ сравнить предыдущую и предлагаемую форму
→ явно подтвердить
→ сохранить Profile + Appearance Version + Confirmation
→ увидеть форму в Chronicle
```

## Инварианты

- ИИ-дневник остаётся основным источником HROS.
- Diary Change Set остаётся обязательным.
- Avatar preview не является domain commit.
- AI/system avatar proposal требует evidence.
- Relationship Context не меняет Identity Core.
- Нет human score, love score, streak penalty, FOMO или loot box.
- Точные редакторы остаются доступны через «Система».

## API 1.1

```text
GET  /api/v1/avatar/state
POST /api/v1/avatar/change-sets
POST /api/v1/avatar/change-sets/{id}/confirm
POST /api/v1/avatar/change-sets/{id}/reject
POST /api/v1/paths/{path_id}/activate
```

Existing People, Relationships, Moments, Records, Snapshot, Revisions и Diagnostics API сохраняются.

## Проверка

Обязательные тесты:

- миграция schema 1.0 → 1.1;
- default Avatar Profile и четыре paths;
- draft не изменяет profile;
- confirm=false не изменяет profile;
- confirm=true создаёт ровно одну Appearance Version;
- repeated confirm не создаёт дубликаты;
- path activation exclusive;
- Chromium и WebKit проходят полный avatar flow;
- mobile 390px не имеет horizontal overflow;
- diary snapshot не меняется до confirmation;
- legacy editors остаются доступны;
- zero console errors.

## Границы версии

Рабочая версия означает устойчивый однопользовательский baseline, а не завершённую облачную платформу.

Не реализованы:

- external LLM orchestration;
- authentication и user accounts;
- защищённое multi-user пространство пары;
- cross-device sync в GitHub Pages режиме;
- GLB/VRM и фотореалистичный digital twin;
- server-side batch transaction для Diary Change Set.

Эти ограничения отображаются в README и интерфейсе и не маскируются.
