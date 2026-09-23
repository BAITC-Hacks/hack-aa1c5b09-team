import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, LockKeyhole, MessageSquare, Search, Wallet } from 'lucide-react';
import { api } from '../api';
import type { OfferStatus, PublicNeed, User } from '../api/types';
import { Avatar, Button, EmptyState, ErrorNotice, formatDate, Loading, Status } from '../components/ui';
import { ReadinessBadge, ReadinessPanel } from '../components/Readiness';
import { NeedPreview } from '../components/NeedPreview';
import { ChatPanel } from '../components/ChatPanel';
import { OfferForm } from '../components/OfferForm';
import { OfferSummary, ProposalStatus } from '../components/OfferSummary';
import s from '../styles/App.module.css';

function CatalogCard({ request }: { request: PublicNeed }) {
  const proposals = `${request.offerCount} ${request.offerCount === 1 ? 'предложение' : request.offerCount >= 2 && request.offerCount <= 4 ? 'предложения' : 'предложений'}`;
  return <Link className={`${s.catalogCard} ${request.readiness?.level === "PRIORITY" ? s.priorityCard : ""}`} to={`/catalog/${request.id}`}>
    <span className={s.catalogCardCategory}>{request.card.category || 'Категория не указана'}</span>
    <ReadinessBadge rating={request.readiness} />
    <h2>{request.card.title}</h2>
    <p>{request.card.description}</p>
    <div className={s.catalogCardDetails}>
      <span><Wallet size={15} />{request.card.budget || 'Бюджет не указан'}</span>
      <span><Clock3 size={15} />{request.card.deadline || 'Срок не указан'}</span>
    </div>
    <footer><span><MessageSquare size={14} />{proposals}</span><time dateTime={request.createdAt}>{formatDate(request.createdAt)}</time></footer>
  </Link>;
}

export function Catalog() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'recommended' | 'newest' | 'oldest'>('recommended');
  const query = useQuery({ queryKey: ['catalog'], queryFn: api.listCatalog, refetchInterval: 15000, refetchIntervalInBackground: false });
  const requests = query.data || [];
  const categories = [...new Set(requests.map(request => request.card.category).filter(Boolean))].sort();
  const filtered = requests
    .filter(request => (!category || request.card.category === category) && `${request.card.title} ${request.card.description} ${request.card.location}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : (sort === 'recommended' ? (b.readiness?.catalogPriority ?? 0) - (a.readiness?.catalogPriority ?? 0) : 0) || b.createdAt.localeCompare(a.createdAt));
  return <>
    <div className={s.pageHeading}><div><h1>Каталог потребностей</h1><p>Найдите задачу, которой можете помочь, и предложите свое решение.</p></div></div>
    <div className={s.catalogTools}>
      <div className={s.catalogSearch}><Search size={18} /><input aria-label="Поиск в каталоге" placeholder="Задачи, слово или город" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <label className={s.catalogSelect}><span className={s.srOnly}>Категория</span><select aria-label="Категория" value={category} onChange={event => setCategory(event.target.value)}><option value="">Категория</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className={s.catalogSelect}><span className={s.srOnly}>Сортировка</span><select aria-label="Сортировка" value={sort} onChange={event => setSort(event.target.value as 'recommended' | 'newest' | 'oldest')}><option value="recommended">По готовности к работе</option><option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option></select></label>
      <span className={s.resultsCount}>Найдено: {filtered.length}</span>
    </div>
    {query.isPending ? <Loading text="Находим открытые потребности…" /> : query.error ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : filtered.length ? <div className={s.catalogGrid}>{filtered.map(request => <CatalogCard key={request.id} request={request} />)}</div> : <EmptyState icon={<Search size={26} />} title={search || category ? 'Нет подходящих потребностей' : 'Пока нет открытых потребностей'} text={search || category ? 'Измените запрос или выберите другую категорию.' : 'Опубликованные потребности других пользователей появятся здесь. Свои заявки доступны в «Моих потребностях».'} action={search || category ? <Button variant="secondary" onClick={() => { setSearch(''); setCategory(''); }}>Сбросить фильтры</Button> : <Link to="/" className={`${s.button} ${s.secondary}`}>Мои потребности</Link>} />}
  </>;
}

export function CatalogDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const user = client.getQueryData<User>(['me'])!;
  const query = useQuery({ queryKey: ['catalog', id], queryFn: () => api.getCatalogRequest(id), refetchInterval: 5000, refetchIntervalInBackground: false });
  if (query.isPending) return <Loading text="Открываем потребность…" />;
  if (query.error) return <><Link to="/catalog" className={s.backLink}><ArrowLeft size={16} />В каталог</Link><ErrorNotice error={query.error} retry={() => void query.refetch()} /></>;
  const { request, myOffer } = query.data;
  if (request.ownerId === user.id) return <Navigate to={`/requests/${id}`} replace />;
  const status: OfferStatus = request.selectedOfferId === myOffer?.id && myOffer ? 'accepted' : request.status === 'selected' ? 'not_selected' : 'pending';
  const chatOpen = params.get('chat') === '1';
  return <>
    <Link to="/catalog" className={s.backLink}><ArrowLeft size={16} />В каталог</Link>
    <div className={s.detailHeading}><div className={s.detailMeta}><Status status={request.status} /><span>Создана {formatDate(request.createdAt)}</span></div><h1>{request.card.title}</h1><div className={s.ownerLine}><Avatar name={request.ownerName} size="small" /><span>Заказчик: <strong>{request.ownerName}</strong></span></div></div>
    <div className={s.catalogDetailGrid}>
      <section className={s.previewPanel} aria-label="Опубликованная потребность"><NeedPreview card={request.card} /><ReadinessPanel request={request} /></section>
      <div className={s.proposalColumn}>
        {myOffer ? <>
          <section className={s.submittedProposal} aria-label="Ваше предложение"><div className={s.submittedHeading}><CheckCircle2 size={21} /><h2>Предложение отправлено</h2></div><ProposalStatus status={status} /><OfferSummary offer={myOffer} />
            <div className={s.proposalActions}><Link to="/offers">Мои предложения<ArrowRight size={14} /></Link><Button variant="secondary" onClick={() => setParams({ chat: '1' }, { replace: true })}><MessageSquare size={16} />{status === 'not_selected' ? 'Открыть переписку' : 'Обсудить с заказчиком'}</Button></div>
          </section>
          {chatOpen && <ChatPanel key={`${user.id}-${myOffer.id}`} request={request} offer={myOffer} peerName={request.ownerName} onClose={() => setParams({}, { replace: true })} />}
        </> : request.status === 'published' ? <OfferForm key={`${user.id}-${id}`} requestId={id} /> : <EmptyState icon={<LockKeyhole size={26} />} title="Исполнитель уже выбран" text="Приём предложений для этой потребности завершён. В каталоге есть другие задачи." action={<Link to="/catalog" className={`${s.button} ${s.primary}`}>Найти другую потребность</Link>} />}
      </div>
    </div>
  </>;
}
