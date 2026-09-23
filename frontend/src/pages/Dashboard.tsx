import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownUp, ArrowRight, ChevronRight, Clock3, FileText, MessageSquare, Palette, Plus, Search, Sparkles, Wallet, Wrench, GraduationCap, Code2 } from 'lucide-react';
import { ReadinessBadge } from '../components/Readiness';
import { api } from '../api';
import type { NeedRequest, RequestStatus, User } from '../api/types';
import { Button, EmptyState, ErrorNotice, formatDate, Loading, Status } from '../components/ui';
import { SearchBanner } from '../components/SearchBanner';
import s from '../styles/App.module.css';

const filters: { label: string; value: 'all' | RequestStatus }[] = [{ label: 'Все заявки', value: 'all' }, { label: 'Опубликованы', value: 'published' }, { label: 'Черновики', value: 'draft' }, { label: 'Исполнитель выбран', value: 'selected' }];
export function CategoryIcon({ category }: { category: string }) {
  const Icon = /дизайн/i.test(category) ? Palette : /ремонт|дом/i.test(category) ? Wrench : /обуч|язык/i.test(category) ? GraduationCap : /разработ|сайт/i.test(category) ? Code2 : FileText;
  return <Icon size={22} strokeWidth={1.65} />;
}
export function RequestCard({ request, to }: { request: Pick<NeedRequest, 'id' | 'status' | 'card' | 'offerCount' | 'createdAt' | 'readiness'>; to?: string }) {
  return <Link className={`${s.requestCard} ${request.readiness?.level === 'PRIORITY' ? s.priorityCard : ''}`} to={to || `/requests/${request.id}${request.status === 'draft' ? '/edit' : ''}`}><div className={s.requestCardTop}><span className={`${s.categoryIcon} ${request.status === 'draft' ? s.categoryMuted : ''}`}><CategoryIcon category={request.card.category} /></span><Status status={request.status} /></div><span className={s.cardCategory}>{request.card.category || 'Категория не указана'}</span><h3>{request.card.title || 'Новая заявка'}</h3><ReadinessBadge rating={request.readiness} /><p className={s.cardDescription}>{request.card.description}</p><div className={s.cardMeta}><span><Wallet size={14} />{request.card.budget || 'Бюджет не указан'}</span><span><Clock3 size={14} />{request.card.deadline || 'Срок не указан'}</span></div><div className={s.cardBottom}><span className={request.status === 'draft' ? s.muted : s.offerCount}>{request.status === 'draft' ? <><FileText size={14} />Продолжить заполнение</> : <><MessageSquare size={14} />{request.offerCount} {request.offerCount === 1 ? 'предложение' : request.offerCount >= 2 && request.offerCount <= 4 ? 'предложения' : 'предложений'}</>}</span><span className={s.cardDate}>{formatDate(request.createdAt)}</span><ArrowRight size={16} /></div></Link>;
}
export function Dashboard({ user }: { user: User }) {
  const [filter, setFilter] = useState<'all' | RequestStatus>('all');
  const [search, setSearch] = useState('');
  const [oldest, setOldest] = useState(false);
  const query = useQuery({ queryKey: ['requests'], queryFn: api.listRequests });
  const requests = query.data || [];
  const filtered = requests.filter(request => (filter === 'all' || request.status === filter) && `${request.card.title} ${request.card.description}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => oldest ? a.updatedAt.localeCompare(b.updatedAt) : b.updatedAt.localeCompare(a.updatedAt));
  return <>
    <div className={s.pageHeading}><div><div className={s.greeting}>ХОРОШИЙ ДЕНЬ ДЛЯ НОВЫХ ИДЕЙ</div><h1>{user.name.split(' ')[0]}, всё получится<span className={s.headingSpark}>✳</span></h1><p>Расскажите, что вам нужно. Вместе найдём решение.</p></div><span className={s.today}>{new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(new Date())}</span></div>
    <SearchBanner />
    <section className={s.requestsSection}><div className={s.sectionHeading}><div><h2>Мои потребности <span>{requests.length}</span></h2><p>Ваши идеи, задачи и будущие решения.</p></div><Link to="/requests/new" className={`${s.button} ${s.secondary}`}><Plus size={17} />Новая заявка</Link></div>
      <div className={s.listTools}><div className={s.tabs} role="tablist" aria-label="Статус заявок">{filters.map(item => <button key={item.value} role="tab" aria-selected={filter === item.value} className={filter === item.value ? s.tabActive : ''} onClick={() => setFilter(item.value)}>{item.label}<span>{requests.filter(request => item.value === 'all' || request.status === item.value).length}</span></button>)}</div><div className={s.searchTools}><div className={s.searchInput}><Search size={16} /><input aria-label="Поиск заявок" placeholder="Найти заявку" value={search} onChange={event => setSearch(event.target.value)} /></div><button className={s.iconButton} aria-label={oldest ? 'Показать сначала новые' : 'Показать сначала старые'} title={oldest ? 'Сначала старые' : 'Сначала новые'} onClick={() => setOldest(!oldest)}><ArrowDownUp size={17} /></button></div></div>
      {query.isPending ? <Loading /> : query.error ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : filtered.length ? <div className={s.requestGrid}>{filtered.map(request => <RequestCard key={request.id} request={request} />)}</div> : <EmptyState icon={<FileText size={26} />} title={requests.length ? 'Ничего не нашлось' : 'Здесь начнётся ваша история'} text={requests.length ? 'Попробуйте другой запрос или статус заявки.' : 'Опишите первую потребность — поможем превратить её в понятную задачу.'} action={requests.length ? <Button variant="secondary" onClick={() => { setFilter('all'); setSearch(''); }}>Сбросить фильтры</Button> : <Link to="/requests/new" className={`${s.button} ${s.primary}`}><Plus size={17} />Описать потребность</Link>} />}
    </section>
    <div className={s.bottomNote}><span><Sparkles size={18} /></span><p><strong>Не обязательно знать все ответы.</strong> Начните с того, что есть, — поможем разобраться по ходу.</p><Link to="/requests/new" aria-label="Создать первую заявку"><ChevronRight size={20} /></Link></div>
  </>;
}
