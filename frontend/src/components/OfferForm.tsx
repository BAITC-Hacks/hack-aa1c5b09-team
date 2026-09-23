import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import type { CatalogDetail, OfferInput, User } from '../api/types';
import { Button, ErrorNotice } from './ui';
import s from '../styles/App.module.css';

const blank: OfferInput = { description: '', method: '', price: '', duration: '' };

export function OfferForm({ requestId }: { requestId: string }) {
  const client = useQueryClient();
  const user = client.getQueryData<User>(['me'])!;
  const storageKey = `yasno-proposal-${user.id}-${requestId}`;
  const [values, setValues] = useState<OfferInput>(() => {
    try { return { ...blank, ...JSON.parse(sessionStorage.getItem(storageKey) || '{}') }; } catch { return { ...blank }; }
  });
  const operation = useRef({ payload: '', id: '' });
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(values)); } catch { /* Preserve the form in memory. */ } }, [storageKey, values]);
  const send = useMutation({
    mutationFn: () => {
      const payload = JSON.stringify(values);
      if (operation.current.payload !== payload) operation.current = { payload, id: crypto.randomUUID() };
      return api.createOffer(requestId, values, operation.current.id);
    },
    onSuccess: offer => {
      try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
      client.setQueryData<CatalogDetail>(['catalog', requestId], previous => previous && ({
        ...previous, myOffer: offer,
        request: { ...previous.request, offerCount: previous.request.offerCount + (previous.myOffer ? 0 : 1) },
      }));
      for (const queryKey of [['catalog'], ['my-offers'], ['requests'], ['offers', requestId]]) void client.invalidateQueries({ queryKey });
    },
    // Recover if the server accepted an offer but its response was lost.
    onError: () => { void client.invalidateQueries({ queryKey: ['catalog', requestId] }); },
  });
  const valid = values.description.trim().length >= 10 && values.method.trim().length >= 10 && values.price.trim() && values.duration.trim();
  const update = (field: keyof OfferInput, value: string) => setValues(previous => ({ ...previous, [field]: value }));
  return <form className={s.proposalForm} onSubmit={event => { event.preventDefault(); if (valid && !send.isPending) send.mutate(); }}>
    <div className={s.proposalFormHeading}><span className={s.sectionEyebrow}>ВАШ ПОДХОД К ЗАДАЧЕ</span><h2>Предложить решение</h2><p>Расскажите, что вы сделаете и как придёте к результату.</p></div>
    <fieldset disabled={send.isPending} className={s.proposalFields}>
      <label>Описание решения <span className={s.required}>*</span><textarea required minLength={10} maxLength={4000} rows={4} placeholder="Что получит заказчик в результате?" value={values.description} onChange={event => update('description', event.target.value)} /></label>
      <label>Способ реализации <span className={s.required}>*</span><textarea required minLength={10} maxLength={4000} rows={4} placeholder="Опишите этапы, инструменты и подход к работе" value={values.method} onChange={event => update('method', event.target.value)} /></label>
      <div className={s.proposalTermsFields}>
        <label>Стоимость <span className={s.required}>*</span><input required maxLength={150} placeholder="Например, 80 000 ₸" value={values.price} onChange={event => update('price', event.target.value)} /></label>
        <label>Сроки выполнения <span className={s.required}>*</span><input required maxLength={150} placeholder="Например, 7 дней" value={values.duration} onChange={event => update('duration', event.target.value)} /></label>
      </div>
    </fieldset>
    <ErrorNotice error={send.error} />
    <p className={s.proposalPolicy}><ShieldCheck size={15} />Одно предложение на потребность. После отправки детали можно обсудить в чате.</p>
    <Button type="submit" className={s.fullWidth} busy={send.isPending} disabled={!valid}>Отправить предложение<ArrowRight size={17} /></Button>
  </form>;
}
