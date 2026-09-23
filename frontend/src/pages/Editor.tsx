import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, FileText, Lightbulb, MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { api, isDemo } from '../api';
import type { NeedCard, NeedRequest, User } from '../api/types';
import { Avatar, Button, ErrorNotice, Loading, Status } from '../components/ui';
import { NeedPreview } from '../components/NeedPreview';
import s from '../styles/App.module.css';

function stored<T>(key: string, fallback: T): T {
  try { const value = sessionStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function stash(key: string, value: unknown) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Server saves still work when browser storage is unavailable. */ } }
function forget(key: string) { try { sessionStorage.removeItem(key); } catch { /* Storage may be disabled. */ } }

export function NewRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const user = client.getQueryData<User>(['me']);
  const storageKey = `yasno-new-${user?.id}`;
  const [initialText, setInitialText] = useState<string>(() => (location.state as { initialText?: string } | null)?.initialText || stored(storageKey, ''));
  const [clientId] = useState(() => crypto.randomUUID());
  useEffect(() => { stash(storageKey, initialText); }, [initialText, storageKey]);
  const create = useMutation({ mutationFn: () => api.createDraft(initialText, clientId), onSuccess: request => { forget(storageKey); client.setQueryData(['request', request.id], request); void client.invalidateQueries({ queryKey: ['requests'] }); navigate(`/requests/${request.id}/edit`, { replace: true }); } });
  const examples = ['Нужен фирменный стиль для новой кофейни', 'Хочу сделать гостиную уютнее без большого ремонта', 'Ищу преподавателя английского для путешествий'];
  return <div className={s.newRequest}><Link to="/" className={s.backLink}><ArrowLeft size={16} />Мои потребности</Link><div className={s.newHeading}><span className={s.largeSpark}><Sparkles size={27} /></span><span className={s.sectionEyebrow}>ШАГ 1 · ВАША ИДЕЯ</span><h1>Что вы хотите сделать?</h1><p>Расскажите своими словами. Даже если пока<br />не знаете, с чего начать — это нормально.</p></div><form className={s.newForm} onSubmit={event => { event.preventDefault(); create.mutate(); }}><label htmlFor="initial-description">Ваша потребность</label><textarea id="initial-description" placeholder="Например: открываю кофейню и хочу, чтобы у неё был свой узнаваемый стиль…" rows={5} minLength={10} maxLength={2000} required value={initialText} onChange={event => setInitialText(event.target.value)} /><div className={s.newFormBottom}><span>{initialText.length} / 2000</span><Button type="submit" busy={create.isPending} disabled={initialText.trim().length < 10}>Уточнить с ИИ<Sparkles size={17} /></Button></div><ErrorNotice error={create.error} /></form><div className={s.examples}><span><Lightbulb size={15} />Можно начать так</span>{examples.map(example => <button key={example} onClick={() => setInitialText(example)}>{example}<ArrowRight size={15} /></button>)}</div><p className={s.privacyNote}><ShieldCheck size={15} />Заявка появится у исполнителей только после вашей проверки.</p></div>;
}

export function Editor() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['request', id], queryFn: () => api.getRequest(id) });
  if (query.isPending) return <Loading text="Открываем черновик…" />;
  if (query.error) return <ErrorNotice error={query.error} retry={() => void query.refetch()} />;
  if (query.data.status !== 'draft') return <Navigate to={`/requests/${id}`} replace />;
  return <EditorContent key={id} request={query.data} />;
}

