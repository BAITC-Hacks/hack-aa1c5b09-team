import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, FileText, MessageSquare, Sparkles, Star } from 'lucide-react';
import { api, isDemo } from '../api';
import type { NeedRequest, Offer } from '../api/types';
import { Avatar, Button, EmptyState, ErrorNotice, formatDate, Loading, Modal, Status } from '../components/ui';
import { NeedPreview } from '../components/NeedPreview';
import { ChatPanel } from '../components/ChatPanel';
import { OfferSummary } from '../components/OfferSummary';
import s from '../styles/App.module.css';

export function RequestDetail() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['request', id], queryFn: () => api.getRequest(id), refetchInterval: 15000, refetchIntervalInBackground: false });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} retry={() => void query.refetch()} />;
  if (query.data.status === 'draft') return <Navigate to={`/requests/${id}/edit`} replace />;
  return <DetailContent key={id} request={query.data} />;
}

function DetailContent({ request }: { request: NeedRequest }) {
  const [params, setParams] = useSearchParams();
  const [confirm, setConfirm] = useState<Offer | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const notice = request.status === 'published' && !noticeDismissed;
  const client = useQueryClient();
  const offers = useQuery({ queryKey: ['offers', request.id], queryFn: () => api.getOffers(request.id), refetchInterval: 15000, refetchIntervalInBackground: false });
  const selectedChat = offers.data?.find(offer => offer.id === params.get('offer'));
  const select = useMutation({ mutationFn: (offerId: string) => api.selectOffer(request.id, offerId), onSuccess: updated => { client.setQueryData(['request', request.id], updated); for (const queryKey of [['requests'], ['catalog'], ['my-offers']]) void client.invalidateQueries({ queryKey }); setConfirm(null); setParams({ offer: updated.selectedOfferId! }, { replace: true }); } });
  return <>
    <Link to="/" className={s.backLink}><ArrowLeft size={16} />Мои потребности</Link>
    {notice && <div className={s.successBanner} role="status"><CheckCircle2 size={21} /><div><strong>Ваша заявка опубликована!</strong><span>{isDemo ? 'Потребность доступна в каталоге. Здесь могут быть и демонстрационные отклики, и предложения пользователей.' : 'Теперь исполнители смогут предложить свои решения.'}</span></div><button onClick={() => setNoticeDismissed(true)} aria-label="Скрыть уведомление">×</button></div>}
    <div className={s.detailHeading}><div><div className={s.detailMeta}><Status status={request.status} /><span>Создана {formatDate(request.createdAt)}</span></div><h1>{request.card.title}</h1><p>Обсудите детали и выберите решение, которое подходит именно вам.</p></div></div>
    <details className={s.requestDetails}><summary><span><FileText size={19} />Карточка потребности</span><span>Посмотреть детали<ArrowRight size={16} /></span></summary><NeedPreview card={request.card} /></details>
    {request.status === 'selected' && <div className={s.selectionBanner}><BadgeCheck size={23} /><div><strong>Исполнитель выбран. Следующий шаг — за вами.</strong><p>Продолжайте обсуждение в чате с выбранным исполнителем. Остальные переписки сохранены для чтения.</p></div></div>}
    <div className={s.sectionHeading}><div><h2>Предложения <span>{offers.data?.length ?? request.offerCount}</span></h2><p>{request.status === 'selected' ? 'Вы нашли своё решение.' : 'Разные подходы к одной задаче. Выбор за вами.'}</p></div>{isDemo && offers.data?.some(offer => !offer.providerId) && <span className={s.smallDemo}><Sparkles size={13} />Есть демонстрационные отклики</span>}</div>
    <div className={`${s.offersLayout} ${selectedChat ? s.offersWithChat : ''}`}><div className={s.offersList}>{offers.isPending ? <Loading text="Загружаем предложения…" /> : offers.error ? <ErrorNotice error={offers.error} retry={() => void offers.refetch()} /> : !offers.data.length ? <EmptyState icon={<MessageSquare size={26} />} title="Ваша задача ждёт своего человека" text="Новые предложения появятся здесь. Можно вернуться чуть позже." /> : offers.data.map(offer => <article className={`${s.offerCard} ${request.selectedOfferId === offer.id ? s.offerSelected : ''}`} key={offer.id}><div className={s.offerTop}><Link to={`/providers/${offer.providerId || offer.id}`} className={s.offerProfileLink} aria-label={`Профиль исполнителя ${offer.name}`}><Avatar name={offer.name} color={offer.color} size="large" /></Link><div><h3><Link to={`/providers/${offer.providerId || offer.id}`} className={s.offerProfileLink}>{offer.name}</Link>{request.selectedOfferId === offer.id && <BadgeCheck size={17} />}</h3><span>{offer.specialty}</span></div>{offer.reviews > 0 ? <div className={s.rating}><Star size={13} fill="currentColor" /><strong>{offer.rating.toFixed(1)}</strong><span>({offer.reviews})</span></div> : <span className={s.newProvider}>Новый участник</span>}</div><OfferSummary offer={offer} /><div className={s.offerActions}><Link to={`/providers/${offer.providerId || offer.id}`} className={s.providerAction}>Профиль исполнителя</Link><Button variant="secondary" onClick={() => setParams({ offer: offer.id }, { replace: true })}><MessageSquare size={16} />Обсудить</Button>{request.status === 'published' && <Button onClick={() => { select.reset(); setConfirm(offer); }}>Выбрать исполнителя<ArrowRight size={16} /></Button>}{request.selectedOfferId === offer.id && <span className={s.chosenLabel}><Check size={15} />Ваш выбор</span>}</div></article>)}</div>{selectedChat && <ChatPanel key={selectedChat.id} request={request} offer={selectedChat} onClose={() => setParams({}, { replace: true })} />}</div>
    {confirm && <Modal title="Выбрать этого исполнителя?" onClose={() => { if (!select.isPending) setConfirm(null); }}><div className={s.confirmProvider}><Avatar name={confirm.name} color={confirm.color} size="large" /><div><h3>{confirm.name}</h3><p>{confirm.price} · {confirm.duration}</p></div></div><p className={s.modalText}>Вы выбираете предложение для заявки «{request.card.title}». После подтверждения сменить исполнителя в этой версии нельзя. Чаты с остальными исполнителями станут доступны только для чтения.</p><ErrorNotice error={select.error} /><div className={s.modalActions}><Button variant="secondary" onClick={() => setConfirm(null)} disabled={select.isPending}>Ещё подумаю</Button><Button busy={select.isPending} onClick={() => select.mutate(confirm.id)}>Подтвердить выбор<Check size={17} /></Button></div></Modal>}
  </>;
}
