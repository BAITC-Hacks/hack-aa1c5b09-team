import { Check, Clock3, Wallet } from 'lucide-react';
import { offerStatusLabels } from '../api/types';
import type { Offer, OfferStatus } from '../api/types';
import s from '../styles/App.module.css';

export function ProposalStatus({ status }: { status: OfferStatus }) {
  return <span className={`${s.status} ${status === 'accepted' ? s.published : status === 'pending' ? s.selected : s.draft}`}>
    {status === 'accepted' ? <Check size={12} /> : <i />}{offerStatusLabels[status]}
  </span>;
}

export function OfferSummary({ offer }: { offer: Offer }) {
  return <div className={s.proposalSummary}>
    <div><h3>Описание решения</h3><p>{offer.description}</p></div>
    <div><h3>Способ реализации</h3><p>{offer.method || 'Не указан'}</p></div>
    <div className={s.offerTerms}><span><Wallet size={16} /><strong>{offer.price}</strong></span><span><Clock3 size={16} />{offer.duration}</span></div>
  </div>;
}