function EditorContent({ request }: { request: NeedRequest }) {
  const client = useQueryClient();
  const user = client.getQueryData<User>(['me']);
  const storageKey = `yasno-answer-${request.ownerId}-${request.id}`;
  const [answer, setAnswer] = useState(() => stored(storageKey, ''));
  const [tab, setTab] = useState<'chat' | 'card'>('chat');
  const [showHistory, setShowHistory] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const operation = useRef({ key: '', id: '' });
  useEffect(() => { stash(storageKey, answer); }, [answer, storageKey]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [request.messages.length]);
  const clarify = useMutation({ mutationFn: (skip: boolean) => {
    const key = `${request.clarificationStep}:${skip}:${answer}`;
    if (operation.current.key !== key) operation.current = { key, id: crypto.randomUUID() };
    return api.clarify(request.id, { text: answer, skip, clientId: operation.current.id });
  }, onSuccess: result => { client.setQueryData(['request', request.id], result); void client.invalidateQueries({ queryKey: ['requests'] }); setAnswer(''); forget(storageKey); } });
  const reviewing = request.readyForReview && !showHistory;
  const filled = Object.values(request.card).filter(Boolean).length;
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (answer.trim() && !clarify.isPending) clarify.mutate(false); } };
  return <>
    <Link to="/" className={s.backLink}><ArrowLeft size={16} />Мои потребности</Link>
    <div className={s.editorHeading}><div><span className={s.sectionEyebrow}>{reviewing ? 'ШАГ 3 · ПОСЛЕДНИЙ ВЗГЛЯД' : 'ШАГ 2 · ДОБАВИМ ЯСНОСТИ'}</span><h1>{reviewing ? 'Всё верно? Можно публиковать' : 'Давайте разберёмся в деталях'}</h1><p>{reviewing ? 'Проверьте карточку: именно её увидят исполнители.' : 'Несколько уточнений — и ваша идея станет понятной задачей.'}</p></div><Status status="draft" /></div>
    {reviewing ? <Review request={request} onHistory={() => setShowHistory(true)} /> : <>
      <div className={s.mobileEditorTabs}><button className={tab === 'chat' ? s.tabActive : ''} onClick={() => setTab('chat')}><MessageSquare size={16} />Диалог с ИИ</button><button className={tab === 'card' ? s.tabActive : ''} onClick={() => setTab('card')}><FileText size={16} />Карточка · {filled}/9</button></div>
      <div className={s.editorGrid}><section className={`${s.aiPanel} ${tab !== 'chat' ? s.mobileHidden : ''}`}><div className={s.aiPanelHeader}><span className={s.aiAvatar}><Sparkles size={21} /></span><div><h2>Помощник Ясно</h2><span>{isDemo ? 'Демонстрационный диалог' : 'Поможет сформулировать задачу'}</span></div><span className={s.assistantOnline}>На связи</span></div><div className={s.aiMessages} aria-live="polite">{request.messages.map(message => <div key={message.id} className={`${s.aiMessage} ${message.role === 'user' ? s.aiMessageUser : ''}`}>{message.role === 'assistant' ? <span className={s.smallAi}><Sparkles size={15} /></span> : <Avatar name={user?.name || 'Вы'} size="small" />}<div><span className={s.messageAuthor}>{message.role === 'assistant' ? 'Помощник Ясно' : 'Вы'}</span><p>{message.text}</p></div></div>)}{clarify.isPending && <div className={s.typing} role="status"><i /><i /><i /><span>Собираем детали…</span></div>}<div ref={end} /></div><ErrorNotice error={clarify.error} />{request.readyForReview ? <div className={s.aiComposer}><Button onClick={() => setShowHistory(false)}>Проверить карточку<ArrowRight size={17} /></Button></div> : <form className={s.aiComposer} onSubmit={event => { event.preventDefault(); if (answer.trim()) clarify.mutate(false); }}><label htmlFor="ai-answer" className={s.srOnly}>Ответ помощнику</label><div className={s.composerInput}><textarea id="ai-answer" value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={onKeyDown} placeholder="Напишите, как вы это видите…" rows={2} maxLength={2000} disabled={clarify.isPending} /><button type="submit" aria-label="Отправить ответ" disabled={!answer.trim() || clarify.isPending}><Send size={18} /></button></div><div className={s.composerFooter}><span>Enter — отправить · Shift + Enter — новая строка</span><button type="button" disabled={clarify.isPending} onClick={() => clarify.mutate(true)}>Пока не знаю, пропустить</button></div></form>}</section><aside className={`${s.previewPanel} ${tab !== 'card' ? s.mobileHidden : ''}`}><div className={s.previewProgress}><span>Карточка обретает форму</span><strong>{filled}/9</strong><div><span style={{ width: `${filled / 9 * 100}%` }} /></div></div><NeedPreview card={request.card} drafting /><div className={s.savedNote}><Check size={14} />Ответы сохраняются автоматически</div></aside></div>
    </>}
  </>;
}

