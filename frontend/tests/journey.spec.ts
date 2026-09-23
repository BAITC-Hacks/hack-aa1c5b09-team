import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function demo(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Открыть демо' }).click();
  await expect(page.getByRole('heading', { name: /Александр, всё получится/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Фирменный стиль для уютной кофейни' })).toBeVisible();
}

test('полный путь: регистрация, ИИ, правки, публикация, два чата и выбор', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/register');
  await page.getByLabel('Ваше имя').fill('Мария');
  await page.getByLabel('Email', { exact: true }).fill('maria@example.test');
  await page.getByLabel('Пароль', { exact: true }).fill('demo-only-12345');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByText('Здесь начнётся ваша история')).toBeVisible();
  await page.getByRole('link', { name: 'Описать потребность' }).click();
  await page.getByLabel('Ваша потребность').fill('Нужен фирменный стиль для небольшой кофейни в Алматы');
  await page.getByRole('button', { name: 'Уточнить с ИИ' }).click();
  await expect(page.getByRole('heading', { name: 'Давайте разберёмся в деталях' })).toBeVisible();
  await page.getByLabel('Ответ помощнику').fill('Логотип, цвета, шрифты и макет стаканчика');
  await page.getByRole('button', { name: 'Отправить ответ' }).click();
  await expect(page.getByText('К какой категории относится задача?', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Логотип, цвета, шрифты и макет стаканчика').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('editor.png'), fullPage: true });
  const answers = ['Дизайн', 'До 120 000 ₸', 'Через две недели', 'Удалённо', 'Алматы', 'Природные оттенки, без сложных иллюстраций'];
  for (const answer of answers) {
    await page.getByLabel('Ответ помощнику').fill(answer);
    await page.getByRole('button', { name: 'Отправить ответ' }).click();
    await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Собираем детали…' })).toHaveCount(0);
    if (answer !== answers.at(-1)) await expect(page.getByLabel('Ответ помощнику')).toHaveValue('');
  }
  await expect(page.getByRole('heading', { name: 'Всё верно? Можно публиковать' })).toBeVisible();
  await page.getByLabel('Название задачи').fill('Айдентика кофейни «Тёплый день»');
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect(page.getByText('Черновик сохранён')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Название задачи')).toHaveValue('Айдентика кофейни «Тёплый день»');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).dblclick();
  await expect(page.getByText('Ваша заявка опубликована!')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  const url = page.url();
  const anna = page.getByRole('article').filter({ hasText: 'Анна Смирнова' });
  await anna.getByRole('button', { name: 'Обсудить' }).click();
  await page.getByLabel('Сообщение исполнителю').fill('Анна, можно начать со скетчей?');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByLabel('Сообщение исполнителю')).toHaveValue('');
  await expect(page.getByText('Анна, можно начать со скетчей?', { exact: true })).toBeVisible();
  const mikhail = page.getByRole('article').filter({ hasText: 'Михаил Волков' });
  await mikhail.getByRole('button', { name: 'Обсудить' }).click();
  await expect(page.getByText('Анна, можно начать со скетчей?', { exact: true })).toHaveCount(0);
  await page.getByLabel('Сообщение исполнителю').fill('Михаил, уточните количество правок');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByLabel('Сообщение исполнителю')).toHaveValue('');
  await expect(page.getByText('Михаил, уточните количество правок', { exact: true })).toBeVisible();
  await anna.getByRole('button', { name: 'Выбрать исполнителя' }).click();
  await page.getByRole('button', { name: 'Подтвердить выбор' }).click();
  await expect(page.getByText('Исполнитель выбран. Следующий шаг — за вами.')).toBeVisible();
  await expect(page.getByLabel('Сообщение исполнителю')).toHaveValue('');
  await expect(page.getByText('Анна, можно начать со скетчей?', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Исполнитель выбран. Следующий шаг — за вами.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Выбрать исполнителя' })).toHaveCount(0);
  await mikhail.getByRole('button', { name: 'Обсудить' }).click();
  await expect(page.getByText('Вы выбрали другого исполнителя. Чат доступен для чтения.')).toBeVisible();
  await expect(page.getByLabel('Сообщение исполнителю')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('selected.png'), fullPage: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Айдентика кофейни «Тёплый день»' })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('yasno-demo-v1'))).not.toContain('demo-only-12345');
  expect(url).toContain('/requests/');
  expect(errors).toEqual([]);
});

test('демо, поиск, фильтры, навигация и сохранение неотправленного текста', async ({ page }, testInfo) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Рады вас видеть' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
  await demo(page);
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('tab', { name: /Черновики/ }).click();
  await expect(page.getByRole('heading', { name: 'Английский для путешествий' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Фирменный стиль для уютной кофейни' })).toHaveCount(0);
  await page.getByRole('tab', { name: /Все заявки/ }).click();
  await page.getByRole('textbox', { name: 'Поиск заявок' }).fill('невозможный запрос');
  await expect(page.getByRole('heading', { name: 'Ничего не нашлось' })).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await page.getByRole('heading', { name: 'Фирменный стиль для уютной кофейни' }).click();
  await page.getByRole('article').filter({ hasText: 'Анна Смирнова' }).getByRole('button', { name: 'Обсудить' }).click();
  await page.getByLabel('Сообщение исполнителю').fill('Сохраните мой вопрос');
  await page.reload();
  await expect(page.getByLabel('Сообщение исполнителю')).toHaveValue('Сохраните мой вопрос');
  await page.goto('/messages');
  await expect(page.getByRole('heading', { name: 'Сообщения', exact: true })).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: 'Анна Смирнова' })).toHaveCount(2);
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('button', { name: 'Выйти из аккаунта' }).click();
  await expect(page.getByRole('heading', { name: 'Рады вас видеть' })).toBeVisible();
  await page.goto('/requests/demo-brand');
  await expect(page).toHaveURL(/\/login$/);
});

test('пропуск вопросов не выдумывает данные, публикация требует результата', async ({ page }) => {
  await demo(page);
  await page.goto('/requests/demo-english/edit');
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: 'Пока не знаю, пропустить' }).click();
    if (i < 6) await expect(page.getByRole('button', { name: 'Пока не знаю, пропустить' })).toBeEnabled();
  }
  await expect(page.getByLabel('Ожидаемый результат')).toHaveValue('');
  await expect(page.getByLabel('Бюджет')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Опубликовать заявку' })).toBeDisabled();
  await page.getByLabel('Ожидаемый результат').fill('Уверенно общаться в аэропорту и отеле');
  await expect(page.getByRole('button', { name: 'Опубликовать заявку' })).toBeEnabled();
});
