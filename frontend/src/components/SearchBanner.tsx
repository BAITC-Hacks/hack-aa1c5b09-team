import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import s from '../styles/App.module.css';

export function SearchBanner() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate('/requests/new', { state: { initialText: value.trim() } });
  }

  function begin() {
    if (value.trim()) {
      navigate('/requests/new', { state: { initialText: value.trim() } });
      return;
    }
    inputRef.current?.focus();
  }

  return <section className={s.searchBanner} aria-labelledby="search-banner-title">
    <h2 id="search-banner-title">Большие решения начинаются с пары слов.</h2>
    <form className={s.searchBannerForm} onSubmit={submit}>
      <label htmlFor="quick-idea" className={s.srOnly}>Короткое описание потребности</label>
      <input
        ref={inputRef}
        id="quick-idea"
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder="Например: ищу дизайнера для моей кофейни"
        maxLength={2000}
      />
      <button type="submit" aria-label="Начать создание задачи"><ArrowRight size={21} /></button>
    </form>
    <div className={s.searchBannerActions} aria-label="Быстрые действия">
      <button type="button" onClick={() => navigate('/requests/new')}>Создать задачу</button>
      <button type="button" onClick={begin}>Уточнить с ИИ</button>
      <button type="button" onClick={begin}>Получить предложения</button>
    </div>
  </section>;
}
