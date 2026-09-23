import { useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, Check, LoaderCircle, Sparkles, X } from 'lucide-react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import type { RequestStatus } from '../api/types';
import { statusLabels } from '../api/types';
import s from '../styles/App.module.css';

export function Logo({ light = false }: { light?: boolean }) {
  return <span className={`${s.logo} ${light ? s.logoLight : ''}`}><span className={s.logoIcon}><Sparkles size={23} strokeWidth={1.8} /></span>ясно<span className={s.logoDot}>.</span></span>;
}
export function Button({ children, variant = 'primary', busy = false, className = '', disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; busy?: boolean }) {
  return <button {...props} disabled={disabled || busy} className={`${s.button} ${s[variant]} ${className}`} aria-busy={busy}>{busy && <LoaderCircle size={17} className={s.spin} />}{children}</button>;
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return <div className={s.error} role="alert"><AlertCircle size={18} /><span>{error instanceof Error ? error.message : 'Что-то пошло не так. Попробуйте ещё раз.'}</span>{retry && <button onClick={retry}>Повторить</button>}</div>;
}
export function Loading({ text = 'Загружаем…' }: { text?: string }) { return <div className={s.loading} role="status"><LoaderCircle className={s.spin} size={24} />{text}</div>; }
export function Status({ status }: { status: RequestStatus }) { return <span className={`${s.status} ${s[status]}`}>{status === 'selected' ? <Check size={12} /> : <i />}{statusLabels[status]}</span>; }
export function Avatar({ name, color = 'violet', size = 'normal' }: { name: string; color?: string; size?: 'normal' | 'large' | 'small' }) {
  return <span className={`${s.avatar} ${s[color] || ''} ${s[`avatar_${size}`]}`}>{name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={ref} className={s.modal} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="modal-title"><div className={s.modalHead}><h2 id="modal-title">{title}</h2><button className={s.iconButton} aria-label="Закрыть" onClick={onClose}><X size={21} /></button></div>{children}</dialog>;
}
export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className={s.empty}><span className={s.emptyIcon}>{icon}</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
export function Steps({ current = 0 }: { current?: number }) {
  return <div className={s.steps}>{['Опишите задачу', 'Уточните с ИИ', 'Получите предложения'].map((label, i) => <div key={label} className={i === current ? s.stepActive : ''}><span>{i < current ? <Check size={13} /> : `0${i + 1}`}</span>{label}{i < 2 && <ArrowRight size={15} />}</div>)}</div>;
}
export function formatDate(value: string) { return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(value)); }
