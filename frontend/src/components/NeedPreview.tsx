import { CalendarDays, CheckCircle2, MapPin, Monitor, Sparkles, Tag, Wallet } from 'lucide-react';
import type { NeedCard } from '../api/types';
import s from '../styles/App.module.css';

export function NeedPreview({ card, drafting = false }: { card: NeedCard; drafting?: boolean }) {
  const metadata = [{ icon: Tag, label: 'Категория', value: card.category }, { icon: Wallet, label: 'Бюджет', value: card.budget }, { icon: CalendarDays, label: 'Сроки', value: card.deadline }, { icon: Monitor, label: 'Формат', value: card.format }, { icon: MapPin, label: 'Место', value: card.location }];
  return <div className={s.needPreview}>
    {drafting && <div className={s.previewEyebrow}><Sparkles size={15} />ВАША БУДУЩАЯ КАРТОЧКА</div>}
    <h2>{card.title || 'Здесь появится ваша задача'}</h2>
    <p className={s.previewDescription}>{card.description || 'Расскажите о потребности — и мы начнём собирать детали.'}</p>
    <div className={s.outcome}><h3><CheckCircle2 size={16} />Ожидаемый результат</h3><p className={!card.outcome ? s.muted : ''}>{card.outcome || 'Не указано'}</p></div>
    <dl className={s.metadata}>{metadata.map(({ icon: Icon, label, value }) => <div key={label}><dt><Icon size={15} />{label}</dt><dd className={!value ? s.muted : ''}>{value || 'Не указано'}</dd></div>)}</dl>
    {card.requirements && <div className={s.requirements}><h3>Дополнительные пожелания</h3><p>{card.requirements}</p></div>}
    {drafting && <div className={s.previewNote}>Карточку видите только вы.<br />Перед публикацией можно всё изменить.</div>}
  </div>;
}
