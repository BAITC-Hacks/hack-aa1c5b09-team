import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { api } from './api';
import { ApiError } from './api/types';
import { ErrorNotice, Loading } from './components/ui';
import { Shell } from './components/Shell';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Editor, NewRequest } from './pages/Editor';
import { RequestDetail } from './pages/RequestDetail';
import { Messages } from './pages/Messages';
import './styles/global.css';

function onError(error: Error) { if (error instanceof ApiError && error.status === 401) queryClient.setQueryData(['me'], null); }
const queryClient = new QueryClient({ queryCache: new QueryCache({ onError }), mutationCache: new MutationCache({ onError }), defaultOptions: { queries: { staleTime: 15_000, retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status < 500) }, mutations: { retry: false } } });

function App() {
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: Infinity });
  if (session.isPending) return <Loading text="Открываем ваше пространство…" />;
  if (session.error) return <div style={{ maxWidth: 600, padding: 24, margin: '15vh auto' }}><ErrorNotice error={session.error} retry={() => void session.refetch()} /></div>;
  const user = session.data ?? null;
  return <><a href="#main" className="skip-link">К основному содержимому</a><Routes><Route path="/login" element={<Auth key="login" user={user} />} /><Route path="/register" element={<Auth key="register" user={user} />} /><Route element={user ? <Shell user={user} /> : <Navigate to="/login" replace />}><Route index element={user && <Dashboard user={user} />} /><Route path="requests/new" element={<NewRequest />} /><Route path="requests/:id/edit" element={<Editor />} /><Route path="requests/:id" element={<RequestDetail />} /><Route path="messages" element={<Messages />} /><Route path="*" element={<div><h1>Страница не найдена</h1><p>Возможно, ссылка устарела.</p><Link to="/">Вернуться к заявкам</Link></div>} /></Route></Routes></>;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main style={{ padding: 40 }}><h1>Не удалось открыть страницу</h1><p>Попробуйте перезагрузить приложение. Сохранённые заявки останутся в вашем аккаунте.</p><button onClick={() => window.location.reload()}>Перезагрузить</button></main> : this.props.children; }
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><QueryClientProvider client={queryClient}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></ErrorBoundary></React.StrictMode>);
