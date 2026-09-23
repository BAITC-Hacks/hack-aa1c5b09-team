import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, ChevronRight, CircleHelp, ClipboardList, FileText, LayoutGrid, LogOut, Menu, MessageSquare, Plus, Sparkles, X } from 'lucide-react';
import { api, isDemo } from '../api';
import { Avatar, Button, ErrorNotice, Logo, Modal } from './ui';
import type { User } from '../api/types';
import s from '../styles/App.module.css';

export function Shell({ user }: { user: User }) {
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const client = useQueryClient();
  const requests = useQuery({ queryKey: ['requests'], queryFn: api.listRequests });
  const logout = useMutation({ mutationFn: api.logout, onSuccess: async () => { await client.cancelQueries(); client.setQueryData(['me'], null); client.removeQueries({ predicate: query => query.queryKey[0] !== 'me' }); } });
  const nav = [
    { to: '/', label: 'Мои потребности', icon: FileText },
    { to: '/catalog', label: 'Каталог', icon: LayoutGrid },
    { to: '/offers', label: 'Мои предложения', icon: ClipboardList },
    { to: '/messages', label: 'Сообщения', icon: MessageSquare },
  ];
  const section = nav.find(item => item.to !== '/' && location.pathname.startsWith(item.to)) || nav[0];
  return <div className={s.app}>
    {menu && <button className={s.sidebarBackdrop} aria-label="Закрыть меню" onClick={() => setMenu(false)} />}
    <aside className={`${s.sidebar} ${menu ? s.sidebarOpen : ''}`}>
      <Link to="/" className={s.brandLink} onClick={() => setMenu(false)} aria-label="Ясно — главная"><Logo /></Link>
      <button className={`${s.iconButton} ${s.mobileClose}`} onClick={() => setMenu(false)} aria-label="Закрыть меню"><X /></button>
      <div className={s.workspaceLabel}>ЛИЧНОЕ ПРОСТРАНСТВО</div>
      <nav className={s.nav} aria-label="Главное меню">{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${s.navItem} ${isActive || (to === '/' && location.pathname.startsWith('/requests')) ? s.navActive : ''}`} onClick={() => setMenu(false)}><Icon size={19} /><span>{label}</span>{to === '/' && <span className={s.navCount}>{requests.data?.length ?? 0}</span>}</NavLink>)}</nav>
      <Link to="/requests/new" className={`${s.button} ${s.primary} ${s.sidebarCreate}`} onClick={() => setMenu(false)}><Plus size={18} />Создать заявку</Link>
      <div className={s.sidebarBottom}>
        <div className={s.assistantTip}><span className={s.tipIcon}><Sparkles size={19} /></span><strong>Всё начинается с мысли</strong><p>Поможем превратить её<br />в понятную задачу.</p><button onClick={() => setHelp(true)}>Как это работает <ArrowUpRight size={15} /></button></div>
        {isDemo && <div className={s.demoBadge}><i />Демонстрационный режим</div>}
        <div className={s.profile}><Avatar name={user.name} /><div><strong>{user.name}</strong><span>Личный аккаунт</span></div><button className={s.iconButton} aria-label="Выйти из аккаунта" disabled={logout.isPending} onClick={() => logout.mutate()}><LogOut size={18} /></button></div>
        <ErrorNotice error={logout.error} />
      </div>
    </aside>
    <div className={s.mainWrap}>
      <header className={s.topbar}><div className={s.breadcrumb}><button className={`${s.iconButton} ${s.mobileMenu}`} aria-label="Открыть меню" onClick={() => setMenu(true)}><Menu size={22} /></button><span className={s.breadcrumbRoot}>Личное пространство</span><ChevronRight size={14} /><Link to={section.to}>{section.label}</Link>{(location.pathname.startsWith('/requests/') || location.pathname.startsWith('/catalog/')) && <><ChevronRight size={14} /><span>{location.pathname.endsWith('/new') ? 'Новая заявка' : 'Потребность'}</span></>}</div><div className={s.topbarRight}><button className={s.helpButton} onClick={() => setHelp(true)}><CircleHelp size={17} /><span>Помощь</span></button><span className={s.topbarDivider} /><Avatar name={user.name} size="small" /></div></header>
      <main className={s.main} id="main"><Outlet /></main>
      <footer className={s.footer}><span>Ясно — когда вас понимают.</span><span>От потребности к решению <Sparkles size={12} /></span></footer>
    </div>
    {help && <Modal title="От мысли к решению" onClose={() => setHelp(false)}><div className={s.helpSteps}>{[['01', 'Расскажите, что вам нужно', 'Достаточно пары предложений. Не нужно заранее знать все детали.'], ['02', 'Уточните задачу вместе с ИИ', 'Ответьте на вопросы, проверьте карточку и опубликуйте её.'], ['03', 'Найдите своё решение', 'Обсуждайте предложения в отдельных чатах и выбирайте исполнителя.']].map(([n, title, text]) => <div key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div>{isDemo && <p className={s.demoNote}>ИИ работает по демосценарию. В каталоге можно отправить своё предложение и обсудить его с заказчиком. Данные сохраняются в этом браузере.</p>}<Button onClick={() => setHelp(false)}>Всё понятно</Button></Modal>}
  </div>;
}
