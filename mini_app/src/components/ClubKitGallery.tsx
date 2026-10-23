import React, { useId } from 'react';
import ClubEmblem from './ClubEmblem';

type Props = { color?: string; shape?: string; symbol?: string; compact?: boolean };

type Palette = { main: string; light: string; dark: string };
const paletteMap: Record<string, Palette> = {
  red: { main: '#c7334e', light: '#ffb0bd', dark: '#4b1422' },
  blue: { main: '#176bd2', light: '#8bd9ff', dark: '#071d3b' },
  green: { main: '#168567', light: '#8cf1d2', dark: '#073d35' },
  yellow: { main: '#d6a52c', light: '#ffebac', dark: '#47320c' },
  purple: { main: '#7949c6', light: '#cfb6ff', dark: '#251448' },
  orange: { main: '#c65b25', light: '#ffc39a', dark: '#421d0d' },
  black: { main: '#344456', light: '#d9e4f3', dark: '#080e17' },
  white: { main: '#e9f1f9', light: '#ffffff', dark: '#526780' },
};

function Shirt({ variant, palette }: { variant: 'home' | 'away' | 'keeper'; palette: Palette }) {
  const uniqueId = useId().replace(/:/g, '');
  const main = variant === 'away' ? '#101e32' : variant === 'keeper' ? '#b78b20' : palette.main;
  const accent = variant === 'away' ? palette.light : variant === 'keeper' ? '#fff0a5' : palette.light;
  const dark = variant === 'keeper' ? '#4f3810' : palette.dark;
  const id = `kit-${variant}-${palette.main.replace('#', '')}-${uniqueId}`;
  return <svg className={`club-kit-art kit-${variant}`} viewBox="0 0 100 112" role="img" aria-label={{home:'Домашняя форма',away:'Гостевая форма',keeper:'Форма вратаря'}[variant]}>
    <defs>
      <linearGradient id={`${id}-fabric`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={accent}/><stop offset=".24" stopColor={main}/><stop offset="1" stopColor={dark}/></linearGradient>
      <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".2"/><stop offset=".45" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".18"/></linearGradient>
      <clipPath id={`${id}-clip`}><path d="M34 12 43 7H57L66 12 84 22 75 43 66 38 67 82 33 82 34 38 25 43 16 22Z"/></clipPath>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity=".45"/></filter>
    </defs>
    <ellipse cx="50" cy="96" rx="29" ry="5" fill="#000" opacity=".28"/>
    <g filter={`url(#${id}-shadow)`}>
      <path d="M34 12 43 7H57L66 12 84 22 75 43 66 38 67 82 33 82 34 38 25 43 16 22Z" fill={`url(#${id}-fabric)`} stroke={accent} strokeWidth="1.35" strokeLinejoin="round"/>
      <g clipPath={`url(#${id}-clip)`}>
        {variant === 'home' && <g opacity=".7">{[-24,-9,6,21,36,51,66,81].map(x=><rect key={x} x={x} y="8" width="7" height="76" fill={dark}/> )}</g>}
        {variant === 'away' && <path d="M-5 19 40 4 107 80 75 91Z" fill={palette.main} opacity=".92"/>}
        {variant === 'keeper' && <path d="M23 23H77V61H23Z" fill="#f4d56a" opacity=".28"/>}
        <path d="M34 12 43 7H57L66 12 56 22H44Z" fill={dark} opacity=".84"/>
        <path d="M43 8Q50 18 57 8" fill="none" stroke={accent} strokeWidth="2.3"/>
        <path d="M50 25V72" stroke={accent} strokeOpacity=".38" strokeWidth="1"/>
        <path d="M21 25 27 29M79 25 73 29" stroke={accent} strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M34 38 34 78M66 38 66 78" stroke={accent} strokeOpacity=".28" strokeWidth="1"/>
        <rect width="100" height="112" fill={`url(#${id}-shine)`}/>
      </g>
      <path d="M16 22 25 43 34 38M84 22 75 43 66 38" fill="none" stroke={accent} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M36 83 64 83 69 96 31 96Z" fill={dark} stroke={accent} strokeWidth="1"/>
      <text x="50" y="64" fontSize="14" fontWeight="900" textAnchor="middle" fill={variant === 'home' && palette.main === '#e9f1f9' ? '#14283b' : '#f5fbff'} stroke={dark} strokeWidth=".35">07</text>
    </g>
  </svg>;
}

export default function ClubKitGallery({ color = 'blue', shape = 'shield', symbol = 'ball', compact = false }: Props) {
  const palette = paletteMap[color] ?? paletteMap.blue;
  const items: { variant: 'home' | 'away' | 'keeper'; title: string; desc: string }[] = [
    { variant: 'home', title: 'Домашняя', desc: 'Основные цвета клуба' },
    { variant: 'away', title: 'Гостевая', desc: 'Контрастный комплект' },
    { variant: 'keeper', title: 'Вратарская', desc: 'Отдельный цвет вратаря' },
  ];
  return <section className={`club-kit-gallery${compact ? ' compact' : ''}`} aria-label="Предпросмотр игровой формы">
    <div className="club-kit-heading"><span className="eyebrow">CLUB IDENTITY</span><b>Игровая форма</b></div>
    <div className="club-kit-grid">
      {items.map(item => <div className="club-kit-item" key={item.variant}>
        <div className="club-kit-art-wrap"><Shirt variant={item.variant} palette={palette}/><span className="club-kit-mini-crest"><ClubEmblem shape={shape} color={color} symbol={symbol} size={15}/></span></div>
        <b>{item.title}</b>
        {!compact && <small>{item.desc}</small>}
      </div>)}
    </div>
  </section>;
}
