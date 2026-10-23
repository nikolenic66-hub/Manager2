import React, { useId } from 'react';

const palettes: Record<string, { main: string; light: string; dark: string }> = {
  red: { main: '#b82e3b', light: '#f47b70', dark: '#54131e' },
  blue: { main: '#1758a5', light: '#5ab5ff', dark: '#08274f' },
  green: { main: '#11755a', light: '#56dbb0', dark: '#063b31' },
  yellow: { main: '#c18b1a', light: '#ffe08b', dark: '#65400a' },
  purple: { main: '#713eae', light: '#c5a0ff', dark: '#2d174e' },
  orange: { main: '#c45a1d', light: '#ffb26b', dark: '#5b260c' },
  black: { main: '#202d3b', light: '#b9c7d7', dark: '#070c12' },
  white: { main: '#dce7f3', light: '#ffffff', dark: '#60758e' },
};

type Props = { shape?: string; color?: string; symbol?: string; size?: number; className?: string };

function Shape({ shape, ...props }: { shape: string; fill: string; stroke: string; strokeWidth?: number; opacity?: number }) {
  switch (shape) {
    case 'circle': return <circle cx={40} cy={45} r={32} {...props} />;
    case 'diamond': return <path d="M40 5 72 42 40 82 8 42Z" {...props} />;
    case 'triangle': return <path d="M40 6 75 78H5Z" {...props} />;
    case 'star': return <polygon points="40,4 49,28 74,29 55,45 62,70 40,56 18,70 25,45 6,29 31,28" {...props} />;
    case 'square': return <path d="M9 10H71V72H9Z" {...props} />;
    default: return <path d="M10 9H70V42Q68 64 40 84Q12 64 10 42Z" {...props} />;
  }
}

function Motif({ symbol, light, dark }: { symbol: string; light: string; dark: string }) {
  const stroke = light;
  if (symbol === 'lion') return <g stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
    <path d="M40 24 47 27 54 24 58 32 62 39 57 52 49 62 40 67 31 62 23 52 18 39 22 32 26 24 33 27Z" fill={light} fillOpacity=".14"/>
    <path d="M28 37 34 34 38 38M52 37 46 34 42 38" fill="none"/><path d="M33 45Q40 40 47 45L44 52 40 54 36 52Z" fill={light}/>
    <path d="M33 58 40 61 47 58M35 48 38 49M45 48 42 49" fill="none"/>
  </g>;
  if (symbol === 'eagle') return <g fill={light} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round">
    <path d="M40 28 47 35 61 30 56 42 68 47 52 51 47 62 40 54 33 62 28 51 12 47 24 42 19 30 33 35Z" fillOpacity=".22"/>
    <path d="M17 31 35 38 40 29 45 38 63 31 55 46 47 49 40 42 33 49 25 46Z"/>
    <path d="M40 38 46 46 40 55 34 46Z" fill={dark}/><path d="M42 43 53 45 44 49Z"/>
  </g>;
  if (symbol === 'wolf') return <g fill={light} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
    <path d="M22 27 34 33 40 28 46 33 58 27 57 42 53 54 40 65 27 54 23 42Z" fillOpacity=".24"/>
    <path d="M22 27 35 34 40 42 45 34 58 27 55 44 48 49 40 45 32 49 25 44Z"/>
    <path d="M32 49 40 54 48 49 45 60 40 64 35 60Z" fill={dark}/><path d="M30 42 35 43M50 42 45 43" stroke={dark} strokeWidth="3" strokeLinecap="round"/>
  </g>;
  if (symbol === 'lightning') return <path d="M44 22 28 46H39L35 66 54 40H43Z" fill={light} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round"/>;
  if (symbol === 'crown') return <g stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill={light}>
    <path d="M20 34 29 42 40 27 51 42 60 34 56 55H24Z"/><path d="M25 60H55" fill="none" strokeWidth="3"/><circle cx={20} cy={31} r={3}/><circle cx={40} cy={24} r={3}/><circle cx={60} cy={31} r={3}/>
  </g>;
  if (symbol === 'star') return <polygon points="40,24 45,38 60,39 48,48 52,62 40,54 28,62 32,48 20,39 35,38" fill={light} stroke={stroke} strokeWidth="1.5"/>;
  if (symbol === 'anchor') return <g stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"><circle cx={40} cy={29} r={5}/><path d="M40 34V60M25 44H55M19 52Q19 64 32 64L40 57 48 64Q61 64 61 52"/></g>;
  if (symbol === 'laurel') return <g fill="none" stroke={light} strokeWidth="2.8" strokeLinecap="round"><path d="M25 63Q12 46 24 27M55 63Q68 46 56 27"/><path d="M22 52 31 50M19 43 29 42M20 34 30 35M74 52 65 50M77 43 67 42M76 34 66 35"/></g>;
  if (symbol === 'shield') return <path d="M26 28H54V46Q52 56 40 64Q28 56 26 46Z" stroke={stroke} strokeWidth="2" fill={light} fillOpacity=".2"/>;
  // Football is drawn as a custom vector, not an emoji, for crisp rendering at any size.
  if (symbol === 'ball') return <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round"><circle cx={40} cy={45} r={19} fill={light} fillOpacity=".14"/><polygon points="40,35 49,41 46,51 34,51 31,41" fill={light}/><path d="M40 35V26M49 41 58 38M46 51 51 60M34 51 29 60M31 41 22 38" fill="none"/><circle cx={40} cy={45} r={19} fill="none"/></g>;
  return <g fill={light} stroke={stroke} strokeWidth="1.5"><path d="M40 25 46 39 61 40 50 49 54 64 40 55 26 64 30 49 19 40 34 39Z"/><circle cx={40} cy={45} r={2.5} fill={dark}/></g>;
}

