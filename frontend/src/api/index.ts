import { httpApi } from './http';
import { mockApi } from './mock';

const mode = import.meta.env.VITE_API_MODE || 'mock';
if (mode !== 'mock' && mode !== 'http') throw new Error('VITE_API_MODE должен быть mock или http.');
export const isDemo = mode === 'mock';
export const api = isDemo ? mockApi : httpApi;
