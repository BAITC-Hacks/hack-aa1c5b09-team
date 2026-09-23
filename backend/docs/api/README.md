Контракт REST API Needboard

Базовый адрес локально: http://localhost:8080. Запросы и ответы — JSON, UTF-8. Все идентификаторы — UUID; даты — YYYY-MM-DD, время создания — ISO 8601 UTC. В Java деньги представлены BigDecimal, максимум 12 цифр до точки и 2 после.

**Авторизация использует серверную сессию и cookie JSESSIONID.** Порядок запросов браузера:

1. GET /api/auth/csrf → сохранить headerName и token. Cookie сессии принимает браузер.
2. POST /api/auth/register с CSRF-заголовком. Регистрация создаёт аккаунт, но не выполняет вход.
3. POST /api/auth/login с тем же CSRF-заголовком.
4. После успешного входа снова GET /api/auth/csrf: идентификатор сессии и CSRF-токен меняются.
5. Во все POST/PUT-запросы, включая logout, добавлять новый CSRF-заголовок.
6. После logout для следующего входа снова получить CSRF-токен.

Использовать fetch с credentials: 'same-origin'; страницы и API предполагаются на одном origin. Открытие HTML через file:// не подходит. CORS для отдельного dev-сервера пока не включён.

Пример ответа CSRF:

~~~json
{"headerName":"X-CSRF-TOKEN","token":"opaque-token"}
~~~

**Реализованные операции:**

| Метод и путь | Доступ | Успешный ответ |
|---|---|---|
| GET /api/auth/csrf | Любой | 200, CSRF-токен |
| POST /api/auth/register | Любой + CSRF | 201, User |
| POST /api/auth/login | Любой + CSRF | 200, User, сессионная cookie |
| POST /api/auth/logout | Сессия + CSRF | 204 |
| GET /api/auth/me | Вошедший пользователь | 200, User |
| POST /api/needs | Вошедший пользователь | 201, Need в DRAFT |
| PUT /api/needs/{id} | Владелец черновика | 200, Need |
| POST /api/needs/{id}/publish | Владелец полного черновика | 200, Need в PUBLISHED |
| GET /api/needs?page=0&size=20 | Любой | 200, страница опубликованных карточек |
| GET /api/needs/{id} | Опубликованная/выбранная — любой; черновик — владелец | 200, Need |
| GET /api/me/needs | Вошедший пользователь | 200, страница своих карточек |
| POST /api/needs/{id}/proposals | Вошедший пользователь, не владелец карточки | 201, Proposal |
| GET /api/needs/{id}/proposals | Владелец карточки | 200, страница предложений |
| GET /api/me/proposals | Вошедший пользователь | 200, страница своих предложений |
| POST /api/proposals/{id}/accept | Владелец соответствующей карточки | 200, принятый Proposal |

Для всех операций записи требуется CSRF. Повторная публикация, принятие после выбора, редактирование опубликованной карточки и предложение к неопубликованной/закрытой карточке возвращают 409. Один автор может отправить одно предложение на карточку.

**Аккаунт содержит идентификатор, email и отображаемое имя.**

Регистрация:

~~~json
{
  "email": "consumer@example.com",
  "password": "Example-pass-123",
  "displayName": "Потребитель"
}
~~~

Вход: только email и password. Ответ регистрации/входа/me:

~~~json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "email": "consumer@example.com",
  "displayName": "Потребитель"
}
~~~

Email приводится к нижнему регистру. Пароль: от 8 символов, не более 72 байт UTF-8. Пароль и его хеш в API-ответы не попадают.

**Создание и замена черновика используют один формат.** PUT заменяет все редактируемые поля; это не частичный PATCH. Поле card совпадает по структуре с будущим suggestedCard ИИ.

~~~json
{
  "originalDescription": "Хочу записывать клиентов через интернет.",
  "card": {
    "title": "Онлайн-запись клиентов",
    "problem": "Записи теряются в переписке, приходится согласовывать время вручную.",
    "expectedResult": "Клиент самостоятельно выбирает свободное время.",
    "acceptanceCriteria": ["Можно выбрать свободный слот", "Клиент получает подтверждение"],
    "constraints": "Интерфейс должен работать на телефоне.",
    "budgetAmount": 150000.00,
    "currency": "KZT",
    "deadline": null
  }
}
~~~

Минимальный запрос для пустого черновика: {"card":{}}. OriginalDescription — приватный исходный текст, максимум 10000 символов. Остальные поля:

