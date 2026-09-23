import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, MessageSquare } from 'lucide-react';
import { api } from '../api';
import { offerStatusLabels } from '../api/types';
import type { OfferStatus } from '../api/types';
import { Button, EmptyState, ErrorNotice, Loading } from '../components/ui';
import { OfferSummary, ProposalStatus } from '../components/OfferSummary';
import s from '../styles/App.module.css';

export function MyOffers() {
  const [filter, setFilter] = useState<'all' | OfferStatus>('all');
  const query = useQuery({ queryKey: ['my-offers'], queryFn: api.listMyOffers, refetchInterval: 5000, refetchIntervalInBackground: false });
  const proposals = query.data || [];
  const filtered = proposals.filter(proposal => filter === 'all' || proposal.status === filter);
  const filters: { value: 'all' | OfferStatus; label: string }[] = [{ value: 'all', label: 'Все предложения' }, ...Object.entries(offerStatusLabels).map(([value, label]) => ({ value: value as OfferStatus, label }))];
  return <>
    <div className={s.pageHeading}><div><span className={s.sectionEyebrow}>РЕШЕНИЯ, КОТОРЫЕ ВЫ ПРЕДЛОЖИЛИ</span><h1>Мои предложения</h1><p>Следите за ответами заказчиков и продолжайте обсуждение в чатах.</p></div><Link to="/catalog" className={`${s.button} ${s.secondary}`}>Найти задачу<ArrowRight size={16} /></Link></div>
    <div className={`${s.tabs} ${s.proposalTabs}`} role="tablist" aria-label="Статус предложений">{filters.map(({ value, label }) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? s.tabActive : ''} onClick={() => setFilter(value)}>{label}<span>{proposals.filter(proposal => value === 'all' || proposal.status === value).length}</span></button>)}</div>
    {query.isPending ? <Loading text="Загружаем ваши предложения…" /> : query.error ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : filtered.length ? <div className={s.myOffersGrid}>{filtered.map(({ offer, request, status }) => <article className={`${s.offerCard} ${status === 'accepted' ? s.offerSelected : ''}`} key={offer.id}><div className={s.myOfferTop}><span>{request.card.category || 'Потребность'}</span><ProposalStatus status={status} /></div><Link to={`/catalog/${request.id}`} className={s.myOfferTitle}><h2>{request.card.title}</h2></Link><p className={s.myOfferOwner}>Заказчик: {request.ownerName}</p><OfferSummary offer={offer} /><div className={s.proposalActions}><Link to={`/catalog/${request.id}`}>Открыть потребность<ArrowRight size={14} /></Link><Link to={`/catalog/${request.id}?chat=1`} className={`${s.button} ${s.secondary}`}><MessageSquare size={16} />Переписка</Link></div></article>)}</div> : <EmptyState icon={<ClipboardList size={27} />} title={proposals.length ? 'Предложений с таким статусом пока нет' : 'Ваше первое решение ещё впереди'} text={proposals.length ? 'Выберите другой статус, чтобы увидеть свои предложения.' : 'Найдите подходящую потребность в каталоге и расскажите, как можете помочь.'} action={proposals.length ? <Button variant="secondary" onClick={() => setFilter('all')}>Показать все</Button> : <Link to="/catalog" className={`${s.button} ${s.primary}`}>Перейти в каталог<ArrowRight size={17} /></Link>} />}
  </>;
}
