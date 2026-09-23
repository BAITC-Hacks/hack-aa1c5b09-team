import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, LockKeyhole, Send, X } from 'lucide-react';
import { api, isDemo } from '../api';
import type { NeedRequest, Offer, User } from '../api/types';
import { Avatar, ErrorNotice, Loading } from './ui';
import s from '../styles/App.module.css';

export function ChatPanel({ request, offer, peerName, onClose }: { request: Pick<NeedRequest, 'id' | 'ownerId' | 'status' | 'selectedOfferId'>; offer: Offer; peerName?: string; onClose: () => void }) {
  const client = useQueryClient();
  const user = client.getQueryData<User>(['me'])!;
  const viewerRole = request.ownerId === user.id ? 'consumer' : 'provider';
  const recipient = peerName || offer.name;
  const key = ['messages', request.id, offer.id];
  const storageKey = `yasno-message-${user.id}-${offer.id}`;
  const [text, setText] = useState(() => { try { return sessionStorage.getItem(storageKey) || ''; } catch { return ''; } });
  const operation = useRef({ text: '', id: '' });
  const end = useRef<HTMLDivElement>(null);
  const query = useQuery({ queryKey: key, queryFn: () => api.getMessages(request.id, offer.id), refetchInterval: 5000, refetchIntervalInBackground: false });
  const readonly = request.status === 'selected' && request.selectedOfferId !== offer.id;
  const send = useMutation({ mutationFn: () => {
    if (operation.current.text !== text) operation.current = { text, id: crypto.randomUUID() };
    return api.sendMessage(request.id, offer.id, text, operation.current.id);
  }, onSuccess: messages => { try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ } setText(''); operation.current = { text: '', id: '' }; client.setQueryData(key, messages); } });
  useEffect(() => { try { sessionStorage.setItem(storageKey, text); } catch { /* The message stays in memory. */ } }, [storageKey, text]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [query.data?.length]);
  return <section className={s.chatPanel} aria-label={`Чат с ${recipient}`}>
    <div className={s.chatHeader}><Avatar name={recipient} color={viewerRole === 'provider' ? 'blue' : offer.color} /><div><h3>{recipient}</h3><span>{viewerRole === 'provider' ? 'Заказчик' : request.selectedOfferId === offer.id ? 'Ваш исполнитель' : 'Обсуждение предложения'}</span></div><button className={s.iconButton} onClick={onClose} aria-label="Закрыть чат"><X size={19} /></button></div>
    {isDemo && <div className={s.chatDemo}>{offer.providerId ? 'Локальная переписка · сообщения сохраняются в этом браузере' : 'Демонстрация · ответы подготовлены заранее'}</div>}
    <div className={s.chatMessages} aria-live="polite">
      {query.isPending ? <Loading text="Загружаем переписку…" /> : <>
        {query.error && <ErrorNotice error={query.error} retry={() => void query.refetch()} />}
        {query.data?.length === 0 && <p className={s.chatEmpty}>Начните разговор: уточните детали предложения.</p>}
        {query.data?.map(message => <div key={message.id} className={`${s.chatBubble} ${message.sender === viewerRole ? s.chatBubbleOwn : ''}`}><p>{message.text}</p><span>{new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt))}{message.sender === viewerRole && <Check size={12} />}</span></div>)}
      </>}
      <div ref={end} />
    </div>
    <ErrorNotice error={send.error} />
    {readonly ? <div className={s.readonlyChat}><LockKeyhole size={16} />{viewerRole === 'consumer' ? 'Вы выбрали другого исполнителя. Чат доступен для чтения.' : 'Заказчик выбрал другого исполнителя. Чат доступен для чтения.'}</div> : <form className={s.chatComposer} onSubmit={event => { event.preventDefault(); if (text.trim() && !send.isPending) send.mutate(); }}>
      <div className={s.composerInput}><label htmlFor={`chat-${offer.id}`} className={s.srOnly}>{viewerRole === 'provider' ? 'Сообщение заказчику' : 'Сообщение исполнителю'}</label><textarea id={`chat-${offer.id}`} placeholder="Обсудите важные детали…" value={text} maxLength={4000} disabled={send.isPending} onChange={event => setText(event.target.value)} rows={2} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (text.trim() && !send.isPending) send.mutate(); } }} /><button type="submit" disabled={!text.trim() || send.isPending || query.isPending} aria-label="Отправить сообщение"><Send size={18} /></button></div><span className={s.chatComposerHint}>{send.isPending ? 'Отправляем…' : 'Enter — отправить · Shift + Enter — новая строка'}</span>
    </form>}
  </section>;
}
