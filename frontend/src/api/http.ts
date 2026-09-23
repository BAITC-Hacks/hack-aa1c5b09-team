import { ApiError, emptyCard } from './types';
import type { AiMessage, Api, ChatMessage, NeedCard, NeedRequest, Offer, PublicNeed, User } from './types';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

type ServerUser = { id: string; email: string; displayName: string };
type Page<T> = { items: T[] };
type ServerCard = {
  title: string | null;
  problem: string | null;
  expectedResult: string | null;
  acceptanceCriteria: string[];
  constraints: string | null;
  budgetAmount: number | null;
  currency: string | null;
  deadline: string | null;
  category?: string | null;
  budgetText?: string | null;
  deadlineText?: string | null;
  workFormat?: string | null;
  location?: string | null;
  requirements?: string | null;
};
type ServerNeed = {
  id: string;
  ownerId: string;
  ownerName?: string | null;
  originalDescription?: string | null;
  card: ServerCard;
  status: 'DRAFT' | 'PUBLISHED' | 'SOLUTION_SELECTED';
  createdAt: string;
  updatedAt?: string | null;
  selectedProposalId: string | null;
  missingFields: string[];
};
type ServerProposal = {
  id: string;
  needId: string;
  authorId: string;
  authorName?: string | null;
  solutionDescription: string;
  implementationPlan: string;
  expectedResult: string;
  priceAmount: number | null;
  currency: string | null;
  priceNote: string | null;
  durationDays: number | null;
  scheduleNote: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
};
type Csrf = { headerName: string; token: string };
type ClarificationState = { card: NeedCard; messages: AiMessage[]; step: number; ready: boolean };

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
const stateKey = (id: string) => `yasno-http-clarification-${id}`;
const uuid = () => crypto.randomUUID();

