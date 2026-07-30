# HROS 1.1 — Avatar Ontology

Дата канонизации: 2026-07-30  
Статус: обязательный доменный контракт

## 1. Назначение

Аватар — визуальная проекция подтверждённых ролей, увлечений, путей и контекстов человека. Он не является оценкой человека и не заменяет `Person` или Identity Core.

```text
Person = непрерывная идентичность
Avatar Profile = текущая подтверждённая визуальная конфигурация
Avatar Appearance = неизменяемая версия формы
Avatar Change Set = черновое предложение изменения
Avatar Confirmation = аудиторское подтверждение
Development Path = выбранное направление роли, навыка или проекта
```

## 2. Неприкосновенные правила

1. Базовый вид выбирается человеком вручную.
2. Ни одно предложение системы не изменяет профиль без подтверждения.
3. Relationship Context меняет ауру, окружение и совместные символы, но не лицо, тело, личность или ценность.
4. Визуальный конфликт не изображается как уродство человека.
5. Старые Appearance Versions не перезаписываются.
6. Автоматически предложенный модификатор обязан иметь `evidenceIds`.
7. Ручной выбор разрешён без внешнего evidence, но маркируется `source.kind=user`.
8. Прогресс пути относится к действиям, ролям и источникам, а не к ценности человека.
9. Theme и reduced motion не являются доменными сущностями.
10. Восстановление старой формы создаёт новый Change Set и новую версию.

## 3. Record kinds

### `avatar_profile`

Одна текущая подтверждённая конфигурация на владельца.

```json
{
  "kind": "avatar_profile",
  "perspectiveOwnerId": "person-id",
  "status": "confirmed",
  "visibility": "private",
  "data": {
    "base": "explorer",
    "role": "creator",
    "palette": "cyan",
    "modifiers": ["ai-orbit"],
    "relationshipContext": "neutral",
    "activePathId": "creator",
    "production": true,
    "confirmedAt": "ISO-8601",
    "lastChangeSetId": "record-id|null"
  }
}
```

Допустимые значения:

- `base`: `explorer|creator|guardian`;
- `role`: `base|creator|athlete|leader|father`;
- `palette`: `cyan|amber|violet|green`;
- `modifiers`: `ai-orbit|sport-band|family-emblem|architecture-grid`;
- `relationshipContext`: `neutral|support|distance|tension`.

### `avatar_appearance`

Неизменяемая сохранённая версия формы.

```json
{
  "kind": "avatar_appearance",
  "status": "finalized",
  "data": {
    "avatar": {},
    "immutable": true,
    "confirmedAt": "ISO-8601",
    "changeSetId": "record-id",
    "reason": "..."
  }
}
```

### `avatar_change_set`

Изолированное предложение. До confirmation не является действующим профилем.

```text
awaiting_confirmation
→ committed | rejected | superseded
```

```json
{
  "kind": "avatar_change_set",
  "status": "draft",
  "data": {
    "state": "awaiting_confirmation",
    "previousAvatar": {},
    "proposedAvatar": {},
    "reason": "...",
    "proposedBy": "user|ai|system",
    "idempotencyKey": "uuid"
  },
  "evidenceIds": []
}
```

### `avatar_confirmation`

Неизменяемая запись решения пользователя.

```json
{
  "kind": "avatar_confirmation",
  "status": "finalized",
  "source": {"kind": "user_confirmation"},
  "data": {
    "changeSetId": "record-id",
    "confirmedBy": "person-id",
    "confirmedAt": "ISO-8601",
    "accepted": true
  }
}
```

### `development_path`

Подтверждённое направление развития.

```json
{
  "kind": "development_path",
  "status": "confirmed",
  "data": {
    "pathId": "creator",
    "title": "AI-создатель",
    "active": true,
    "activatedAt": "ISO-8601"
  }
}
```

Одновременно активен не более чем один путь владельца. Переключение не удаляет остальные записи.

## 4. Визуальная семантика

- **Base Form** — стартовая геометрия, выбранная человеком.
- **Role Shell** — текущая роль, основанная на ручном выборе или подтверждённых данных.
- **Interest Modifier** — символ увлечения, навыка или проекта.
- **Relationship Context** — временная аура или окружение, не характеристика личности.
- **Appearance Version** — исторический снимок подтверждённой формы.

## 5. Источники

Автоматическое предложение может ссылаться только на существующие записи со статусом `observed|confirmed|finalized` или подтверждённые Moments.

```text
Original Memory / Fact / Perspective / Action / Person Facet / Moment
→ evidenceIds
→ Avatar Change Set
→ review
→ confirmation
→ Appearance Version
```

Ручной выбор разрешён без evidence и маркируется как ручной. Система не должна выдавать ручной выбор за аналитический вывод.

## 6. Жизненный цикл

```text
редактор / подтверждённые источники
→ draft configuration
→ avatar_change_set(awaiting_confirmation)
→ пользователь видит before / proposed / evidence
→ confirm или reject

confirm:
transaction
├── update avatar_profile
├── create avatar_appearance(finalized)
├── create avatar_confirmation(finalized)
└── finalize avatar_change_set

reject:
archive avatar_change_set
└── avatar_profile не меняется
```

Повторный confirm одного Change Set возвращает существующий audit bundle и не создаёт дублей.

## 7. Хранилища

- LocalStorage adapter выполняет одно сохранение целого snapshot.
- FastAPI/PostgreSQL adapter выполняет одну database transaction.
- Playtest keys мигрируют в доменную модель один раз.
- Theme и reduced motion остаются UI preferences.

## 8. Privacy

Avatar records по умолчанию `private`. Видимость не повышается автоматически. Аватар другого человека нельзя изменять на основании односторонней интерпретации владельца без отдельного consent contract.

## 9. Диагностика

Ошибки:

- owner missing;
- invalid configuration;
- automatic proposal without evidence;
- confirmation missing;
- already processed Change Set;
- atomic commit failure;
- visibility escalation;
- Identity Core mutation attempt.

Диагностика не содержит private diary text.
