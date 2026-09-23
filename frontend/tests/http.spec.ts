import { expect, test } from '@playwright/test';
import type { ChatMessage, NeedRequest, Offer } from '../src/api/types';

const user = { id: 'server-user', name: 'Тест', email: 'test@example.test' };
const request: NeedRequest = { id: 'server-request', ownerId: user.id, status: 'published', card: { title: 'Настроить сайт кофейни', description: 'Нужно настроить меню и контакты на сайте', outcome: 'Работающий сайт с меню', category: 'Разработка', budget: '50 000 ₸', deadline: 'Неделя', format: 'Удалённо', location: '', requirements: '' }, initialText: 'Настроить сайт', messages: [], clarificationStep: 7, readyForReview: true, offerCount: 1, createdAt: '2026-09-23T08:00:00.000Z', updatedAt: '2026-09-23T08:00:00.000Z' };
const offer: Offer = { id: 'server-offer', requestId: request.id, name: 'Анна Смирнова', initials: 'АС', specialty: 'Разработка', color: 'peach', description: 'Предлагаю настроить сайт за неделю.', price: '50 000 ₸', duration: '7 дней', rating: 4.9, reviews: 10 };

test('HTTP: ошибка входа, повтор сообщения без потери текста, истечение сессии', async ({ page }) => {
  let signedIn = false;
  let failSend = true;
  let expired = false;
  const attempts: { text: string; clientId: string }[] = [];
  let messages: ChatMessage[] = [];
  await page.route('http://127.0.0.1:4174/api/**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const ok = (json: unknown) => route.fulfill({ json });
    const error = (status: number, message: string) => route.fulfill({ status, json: { message } });
    if (url.pathname === '/api/auth/me') return signedIn && !expired ? ok(user) : error(401, 'Войдите в аккаунт');
    if (url.pathname === '/api/auth/login') {
      if (route.request().postDataJSON().password !== 'correct-password') return error(401, 'Неверный email или пароль');
      signedIn = true; return ok(user);
    }
    if (expired) return error(401, 'Сессия завершилась. Войдите снова.');
    if (url.pathname === '/api/requests') return ok([request]);
    if (url.pathname.endsWith('/messages')) {
      if (method === 'GET') return ok(messages);
      const input = route.request().postDataJSON(); attempts.push(input);
      if (failSend) { failSend = false; return error(503, 'Сообщение не отправлено. Попробуйте ещё раз.'); }
      messages = [{ id: 'message-1', clientId: input.clientId, offerId: offer.id, sender: 'consumer', text: input.text, createdAt: new Date().toISOString() }];
      return ok(messages);
    }
    if (url.pathname.endsWith('/offers')) return ok([offer]);
    if (url.pathname === `/api/requests/${request.id}`) return ok(request);
    return error(404, 'Нет такого маршрута');
  });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Открыть демо' })).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Пароль', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Неверный email или пароль');
  await page.getByLabel('Пароль', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: request.card.title })).toBeVisible();
  await page.getByRole('heading', { name: request.card.title }).click();
  await page.getByRole('button', { name: 'Обсудить', exact: true }).click();
  await page.getByLabel('Сообщение исполнителю').fill('Нужна адаптация для мобильных');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByRole('alert')).toContainText('Сообщение не отправлено');
  await expect(page.getByLabel('Сообщение исполнителю')).toHaveValue('Нужна адаптация для мобильных');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByText('Нужна адаптация для мобильных', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Сообщение исполнителю')).toHaveValue('');
  expect(attempts).toHaveLength(2);
  expect(attempts[0].clientId).toBe(attempts[1].clientId);
  expired = true;
  await page.getByLabel('Сообщение исполнителю').fill('Проверка истечения сессии');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('HTTP: ошибки ИИ и публикации сохраняют ответы и ручные правки', async ({ page }) => {
  let draft: NeedRequest = { ...request, status: 'draft', offerCount: 0, readyForReview: false, clarificationStep: 0, card: { ...request.card, outcome: '' }, messages: [{ id: 'ai-1', role: 'assistant', text: 'Какой результат нужен?' }] };
  let failAi = true;
  let failPublish = true;
  await page.route('http://127.0.0.1:4174/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const ok = (json: unknown) => route.fulfill({ json });
    if (path.endsWith('/auth/me')) return ok(user);
    if (path === '/api/requests') return ok([draft]);
    if (path.endsWith('/clarify')) {
      if (failAi) { failAi = false; return route.fulfill({ status: 503, json: { message: 'Помощник временно недоступен' } }); }
      draft = { ...draft, readyForReview: true, card: { ...draft.card, outcome: route.request().postDataJSON().text } }; return ok(draft);
    }
    if (path.endsWith('/publish')) {
      if (failPublish) { failPublish = false; return route.fulfill({ status: 503, json: { message: 'Не удалось опубликовать заявку' } }); }
      draft = { ...draft, status: 'published' }; return ok(draft);
    }
    if (path.endsWith('/offers')) return ok([]);
    if (method === 'PATCH') draft = { ...draft, card: route.request().postDataJSON().card };
    return ok(draft);
  });
  await page.goto(`/requests/${request.id}/edit`);
  await page.getByLabel('Ответ помощнику').fill('Адаптивный сайт с меню и контактами');
  await page.getByRole('button', { name: 'Отправить ответ' }).click();
  await expect(page.getByRole('alert')).toContainText('Помощник временно недоступен');
  await expect(page.getByLabel('Ответ помощнику')).toHaveValue('Адаптивный сайт с меню и контактами');
  await page.getByRole('button', { name: 'Отправить ответ' }).click();
  await expect(page.getByLabel('Ожидаемый результат')).toHaveValue('Адаптивный сайт с меню и контактами');
  await page.getByLabel('Название задачи').fill('Сайт кофейни: меню и контакты');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();
  await expect(page.getByRole('alert')).toContainText('Не удалось опубликовать заявку');
  await expect(page.getByLabel('Название задачи')).toHaveValue('Сайт кофейни: меню и контакты');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();
  await expect(page.getByText('Ваша задача ждёт своего человека')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сайт кофейни: меню и контакты' })).toBeVisible();
});
