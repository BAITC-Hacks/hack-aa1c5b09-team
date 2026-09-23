import { ApiError } from './types';
import type { Api } from './types';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, credentials: 'include', signal: controller.signal, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
    if (!response.ok) {
      const error = await response.json().catch(() => null) as { message?: string } | null;
      throw new ApiError(error?.message || (response.status === 401 ? 'Сессия завершилась. Войдите снова.' : 'Не удалось выполнить запрос. Попробуйте ещё раз.'), response.status);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error && error.name === 'AbortError' ? 'Сервер не ответил вовремя. Попробуйте ещё раз.' : 'Нет связи с сервером. Проверьте подключение и повторите попытку.', 503);
  } finally { clearTimeout(timeout); }
}
const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const path = (id: string) => `/requests/${encodeURIComponent(id)}`;
const chat = (id: string, offerId: string) => `${path(id)}/offers/${encodeURIComponent(offerId)}/messages`;
export const httpApi: Api = {
  async me() { try { return await request('/auth/me'); } catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; } },
  login: input => post('/auth/login', input),
  register: input => post('/auth/register', input),
  logout: () => post('/auth/logout'),
  listRequests: () => request('/requests'),
  listCatalog: () => request('/catalog'),
  getCatalogRequest: id => request(`/catalog/${encodeURIComponent(id)}`),
  createOffer: (id, input, clientId) => post(`${path(id)}/offers`, { ...input, clientId }),
  listMyOffers: () => request('/offers/mine'),
  getRequest: id => request(path(id)),
  createDraft: (initialText, clientId) => post('/requests', { initialText, clientId }),
  clarify: (id, input) => post(`${path(id)}/clarify`, input),
  updateDraft: (id, card) => request(path(id), { method: 'PATCH', body: JSON.stringify({ card }) }),
  publish: id => post(`${path(id)}/publish`),
  getOffers: id => request(`${path(id)}/offers`),
  selectOffer: (id, offerId) => post(`${path(id)}/select`, { offerId }),
  getMessages: (id, offerId) => request(chat(id, offerId)),
  sendMessage: (id, offerId, text, clientId) => post(chat(id, offerId), { text, clientId }),
};