| Поле card | Ограничение | Для публикации |
|---|---|---|
| title | До 200 символов | Обязательно |
| problem | До 10000 | Обязательно |
| expectedResult | До 5000 | Обязательно |
| acceptanceCriteria | До 30 непустых строк, каждая до 500 | Хотя бы одна |
| constraints | До 5000 | Необязательно |
| budgetAmount | Неотрицательная сумма или null | Необязательно |
| currency | Три латинские буквы, нормализуются в верхний регистр | Если указана сумма |
| deadline | Дата или null | Если указана, при публикации не может быть раньше текущей даты UTC |

Отсутствующий бюджет или срок означает «Обсуждается». MissingFields указывает недостающие поля для публикации: title, problem, expectedResult, acceptanceCriteria. Это проверка заполненности, а не оценка качества текста моделью.

Ответ Need:

~~~json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "ownerId": "11111111-1111-1111-1111-111111111111",
  "originalDescription": "Хочу записывать клиентов через интернет.",
  "card": {
    "title": "Онлайн-запись",
    "problem": "Записи теряются",
    "expectedResult": "Самостоятельная запись",
    "acceptanceCriteria": ["Можно выбрать время"],
    "constraints": null,
    "budgetAmount": null,
    "currency": null,
    "deadline": null
  },
  "status": "DRAFT",
  "createdAt": "2026-09-23T10:00:00Z",
  "selectedProposalId": null,
  "missingFields": []
}
~~~

OriginalDescription присутствует только при доступе владельца к собственной карточке. Каталог всегда отдаёт публичное представление без этого поля. Чужой черновик возвращает 404. Статусы: DRAFT → PUBLISHED → SOLUTION_SELECTED. Выбранная карточка доступна по прямому адресу и в списке владельца, но исключается из каталога открытых потребностей.

**Предложение включает содержание решения и условия.**

~~~json
{
  "solutionDescription": "Настрою готовый сервис онлайн-записи.",
  "implementationPlan": "Настройка расписания, формы и уведомлений.",
  "expectedResult": "Страница записи для ваших клиентов.",
  "priceAmount": 80000.00,
  "currency": "KZT",
  "priceNote": null,
  "durationDays": 5,
  "scheduleNote": "После получения расписания."
}
~~~

SolutionDescription, implementationPlan, expectedResult обязательны; максимальная длина 10000, 5000, 5000 соответственно. Если priceAmount не задана, требуется priceNote; при сумме требуется currency. Если durationDays не задана, требуется scheduleNote; числовая длительность от 1 до 3650 дней. Текстовые условия цены/сроков — до 2000 символов.

Ответ содержит все поля запроса и id, needId, authorId, status, createdAt. Статусы: PENDING, ACCEPTED, REJECTED. В MVP отклонение остальных ожидающих предложений происходит автоматически при выборе одного. Отдельного метода ручного отклонения или отзыва пока нет.

Содержание предложений видят их авторы в /api/me/proposals и владелец потребности в /api/needs/{id}/proposals. Публичный просмотр карточки не раскрывает тексты чужих решений.

**Списки используют единый формат и стабильную сортировку по createdAt, id по убыванию.**

~~~json
{"items":[],"page":0,"size":20,"totalElements":0,"totalPages":0}
~~~

Page начинается с 0, size — от 1 до 100.

**Ошибки имеют машинный код, сообщение и ошибки полей.**

~~~json
{
  "code": "VALIDATION_ERROR",
  "message": "Проверьте поля запроса.",
  "fieldErrors": {"card.title":"Заполните поле перед публикацией."}
}
~~~

| HTTP | Типичные коды |
|---|---|
| 400 | VALIDATION_ERROR, INVALID_REQUEST |
| 401 | UNAUTHENTICATED, INVALID_CREDENTIALS |
| 403 | FORBIDDEN, CSRF_INVALID |
| 404 | NOT_FOUND |
| 409 | EMAIL_EXISTS, PROPOSAL_EXISTS, INVALID_NEED_STATUS, INVALID_PROPOSAL_STATUS, CONFLICT |

Неизвестные поля JSON отклоняются. Идентификаторы авторов, статусы и время создания нельзя присвоить через запрос.

**Для участника 3 уже доступны общие компоненты.** CurrentUser.id() получает UUID пользователя из проверенной сессии; NeedCardDraft задаёт структуру карточки; NeedCardRules.missingFields() и validateBudget() задают общие правила. Пакет clarification реализует свои контроллеры, сущности и миграции. Не обращаться напрямую к репозиториям identity/needs/proposals.

Следующие маршруты зарезервированы планом, но ещё не реализованы: POST /api/clarifications, POST /api/clarifications/{id}/messages, GET /api/clarifications/{id}. Ожидаемый ответ: sessionId, questions[], suggestedCard, missingFields[]. SuggestedCard хранится в сессии уточнения до подтверждения пользователем; затем фронтенд передаёт её как card в POST /api/needs.
