import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function register(page: Page, name: string, email: string) {
  await page.goto('/register');
  await page.getByLabel('Ваше имя').fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`${name}, всё получится`) })).toBeVisible();
}
async function logout(page: Page) {
  const menu = page.getByRole('button', { name: 'Открыть меню' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: 'Выйти из аккаунта' }).click();
  await expect(page.getByRole('heading', { name: 'Рады вас видеть' })).toBeVisible();
}
async function login(page: Page, email: string) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}
async function navigate(page: Page, label: string) {
  const menu = page.getByRole('button', { name: 'Открыть меню' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Главное меню' }).getByRole('link', { name: label, exact: true }).click();
}
async function fillOffer(page: Page) {
  await page.getByLabel('Описание решения').fill('Подготовлю понятную и удобную страницу кофейни');
  await page.getByLabel('Способ реализации').fill('Сначала прототип, затем дизайн и адаптивная вёрстка');
  await page.getByLabel('Стоимость', { exact: false }).fill('90 000 ₸');
  await page.getByLabel('Сроки выполнения').fill('10 дней');
}

test('два пользователя: публикация, каталог, отклик, переписка и принятие', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await register(page, 'Заказчик', 'owner@example.test');
  await page.goto('/requests/new');
  await page.getByLabel('Ваша потребность').fill('Нужен сайт кофейни с меню и контактами');
  await page.getByRole('button', { name: 'Уточнить с ИИ' }).click();
  await page.getByLabel('Ответ помощнику').fill('Адаптивная страница с меню и формой заявки');
  await page.getByRole('button', { name: 'Отправить ответ' }).click();
  await expect(page.getByLabel('Ответ помощнику')).toHaveValue('');
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Пока не знаю, пропустить' }).click();
    if (i < 5) await expect(page.getByRole('button', { name: 'Пока не знаю, пропустить' })).toBeEnabled();
  }
  await page.getByLabel('Название задачи').fill('Сайт кофейни для двух пользователей');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();
  await expect(page.getByText('Ваша заявка опубликована!')).toBeVisible();
  const requestId = new URL(page.url()).pathname.split('/')[2];
  await logout(page);
  await register(page, 'Исполнитель', 'provider@example.test');
  await navigate(page, 'Мои предложения');
  await expect(page.getByText('Ваше первое решение ещё впереди')).toBeVisible();
  await page.getByRole('link', { name: 'Перейти в каталог' }).click();
  await expect(page.getByRole('heading', { name: 'Каталог потребностей', exact: true })).toBeVisible();
  await expect(page.getByText('Найдите задачу, которой можете помочь, и предложите свое решение.')).toBeVisible();
  await expect(page.getByPlaceholder('Задачи, слово или город')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Категория' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Сортировка' })).toBeVisible();
  await expect(page.getByText(/^Найдено: \d+$/)).toBeVisible();
  await expect(page.getByText('Хорошие решения находят друг друга')).toHaveCount(0);
  await expect(page.getByText('Опубликована', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Сайт кофейни для двух пользователей' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Английский для путешествий' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('catalog.png'), fullPage: true });
  await page.getByLabel('Поиск в каталоге').fill('несуществующая потребность');
  await expect(page.getByText('Нет подходящих потребностей')).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await page.getByRole('heading', { name: 'Сайт кофейни для двух пользователей' }).click();
  await expect(page.getByRole('button', { name: 'Отправить предложение' })).toBeDisabled();
  await fillOffer(page);
  await page.reload();
  await expect(page.getByLabel('Способ реализации')).toHaveValue('Сначала прототип, затем дизайн и адаптивная вёрстка');
  await page.screenshot({ path: testInfo.outputPath('offer-form.png'), fullPage: true });
  await page.getByRole('button', { name: 'Отправить предложение' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Предложение отправлено' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Отправить предложение' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Обсудить с заказчиком' }).click();
  await page.getByLabel('Сообщение заказчику').fill('Могу начать в понедельник');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByLabel('Сообщение заказчику')).toHaveValue('');
  await expect(page.getByRole('region', { name: 'Чат с Заказчик' }).getByRole('paragraph')).toHaveCount(1);
  await navigate(page, 'Мои предложения');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Ожидает решения');
  await expect(page.getByRole('article')).toContainText('90 000 ₸');
  await logout(page);
  await login(page, 'owner@example.test');
  await page.goto(`/requests/${requestId}`);
  const proposal = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Исполнитель', exact: true }) });
  await expect(proposal).toContainText('Сначала прототип, затем дизайн и адаптивная вёрстка');
  await expect(proposal).toContainText('Новый участник');
  await proposal.getByRole('button', { name: 'Обсудить' }).click();
  await expect(page.getByRole('paragraph').filter({ hasText: /^Могу начать в понедельник$/ })).toBeVisible();
  await page.getByLabel('Сообщение исполнителю').fill('Отлично, договорились');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByLabel('Сообщение исполнителю')).toHaveValue('');
  await proposal.getByRole('button', { name: 'Выбрать исполнителя' }).click();
  await page.getByRole('button', { name: 'Подтвердить выбор' }).click();
  await expect(page.getByText('Исполнитель выбран. Следующий шаг — за вами.')).toBeVisible();
  await logout(page);
  await login(page, 'provider@example.test');
  await navigate(page, 'Мои предложения');
  await expect(page.getByRole('article')).toContainText('Принято');
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Принято');
  await page.screenshot({ path: testInfo.outputPath('my-offers.png'), fullPage: true });
  await page.getByRole('link', { name: 'Переписка', exact: true }).click();
  await expect(page.getByRole('paragraph').filter({ hasText: /^Отлично, договорились$/ })).toBeVisible();
  await expect(page.getByLabel('Сообщение заказчику')).toBeEnabled();
  await navigate(page, 'Сообщения');
  await expect(page.getByRole('heading', { name: 'Заказчик', exact: true })).toBeVisible();
  await navigate(page, 'Каталог');
  await expect(page.getByRole('heading', { name: 'Сайт кофейни для двух пользователей' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('отказ, ограничения доступа и сохранение существующих данных', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Демо исполнителя' }).click();
  await expect(page.getByRole('heading', { name: /Алиса, всё получится/ })).toBeVisible();
  // Simulate a v1 store to verify the additive catalog migration preserves user data.
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('yasno-demo-v1')!);
    delete db.catalogSeeded;
    db.requests.find((item: { id: string }) => item.id === 'demo-english').card.title = 'Мой сохранённый черновик';
    localStorage.setItem('yasno-demo-v1', JSON.stringify(db));
  });
  await page.goto('/catalog/demo-brand');
  await fillOffer(page);
  await page.getByRole('button', { name: 'Отправить предложение' }).click();
  await expect(page.getByRole('heading', { name: 'Предложение отправлено' })).toBeVisible();
  const restrictions = await page.evaluate(async () => {
    const modulePath = '/src/api/mock.ts';
    const { mockApi } = await import(modulePath);
    const detail = await mockApi.getCatalogRequest('demo-brand');
    const status = async (operation: () => Promise<unknown>) => { try { await operation(); return 200; } catch (error) { return (error as { status: number }).status; } };
    return {
      privateRequest: await status(() => mockApi.getRequest('demo-brand')),
      privateDraft: await status(() => mockApi.getCatalogRequest('demo-english')),
      competitors: await status(() => mockApi.getOffers('demo-brand')),
      select: await status(() => mockApi.selectOffer('demo-brand', detail.myOffer.id)),
      duplicate: await status(() => mockApi.createOffer('demo-brand', { description: 'Ещё одно предложение', method: 'Сделаю всё по этапам', price: '100 ₸', duration: '1 день' }, 'another-key')),
      privateHistoryExposed: 'messages' in detail.request || 'initialText' in detail.request,
    };
  });
  expect(restrictions).toEqual({ privateRequest: 404, privateDraft: 404, competitors: 404, select: 404, duplicate: 409, privateHistoryExposed: false });
  await logout(page);
  await page.getByRole('button', { name: 'Открыть демо' }).click();
  await expect(page.getByRole('heading', { name: 'Мой сохранённый черновик' })).toBeVisible();
  await page.goto('/catalog/demo-brand');
  await expect(page).toHaveURL(/\/requests\/demo-brand$/);
  await expect(page.getByRole('button', { name: 'Отправить предложение' })).toHaveCount(0);
  await page.getByRole('article').filter({ hasText: 'Анна Смирнова' }).getByRole('button', { name: 'Выбрать исполнителя' }).click();
  await page.getByRole('button', { name: 'Подтвердить выбор' }).click();
  await expect(page.getByText('Исполнитель выбран. Следующий шаг — за вами.')).toBeVisible();
  await logout(page);
  await page.getByRole('button', { name: 'Демо исполнителя' }).click();
  await expect(page.getByRole('heading', { name: /Алиса, всё получится/ })).toBeVisible();
  await navigate(page, 'Мои предложения');
  await expect(page.getByRole('article')).toContainText('Выбран другой исполнитель');
  await page.getByRole('tab', { name: /^Принято/ }).click();
  await expect(page.getByText('Предложений с таким статусом пока нет')).toBeVisible();
  await page.getByRole('button', { name: 'Показать все' }).click();
  await page.getByRole('link', { name: 'Переписка', exact: true }).click();
  await expect(page.getByText('Заказчик выбрал другого исполнителя. Чат доступен для чтения.')).toBeVisible();
  await expect(page.getByLabel('Сообщение заказчику')).toHaveCount(0);
});
