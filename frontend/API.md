# Предлагаемый контракт API

Контракт реализован HTTP-адаптером фронтенда и требует согласования с командой. Реального сервера в репозитории пока нет. Источник моделей — `src/api/types.ts`.

## Общие правила

Базовый URL: `VITE_API_BASE_URL` (по умолчанию `/api`). JSON без обёрток `data`; даты — ISO 8601, идентификаторы — строки. Неизвестные поля карточки — пустые строки, в UI отображаются как «Не указано». Тексты — plain text, без HTML/Markdown.

Успех: `200`/`201` с объектом или массивом; выход — `204`. Ошибки: `{ "message": "Сообщение пользователю" }`. Статусы: `401` — повторный вход, `404` — объект отсутствует/недоступен, `409` — конфликт состояния, `422` — валидация, `503` — временная недоступность. Таймаут фронтенда — 30 секунд; отмена ожидания не означает отмену серверной операции.

Авторизация: HttpOnly cookie-сессия, `credentials: 'include'`. Предпочтителен один origin через reverse proxy. Для разных origin — CORS с явным origin и credentials. В production сервер использует Secure/SameSite cookie и проверяет Origin/защиту от CSRF для мутаций. Если выбран CSRF-токен, получение и заголовок добавляются в `src/api/http.ts`.

## Маршруты

| Метод и путь | Тело | Ответ |
| --- | --- | --- |
| `GET /auth/me` | — | `User`; `401` без сессии |
| `POST /auth/register` | `{ name, email, password }` | `User` + cookie |
| `POST /auth/login` | `{ email, password }` | `User` + cookie |
| `POST /auth/logout` | — | `204`, удаление сессии |
| `GET /requests` | — | `NeedRequest[]` текущего пользователя |
| `POST /requests` | `{ initialText, clientId }` | `NeedRequest` с первой репликой ИИ |
| `GET /requests/:id` | — | `NeedRequest` |
| `PATCH /requests/:id` | `{ card: NeedCard }` | Обновлённый `NeedRequest` |
| `POST /requests/:id/clarify` | `{ text, skip, clientId }` | `NeedRequest` с карточкой и историей |
| `POST /requests/:id/publish` | — | Опубликованный `NeedRequest` |
| `GET /requests/:id/offers` | — | `Offer[]` |
| `POST /requests/:id/select` | `{ offerId }` | `NeedRequest` со статусом `selected` |
| `GET /requests/:id/offers/:offerId/messages` | — | `ChatMessage[]` по времени |
| `POST /requests/:id/offers/:offerId/messages` | `{ text, clientId }` | Актуальный `ChatMessage[]` этого чата |

## Модели

- `User`: `{ id, name, email }`.
- `NeedCard`: строки `title`, `description`, `outcome`, `category`, `budget`, `deadline`, `format`, `location`, `requirements`. Бюджет и сроки — свободный текст: `До 120 000 ₸`, `В течение двух недель`.
- `NeedRequest`: `{ id, ownerId, status, card, initialText, messages, clarificationStep, readyForReview, createdAt, updatedAt, offerCount, selectedOfferId? }`. Статусы: `draft | published | selected`. `messages` — история ИИ из `{ id, role: 'user' | 'assistant', text }`. `clarificationStep` — число обработанных ответов. `readyForReview` управляется сервером; число вопросов может отличаться от демо.
- `Offer`: `{ id, requestId, name, specialty, initials, color, description, price, duration, rating, reviews }`. Строки, кроме `rating` и `reviews` (числа). `color`: `peach | blue | mint | violet`; неизвестное значение получает стандартный цвет. Рейтинг и отзывы в демо вымышленные.
- `ChatMessage`: `{ id, clientId?, offerId, sender: 'consumer' | 'provider', text, createdAt }`.

## Инварианты

- Все операции требуют авторизации. Проверка `ownerId` и принадлежности предложения заявке выполняется сервером.
- Начальное описание: 10–2000 символов после trim. Ответ ИИ: до 2000; `skip: true` оставляет неизвестное поле пустым.
- Уточнение атомарно сохраняет ответ, новую реплику и карточку. ИИ задаёт один вопрос за раз и не заполняет неподтверждённые факты.
- Правки разрешены только для `draft` с `readyForReview: true`. Название: до 120 символов; описание, результат, пожелания: до 4000; остальные поля: до 250. Пробелы обрезаются по краям.
- Публикация требует `title`, `description`, `outcome`. Опубликованная карточка неизменна. Повторная публикация возвращает ту же заявку без дублирования предложений.
- Выбор атомарен и разрешён только для `published`. Повтор того же выбора возвращает текущую заявку; другой выбор после `selected` — `409`.
- После выбора сообщения в невыбранные чаты запрещены (`409`); чтение доступно. Текст сообщения: 1–4000 символов после trim.
- `clientId` — ключ идемпотентности в области пользователя/операции или чата. Повтор не добавляет вторую заявку, ответ ИИ или сообщение. Фронтенд сохраняет ключ при повторе ошибки в той же форме; после перезагрузки неотправленный текст может получить новый ключ.
- Реальный сервер создаёт предложения по действиям исполнителей. Автоматическое создание откликов и ответы чата есть только в `mock`.
