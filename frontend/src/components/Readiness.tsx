import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { readinessLabels } from '../api/readiness';
import type { NeedRequest, ReadinessCriterion, ReadinessRating } from '../api/types';
import { ErrorNotice } from './ui';
import s from '../styles/App.module.css';

export function ReadinessBadge({ rating }: { rating?: ReadinessRating }) {
  if (!rating) return null;
  return <span className={`${s.readinessBadge} ${rating.level === 'PRIORITY' ? s.readinessPriority : rating.level === 'READY' ? s.readinessReady : ''}`}>
    {rating.score}/100 · {readinessLabels[rating.level]}
  </span>;
}

export function ReadinessPanel({ request, editable = false, unsaved = false }: { request: Pick<NeedRequest, 'id' | 'status' | 'revision' | 'readiness'>; editable?: boolean; unsaved?: boolean }) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (criteria: ReadinessCriterion[]) => api.confirmReadiness(request.id, request.revision!, criteria),
    onSuccess: result => { client.setQueryData(['request', request.id], result); void client.invalidateQueries({ queryKey: ['requests'] }); void client.invalidateQueries({ queryKey: ['catalog'] }); },
    onError: () => { void client.invalidateQueries({ queryKey: ['request', request.id] }); },
  });
  if (!request.readiness) return null;
  const rating = request.readiness;
  const canConfirm = editable && request.status !== 'selected' && request.revision !== undefined;
  function toggle(criterion: ReadinessCriterion, checked: boolean) {
    const selected = rating.criteria.filter(item => item.confirmed && item.criterion !== criterion).map(item => item.criterion);
    mutation.mutate(checked ? [...selected, criterion] : selected);
  }
  return <section className={s.readinessPanel} aria-label="Рейтинг готовности задачи">
    <div className={s.readinessHeading}><h2>Готовность к работе</h2><ReadinessBadge rating={rating} /></div>
    <p>Баллы показывают, насколько можно начать работу без уточнений. Низкий рейтинг не скрывает опубликованную задачу и не мешает откликам.</p>
    <progress value={rating.score} max={100} aria-label="Баллы готовности" />
    {canConfirm && <p>Подтвердите, что сохранённые сведения соответствуют каждому условию. За одно заполнение баллы не начисляются.</p>}
    {unsaved && <p className={s.readinessHint} role="status">Сохраните изменения, затем подтвердите обновлённые сведения. Сейчас показан рейтинг сохранённой карточки.</p>}
    <ul className={s.readinessList}>{rating.criteria.map(item => <li key={item.criterion}>
      <label className={s.readinessCriterion}>
        {canConfirm && <input type="checkbox" aria-label={`Подтвердить: ${item.label}`} checked={item.confirmed} disabled={!item.filled || unsaved || mutation.isPending} onChange={event => toggle(item.criterion, event.target.checked)} />}
        <span><strong>{item.label}</strong><span>{item.description}</span><small>{item.confirmed ? 'Подтверждено владельцем' : item.filled ? 'Ожидает подтверждения' : 'Нужно дополнить сведения'}</small></span>
        <b>{item.points}/{item.weight}</b>
      </label>
    </li>)}</ul>
    <ErrorNotice error={mutation.error} />
    {mutation.isPending && <p role="status">Сохраняем подтверждение…</p>}
  </section>;
}
