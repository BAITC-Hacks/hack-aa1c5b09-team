import { ApiError, emptyCard } from './types';
import type { Api, ChatMessage, NeedRequest, Offer, User } from './types';

const STORAGE_KEY = 'yasno-demo-v1';
const SESSION_KEY = 'yasno-demo-session';
interface Database {
  version: 1;
  users: User[];
  requests: NeedRequest[];
  offers: Offer[];
  messages: ChatMessage[];
  operations: Record<string, string>;
}
const demoUser: User = { id: 'demo-consumer', name: 'Александр', email: 'demo@yasno.app' };
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 350));

function offersFor(requestId: string): Offer[] {
  return [
    { id: uuid(), requestId, name: 'Анна Смирнова', initials: 'АС', specialty: 'Внимание к каждой детали', color: 'peach', description: 'Помогу разобраться в задаче и предложу понятный план. Начнём с обсуждения результата, согласуем этапы и будем на связи в процессе работы.', price: '85 000 ₸', duration: '7 дней', rating: 4.9, reviews: 24 },
    { id: uuid(), requestId, name: 'Михаил Волков', initials: 'МВ', specialty: 'От идеи до готового результата', color: 'blue', description: 'Готов взять задачу целиком. Сначала уточним ваши пожелания, затем подготовлю два варианта решения. В стоимость включены две итерации правок.', price: '110 000 ₸', duration: '5 дней', rating: 5.0, reviews: 18 },
    { id: uuid(), requestId, name: 'Дарья Ким', initials: 'ДК', specialty: 'Индивидуальный подход', color: 'mint', description: 'Предлагаю начать с небольшой консультации. Вместе определим приоритеты и подберём решение под ваш бюджет. Каждый этап согласуем заранее.', price: '70 000 ₸', duration: '10 дней', rating: 4.8, reviews: 32 },
  ];
}
function welcome(offer: Offer): ChatMessage {
  return { id: uuid(), offerId: offer.id, sender: 'provider', text: `Здравствуйте! Меня зовут ${offer.name.split(' ')[0]}. Я ознакомилась с вашей задачей и готова обсудить детали. Что для вас самое важное в результате?`.replace(offer.initials === 'МВ' ? 'ознакомилась' : '__', 'ознакомился').replace(offer.initials === 'МВ' ? 'готова' : '__', 'готов'), createdAt: now() };
}
function initialDatabase(): Database {
  const timestamp = now();
  const requests: NeedRequest[] = [
    { id: 'demo-brand', ownerId: demoUser.id, status: 'published', initialText: 'Нужен фирменный стиль для кофейни', card: { title: 'Фирменный стиль для уютной кофейни', description: 'Открываем небольшую кофейню в Алматы. Нужен тёплый, узнаваемый визуальный стиль, который передаст атмосферу места.', outcome: 'Логотип, палитра, шрифты и макеты стаканчиков. Исходники и небольшое руководство по использованию.', category: 'Дизайн', budget: 'До 120 000 ₸', deadline: 'В течение двух недель', format: 'Удалённо', location: '', requirements: 'Предпочитаем природные оттенки и лаконичную типографику.' }, messages: [], clarificationStep: 7, readyForReview: true, createdAt: timestamp, updatedAt: timestamp, offerCount: 3 },
    { id: 'demo-room', ownerId: demoUser.id, status: 'published', initialText: 'Хочу обновить гостиную', card: { title: 'Обновить гостиную без большого ремонта', description: 'Хочу сделать гостиную площадью 18 м² светлее и уютнее. Основную мебель планирую сохранить.', outcome: 'План расстановки, подбор освещения и текстиля, список покупок.', category: 'Дом и ремонт', budget: 'До 90 000 ₸', deadline: 'В течение месяца', format: 'Очно', location: 'Алматы', requirements: 'Без перепланировки и замены напольного покрытия.' }, messages: [], clarificationStep: 7, readyForReview: true, createdAt: timestamp, updatedAt: timestamp, offerCount: 2 },
    { id: 'demo-english', ownerId: demoUser.id, status: 'draft', initialText: 'Хочу увереннее говорить на английском', card: { ...emptyCard(), title: 'Английский для путешествий', description: 'Хочу увереннее говорить на английском в путешествиях.' }, messages: [{ id: uuid(), role: 'user', text: 'Хочу увереннее говорить на английском в путешествиях.' }, { id: uuid(), role: 'assistant', text: 'Какой результат вы хотите получить? Опишите, что изменится, когда задача будет решена.' }], clarificationStep: 0, readyForReview: false, createdAt: timestamp, updatedAt: timestamp, offerCount: 0 },
  ];
  const offers = [...offersFor('demo-brand'), ...offersFor('demo-room').slice(0, 2)];
  return { version: 1, users: [demoUser], requests, offers, messages: offers.map(welcome), operations: {} };
}
function save(db: Database) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
  catch { throw new ApiError('Не удалось сохранить данные. Проверьте, доступно ли хранилище браузера.', 503); }
}
function read(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { const db = initialDatabase(); save(db); return db; }
    const parsed = JSON.parse(raw) as Database;
    if (parsed.version !== 1 || !Array.isArray(parsed.users) || !Array.isArray(parsed.requests) || !Array.isArray(parsed.offers) || !Array.isArray(parsed.messages) || !parsed.operations) throw new Error('Invalid storage');
    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Демонстрационные данные недоступны. Откройте приложение в другом профиле браузера или очистите данные этого сайта.', 503);
  }
}
function currentUser(db: Database): User | null {
  return db.users.find(user => user.id === localStorage.getItem(SESSION_KEY)) ?? null;
}
function requireUser(db: Database): User {
  const user = currentUser(db);
  if (!user) throw new ApiError('Сессия завершилась. Войдите снова.', 401);
  return user;
}
function ownedRequest(db: Database, id: string): NeedRequest {
  const user = requireUser(db);
  const request = db.requests.find(item => item.id === id && item.ownerId === user.id);
  if (!request) throw new ApiError('Заявка не найдена.', 404);
  return request;
}
function draft(db: Database, id: string): NeedRequest {
  const request = ownedRequest(db, id);
  if (request.status !== 'draft') throw new ApiError('Опубликованную заявку больше нельзя редактировать.', 409);
  return request;
}
function conversation(db: Database, requestId: string, offerId: string) {
  const request = ownedRequest(db, requestId);
  const offer = db.offers.find(item => item.id === offerId && item.requestId === requestId);
  if (!offer) throw new ApiError('Предложение не найдено.', 404);
  return { request, offer };
}
const questions = [
  'Какой результат вы хотите получить? Опишите, что изменится, когда задача будет решена.',
  'К какой категории относится задача? Например: дизайн, дом и ремонт, обучение или разработка.',
  'Какой бюджет вы рассматриваете? Укажите сумму и валюту или напишите, что готовы обсудить.',
  'Когда нужен результат? Можно указать дату или примерный срок.',
  'Как удобно работать: удалённо, очно или в любом формате?',
  'Где нужно выполнить задачу? Для удалённой работы этот вопрос можно пропустить.',
  'Есть ли ещё пожелания или ограничения, которые стоит знать исполнителю?',
];
const questionFields = ['outcome', 'category', 'budget', 'deadline', 'format', 'location', 'requirements'] as const;

