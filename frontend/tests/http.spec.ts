import { expect, test } from '@playwright/test';

const serverUser = { id: '10000000-0000-0000-0000-000000000001', email: 'test@example.test', displayName: 'Тест' };
const otherId = '10000000-0000-0000-0000-000000000002';
const needId = '20000000-0000-0000-0000-000000000001';
const proposalId = '30000000-0000-0000-0000-000000000001';
const timestamp = '2026-09-23T08:00:00Z';
const serverCard = {
  title: 'Настроить сайт кофейни', problem: 'Нужно настроить меню и контакты на сайте', expectedResult: 'Работающий сайт с меню',
  acceptanceCriteria: ['Работающий сайт с меню'], constraints: null, budgetAmount: null, currency: null, deadline: null,
  category: 'Разработка', budgetText: '50 000 ₸', deadlineText: 'Неделя', workFormat: 'Удалённо', location: '', requirements: '',
};
const serverNeed = { id: needId, ownerId: otherId, ownerName: 'Заказчик', card: serverCard, status: 'PUBLISHED', createdAt: timestamp, updatedAt: timestamp, selectedProposalId: null, missingFields: [] };
const page = <T>(items: T[]) => ({ items, page: 0, size: 100, totalElements: items.length, totalPages: items.length ? 1 : 0 });
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' };

test('HTTP-адаптер использует backend-маршруты, CSRF и преобразует предложение', async ({ page: browser }) => {
  let submitted: Record<string, unknown> | null = null;
  let attempts = 0;
  await browser.route('http://127.0.0.1:4174/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const ok = (json: unknown) => route.fulfill({ json });
    if (url.pathname === '/api/auth/csrf') return ok(csrf);
    if (url.pathname === '/api/auth/me') return ok(serverUser);
    if (url.pathname === '/api/me/needs') return ok(page([]));
    if (url.pathname === '/api/needs' && request.method() === 'GET') return ok(page([serverNeed]));
    if (url.pathname === `/api/needs/${needId}`) return ok(serverNeed);
    if (url.pathname === '/api/me/proposals') return ok(page(submitted ? [{ id: proposalId, needId, authorId: serverUser.id, authorName: serverUser.displayName, status: 'PENDING', createdAt: timestamp, ...submitted }] : []));
    if (url.pathname === `/api/needs/${needId}/proposals` && request.method() === 'POST') {
      attempts += 1;
      expect(request.headers()['x-csrf-token']).toBe(csrf.token);
      if (attempts === 1) return route.fulfill({ status: 503, json: { code: 'TEMPORARY', message: 'Не удалось отправить предложение' } });
      submitted = request.postDataJSON();
      return ok({ id: proposalId, needId, authorId: serverUser.id, authorName: serverUser.displayName, status: 'PENDING', createdAt: timestamp, ...submitted });
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'Нет такого маршрута' } });
  });

  await browser.goto('/catalog');
  await browser.getByRole('heading', { name: serverCard.title }).click();
  await browser.getByLabel('Описание решения').fill('Сделаю сайт с меню и контактами');
  await browser.getByLabel('Способ реализации').fill('Прототип, дизайн и адаптивная вёрстка');
  await browser.getByLabel('Стоимость').fill('80 000 ₸');
  await browser.getByLabel('Сроки выполнения').fill('10 дней');
  await browser.getByRole('button', { name: 'Отправить предложение' }).click();
  await expect(browser.getByRole('alert')).toContainText('Не удалось отправить предложение');
  await browser.getByRole('button', { name: 'Отправить предложение' }).click();
  await expect(browser.getByRole('heading', { name: 'Предложение отправлено' })).toBeVisible();
  expect(submitted).toMatchObject({ solutionDescription: 'Сделаю сайт с меню и контактами', implementationPlan: 'Прототип, дизайн и адаптивная вёрстка', priceNote: '80 000 ₸', scheduleNote: '10 дней' });
});

test('HTTP-регистрация входит в сессию и публикует карточку в формате backend', async ({ page: browser }) => {
  let signedIn = false;
  let draft = { ...serverNeed, ownerId: serverUser.id, ownerName: serverUser.displayName, originalDescription: 'Нужен сайт кофейни с меню', status: 'DRAFT', card: { ...serverCard, title: 'Нужен сайт кофейни с меню', problem: 'Нужен сайт кофейни с меню', expectedResult: null, acceptanceCriteria: [] } };
  let updateBody: { card: typeof serverCard } | null = null;
  await browser.route('http://127.0.0.1:4174/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const ok = (json: unknown) => route.fulfill({ json });
    if (url.pathname === '/api/auth/csrf') return ok(csrf);
    if (url.pathname === '/api/auth/register') { expect(request.postDataJSON()).toMatchObject({ displayName: 'Мария' }); return ok(serverUser); }
    if (url.pathname === '/api/auth/login') { signedIn = true; return ok(serverUser); }
    if (url.pathname === '/api/auth/me') return signedIn ? ok(serverUser) : route.fulfill({ status: 401, json: { code: 'UNAUTHENTICATED', message: 'Необходимо войти.' } });
    if (url.pathname === '/api/me/needs') return ok(page([]));
    if (url.pathname === '/api/needs' && request.method() === 'POST') return ok(draft);
    if (url.pathname === `/api/needs/${needId}` && request.method() === 'GET') return ok(draft);
    if (url.pathname === `/api/needs/${needId}` && request.method() === 'PUT') { updateBody = request.postDataJSON(); draft = { ...draft, card: updateBody!.card }; return ok(draft); }
    if (url.pathname === `/api/needs/${needId}/publish`) { draft = { ...draft, status: 'PUBLISHED' }; return ok(draft); }
    if (url.pathname === `/api/needs/${needId}/proposals`) return ok(page([]));
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'Нет такого маршрута' } });
  });

  await browser.goto('/register');
  await browser.getByLabel('Ваше имя').fill('Мария');
  await browser.getByLabel('Email', { exact: true }).fill(serverUser.email);
  await browser.getByLabel('Пароль', { exact: true }).fill('correct-password');
  await browser.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(browser.getByRole('heading', { name: /Тест, всё получится/ })).toBeVisible();
  await browser.goto('/requests/new');
  await browser.getByLabel('Ваша потребность').fill('Нужен сайт кофейни с меню');
  await browser.getByRole('button', { name: 'Уточнить с ИИ' }).click();
  const answers = ['Готовый сайт с меню', 'Разработка', '100 000 ₸', 'Две недели', 'Удалённо', 'Алматы', 'Адаптация под телефон'];
  for (const [index, answer] of answers.entries()) {
    await browser.getByLabel('Ответ помощнику').fill(answer);
    await browser.getByRole('button', { name: 'Отправить ответ' }).click();
    if (index < answers.length - 1) await expect(browser.getByLabel('Ответ помощнику')).toHaveValue('');
  }
  await browser.getByLabel('Название задачи').fill('Сайт кофейни');
  await browser.getByRole('button', { name: 'Опубликовать заявку' }).click();
  await expect(browser.getByText('Ваша задача ждёт своего человека')).toBeVisible();
  expect(updateBody?.card).toMatchObject({ title: 'Сайт кофейни', expectedResult: 'Готовый сайт с меню', category: 'Разработка', budgetText: '100 000 ₸', workFormat: 'Удалённо', location: 'Алматы', requirements: 'Адаптация под телефон', acceptanceCriteria: ['Готовый сайт с меню'] });
});
