import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, MapPin, UserRound } from 'lucide-react';
import { api } from '../api';
import type { ProfileInput, User } from '../api/types';
import { Avatar, Button, ErrorNotice, Loading, Logo } from '../components/ui';
import s from '../styles/Profile.module.css';

function profileFields(user: User): ProfileInput {
  return { name: user.name, specialty: user.specialty || '', location: user.location || '', bio: user.bio || '' };
}

export function Profile({ user }: { user: User }) {
  const client = useQueryClient();
  const [fields, setFields] = useState<ProfileInput>(() => profileFields(user));
  const [saved, setSaved] = useState(false);
  const requests = useQuery({ queryKey: ['requests'], queryFn: api.listRequests });
  const offers = useQuery({ queryKey: ['my-offers'], queryFn: api.listMyOffers });
  const update = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: updated => {
      client.setQueryData(['me'], updated);
      setFields(profileFields(updated));
      setSaved(true);
      void client.invalidateQueries({ queryKey: ['my-offers'] });
      void client.invalidateQueries({ queryKey: ['provider', updated.id] });
    },
  });
  const changed = (Object.keys(fields) as (keyof ProfileInput)[]).some(key => fields[key].trim() !== profileFields(user)[key]);
  const valid = fields.name.trim().length >= 2 && fields.name.trim().length <= 100 && fields.specialty.trim().length <= 120 && fields.location.trim().length <= 120 && fields.bio.trim().length <= 2000;
  const edit = (key: keyof ProfileInput, value: string) => { setFields(current => ({ ...current, [key]: value })); setSaved(false); update.reset(); };

  return <div className={s.personalPage}>
    <div className={s.eyebrow}>ЛИЧНОЕ ПРОСТРАНСТВО / ПРОФИЛЬ</div>
    <div className={s.heading}><div><h1>Мой профиль</h1><p>Расскажите о себе, чтобы заказчикам было проще узнать вас.</p></div><Link className={s.publicLink} to={`/providers/${user.id}`}>Посмотреть публичный профиль <ArrowRight size={16} /></Link></div>
    <div className={s.personalGrid}>
      <section className={s.card} aria-labelledby="profile-details"><div className={s.identity}><Avatar name={user.name} size="large" /><div><h2 id="profile-details">{user.name}</h2><span>Ваш аккаунт</span></div></div>
        <form onSubmit={event => { event.preventDefault(); if (valid && changed) update.mutate(fields); }}>
          <div className={s.fieldGrid}>
            <label>Имя и фамилия<input value={fields.name} onChange={event => edit('name', event.target.value)} maxLength={100} required minLength={2} autoComplete="name" /></label>
            <label>Email<input value={user.email} readOnly type="email" aria-describedby="email-hint" /></label>
            <label>Специализация<input value={fields.specialty} onChange={event => edit('specialty', event.target.value)} maxLength={120} placeholder="Например, веб-дизайнер" /></label>
            <label>Город<input value={fields.location} onChange={event => edit('location', event.target.value)} maxLength={120} placeholder="Например, Алматы" /></label>
            <label className={s.fullField}>О себе<textarea value={fields.bio} onChange={event => edit('bio', event.target.value)} maxLength={2000} rows={5} placeholder="Опыт, подход к работе и то, чем вы можете помочь" /></label>
          </div>
          <p className={s.hint} id="email-hint">Email виден только вам. Имя, специализация, город и описание появятся в публичном профиле.</p>
          <ErrorNotice error={update.error} />
          <div className={s.formActions}><Button type="submit" busy={update.isPending} disabled={!changed || !valid}>Сохранить изменения</Button>{saved && <span className={s.saved} role="status"><CheckCircle2 size={17} />Сохранено</span>}</div>
        </form>
      </section>
      <aside className={s.activity}><h2>Ваши действия</h2><p>Быстрый переход к вашим задачам и откликам.</p><Link to="/"><span className={s.activityIcon}><UserRound size={20} /></span><span><strong>Мои потребности</strong><small>{requests.data?.length ?? '—'} заявок</small></span><ArrowRight size={17} /></Link><Link to="/offers"><span className={s.activityIcon}><BriefcaseBusiness size={20} /></span><span><strong>Мои предложения</strong><small>{offers.data?.length ?? '—'} откликов</small></span><ArrowRight size={17} /></Link></aside>
    </div>
  </div>;
}

export function ProviderProfile({ viewer }: { viewer: User | null }) {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['provider', id], queryFn: () => api.getProviderProfile(id) });
  return <div className={s.publicPage}>
    <header className={s.publicHeader}><Link to={viewer ? '/' : '/login'} aria-label="Ясно — главная"><Logo /></Link><Link to={viewer ? '/' : '/login'}>{viewer ? 'Личное пространство' : 'Войти'} <ArrowRight size={15} /></Link></header>
    <main className={s.publicMain} id="main"><Link className={s.backLink} to={viewer ? '/' : '/login'}><ArrowLeft size={16} />{viewer ? 'Вернуться в личное пространство' : 'На главную'}</Link>
      {query.isPending ? <Loading /> : query.error ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : <div className={s.publicCard}><div className={s.publicHero}><Avatar name={query.data.name} size="large" /><div><span className={s.eyebrow}>ПРОФИЛЬ ИСПОЛНИТЕЛЯ</span><h1>{query.data.name}</h1><p>{query.data.specialty || 'Исполнитель на Ясно'}</p></div></div>
        {query.data.location && <div className={s.location}><MapPin size={17} />{query.data.location}</div>}
        <section className={s.about}><h2>О себе</h2><p>{query.data.bio || 'Исполнитель пока не добавил информацию о себе.'}</p></section>
        {viewer?.id === query.data.id && <Link className={s.publicLink} to="/profile">Редактировать профиль <ArrowRight size={16} /></Link>}
      </div>}
    </main>
  </div>;
}
