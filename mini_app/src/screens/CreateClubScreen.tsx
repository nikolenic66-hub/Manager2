import React, { useState } from 'react';
import { createClub } from '../api';
import ClubEmblem from '../components/ClubEmblem';
import ClubKitGallery from '../components/ClubKitGallery';
import { Check } from 'lucide-react';

const shapes = [
  { id: 'shield', label: 'Щит' }, { id: 'circle', label: 'Круг' },
  { id: 'diamond', label: 'Ромб' }, { id: 'triangle', label: 'Треугольник' },
  { id: 'star', label: 'Звезда' }, { id: 'square', label: 'Квадрат' },
];
const colors = [
  { id: 'red', label: 'Красный', value: '#ef4444' }, { id: 'blue', label: 'Синий', value: '#3b82f6' },
  { id: 'green', label: 'Зелёный', value: '#22c55e' }, { id: 'yellow', label: 'Жёлтый', value: '#facc15' },
  { id: 'purple', label: 'Фиолетовый', value: '#a855f7' }, { id: 'orange', label: 'Оранжевый', value: '#f97316' },
  { id: 'black', label: 'Чёрный', value: '#171717' }, { id: 'white', label: 'Белый', value: '#f8fafc' },
];
const symbols = [
  { id: 'ball', label: 'Мяч' }, { id: 'lion', label: 'Лев' },
  { id: 'eagle', label: 'Орёл' }, { id: 'wolf', label: 'Волк' },
  { id: 'lightning', label: 'Молния' }, { id: 'crown', label: 'Корона' },
  { id: 'star', label: 'Звезда' },
];

export default function CreateClubScreen({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [shape, setShape] = useState('shield');
  const [color, setColor] = useState('blue');
  const [symbol, setSymbol] = useState('ball');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 3 || name.trim().length > 20) {
      setToast('Название клуба должно содержать от 3 до 20 символов.');
      return;
    }
    setBusy(true);
    setToast('');
    try {
      await createClub({ name: name.trim(), emblem_shape: shape, emblem_color: color, emblem_symbol: symbol });
      onCreated();
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось создать клуб. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="app-shell create-club-screen">
    <div className="topline"><span>FOOTBALL MANAGER</span><span>НОВАЯ КАРЬЕРА</span></div>
    <header className="create-club-header"><div><small>ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ</small><h1>Создай клуб</h1><p className="muted">Придумай имя и собери эмблему своей команды.</p></div></header>
    <form className="card create-club-form" onSubmit={submit}>
      <label htmlFor="club-name">Название клуба</label>
      <input id="club-name" className="club-name-input" value={name} onChange={e => setName(e.target.value.slice(0, 20))} maxLength={20} minLength={3} placeholder="Например, Северные львы" required />
      <small className="muted name-counter">{name.length}/20 · минимум 3 символа</small>

      <h3>1. Форма эмблемы</h3>
      <div className="crest-options">{shapes.map(item => <button type="button" key={item.id} className={`crest-option ${shape === item.id ? 'selected' : ''}`} onClick={() => setShape(item.id)} aria-pressed={shape === item.id}><ClubEmblem shape={item.id} color={color} symbol={symbol} size={38} /><small>{item.label}</small></button>)}</div>

      <h3>2. Цвет эмблемы</h3>
      <div className="color-options">{colors.map(item => <button type="button" key={item.id} title={item.label} aria-label={item.label} aria-pressed={color === item.id} className={`color-option ${color === item.id ? 'selected' : ''}`} style={{ backgroundColor: item.value }} onClick={() => setColor(item.id)}>{color === item.id ? <Check size={17} strokeWidth={3}/> : ''}</button>)}</div>
      <p className="muted color-label">{colors.find(c => c.id === color)?.label}</p>

      <h3>3. Символ команды</h3>
      <div className="symbol-options">{symbols.map(item => <button type="button" key={item.id} className={`symbol-option ${symbol === item.id ? 'selected' : ''}`} onClick={() => setSymbol(item.id)} aria-pressed={symbol === item.id}><ClubEmblem shape={shape} color={color} symbol={item.id} size={32}/><small>{item.label}</small></button>)}</div>

      <div className="crest-preview"><div className="crest-preview-shape"><ClubEmblem shape={shape} color={color} symbol={symbol} size={66}/></div><div><small>КЛУБ · ПРЕДПРОСМОТР</small><b>{name.trim() || 'Название клуба'}</b><span className="muted">Герб команды в едином стиле игры</span></div></div>
      <ClubKitGallery color={color} shape={shape} symbol={symbol}/>
      <button className="btn create-club-submit" type="submit" disabled={busy}>{busy ? 'Создаём клуб…' : 'Создать клуб'}</button>
    </form>
    {toast && <div role="status" className="toast" onClick={() => setToast('')}>{toast}</div>}
  </main>;
}
