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
  await expect(page.getByRole('heading', { name: 'Большие решения начинаются с пары слов.' })).toBeVisible();
  await expect(page.getByPlaceholder('Например: ищу дизайнера для моей кофейни')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Создать задачу', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Уточнить с ИИ', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Получить предложения', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Уточнить с ИИ', exact: true }).click();
  await expect(page.getByPlaceholder('Например: ищу дизайнера для моей кофейни')).toBeFocused();
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
  await expect(page.getByRole('textbox', { name: 'Ожидаемый результат' })).toHaveValue('');
  await expect(page.getByLabel('Бюджет')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Опубликовать заявку' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Ожидаемый результат' }).fill('Уверенно общаться в аэропорту и отеле');
  await expect(page.getByRole('button', { name: 'Опубликовать заявку' })).toBeEnabled();
});

test('личный и публичный профиль: сохранение и переход из предложения', async ({ page }) => {
  await demo(page);
  await page.getByRole('link', { name: 'Открыть мой профиль' }).last().click();
  await expect(page.getByRole('heading', { name: 'Мой профиль' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('demo@yasno.app');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Имя и фамилия').fill('Александр Сариев');
  await page.getByLabel('Специализация').fill('Графический дизайн');
  await page.getByLabel('Город').fill('Алматы');
  await page.getByLabel('О себе').fill('Помогаю создавать понятные визуальные решения.');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Сохранено' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Имя и фамилия')).toHaveValue('Александр Сариев');
  await page.getByRole('link', { name: /Посмотреть публичный профиль/ }).click();
  await expect(page.getByRole('heading', { name: 'Александр Сариев' })).toBeVisible();
  await expect(page.getByText('Помогаю создавать понятные визуальные решения.')).toBeVisible();
  await expect(page.getByText('demo@yasno.app')).toHaveCount(0);
  await page.goto('/requests/demo-brand');
  await page.getByRole('article').filter({ hasText: 'Анна Смирнова' }).getByRole('link', { name: 'Профиль исполнителя', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Анна Смирнова' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('рейтинг: подтверждение, сохранение, публикация и пересчёт после дополнения', async ({ page }, testInfo) => {
  await demo(page);
  await page.goto('/requests/demo-english/edit');
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: 'Пока не знаю, пропустить' }).click();
    if (i < 6) await expect(page.getByRole('button', { name: 'Пока не знаю, пропустить' })).toBeEnabled();
  }
  const panel = page.getByRole('region', { name: 'Рейтинг готовности задачи' });
  await expect(panel.getByRole('progressbar')).toHaveAttribute('value', '0');
  const input: Record<string, string> = {
    'Ожидаемый результат': 'Уверенно общаться в аэропорту и отеле',
    'Данные и материалы': 'Запись пробного разговора, результаты теста уровня',
    'Критерии успеха': 'Диалог в отеле длится 10 минут без перехода на русский',
    'Сроки': 'Два месяца',
    'Пользователи решения': 'Взрослые путешественники с уровнем A2',
    'Контакт со стороны бизнеса': 'contact@example.test',
    'Формат консультаций': 'Видеовстреча по четвергам',
    'Порядок обратной связи': 'Разбор записей в течение двух дней',
  };
  for (const [label, value] of Object.entries(input)) await page.getByRole('textbox', { name: label }).fill(value);
  await expect(panel.getByRole('checkbox').first()).toBeDisabled();
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect(page.getByText('Черновик сохранён')).toBeVisible();
  await expect(panel.getByRole('progressbar')).toHaveAttribute('value', '0');
  const labels = ['Контекст и потребность', 'Данные и материалы', 'Ожидаемый результат', 'Критерии успеха', 'Ограничения', 'Пользователи', 'Связь с бизнесом'];
  for (const label of labels) {
    const checkbox = panel.getByRole('checkbox', { name: `Подтвердить: ${label}`, exact: true });
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toBeEnabled();
  }
  await expect(panel.getByRole('progressbar')).toHaveAttribute('value', '100');
  await page.reload();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '100');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();
  await expect(page.getByText('Ваша заявка опубликована!')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByText('100/100 · Приоритетная')).toBeVisible();
  await page.getByRole('link', { name: 'Дополнить задачу' }).click();
  await page.getByRole('textbox', { name: 'Данные и материалы', exact: true }).fill('Новые записи и обновлённый тест уровня');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByText('Изменения сохранены')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '80');
  await expect(page.getByRole('checkbox', { name: 'Подтвердить: Данные и материалы', exact: true })).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Подтвердить: Данные и материалы', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '100');
  await page.screenshot({ path: testInfo.outputPath('readiness.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