function readState(id: string): ClarificationState | null {
  try { const value = localStorage.getItem(stateKey(id)); return value ? JSON.parse(value) as ClarificationState : null; }
  catch { return null; }
}
function writeState(id: string, state: ClarificationState) {
  try { localStorage.setItem(stateKey(id), JSON.stringify(state)); }
  catch { throw new ApiError('Не удалось сохранить диалог в браузере.', 503); }
}
function user(value: ServerUser): User { return { id: value.id, email: value.email, name: value.displayName }; }
function text(value: string | null | undefined) { return value || ''; }
function money(value: number | null, currency: string | null) {
  if (value == null) return '';
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ${currency === 'KZT' ? '₸' : currency || ''}`.trim();
}
function card(value: ServerCard): NeedCard {
  return {
    title: text(value.title),
    description: text(value.problem),
    outcome: text(value.expectedResult),
    category: text(value.category),
    budget: text(value.budgetText) || money(value.budgetAmount, value.currency),
    deadline: text(value.deadlineText) || text(value.deadline),
    format: text(value.workFormat),
    location: text(value.location),
    requirements: text(value.requirements) || text(value.constraints),
  };
}
function serverCard(value: NeedCard): ServerCard {
  const clean = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item.trim()])) as unknown as NeedCard;
  return {
    title: clean.title || null,
    problem: clean.description || null,
    expectedResult: clean.outcome || null,
    acceptanceCriteria: clean.outcome ? [clean.outcome] : [],
    constraints: clean.requirements || null,
    budgetAmount: null,
    currency: null,
    deadline: null,
    category: clean.category || null,
    budgetText: clean.budget || null,
    deadlineText: clean.deadline || null,
    workFormat: clean.format || null,
    location: clean.location || null,
    requirements: clean.requirements || null,
  };
}
function status(value: ServerNeed['status']): NeedRequest['status'] {
  return value === 'DRAFT' ? 'draft' : value === 'PUBLISHED' ? 'published' : 'selected';
}
function initialState(need: ServerNeed): ClarificationState {
  const initial = need.originalDescription || need.card.problem || '';
  const complete = Boolean(need.card.expectedResult && need.card.acceptanceCriteria?.length);
  return {
    card: card(need.card),
    step: complete ? questions.length : 0,
    ready: complete,
    messages: complete ? [{ id: uuid(), role: 'assistant', text: 'Карточка готова к проверке. Проверьте формулировки перед публикацией.' }] : [
      { id: uuid(), role: 'user', text: initial },
      { id: uuid(), role: 'assistant', text: `Давайте превратим вашу идею в понятную задачу. ${questions[0]}` },
    ],
  };
}
function requestNeed(need: ServerNeed): NeedRequest {
  const draftState = need.status === 'DRAFT' ? readState(need.id) || initialState(need) : null;
  return {
    id: need.id,
    ownerId: need.ownerId,
    status: status(need.status),
    card: draftState?.card || card(need.card),
    initialText: need.originalDescription || need.card.problem || '',
    messages: draftState?.messages || [],
    clarificationStep: draftState?.step || 0,
    readyForReview: draftState?.ready || false,
    createdAt: need.createdAt,
    updatedAt: need.updatedAt || need.createdAt,
    offerCount: 0,
    selectedOfferId: need.selectedProposalId || undefined,
  };
}
function publicNeed(need: ServerNeed): PublicNeed {
  return { id: need.id, ownerId: need.ownerId, ownerName: need.ownerName || 'Заказчик', status: status(need.status) as PublicNeed['status'], card: card(need.card), createdAt: need.createdAt, updatedAt: need.updatedAt || need.createdAt, offerCount: 0, selectedOfferId: need.selectedProposalId || undefined };
}
function offer(value: ServerProposal): Offer {
  const price = value.priceNote || money(value.priceAmount, value.currency) || 'Стоимость обсуждается';
  const duration = value.scheduleNote || (value.durationDays ? `${value.durationDays} дн.` : 'Срок обсуждается');
  const name = value.authorName || 'Исполнитель';
  return { id: value.id, requestId: value.needId, providerId: value.authorId, name, specialty: 'Предложение решения', initials: name.split(' ').map(part => part[0]).slice(0, 2).join(''), color: 'violet', description: value.solutionDescription, method: value.implementationPlan, price, duration, rating: 0, reviews: 0, createdAt: value.createdAt };
}

let csrf: Csrf | null = null;
async function fetchJson<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const method = (options.method || 'GET').toUpperCase();
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !csrf) csrf = await fetchJson<Csrf>('/auth/csrf');
    const response = await fetch(`${baseUrl}${path}`, { ...options, credentials: 'include', signal: controller.signal, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method) ? { [csrf.headerName]: csrf.token } : {}), ...options.headers } });
    if (!response.ok) {
      const error = await response.json().catch(() => null) as { code?: string; message?: string; fieldErrors?: Record<string, string> } | null;
      if (response.status === 403 && error?.code === 'CSRF_INVALID' && allowRetry) { csrf = null; return fetchJson<T>(path, options, false); }
      const fieldMessage = error?.fieldErrors ? Object.values(error.fieldErrors)[0] : undefined;
      throw new ApiError(fieldMessage || error?.message || (response.status === 401 ? 'Сессия завершилась. Войдите снова.' : 'Не удалось выполнить запрос. Попробуйте ещё раз.'), response.status);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error && error.name === 'AbortError' ? 'Сервер не ответил вовремя. Попробуйте ещё раз.' : 'Нет связи с сервером. Проверьте, запущен ли backend.', 503);
  } finally { clearTimeout(timeout); }
}
const body = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });
const post = <T>(path: string, value?: unknown) => fetchJson<T>(path, { method: 'POST', ...(value === undefined ? {} : body(value)) });

export const httpApi: Api = {
  async me() { try { return user(await fetchJson<ServerUser>('/auth/me')); } catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; } },
  async login(input) { const result = user(await post<ServerUser>('/auth/login', input)); csrf = null; return result; },
  async register(input) {
    await post<ServerUser>('/auth/register', { displayName: input.name, email: input.email, password: input.password });
    csrf = null;
    return this.login({ email: input.email, password: input.password });
  },
  async logout() { await post('/auth/logout'); csrf = null; },
  async listRequests() { const page = await fetchJson<Page<ServerNeed>>('/me/needs?size=100'); return page.items.map(requestNeed); },
  async listCatalog() {
    const [page, me] = await Promise.all([fetchJson<Page<ServerNeed>>('/needs?size=100'), fetchJson<ServerUser>('/auth/me')]);
    return page.items.filter(item => item.ownerId !== me.id).map(publicNeed);
  },
  async getCatalogRequest(id) {
    const [need, proposals] = await Promise.all([fetchJson<ServerNeed>(`/needs/${encodeURIComponent(id)}`), fetchJson<Page<ServerProposal>>('/me/proposals?size=100')]);
    const mine = proposals.items.find(item => item.needId === id);
    return { request: publicNeed(need), myOffer: mine ? offer(mine) : null };
  },
  async createOffer(id, input) {
    const result = await post<ServerProposal>(`/needs/${encodeURIComponent(id)}/proposals`, { solutionDescription: input.description, implementationPlan: input.method, expectedResult: input.description, priceAmount: null, currency: null, priceNote: input.price, durationDays: null, scheduleNote: input.duration });
    return offer(result);
  },
  async listMyOffers() {
    const page = await fetchJson<Page<ServerProposal>>('/me/proposals?size=100');
    return Promise.all(page.items.map(async item => {
      const need = await fetchJson<ServerNeed>(`/needs/${encodeURIComponent(item.needId)}`);
      return { offer: offer(item), request: publicNeed(need), status: item.status === 'ACCEPTED' ? 'accepted' as const : item.status === 'REJECTED' ? 'not_selected' as const : 'pending' as const };
    }));
  },
  async getRequest(id) { return requestNeed(await fetchJson<ServerNeed>(`/needs/${encodeURIComponent(id)}`)); },
  async createDraft(initialText) {
    const trimmed = initialText.trim();
    const initialCard = { ...emptyCard(), title: trimmed.length > 76 ? `${trimmed.slice(0, 73)}…` : trimmed, description: trimmed };
    const need = await post<ServerNeed>('/needs', { originalDescription: trimmed, card: serverCard(initialCard) });
    const state = initialState(need); writeState(need.id, state);
    return requestNeed(need);
  },
  async clarify(id, input) {
    const need = await fetchJson<ServerNeed>(`/needs/${encodeURIComponent(id)}`);
    const state = readState(id) || initialState(need);
    if (state.ready) throw new ApiError('Уточнения завершены. Перейдите к проверке карточки.', 409);
    if (!input.skip && !input.text.trim()) throw new ApiError('Введите ответ или пропустите вопрос.');
    if (!input.skip) state.card[questionFields[state.step]] = input.text.trim();
    state.messages.push({ id: uuid(), role: 'user', text: input.skip ? 'Пока не знаю, пропустить' : input.text.trim() });
    state.step += 1;
    state.ready = state.step >= questions.length;
    state.messages.push({ id: uuid(), role: 'assistant', text: state.ready ? 'Карточка готова к проверке! Проверьте формулировки и добавьте недостающие детали перед публикацией.' : questions[state.step] });
    writeState(id, state);
    return requestNeed(need);
  },
  async updateDraft(id, value) {
    const current = await fetchJson<ServerNeed>(`/needs/${encodeURIComponent(id)}`);
    const result = await fetchJson<ServerNeed>(`/needs/${encodeURIComponent(id)}`, { method: 'PUT', ...body({ originalDescription: current.originalDescription || value.description, card: serverCard(value) }) });
    const state = readState(id) || initialState(result); state.card = value; state.ready = true; state.step = questions.length; writeState(id, state);
    return requestNeed(result);
  },
  async publish(id) { const result = await post<ServerNeed>(`/needs/${encodeURIComponent(id)}/publish`); try { localStorage.removeItem(stateKey(id)); } catch { /* no-op */ } return requestNeed(result); },
  async getOffers(id) { const page = await fetchJson<Page<ServerProposal>>(`/needs/${encodeURIComponent(id)}/proposals?size=100`); return page.items.map(offer); },
  async selectOffer(id, offerId) { await post(`/proposals/${encodeURIComponent(offerId)}/accept`); return requestNeed(await fetchJson<ServerNeed>(`/needs/${encodeURIComponent(id)}`)); },
  getMessages: (requestId, offerId) => fetchJson<ChatMessage[]>(`/requests/${encodeURIComponent(requestId)}/offers/${encodeURIComponent(offerId)}/messages`),
  sendMessage: (requestId, offerId, message, clientId) => post<ChatMessage[]>(`/requests/${encodeURIComponent(requestId)}/offers/${encodeURIComponent(offerId)}/messages`, { text: message, clientId }),
};
