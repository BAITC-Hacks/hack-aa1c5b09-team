import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { api } from '../api';
import { Avatar, EmptyState, ErrorNotice, Loading } from '../components/ui';
import s from '../styles/App.module.css';

export function Messages() {
  const requests = useQuery({ queryKey: ['requests'], queryFn: api.listRequests });
  const published = requests.data?.filter(request => request.status !== 'draft') || [];
  const offers = useQueries({ queries: published.map(request => ({ queryKey: ['offers', request.id], queryFn: () => api.getOffers(request.id) })) });
  const loading = requests.isPending || offers.some(query => query.isPending);
  const error = requests.error || offers.find(query => query.error)?.error;
  const conversations = offers.flatMap((query, index) => (query.data || []).map(offer => ({ offer, request: published[index] })));
  return <><div className={s.pageHeading}><div><span className={s.sectionEyebrow}>ОТ ДИАЛОГА К РЕШЕНИЮ</span><h1>Сообщения</h1><p>Обсуждайте предложения, уточняйте детали, находите общий язык.</p></div></div>{loading ? <Loading text="Собираем ваши диалоги…" /> : error ? <ErrorNotice error={error} retry={() => { void requests.refetch(); offers.forEach(query => void query.refetch()); }} /> : !conversations.length ? <EmptyState icon={<MessageSquare size={27} />} title="Всё начинается с разговора" text="Когда у вашей заявки появятся предложения, здесь будут чаты с исполнителями." action={<Link to="/" className={`${s.button} ${s.primary}`}>Перейти к заявкам<ArrowRight size={17} /></Link>} /> : <div className={s.conversations}>{conversations.map(({ offer, request }) => <Link key={offer.id} className={s.conversation} to={`/requests/${request.id}?offer=${offer.id}`}><Avatar name={offer.name} color={offer.color} size="large" /><div><div><h3>{offer.name}</h3>{request.selectedOfferId === offer.id && <span className={s.chosenLabel}>Ваш исполнитель</span>}</div><p>{request.card.title}</p><span>{request.status === 'selected' && request.selectedOfferId !== offer.id ? 'Только для чтения' : 'Обсудить предложение'}</span></div><ArrowRight size={19} /></Link>)}</div>}</>;
}