export default function ClubEmblem({ shape = 'shield', color = 'blue', symbol = 'ball', size = 56, className = '' }: Props) {
  const palette = palettes[color] ?? palettes.blue;
  const gradientId = useId().replace(/:/g, '');
  return <span className={`club-emblem ${className}`} style={{ width: size, height: size * 1.08 }}>
    <svg viewBox="0 0 80 90" width={size} height={size * 1.08} role="img" aria-label={`Эмблема клуба: ${symbol}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${gradientId}-main`} x1={0} y1={0} x2={1} y2={1}><stop stopColor={palette.light}/><stop offset=".34" stopColor={palette.main}/><stop offset="1" stopColor={palette.dark}/></linearGradient>
        <linearGradient id={`${gradientId}-shine`} x1={0} y1={0} x2={0} y2={1}><stop stopColor="#fff" stopOpacity=".28"/><stop offset=".55" stopColor="#fff" stopOpacity="0"/></linearGradient>
        <clipPath id={`${gradientId}-clip`}><Shape shape={shape} fill="#fff" stroke="#fff"/></clipPath>
      </defs>
      <g clipPath={`url(#${gradientId}-clip)`}>
        <rect width={80} height={90} fill={`url(#${gradientId}-main)`}/>
        <path d="M9 0H29L10 90H0V8Z" fill="#fff" opacity=".08"/>
        <path d="M55 0H80V90H68L43 0Z" fill="#020912" opacity=".14"/>
        <path d="M0 18H80M0 22H80" stroke={palette.light} strokeOpacity=".55" strokeWidth="1.2"/>
        <path d="M0 70H80M0 73H80" stroke={palette.light} strokeOpacity=".45" strokeWidth="1.2"/>
        <path d="M9 0 40 13 71 0" fill="none" stroke={palette.light} strokeWidth="2" strokeOpacity=".7"/>
        <rect width={80} height={90} fill={`url(#${gradientId}-shine)`}/>
      </g>
      <Shape shape={shape} fill="none" stroke="#020a14" strokeWidth={4.2} opacity={0.88}/>
      <Shape shape={shape} fill="none" stroke={palette.light} strokeWidth={1.35}/>
      <Shape shape={shape} fill="none" stroke="#ffffff" strokeWidth={0.55} opacity={0.68}/>
      <circle cx={40} cy={45} r={23.5} fill="#031326" fillOpacity=".31" stroke="#f6d88f" strokeOpacity=".52" strokeWidth="1.1"/>
      <circle cx={40} cy={45} r={20.4} fill="none" stroke={palette.light} strokeOpacity=".32" strokeWidth=".6"/>
      <path d="M14 19 19 24M66 19 61 24M16 68 21 64M64 68 59 64" fill="none" stroke="#f6d88f" strokeOpacity=".68" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M40 10 42.4 14.1 40 18.2 37.6 14.1Z" fill="#f8e1a0" stroke="#72551e" strokeWidth=".5"/>
      <g transform="translate(0 0)"><Motif symbol={symbol} light={color === 'white' ? '#e5c875' : '#f8e1a0'} dark={palette.dark}/></g>
      <path d="M22 77 40 84 58 77" fill="none" stroke={palette.light} strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx={17} cy={14} r={2} fill="#fff"/><circle cx={63} cy={14} r={2} fill="#fff"/>
    </svg>
  </span>;
}