export const mockApi: Api = {
  async me() { await pause(); return currentUser(read()); },
  async login({ email, password }) {
    await pause();
    const user = read().users.find(item => item.email === email.trim().toLowerCase());
    if (!user || password.length < 8) throw new ApiError('Проверьте email и пароль. В деморежиме сначала зарегистрируйтесь или откройте демо.');
    localStorage.setItem(SESSION_KEY, user.id);
    return user;
  },
  async register({ name, email, password }) {
    await pause();
    const db = read();
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || password.length < 8) throw new ApiError('Укажите имя, корректный email и пароль от 8 символов.');
    if (db.users.some(user => user.email === normalizedEmail)) throw new ApiError('Этот email уже зарегистрирован. Войдите в аккаунт.', 409);
    const user = { id: uuid(), name: name.trim(), email: normalizedEmail };
    db.users.push(user);
    save(db);
    localStorage.setItem(SESSION_KEY, user.id);
    return user;
  },
  async logout() { await pause(); localStorage.removeItem(SESSION_KEY); },
  async listRequests() {
    await pause(); const db = read(); const user = requireUser(db);
    return db.requests.filter(item => item.ownerId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async getRequest(id) { await pause(); return ownedRequest(read(), id); },
  async createDraft(initialText, clientId) {
    await pause(); const db = read(); const user = requireUser(db);
    const operation = `${user.id}:create:${clientId}`;
    if (db.operations[operation]) return ownedRequest(db, db.operations[operation]);
    if (initialText.trim().length < 10) throw new ApiError('Опишите потребность чуть подробнее — минимум 10 символов.');
    const text = initialText.trim();
    const request: NeedRequest = { id: uuid(), ownerId: user.id, status: 'draft', card: { ...emptyCard(), title: text.length > 76 ? `${text.slice(0, 73)}…` : text, description: text }, initialText: text, messages: [{ id: uuid(), role: 'user', text }, { id: uuid(), role: 'assistant', text: `Давайте превратим вашу идею в понятную задачу. ${questions[0]}` }], clarificationStep: 0, readyForReview: false, createdAt: now(), updatedAt: now(), offerCount: 0 };
    db.requests.push(request); db.operations[operation] = request.id; save(db); return request;
  },
  async clarify(id, { text, skip, clientId }) {
    await pause(); const db = read(); const request = draft(db, id);
    const operation = `${id}:clarify:${clientId}`;
    if (db.operations[operation]) return request;
    if (request.readyForReview) throw new ApiError('Уточнения завершены. Перейдите к проверке карточки.', 409);
    if (!skip && !text.trim()) throw new ApiError('Введите ответ или пропустите вопрос.');
    if (!skip) request.card[questionFields[request.clarificationStep]] = text.trim();
    request.messages.push({ id: uuid(), role: 'user', text: skip ? 'Пока не знаю, пропустить' : text.trim() });
    request.clarificationStep += 1;
    request.readyForReview = request.clarificationStep >= questions.length;
    request.messages.push({ id: uuid(), role: 'assistant', text: request.readyForReview ? 'Карточка готова к проверке! Я собрал ваши ответы. Проверьте формулировки и добавьте недостающие детали перед публикацией.' : questions[request.clarificationStep] });
    request.updatedAt = now(); db.operations[operation] = id; save(db); return request;
  },
  async updateDraft(id, card) {
    await pause(); const db = read(); const request = draft(db, id);
    if (!request.readyForReview) throw new ApiError('Сначала завершите уточнения.', 409);
    request.card = Object.fromEntries(Object.entries(card).map(([key, value]) => [key, value.trim()])) as typeof card;
    request.updatedAt = now(); save(db); return request;
  },
  async publish(id) {
    await pause(); const db = read(); const request = ownedRequest(db, id);
    if (request.status !== 'draft') return request;
    if (!request.readyForReview || !request.card.title.trim() || !request.card.description.trim() || !request.card.outcome.trim()) throw new ApiError('Заполните название, описание и ожидаемый результат.');
    request.status = 'published'; request.updatedAt = now();
    const offers = offersFor(id); request.offerCount = offers.length;
    db.offers.push(...offers); db.messages.push(...offers.map(welcome)); save(db); return request;
  },
  async getOffers(id) { await pause(); const db = read(); ownedRequest(db, id); return db.offers.filter(offer => offer.requestId === id); },
  async selectOffer(requestId, offerId) {
    await pause(); const db = read(); const { request } = conversation(db, requestId, offerId);
    if (request.selectedOfferId === offerId) return request;
    if (request.status !== 'published') throw new ApiError('Для этой заявки уже выбран исполнитель.', 409);
    request.selectedOfferId = offerId; request.status = 'selected'; request.updatedAt = now(); save(db); return request;
  },
  async getMessages(requestId, offerId) { await pause(); const db = read(); conversation(db, requestId, offerId); return db.messages.filter(message => message.offerId === offerId); },
  async sendMessage(requestId, offerId, text, clientId) {
    await pause(); const db = read(); const { request, offer } = conversation(db, requestId, offerId);
    if (db.messages.some(message => message.offerId === offerId && message.clientId === clientId)) return db.messages.filter(message => message.offerId === offerId);
    if (request.status === 'selected' && request.selectedOfferId !== offerId) throw new ApiError('Этот чат доступен только для чтения.', 409);
    if (!text.trim() || text.length > 4000) throw new ApiError('Сообщение должно содержать от 1 до 4000 символов.');
    db.messages.push({ id: uuid(), clientId, offerId, sender: 'consumer', text: text.trim(), createdAt: now() });
    const count = db.messages.filter(message => message.offerId === offerId && message.sender === 'consumer').length;
    const responses = ['Спасибо за уточнение! Учту это в плане работы. Могу предложить начать с короткого обсуждения ваших приоритетов.', `По срокам ориентир — ${offer.duration.toLowerCase()}. В предложение включено согласование деталей и промежуточный результат.`, 'Да, давайте зафиксируем эти пожелания. Готовы обсудить следующий шаг?'];
    db.messages.push({ id: uuid(), offerId, sender: 'provider', text: responses[(count - 1) % responses.length], createdAt: now() });
    save(db); return db.messages.filter(message => message.offerId === offerId);
  },
};
