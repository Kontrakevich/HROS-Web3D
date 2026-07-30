# HROS v1.2 — Privacy and Consent

## Пространства

- `private` — доступ только автору/владельцу.
- `shared_with_partner` — доступ конкретному партнёру после явного действия.
- `shared` — совместно подтверждённая запись участников.
- `group` — доступ указанной группе.

Новая запись по умолчанию получает `private`.

## Обязательные поля

Каждая чувствительная запись содержит:

- `visibility`;
- `ownerId` или `perspectiveOwnerId`;
- `subjectIds`;
- `consentPolicyId` при публикации;
- `source` и provenance;
- признак `containsSensitiveData`.

## Согласие

Согласие является отдельной версионируемой записью, а не boolean-флагом. Оно включает:

- кто дал согласие;
- на какую запись или категорию;
- кому разрешён доступ;
- цель использования;
- дату и срок;
- возможность отзыва.

Отзыв согласия прекращает дальнейшее использование в Living Memory и новых AI-выводах, но аудит изменения сохраняется.

## Режим пары

```text
Личное пространство Михаила
Личное пространство Снежи
Совместное пространство пары
```

Запись не попадает в совместное пространство автоматически. Разные перспективы сохраняются раздельно. Совместный факт создаётся только после подтверждения или явной маркировки основания.

## Messenger

- Беседа по умолчанию является приватной локальной рабочей областью.
- Messenger Thread не публикуется в совместное пространство автоматически.
- Отправка сообщения GPT-провайдеру разрешает обработку только данного сообщения, ограниченной recent history и отфильтрованного Context Envelope.
- Кнопка `Зафиксировать` не является согласием на commit; она только создаёт Diary draft и Change Set.
- Ответ, редактирование, удаление и экспорт применяются к беседе, а не к committed HROS records.
- Локальные attachment metadata не означают загрузку бинарного файла на сервер.
- При будущем файловом хранилище каждый файл должен иметь отдельную visibility и consent policy.

## HROS Memory Gateway

Перед передачей контекста агенту система обязана:

1. определить владельца HROS;
2. применить visibility filter;
3. исключить private record с другим `perspectiveOwnerId`;
4. ограничить количество записей;
5. передать kind, status, confidence и source;
6. не передавать secret fields и диагностические данные;
7. не сохранять Context Envelope как новую память автоматически.

`[HROS:record-id]` используется для прозрачности источника, но не раскрывает запись пользователю, у которого нет права её читать.

## GPT Agents

- GPT Agent не повышает visibility записи.
- GPT Agent не использует private-перспективу другого участника без разрешения.
- Agent Response маркируется как AI output и не считается подтверждённым знанием.
- GPT Agent не имеет write tool к Repository.
- GPT Agent не может подтвердить собственный Change Set.
- Отсутствующая перспектива другого человека остаётся неизвестной.
- Гипотеза не маскируется под факт.
- Ответ не должен содержать единый рейтинг человека, партнёра, родителя, любви или брака.

## API keys и provider data

- `OPENAI_API_KEY` и `OPENROUTER_API_KEY` хранятся только в server-side environment или secret manager.
- Ключи запрещено включать в frontend bundle, `public/config.js`, LocalStorage, URL, лог или response payload.
- GitHub Pages не содержит GPT key и работает в local Memory Gateway mode.
- Provider и model показываются пользователю, но key и raw authorization headers не показываются.
- OpenAI Agents SDK tracing отключён по умолчанию для приватных HROS-разговоров.
- Включение tracing требует отдельного осознанного решения владельца deployment и проверки политики хранения данных.

## Диагностика

Диагностика может содержать:

- trace ID;
- endpoint;
- agent ID;
- provider/model;
- status;
- duration;
- число переданных memory references;
- класс ошибки.

Диагностика не содержит:

- secret tokens;
- полный private transcript;
- полный Context Envelope;
- полный model response;
- private record statements;
- персональные данные в query string.

## Технические требования production

- аутентификация;
- tenant isolation;
- server-side authorization для каждой записи и беседы;
- шифрование в транзите и на хранении;
- секреты только через environment/secret manager;
- аудит доступа к памяти;
- rate limits для agent endpoints;
- export и удаление пользовательских данных;
- резервное копирование с теми же правилами доступа;
- отдельная политика retention для raw chat history;
- защита от prompt injection в imported documents и external attachments.

GitHub Pages остаётся локальным персональным режимом и не считается защищённым совместным хранилищем пары. Protected GPT mode требует FastAPI deployment.