const fields: { key: keyof NeedCard; label: string; placeholder: string; required?: boolean; multiline?: boolean }[] = [
  { key: 'title', label: 'Название задачи', placeholder: 'Кратко и по делу', required: true },
  { key: 'description', label: 'Описание потребности', placeholder: 'Что нужно сделать и почему это важно', required: true, multiline: true },
  { key: 'outcome', label: 'Ожидаемый результат', placeholder: 'Что вы хотите получить в итоге', required: true, multiline: true },
  { key: 'category', label: 'Категория', placeholder: 'Например, дизайн' },
  { key: 'budget', label: 'Бюджет', placeholder: 'Сумма и валюта или «Обсудим»' },
  { key: 'deadline', label: 'Сроки', placeholder: 'Когда нужен результат' },
  { key: 'format', label: 'Формат работы', placeholder: 'Удалённо, очно или любой' },
  { key: 'location', label: 'Место выполнения', placeholder: 'Город или адрес, если важен' },
  { key: 'requirements', label: 'Дополнительные пожелания', placeholder: 'Ограничения, предпочтения и другие детали', multiline: true },
];
function Review({ request, onHistory }: { request: NeedRequest; onHistory: () => void }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const storageKey = `yasno-review-${request.ownerId}-${request.id}`;
  const [card, setCard] = useState<NeedCard>(() => ({ ...request.card, ...stored<Partial<NeedCard>>(storageKey, {}) }));
  const [saved, setSaved] = useState(false);
  useEffect(() => { stash(storageKey, card); }, [card, storageKey]);
  const save = useMutation({ mutationFn: () => api.updateDraft(request.id, card), onSuccess: result => { client.setQueryData(['request', request.id], result); void client.invalidateQueries({ queryKey: ['requests'] }); setSaved(true); forget(storageKey); } });
  const publish = useMutation({ mutationKey: ['publish', request.id], mutationFn: async () => { await api.updateDraft(request.id, card); return api.publish(request.id); }, onSuccess: result => { forget(storageKey); client.setQueryData(['request', request.id], result); void client.invalidateQueries({ queryKey: ['requests'] }); navigate(`/requests/${request.id}`, { replace: true, state: { published: true } }); } });
  function submit(event: FormEvent) { event.preventDefault(); if (!save.isPending && !publish.isPending) publish.mutate(); }
  return <div className={s.reviewGrid}><form className={s.reviewForm} onSubmit={submit}><div className={s.panelTitle}><FileCheck2 size={20} /><h2>Карточка потребности</h2><span>* Обязательные поля</span></div><div className={s.fieldsGrid}>{fields.map(field => <label key={field.key} className={field.multiline || field.key === 'title' ? s.fieldFull : ''}>{field.label}{field.required && <span className={s.required}> *</span>}{field.multiline ? <textarea rows={3} required={field.required} maxLength={4000} placeholder={field.placeholder} value={card[field.key]} onChange={event => { setSaved(false); setCard({ ...card, [field.key]: event.target.value }); }} /> : <input required={field.required} maxLength={field.key === 'title' ? 120 : 250} placeholder={field.placeholder} value={card[field.key]} onChange={event => { setSaved(false); setCard({ ...card, [field.key]: event.target.value }); }} />}</label>)}</div><ErrorNotice error={save.error || publish.error} />{saved && <p className={s.successText} role="status"><CheckCircle2 size={16} />Черновик сохранён</p>}<div className={s.reviewActions}><Button type="button" variant="secondary" busy={save.isPending} disabled={publish.isPending} onClick={() => save.mutate()}>Сохранить черновик</Button><Button type="submit" busy={publish.isPending} disabled={save.isPending || !card.title.trim() || !card.description.trim() || !card.outcome.trim()}>Опубликовать заявку<ArrowRight size={17} /></Button></div></form><aside className={s.reviewAside}><div className={s.reviewAdvice}><span className={s.largeSpark}><Sparkles size={23} /></span><h3>Хорошая задача —<br />половина решения</h3><p>Чем понятнее ожидаемый результат, тем точнее будут предложения.</p><ul><li><Check size={15} />Проверьте важные детали</li><li><Check size={15} />Укажите комфортные сроки</li><li><Check size={15} />Оставьте место для идей</li></ul><p className={s.reviewWarning}>После публикации изменить карточку нельзя. Вы сможете обсудить детали в чатах с исполнителями.</p></div><Button variant="ghost" onClick={onHistory}><MessageSquare size={16} />Посмотреть диалог с ИИ</Button></aside></div>;
}
