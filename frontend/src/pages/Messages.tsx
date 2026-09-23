import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { api } from '../api';
import { Avatar, EmptyState, ErrorNotice, Loading } from '../components/ui';
import s from '../styles/App.module.css';

export function Messages() {
  const requests = useQuery({ queryKey: ['requests'], queryFn: api.listRequests });
  const mine = useQuery({ queryKey: ['my-offers'], queryFn: api.listMyOffers, refetchInterval: 5000, refetchIntervalInBackground: false });
  const published = requests.data?.filter(request => request.status !== 'draft') || [];
  const offers = useQueries({ queries: published.map(request => ({ queryKey: ['offers', request.id], queryFn: () => api.getOffers(request.id) })) });
  const loading = requests.isPending || mine.isPending || offers.some(query => query.isPending);
  const error = requests.error || mine.error || offers.find(query => query.error)?.error;
  const conversations = [
    ...offers.flatMap((query, index) => (query.data || []).map(offer => ({ offer, request: published[index], peer: offer.name, provider: false, to: `/requests/${offer.requestId}?offer=${offer.id}` }))),
    ...(mine.data || []).map(({ offer, request }) => ({ offer, request, peer: request.ownerName, provider: true, to: `/catalog/${request.id}?chat=1` })),
  ];
  return <>
    <div className={s.pageHeading}><div><span className={s.sectionEyebrow}>ОТ ДИАЛОГА К РЕШЕНИЮ</span><h1>Сообщения</h1><p>Обсуждайте предложения с заказчиками и исполнителями.</p></div></div>
    {loading ? <Loading text="Собираем ваши диалоги…" /> : error ? <ErrorNotice error={error} retry={() => { void requests.refetch(); void mine.refetch(); offers.forEach(query => void query.refetch()); }} /> : !conversations.length ? <EmptyState icon={<MessageSquare size={27} />} title="Всё начинается с разговора" text="Чаты появятся здесь, когда вы получите отклик или отправите своё предложение." action={<Link to="/catalog" className={`${s.button} ${s.primary}`}>Перейти в каталог<ArrowRight size={17} /></Link>} /> : <div className={s.conversations}>{conversations.map(({ offer, request, peer, provider, to }) => <Link key={offer.id} className={s.conversation} to={to}><Avatar name={peer} color={provider ? 'blue' : offer.color} size="large" /><div><div><h3>{peer}</h3>{request.selectedOfferId === offer.id && <span className={s.chosenLabel}>{provider ? 'Ваше предложение принято' : 'Ваш исполнитель'}</span>}</div><p>{request.card.title}</p><span>{request.status === 'selected' && request.selectedOfferId !== offer.id ? 'Только для чтения' : provider ? 'Заказчик · обсудить предложение' : 'Исполнитель · обсудить предложение'}</span></div><ArrowRight size={19} /></Link>)}</div>}
  </>;
}
