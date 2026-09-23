import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Eye, EyeOff, MessageSquare, Sparkles } from 'lucide-react';
import { api, isDemo } from '../api';
import type { User } from '../api/types';
import { Button, ErrorNotice, Logo } from '../components/ui';
import s from '../styles/App.module.css';

export function Auth({ user }: { user: User | null }) {
  const register = useLocation().pathname === '/register';
  const navigate = useNavigate();
  const client = useQueryClient();
  const [visible, setVisible] = useState(false);
  const mutation = useMutation({ mutationFn: async (input: { email: string; password: string; name?: string }) => register && input.name !== undefined ? api.register({ ...input, name: input.name }) : api.login(input), onSuccess: async result => { await client.cancelQueries(); client.removeQueries({ predicate: query => query.queryKey[0] !== 'me' }); client.setQueryData(['me'], result); navigate('/', { replace: true }); } });
  if (user) return <Navigate to="/" replace />;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    mutation.mutate({ email: String(data.get('email')), password: String(data.get('password')), ...(register ? { name: String(data.get('name')) } : {}) });
  }
  return <div className={s.authPage}>
    <section className={s.authStory}>
      <Logo light />
      <div className={s.authStoryContent}><span className={s.authEyebrow}><span />ХОРОШИЕ РЕШЕНИЯ НАЧИНАЮТСЯ ЗДЕСЬ</span><h1>У вас — идея.<br />Дальше — <em>ясно.</em></h1><p>Поможем сформулировать задачу<br />и найти людей, которые её решат.</p>
        <div className={s.authIllustration} aria-hidden="true"><div className={s.orbit} /><div className={s.orbitTwo} /><div className={s.floatingThought}><MessageSquare size={19} /><span>«Хочу открыть свою кофейню…»</span></div><div className={s.floatingCard}><span className={s.artSpark}><Sparkles size={22} /></span><small>ИЗ МЫСЛИ В ЗАДАЧУ</small><strong>Фирменный стиль для кофейни</strong><div><Check size={14} />Понятная цель</div><div><Check size={14} />Все важные детали</div><div><Check size={14} />Подходящие предложения</div><span className={s.artCardBottom}>Можно начинать <ArrowRight size={16} /></span></div><span className={s.floatingStar}>✦</span></div>
      </div>
      <span className={s.authStoryFooter}>Меньше неопределённости. Больше возможностей.</span>
    </section>
    <section className={s.authFormSide}><div className={s.mobileBrand}><Logo /></div><div className={s.authFormWrap}><span className={s.sectionEyebrow}>ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО</span><h2>{register ? 'Начнём знакомство' : 'Рады вас видеть'}</h2><p>{register ? 'Создайте аккаунт, чтобы идеи стали реальностью.' : 'Войдите, чтобы продолжить путь к решению.'}</p><form onSubmit={submit} className={s.authForm}>
      {register && <label>Ваше имя<input name="name" autoComplete="given-name" placeholder="Как к вам обращаться?" required minLength={2} maxLength={60} /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={150} /></label>
      <label>Пароль<div className={s.passwordField}><input name="password" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} placeholder="Не менее 8 символов" required minLength={8} maxLength={128} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
      <ErrorNotice error={mutation.error} /><Button type="submit" busy={mutation.isPending}>{register ? 'Создать аккаунт' : 'Войти'}<ArrowRight size={17} /></Button>
    </form><p className={s.authSwitch}>{register ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?'} <Link to={register ? '/login' : '/register'} onClick={() => mutation.reset()}>{register ? 'Войти' : 'Зарегистрироваться'}</Link></p>
      {isDemo && <><div className={s.authOr}><span />или познакомьтесь с продуктом<span /></div><Button variant="secondary" className={s.fullWidth} busy={mutation.isPending} onClick={() => mutation.mutate({ email: 'demo@yasno.app', password: 'demo-password' })}><Sparkles size={17} />Открыть демо</Button><p className={s.authDemo}>Деморежим: локальные данные и имитация входа.<br />Используйте вымышленные данные и пароль.</p></>}
    </div><span className={s.authCopyright}>Ясно © {new Date().getFullYear()}</span></section>
  </div>;
}
