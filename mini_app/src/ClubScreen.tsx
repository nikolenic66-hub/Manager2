import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CirclePlay, Shield, Sparkles, Home, UsersRound, CalendarDays, ArrowLeftRight, LayoutGrid, Dumbbell, Trophy, Building2, GraduationCap, ShieldCheck, Zap, Brain, Handshake, FlaskConical, ClipboardList, Mic, Repeat2, Target, ShieldAlert, Activity, Settings2, Shirt, TrendingUp, ArrowUpRight, Check, CircleDot, Menu } from 'lucide-react';
import './style.css';
import {
  getClub, getSquad, getNextMatch, getMatchSnapshot, getLastMatch, getLeague, getTactics, saveTactics,
  getLiveMatchLineup, substituteLivePlayer, updateLiveMatchTactics,
  getTransferListings, bidForPlayer, getScoutRecommendations, getFixtures, getTransferOffers, getTransferHistory, getScoutReport, acceptTransferOffer, rejectTransferOffer,
  getTrainingToday, completeTraining, getAcademyYouth, promoteYouth,
  getPacks, openPack, getStadiumInfo, upgradeStadium,
  getStartingLineup, autoSelectStartingLineup, saveStartingLineup, getLineupRecommendation, updateManagerProfile, updateClubName, updateManagerAvatar, updateClubEmblem, playFriendlyMatch, sellPlayer,
  type Club, type Player, type NextMatch, type LastMatch, type LeagueResponse, type MarketPlayer,
  type Fixture, type TrainingToday, type AcademyYouth, type Pack, type StadiumInfo, type TransferOffer, type TransferHistoryItem, type ScoutReport, type LineupPlayer, type FormationSlot, type PackOpeningResult, type PlayedFriendlyMatch,
} from './api';
import MatchCanvas from './components/MatchCanvas';
import { isMatchLive } from './game/matchStatus';
import ClubEmblem from './components/ClubEmblem';
import PlayerPortrait from './components/PlayerPortrait';
import ManagerPortrait from './components/ManagerPortrait';
import ClubKitGallery from './components/ClubKitGallery';

type Page = 'home'|'team'|'tactics'|'squad'|'lineup'|'profile'|'match'|'transfers'|'training'|'league'|'stadium'|'academy'|'scout'|'packs';
const nav: {id: Page; icon: React.ElementType; label: string}[] = [
  {id:'home',icon:Home,label:'Главная'}, {id:'team',icon:UsersRound,label:'Команда'},
  {id:'match',icon:CalendarDays,label:'Матчи'}, {id:'transfers',icon:ArrowLeftRight,label:'Рынок'}, {id:'league',icon:LayoutGrid,label:'Ещё'},
];
const homeTiles: { icon: React.ElementType; label: string; id: Page }[] = [
  {icon:CalendarDays,label:'Матчи',id:'match'}, {icon:UsersRound,label:'Команда',id:'team'},
  {icon:ArrowLeftRight,label:'Трансферы и скаутинг',id:'transfers'}, {icon:Dumbbell,label:'Тренировки',id:'training'},
  {icon:Trophy,label:'Лиги и кубки',id:'league'}, {icon:Building2,label:'Стадион',id:'stadium'},
  {icon:GraduationCap,label:'Академия',id:'academy'}, {icon:ShieldCheck,label:'Паки игроков',id:'packs'},
];
const money = (n?: number | null) => n == null ? '—' : '€' + new Intl.NumberFormat('ru-RU').format(n);
const validDate = (value?: string | null) => { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; };
const dateText = (value?: string | null) => { const d = validDate(value); return d ? d.toLocaleString('ru-RU',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Дата не назначена'; };
const dateKey = (value?: string | null) => { const d = validDate(value); return d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : 'undated'; };
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Не удалось загрузить данные. Попробуйте ещё раз.';
const rarityLabel = (rarity?: string) => ({BASE:'ОБЫЧНАЯ',RARE:'РЕДКАЯ',GOLD:'ЗОЛОТАЯ',EPIC:'ЭПИЧЕСКАЯ',LEGENDARY:'ЛЕГЕНДАРНАЯ'} as Record<string,string>)[String(rarity||'BASE').toUpperCase()] || 'ОБЫЧНАЯ';
const rarityClass = (rarity?: string) => ({BASE:'rarity-base',COMMON:'rarity-base',RARE:'rarity-rare',GOLD:'rarity-gold',EPIC:'rarity-epic',LEGENDARY:'rarity-legendary'} as Record<string,string>)[String(rarity||'BASE').toUpperCase()] || 'rarity-base';
const positionFits: Record<string,string[]> = {GK:['GK'],LB:['LB','CB','LM','LW'],CB:['CB','LB','RB','DM'],RB:['RB','CB','RM','RW'],DM:['DM','CM','CB'],CM:['CM','DM','AM','LM','RM'],LM:['LM','LW','LB','CM'],RM:['RM','RW','RB','CM'],AM:['AM','CM','LW','RW','ST'],LW:['LW','LM','ST','AM'],RW:['RW','RM','ST','AM'],ST:['ST','LW','RW','AM']};
function orderIdsForSlots(ids:number[], players:LineupPlayer[], slots:FormationSlot[]) {
  const remaining = ids.map(id=>players.find(p=>p.id===id)).filter((p):p is LineupPlayer=>Boolean(p));
  return slots.map(slot=>{
    const candidates=remaining.slice().sort((a,b)=>{
      const fitA=(positionFits[slot.slot]||[slot.slot]).includes(a.position)?1:0;
      const fitB=(positionFits[slot.slot]||[slot.slot]).includes(b.position)?1:0;
      const exactA=a.position===slot.slot?1:0, exactB=b.position===slot.slot?1:0;
      return exactB-exactA || fitB-fitA || b.overall-a.overall;
    });
    const chosen=candidates[0];
    if(!chosen)return null;
    remaining.splice(remaining.findIndex(p=>p.id===chosen.id),1);
    return chosen.id;
  }).filter((id):id is number=>id!==null);
}

const MANAGER_AVATARS = [1,2,3,4,5,6,7,8];

// Keep this component identity stable. Defining Card inside ClubScreen caused React
// to unmount/remount every card subtree on every state update, including MatchCanvas.
function Card({children, cls = ''}:{children:React.ReactNode;cls?:string}) {
  return <section className={'card '+cls}>{children}</section>;
}

function ScreenHeader({title, budget, onBack}:{title:string;budget:number;onBack:()=>void}) {
  return <header><button className="back" onClick={onBack}>‹</button><div><small>FOOTBALL MANAGER</small><h1>{title}</h1></div><span className="coin">{money(budget)}</span></header>;
}

function ActionButton({children,onClick,secondary=false,disabled=false}:{children:React.ReactNode;onClick:()=>void;secondary?:boolean;disabled?:boolean}) {
  return <button className={`btn${secondary?' secondary':''}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

type ManagerClubIdentityFormProps = {
  managerName: string;
  club: Club;
  loading: boolean;
  onManagerSaved: (name: string) => void;
  onClubNameSaved: (name: string) => void;
  onNotify: (message: string) => void;
  onError: (message: string) => void;
};

// Keep text-editing state in this stable, memoized component. On Android Telegram
// WebView, typing should not rerender the whole ClubScreen / LIVE match subtree.
const ManagerClubIdentityForm = React.memo(function ManagerClubIdentityForm({
  managerName, club, loading, onManagerSaved, onClubNameSaved, onNotify, onError,
}: ManagerClubIdentityFormProps) {
  const [managerDraft, setManagerDraft] = useState(managerName);
  const [clubNameDraft, setClubNameDraft] = useState(club.name);
  const [savingManager, setSavingManager] = useState(false);
  const [savingClubName, setSavingClubName] = useState(false);

  const saveManager = async () => {
    const value = managerDraft.trim();
    if (value.length < 2 || savingManager || loading) return;
    setSavingManager(true);
    onError('');
    try {
      const result = await updateManagerProfile(value);
      setManagerDraft(result.manager_name);
      onManagerSaved(result.manager_name);
      onNotify('Имя менеджера сохранено');
    } catch (error) {
      onError(errorText(error));
    } finally {
      setSavingManager(false);
    }
  };

  const saveClubName = async () => {
    const value = clubNameDraft.trim();
    if (value.length < 3 || value === club.name || savingClubName || loading) return;
    setSavingClubName(true);
    onError('');
    try {
      const result = await updateClubName(value);
      setClubNameDraft(result.name);
      onClubNameSaved(result.name);
      onNotify('Название клуба сохранено');
    } catch (error) {
      onError(errorText(error));
    } finally {
      setSavingClubName(false);
    }
  };

  return <Card>
    <h3>Менеджер и клуб</h3>
    <label className="field-label" htmlFor="manager-name-draft">Имя менеджера</label>
    <input id="manager-name-draft" name="managerName" autoComplete="off" className="club-name-input" value={managerDraft} maxLength={32} onChange={event => setManagerDraft(event.currentTarget.value)} placeholder="Имя менеджера" />
    <ActionButton disabled={loading || savingManager || managerDraft.trim().length < 2} onClick={() => void saveManager()}>Сохранить имя</ActionButton>

    <label className="field-label" htmlFor="club-name-draft">Название клуба</label>
    <input id="club-name-draft" name="clubName" autoComplete="off" className="club-name-input" value={clubNameDraft} maxLength={24} onChange={event => setClubNameDraft(event.currentTarget.value)} placeholder="Название клуба" />
    <ActionButton disabled={loading || savingClubName || clubNameDraft.trim().length < 3 || clubNameDraft.trim() === club.name} onClick={() => void saveClubName()}>Сохранить название клуба</ActionButton>
  </Card>;
});

export default function ClubScreen({club: initialClub, managerName: initialManagerName='Менеджер', managerAvatarId: initialManagerAvatarId=1}:{club:Club;managerName?:string;managerAvatarId?:number}) {
  const [page,setPage] = useState<Page>('home');
  const [club,setClub] = useState<Club>(initialClub);
  const [managerName,setManagerName] = useState(initialManagerName);
  const [managerAvatarId,setManagerAvatarId] = useState(Math.min(8,Math.max(1,initialManagerAvatarId)));
  const [scoutReportOpen,setScoutReportOpen] = useState(false);
  const [emblemShape,setEmblemShape] = useState(initialClub.emblem_shape||'shield');
  const [emblemColor,setEmblemColor] = useState(initialClub.emblem_color||'blue');
  const [emblemSymbol,setEmblemSymbol] = useState(initialClub.emblem_symbol||'ball');
  const [lineupPlayers,setLineupPlayers] = useState<LineupPlayer[]>([]);
  const [startingIds,setStartingIds] = useState<number[]>([]);
  const [benchIds,setBenchIds] = useState<number[]>([]);
  const [lineupFormation,setLineupFormation] = useState('4-3-3');
  const [lineupSlots,setLineupSlots] = useState<FormationSlot[]>([]);
  const [lineupReason,setLineupReason] = useState('');
  const [academyLevel,setAcademyLevel] = useState(1);
  const preserveLineupSelection = useRef(false);
  const [players,setPlayers] = useState<Player[]>([]);
  const [nextMatch,setNextMatch] = useState<NextMatch|null>(null);
  const nextMatchSnapshotRef = useRef<NextMatch|null>(null);
  const updateNextMatch = useCallback((snapshot: NextMatch|null) => {
    const current = nextMatchSnapshotRef.current;
    // A generic next-match response must not swap the active pitch while this
    // match is LIVE. A same-ID response may still advance it to FINISHED, but
    // transient / older snapshots must never unmount or rewind the live renderer.
    if (current && isMatchLive(current.status)) {
      if (!snapshot || Number(snapshot.id) !== Number(current.id)) return current;
      const incomingStatus = String(snapshot.status ?? '').trim().toUpperCase();
      const isTerminal = ['FINISHED', 'FAILED', 'CANCELLED', 'ABANDONED', 'POSTPONED'].includes(incomingStatus);
      if (!isMatchLive(snapshot.status) && !isTerminal) return current;
      if (isMatchLive(snapshot.status)) {
        const oldMinute = Number(current.current_minute ?? 0);
        const newMinute = Number(snapshot.current_minute ?? 0);
        const scoreWentBack = Number(snapshot.home_score ?? 0) < Number(current.home_score ?? 0)
          || Number(snapshot.away_score ?? 0) < Number(current.away_score ?? 0);
        if (newMinute < oldMinute || scoreWentBack) return current;
      }
    }
    nextMatchSnapshotRef.current = snapshot;
    setNextMatch(snapshot);
    return snapshot;
  }, []);
  const [lastMatch,setLastMatch] = useState<LastMatch|null>(null);
  const [league,setLeague] = useState<LeagueResponse|null>(null);
  const [market,setMarket] = useState<MarketPlayer[]>([]);
  const [offers,setOffers] = useState<TransferOffer[]>([]);
  const [transferHistory,setTransferHistory] = useState<TransferHistoryItem[]>([]);
  const [scoutReport,setScoutReport] = useState<ScoutReport|null>(null);
  const [scout,setScout] = useState<MarketPlayer[]>([]);
  const [fixtures,setFixtures] = useState<Fixture[]>([]);
  const [training,setTraining] = useState<TrainingToday|null>(null);
  const [youth,setYouth] = useState<AcademyYouth[]>([]);
  const [packs,setPacks] = useState<Pack[]>([]);
  const [stadium,setStadium] = useState<StadiumInfo|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [toast,setToast] = useState('');
  const [filter,setFilter] = useState('Все');
  const [transferTab,setTransferTab] = useState('Рынок');
  const [formation,setFormation] = useState('4-3-3');
  const [tactics,setTactics] = useState<Record<string,string|number>>({formation:'4-3-3',style:'BALANCE',tempo:50,pressing:50,width:50,defensive_line:50,aggression:50});
  const [busyId,setBusyId] = useState<number|null>(null);
  const [lastPackResult,setLastPackResult] = useState<PackOpeningResult|null>(null);
  const [packOpening,setPackOpening] = useState(false);
  const [packPhase,setPackPhase] = useState<'charge'|'burst'|'reveal'>('charge');
  const [friendlyBusy,setFriendlyBusy] = useState(false);
  const [lastFriendlyResult,setLastFriendlyResult] = useState<PlayedFriendlyMatch|null>(null);
  const [livePanel,setLivePanel] = useState<'substitute'|'tactics'|null>(null);
  const [livePlayerOutId,setLivePlayerOutId] = useState<number|null>(null);
  const [livePlayerInId,setLivePlayerInId] = useState<number|null>(null);
  const [liveActionBusy,setLiveActionBusy] = useState(false);
  const [trainingResult,setTrainingResult] = useState('');
  const [selectedPlayer,setSelectedPlayer] = useState<LineupPlayer|null>(null);
  const [playerTab,setPlayerTab] = useState<'overview'|'attributes'|'statistics'>('overview');
  const [playerAction,setPlayerAction] = useState<'menu'|'sale'|null>(null);
  const [salePrice,setSalePrice] = useState('');
  const [trainingFocus,setTrainingFocus] = useState('BALANCED');

  const [trainingIntensity,setTrainingIntensity] = useState('NORMAL');

  // Telegram WebView may scroll its visual viewport while the document stays
  // fixed. Keep player and scouting dialogs centered on the visible screen.
  useEffect(() => {
    if (!selectedPlayer && !scoutReportOpen) return;
    const root = document.documentElement;
    const previousTop = root.style.getPropertyValue('--fm-overlay-top');
    const previousHeight = root.style.getPropertyValue('--fm-overlay-height');
    const previousOverflow = document.body.style.overflow;
    const updateViewport = () => {
      const viewport = window.visualViewport;
      const top = Math.max(0, viewport?.offsetTop ?? 0);
      const height = Math.max(240, viewport?.height ?? window.innerHeight);
      root.style.setProperty('--fm-overlay-top', `${top}px`);
      root.style.setProperty('--fm-overlay-height', `${height}px`);
    };
    const viewport = window.visualViewport;
    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    document.body.style.overflow = 'hidden';
    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      if (previousTop) root.style.setProperty('--fm-overlay-top', previousTop);
      else root.style.removeProperty('--fm-overlay-top');
      if (previousHeight) root.style.setProperty('--fm-overlay-height', previousHeight);
      else root.style.removeProperty('--fm-overlay-height');
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedPlayer, scoutReportOpen]);

  const notify = useCallback((message:string) => { setToast(message); window.setTimeout(()=>setToast(''),3500); }, []);
  const go = (p:Page) => { setPage(p); setError(''); };
  const handleClubNameSaved = useCallback((name:string) => { setClub(current => ({...current, name})); }, []);
  const refreshClub = useCallback(async () => {
    const [clubData,squadData,leagueData] = await Promise.all([getClub(initialClub.id),getSquad(initialClub.id),getLeague()]);
    setClub(clubData); setPlayers(squadData.players); setLeague(leagueData);
  },[initialClub.id]);

  const loadPage = useCallback(async (target:Page) => {
    setLoading(true); setError('');
    try {
      if (target==='home'||target==='team'||target==='squad') {
        const tasks = await Promise.allSettled([getClub(initialClub.id),getSquad(initialClub.id),getLeague(),getNextMatch(),getLastMatch()]);
        if (tasks[0].status==='fulfilled') setClub(tasks[0].value);
        if (tasks[1].status==='fulfilled') setPlayers(tasks[1].value.players);
        if (tasks[2].status==='fulfilled') setLeague(tasks[2].value);
        if (tasks[3].status==='fulfilled') updateNextMatch(tasks[3].value.match);
        if (tasks[4].status==='fulfilled') setLastMatch(tasks[4].value.match);
        const failed=tasks.find(t=>t.status==='rejected'); if(failed&&failed.status==='rejected') throw failed.reason;
      } else if(target==='tactics') { const [t,c] = await Promise.all([getTactics(initialClub.id),getClub(initialClub.id)]); setTactics(t); setClub(c); }
      else if(target==='transfers') { const [r,o,h,sr]=await Promise.all([getTransferListings(),getTransferOffers(),getTransferHistory(),getScoutRecommendations()]); setMarket(r.listings); setOffers(o.offers); setTransferHistory(h.transfers); setScout(sr.recommendations); }
      else if(target==='scout') { const r=await getScoutRecommendations(); setScout(r.recommendations); }
      else if(target==='league') { const [l,f]=await Promise.all([getLeague(),getFixtures()]); setLeague(l); setFixtures(f.fixtures); }
      else if(target==='training') { setTraining(await getTrainingToday()); }
      else if(target==='academy') { const r=await getAcademyYouth(); setYouth(r.youth); setAcademyLevel(r.academy_level||1); }
      else if(target==='lineup') { const r=await getStartingLineup(); setLineupPlayers(r.players); if(preserveLineupSelection.current){preserveLineupSelection.current=false;}else{setLineupSlots(r.formation_slots||[]);setStartingIds(r.starting_ids);setBenchIds(r.bench_ids||[]);setLineupFormation(r.formation);} }
      else if(target==='profile') { setEmblemShape(club.emblem_shape||'shield'); setEmblemColor(club.emblem_color||'blue'); setEmblemSymbol(club.emblem_symbol||'ball'); }
      else if(target==='packs') { setPacks((await getPacks()).packs); }
      else if(target==='stadium') { setStadium(await getStadiumInfo()); }
      else if(target==='match') {
        const matchResponse=await getNextMatch();
        const requestedMatch=matchResponse.match ?? null;
        const currentMatch=updateNextMatch(requestedMatch);
        const [lineupResponse,tacticsResponse]=await Promise.all([getStartingLineup(),getTactics(initialClub.id)]);
        setLineupPlayers(lineupResponse.players);
        setLineupFormation(lineupResponse.formation);
        setLineupSlots(lineupResponse.formation_slots||[]);
        setTactics(tacticsResponse);
        if(currentMatch && isMatchLive(currentMatch.status)) {
          const currentLineup=await getLiveMatchLineup(currentMatch.id);
          setStartingIds(currentLineup.starting_ids);
          setBenchIds(currentLineup.bench_ids||[]);
          setLivePlayerOutId(currentLineup.starting_ids[0]??null);
          setLivePlayerInId(currentLineup.bench_ids[0]??null);
        } else {
          setStartingIds(lineupResponse.starting_ids);
          setBenchIds(lineupResponse.bench_ids||[]);
          setLivePanel(null);
        }
      }
      else if(target==='tactics') { setTactics(await getTactics(initialClub.id)); }
    } catch(e) { setError(errorText(e)); }
    finally { setLoading(false); }
  },[initialClub.id,updateNextMatch]);

  const openPlayerProfile = async (playerId:number) => {
    setError('');
    try {
      const data = await getStartingLineup();
      setLineupPlayers(data.players);
      const player = data.players.find(candidate=>candidate.id===playerId);
      if (!player) throw new Error('Карточка игрока не найдена в составе клуба.');
      setSelectedPlayer(player);
      setPlayerTab('overview');
      setPlayerAction(null);
      setSalePrice(String(Math.max(10000,Math.round((player.overall||40)*25000))));
    } catch (e) {
      setError(errorText(e));
    }
  };

  useEffect(()=>{void loadPage(page);},[page,loadPage]);
  useEffect(()=>{
    let disposed = false;
    let inFlight = false;
    const refreshMatch = async () => {
      if (disposed || inFlight) return;
      inFlight = true;
      try {
        const current = nextMatchSnapshotRef.current;
        if (current && isMatchLive(current.status)) {
          // Poll the current match by its immutable ID. /matches/next is meant
          // to discover fixtures and may switch rows; it must not drive the LIVE canvas.
          const response = await getMatchSnapshot(current.id);
          if (disposed) return;
          const snapshot = response.match;
          if (snapshot && Number(snapshot.id) === Number(current.id)) updateNextMatch(snapshot);
          // Preserve the last good frame for a missing/failed snapshot; retry in 5 seconds.
          return;
        }
        const response = await getNextMatch();
        if (!disposed) updateNextMatch(response.match);
      } catch {
        // A temporary API/network error must never blank or restart an active match.
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => { void refreshMatch(); }, 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  },[updateNextMatch]);

  const reload=()=>void loadPage(page);
  const buy=async(p:MarketPlayer)=>{setBusyId(p.id);setError('');try{const result=await bidForPlayer(p.id);notify(result.status==='offer_submitted'?`Предложение отправлено: ${money(result.price)}`:`Игрок приобретён за ${money(result.price)}`);await Promise.all([loadPage('transfers'),refreshClub()]);}catch(e){setError(errorText(e));}finally{setBusyId(null);}};
  const playerName=(p:{first_name:string;last_name:string})=>`${p.first_name} ${p.last_name}`.trim();
  const MarketRows=({rows,scouting=false}:{rows:MarketPlayer[];scouting?:boolean})=>rows.length?rows.map(p=><div className="market-row" key={p.id}><PlayerPortrait name={playerName(p)} seed={p.id} className="avatar large player-placeholder" /><div className="player-info"><b>{playerName(p)}</b><small>{p.position} · {p.age} лет · OVR {p.overall??'—'}</small><small>Потенциал {p.potential} · {money(p.asking_price||p.market_value)}</small></div><ActionButton disabled={busyId===p.id} onClick={()=>scouting?void loadScoutReport(p):void buy(p)}>{scouting?'Отчёт':p.is_listed?'Предложить':'Купить'}</ActionButton></div>):<p className="muted">{loading?'Загрузка…':'Нет доступных игроков.'}</p>;
  const loadScoutReport=async(p:MarketPlayer)=>{setBusyId(p.id);setError('');try{const report=await getScoutReport(p.id);setScoutReport(report);setScoutReportOpen(true);}catch(e){setError(errorText(e));}finally{setBusyId(null);}};

  return <div className="app-shell"><div className="topline"><span>{new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span><span>FOOTBALL MANAGER</span></div>
    {page==='home'&&<><div className="brand"><ClubEmblem shape="shield" color="blue" symbol="ball" size={28}/><b>Football Manager</b><button aria-label="Открыть разделы" onClick={()=>go('league')}><Menu size={20}/></button></div><Card cls="profile"><div className="manager"><ManagerPortrait avatarId={managerAvatarId} className="manager-portrait" title={managerName}/></div><div><b>{managerName}</b><small>Менеджер клуба</small><strong><ClubEmblem shape={club.emblem_shape} color={club.emblem_color} symbol={club.emblem_symbol} size={28}/> {club.name}</strong><small>{league?.division_name||club.division_name||league?.league_name||'Дивизион не назначен'}</small><button className="text-action" onClick={()=>go('profile')}>Изменить профиль и эмблему →</button></div></Card><div className="stats"><div><small>Репутация</small><b>{club.reputation??'—'}</b></div><div><small>Бюджет</small><b>{money(club.budget)}</b></div><div><small>Болельщики</small><b>{club.fans??'—'}</b></div></div><div className="tiles">{homeTiles.map(({icon:TileIcon,label,id})=><button className="tile" key={id} onClick={()=>go(id)}><span><TileIcon size={25} strokeWidth={1.7}/></span><b>{label}</b><small>Открыть раздел</small></button>)}</div><Card><h3>Ближайший матч</h3>{nextMatch?<><b>{nextMatch.home_name} — {nextMatch.away_name}</b><p className="muted">{isMatchLive(nextMatch.status)?`LIVE · ${nextMatch.current_minute??0}′`:dateText(nextMatch.scheduled_at)} · {nextMatch.competition_name||nextMatch.status}</p></>:<p className="muted">{loading?'Загружаем расписание…':'Матч пока не назначен'}</p>}<ActionButton onClick={()=>go('match')}>Открыть матч →</ActionButton>{lastMatch&&<div className="last-match-result"><div className="last-match-heading"><span>ПОСЛЕДНИЙ РЕЗУЛЬТАТ</span><small>{lastMatch.competition_name||'Матч завершён'}</small></div><div className="last-match-score"><b>{lastMatch.home_name}</b><strong>{lastMatch.home_score} : {lastMatch.away_score}</strong><b>{lastMatch.away_name}</b></div><small className="last-match-date">{dateText(lastMatch.finished_at||lastMatch.started_at||lastMatch.scheduled_at)}</small></div>}</Card></>}

    {page==='team'&&<><ScreenHeader title="Команда" budget={club.budget} onBack={()=>go('home')} /><div className="tabs"><button onClick={()=>go('squad')}>Все игроки</button><button onClick={()=>go('lineup')}>Стартовый состав</button><button onClick={()=>go('tactics')}>Тактика</button><button onClick={()=>go('training')}>Тренировки</button></div><Card><div className="clubhero"><div className="crest"><ClubEmblem shape={club.emblem_shape} color={club.emblem_color} symbol={club.emblem_symbol} size={52}/></div><div><h2>{club.name}</h2><small>{league?.division_name||club.division_name||league?.league_name||'Дивизион не назначен'}</small></div></div><div className="teamstats"><div><small>Игроков</small><b>{players.length}</b></div><div><small>Стадион</small><b>{club.stadium_level??1} ур.</b></div><div><small>Репутация</small><b>{club.reputation??'—'}</b></div></div></Card><Card><h3>Состав</h3>{players.slice(0,5).map(p=><div className="player-row" key={p.id}><PlayerPortrait name={`${p.first_name} ${p.last_name}`} seed={p.id} imageUrl={p.portrait_url} className="avatar player-placeholder" /><div className="player-info"><b>{p.first_name} {p.last_name}</b><small>{p.position} · {p.age??'—'} лет</small></div><strong className="rating">{p.overall}</strong></div>)}<ActionButton onClick={()=>go('squad')}>Весь состав →</ActionButton></Card></>}
    {page==='squad'&&<><ScreenHeader title="Состав" budget={club.budget} onBack={()=>go('home')} /><div className="lineup-actions"><ActionButton onClick={()=>go('lineup')}>Стартовый состав</ActionButton><ActionButton secondary onClick={async()=>{setLoading(true);setError('');try{const r=await autoSelectStartingLineup();setStartingIds(r.starting_ids);setBenchIds(ids=>ids.filter(id=>!r.starting_ids.includes(id)));setLineupFormation(r.formation||'4-3-3');notify('Автосостав рассчитан и сохранён');go('lineup');}catch(e){setError(errorText(e));}finally{setLoading(false);}}}><Zap className="button-icon" size={14}/> Автовыбор</ActionButton><ActionButton secondary onClick={async()=>{setLoading(true);setError('');try{const r=await getLineupRecommendation();setStartingIds(r.starting_ids);setBenchIds(ids=>ids.filter(id=>!r.starting_ids.includes(id)));setLineupFormation(r.formation);setLineupSlots(r.formation_slots||[]);setLineupReason(r.reason);preserveLineupSelection.current=true;notify('AI-рекомендация готова');go('lineup');}catch(e){setError(errorText(e));}finally{setLoading(false);}}}><Brain className="button-icon" size={14}/> Рекомендация</ActionButton></div><div className="tabs">{['Все','Вратари','Защитники','Полузащитники','Нападающие'].map(x=><button className={filter===x?'active':''} key={x} onClick={()=>setFilter(x)}>{x}</button>)}</div><Card>{players.filter(p=>filter==='Все'||(filter==='Вратари'&&p.position==='GK')||(filter==='Защитники'&&['LB','CB','RB'].includes(p.position))||(filter==='Полузащитники'&&['DM','CM','AM'].includes(p.position))||(filter==='Нападающие'&&['LW','RW','ST'].includes(p.position))).map(p=><div className="player-row" key={p.id}><PlayerPortrait name={`${p.first_name} ${p.last_name}`} seed={p.id} imageUrl={p.portrait_url} className="avatar" /><div className="player-info player-info-clickable" role="button" tabIndex={0} onClick={()=>void openPlayerProfile(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void openPlayerProfile(p.id);}}}><b>{p.first_name} {p.last_name}</b><small>{p.position} · {p.age??'—'} лет · форма {p.fitness}%</small></div><strong className="rating">{p.overall}</strong></div>)}{!players.length&&<p className="muted">{loading?'Загрузка состава…':'Состав пока пуст.'}</p>}</Card></>}
    {page==='lineup'&&<><ScreenHeader title="Стартовый состав" budget={club.budget} onBack={()=>go('home')} /><Card><div className="section-title"><h3>Стартовые 11</h3><span className="muted">{startingIds.length}/11</span></div><div className="lineup-pitch"><div className="lineup-halfline"/><div className="lineup-circle"/><div className="lineup-goal top"/><div className="lineup-goal bottom"/>{orderIdsForSlots(startingIds,lineupPlayers,lineupSlots.length===11?lineupSlots:[]).map((id,index)=>{const p=lineupPlayers.find(x=>x.id===id);const slot=lineupSlots[index];if(!p||!slot)return null;return <div className="lineup-marker" key={id} style={{left:`${slot.x}%`,top:`${100-slot.y}%`}}><PlayerPortrait name={`${p.first_name} ${p.last_name}`} seed={p.id} imageUrl={p.portrait_url} className="lineup-player-mini" title={`${p.first_name} ${p.last_name}`} /><b>{p.last_name}</b><small>{p.position} · {p.overall}</small></div>;})}</div><p className="muted">Расстановка {lineupFormation}. Выбирай игроков ниже; травмированные и дисквалифицированные отмечены отдельно.</p><div className="lineup-actions"><ActionButton disabled={loading} onClick={async()=>{setLoading(true);setError('');try{const r=await autoSelectStartingLineup();setStartingIds(r.starting_ids);setLineupReason('Автосостав сохранён по рейтингу, позиции и доступности игроков.');notify('Автосостав сохранён');await loadPage('lineup');}catch(e){setError(errorText(e));}finally{setLoading(false);}}}><Zap className="button-icon" size={14}/> Автовыбор состава</ActionButton><ActionButton secondary disabled={loading} onClick={async()=>{setLoading(true);setError('');try{const r=await getLineupRecommendation();setStartingIds(r.starting_ids);setBenchIds(ids=>ids.filter(id=>!r.starting_ids.includes(id)));setLineupFormation(r.formation);setLineupSlots(r.formation_slots||[]);setLineupReason(r.reason);notify('Рекомендация состава готова');}catch(e){setError(errorText(e));}finally{setLoading(false);}}}><Brain className="button-icon" size={14}/> Рекомендация AI</ActionButton></div>{lineupReason&&<div className="recommendation-note"><b>Рекомендация</b><p>{lineupReason}</p><ActionButton disabled={startingIds.length!==11} onClick={async()=>{try{const saved=await saveStartingLineup(startingIds,lineupFormation,benchIds);setStartingIds(saved.starting_ids);setBenchIds(saved.bench_ids||benchIds);setLineupFormation(saved.formation||lineupFormation);notify('Состав и лавка сохранены в базе');}catch(e){setError(errorText(e));}}}>Сохранить рекомендованный состав</ActionButton></div>}</Card><Card><h3>Игроки команды</h3><p className="muted">Выбрано {startingIds.length} из 11. Нельзя выбрать одного игрока дважды.</p>{lineupPlayers.map(p=>{const selected=startingIds.includes(p.id);const onBench=benchIds.includes(p.id);const unavailable=p.is_injured||Number(p.suspension_matches||0)>0;return <div className="player-row" key={p.id}><PlayerPortrait name={`${p.first_name} ${p.last_name}`} seed={p.id} imageUrl={p.portrait_url} className="avatar player-placeholder" /><div className="player-info player-info-clickable" role="button" tabIndex={0} onClick={()=>{setSelectedPlayer(p);setPlayerTab('overview');setPlayerAction(null);setSalePrice(String(Math.max(10000,Math.round((p.overall||40)*25000))));}}><b>{p.first_name} {p.last_name}</b><small>{p.position} · OVR {p.overall} · форма {p.fitness}%</small>{unavailable&&<small className="unavailable">{p.is_injured?'Травмирован':'Дисквалификация'}</small>}{onBench&&<small className="bench-selected-label">В заявке на матч</small>}</div><div className="player-row-actions"><ActionButton secondary disabled={unavailable||(!selected&&startingIds.length>=11)} onClick={()=>{if(selected){setStartingIds(ids=>ids.filter(x=>x!==p.id));}else{setStartingIds(ids=>[...ids,p.id]);setBenchIds(ids=>ids.filter(x=>x!==p.id));}}}>{selected?'Убрать':'В старт'}</ActionButton><ActionButton secondary disabled={unavailable||selected||(!onBench&&benchIds.length>=7)} onClick={()=>setBenchIds(ids=>onBench?ids.filter(x=>x!==p.id):[...ids,p.id])}>{onBench?'Убрать с лавки':'В запас'}</ActionButton></div></div>;})}<div className="bench-panel"><div className="section-title"><h3>Лавка на матч</h3><span className="muted">{benchIds.length}/7</span></div>{lineupPlayers.filter(p=>benchIds.includes(p.id)).length?lineupPlayers.filter(p=>benchIds.includes(p.id)).map(p=><div className="player-row bench-row" key={'bench-'+p.id}><PlayerPortrait name={`${p.first_name} ${p.last_name}`} seed={p.id} imageUrl={p.portrait_url} className="avatar player-placeholder" /><div className="player-info player-info-clickable" role="button" tabIndex={0} onClick={()=>{setSelectedPlayer(p);setPlayerTab('overview');setPlayerAction(null);setSalePrice(String(Math.max(10000,Math.round((p.overall||40)*25000))));}}><b>{p.first_name} {p.last_name}</b><small>{p.position} · OVR {p.overall} · {p.age||'—'} лет</small></div><ActionButton secondary disabled={startingIds.length>=11||p.is_injured||Number(p.suspension_matches||0)>0} onClick={()=>{setStartingIds(ids=>[...ids,p.id]);setBenchIds(ids=>ids.filter(x=>x!==p.id));}}>В основу</ActionButton></div>):<p className="muted">Выбери до 7 здоровых игроков в колонке «В запас» выше.</p>}<p className="muted">Выбор лавки сохраняется вместе со стартовым составом и используется live-движком для замен.</p></div><ActionButton disabled={startingIds.length!==11||loading||benchIds.some(id=>startingIds.includes(id))} onClick={async()=>{setLoading(true);setError('');try{const saved=await saveStartingLineup(startingIds,lineupFormation,benchIds);setStartingIds(saved.starting_ids);setBenchIds(saved.bench_ids||benchIds);setLineupFormation(saved.formation||lineupFormation);notify('Стартовый состав и лавка сохранены в базе');}catch(e){setError(errorText(e));}finally{setLoading(false);}}}>Сохранить состав и лавку ({startingIds.length}/11 · {benchIds.length}/7)</ActionButton></Card></>}
    {page==='profile'&&<><ScreenHeader title="Профиль менеджера" budget={club.budget} onBack={()=>go('home')} /><ManagerClubIdentityForm managerName={managerName} club={club} loading={loading} onManagerSaved={setManagerName} onClubNameSaved={handleClubNameSaved} onNotify={notify} onError={setError} /><Card><h3>Эмблема клуба</h3><div className="crest-preview"><ClubEmblem shape={emblemShape} color={emblemColor} symbol={emblemSymbol} size={64}/><div><small>ПРЕДПРОСМОТР</small><b>{club.name}</b></div></div><label className="field-label">Форма</label><select value={emblemShape} onChange={e=>setEmblemShape(e.target.value)}>{[['shield','Щит'],['circle','Круг'],['diamond','Ромб'],['triangle','Треугольник'],['star','Звезда'],['square','Квадрат']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><label className="field-label">Цвет</label><select value={emblemColor} onChange={e=>setEmblemColor(e.target.value)}>{[['blue','Синий'],['red','Красный'],['green','Зелёный'],['yellow','Жёлтый'],['purple','Фиолетовый'],['orange','Оранжевый'],['black','Чёрный'],['white','Белый']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><label className="field-label">Символ</label><select value={emblemSymbol} onChange={e=>setEmblemSymbol(e.target.value)}>{[['ball','Мяч'],['lion','Лев'],['eagle','Орёл'],['wolf','Волк'],['lightning','Молния'],['crown','Корона'],['star','Звезда']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><ActionButton disabled={loading} onClick={async()=>{setLoading(true);setError('');try{await updateClubEmblem({emblem_shape:emblemShape,emblem_color:emblemColor,emblem_symbol:emblemSymbol});setClub(c=>({...c,emblem_shape:emblemShape,emblem_color:emblemColor,emblem_symbol:emblemSymbol}));notify('Эмблема клуба сохранена');}catch(e){setError(errorText(e));}finally{setLoading(false);}}}>Сохранить эмблему</ActionButton><ClubKitGallery color={emblemColor} shape={emblemShape} symbol={emblemSymbol}/></Card></>}
    {page==='tactics'&&<><ScreenHeader title="Тактика" budget={club.budget} onBack={()=>go('home')} /><Card><label>Расстановка</label><select value={String(tactics.formation||formation)} onChange={e=>{setFormation(e.target.value);setTactics(t=>({...t,formation:e.target.value}));}}>{['4-2-3-1','4-3-3','3-5-2','4-4-2','5-3-2'].map(x=><option key={x}>{x}</option>)}</select>{(['pressing','width','tempo','defensive_line','aggression'] as const).map(key=><div className="range" key={key}><label>{({pressing:'Прессинг',width:'Ширина',tempo:'Темп',defensive_line:'Линия защиты',aggression:'Агрессия'} as Record<string,string>)[key]}</label><input type="range" min="0" max="100" value={Number(tactics[key]??50)} onChange={e=>setTactics(t=>({...t,[key]:Number(e.target.value)}))}/><span>{tactics[key]??50}</span></div>)}<ActionButton onClick={async()=>{try{await saveTactics(initialClub.id,tactics);notify('Тактика сохранена в базе данных');}catch(e){setError(errorText(e));}}}>Сохранить тактику</ActionButton></Card></>}

    {page==='transfers'&&<><ScreenHeader title="Трансферный рынок" budget={club.budget} onBack={()=>go('home')} /><div className="tabs">{['Рынок','Скаутинг','Мои заявки','История'].map(x=><button key={x} className={transferTab===x?'active':''} onClick={()=>{setTransferTab(x);if(x==='Скаутинг'&&!scout.length)void getScoutRecommendations().then(r=>setScout(r.recommendations)).catch(e=>setError(errorText(e)));}}>{x}</button>)}</div><Card><div className="section-title"><h3>{transferTab==='Рынок'?'Доступные игроки':transferTab==='Скаутинг'?'Скаутские рекомендации':transferTab}</h3><span className="muted">Бюджет {money(club.budget)}</span></div>{transferTab==='Рынок'?<MarketRows rows={market}/>:transferTab==='Скаутинг'?<><MarketRows rows={scout} scouting/>{scoutReport&&!scoutReportOpen&&<div className="recommendation-note"><b>Отчёт: {playerName(scoutReport.player)}</b><p>{scoutReport.recommendation}</p><p>OVR {scoutReport.player.overall??'—'} · потенциал {scoutReport.player.potential} · разница {scoutReport.potential_gap}</p><h4>Сильные стороны</h4>{scoutReport.strengths.map(a=><div className="effect" key={a.attribute}><span>{a.attribute}</span><b>{a.value}</b></div>)}<h4>Зоны развития</h4>{scoutReport.weaknesses.map(a=><div className="effect" key={a.attribute}><span>{a.attribute}</span><b>{a.value}</b></div>)}</div>}</>:transferTab==='Мои заявки'?(offers.length?offers.map(o=><div className="effect" key={o.id}><span><b>{o.player_name}</b><small>{o.is_incoming?'Входящее предложение':'Ваше предложение'} · {o.buyer_club_name} · {dateText(o.created_at)}</small><small>{money(o.amount)} · {o.status}</small>{o.is_incoming&&o.status==='PENDING'&&<div className="tabs"><button disabled={busyId===o.id} onClick={async()=>{setBusyId(o.id);setError('');try{await acceptTransferOffer(o.id);notify(`Предложение за ${o.player_name} принято`);await Promise.all([loadPage('transfers'),refreshClub()]);}catch(e){setError(errorText(e));}finally{setBusyId(null);}}}>Принять</button><button disabled={busyId===o.id} onClick={async()=>{setBusyId(o.id);setError('');try{await rejectTransferOffer(o.id);notify('Предложение отклонено');await loadPage('transfers');}catch(e){setError(errorText(e));}finally{setBusyId(null);}}}>Отклонить</button></div>}</span></div>):<p className="muted">Заявок пока нет.</p>):(transferHistory.length?transferHistory.map(t=><div className="effect" key={t.id}><span><b>{t.player_name}</b><small>{t.from_club_name||'Свободный агент'} → {t.to_club_name||'Свободный агент'} · {dateText(t.created_at)}</small></span><b>{money(t.price)}</b></div>):<p className="muted">История трансферов пока пуста.</p>)}<ActionButton secondary onClick={reload}>Обновить рынок</ActionButton><ActionButton onClick={async()=>{setError('');try{const candidates=(scout.length?scout:market).slice().sort((a,b)=>(b.potential-(b.overall??0))-(a.potential-(a.overall??0)));const recommendation=candidates[0];if(!recommendation){notify('Нет игроков для анализа. Обнови рынок.');return;}setTransferTab('Скаутинг');setScoutReport(await getScoutReport(recommendation.id));setScoutReportOpen(true);notify(`Подготовлен отчёт по игроку ${playerName(recommendation)}.`);}catch(e){setError(errorText(e));}}}><Brain className="button-icon" size={14}/> AI Советник</ActionButton></Card></>}
    {page==='scout'&&<><ScreenHeader title="Скаутинг" budget={club.budget} onBack={()=>go('home')} /><Card><div className="section-title"><h3>Рекомендации скаута</h3><span className="muted">Из базы игроков</span></div><MarketRows rows={scout} scouting/></Card>{scoutReport&&!scoutReportOpen&&<Card><h3>Отчёт: {playerName(scoutReport.player)}</h3><p>{scoutReport.recommendation}</p><p className="muted">Позиция {scoutReport.player.position} · возраст {scoutReport.player.age} · OVR {scoutReport.player.overall??'—'} · потенциал {scoutReport.player.potential} · разница потенциала {scoutReport.potential_gap}</p><h4>Сильные стороны</h4>{scoutReport.strengths.map(a=><div className="effect" key={a.attribute}><span>{a.attribute}</span><b>{a.value}</b></div>)}<h4>Зоны развития</h4>{scoutReport.weaknesses.map(a=><div className="effect" key={a.attribute}><span>{a.attribute}</span><b>{a.value}</b></div>)}</Card>}</>}
    {page==='league'&&<><ScreenHeader title={league?.division_name?`${league.division_name} · ${league.league_name||'Лига'}`:(league?.league_name||'Лига')} budget={club.budget} onBack={()=>go('home')} /><div className="tabs"><button className={filter!=='fixtures'?'active':''} onClick={()=>setFilter('Все')}>Таблица</button><button className={filter==='fixtures'?'active':''} onClick={()=>{setFilter('fixtures');void loadPage('league');}}>Календарь</button></div>{filter==='fixtures'?<Card><div className="section-title"><h3>Календарь сезона</h3><span className="muted">{fixtures.length} матчей</span></div>{fixtures.length?(Object.entries(fixtures.filter(f=>String(f.competition_type??f.comp_type??'LEAGUE').trim().toUpperCase()==='LEAGUE').reduce<Record<string,Fixture[]>>((groups,f)=>{const key=dateKey(f.scheduled_at);(groups[key] ||= []).push(f);return groups;},{})) as [string,Fixture[]][]).sort(([a],[b])=>a==='undated'?1:b==='undated'?-1:a.localeCompare(b)).map(([day,dayFixtures])=><section className="calendar-day" key={day}><div className="calendar-day-title">{day==='undated'?'Дата не назначена':new Date(`${day}T12:00:00`).toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>{dayFixtures.map(f=><div className="calendar-match" key={f.id}><div className="calendar-round">{f.competition_name||'Чемпионат'} · ТУР {f.round}</div><div className="calendar-teams"><b>{f.home_name}</b><span>—</span><b>{f.away_name}</b></div><div className="calendar-meta"><span>{validDate(f.scheduled_at)?validDate(f.scheduled_at)!.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'Время не назначено'}</span><strong className={f.status==='FINISHED'?'calendar-finished':''}>{(f.status==='FINISHED'||isMatchLive(f.status))&&f.home_score!=null&&f.away_score!=null?`${f.home_score} : ${f.away_score}`:'VS'}</strong></div></div>)}</section>):<p className="muted">В текущей лиге нет матчей календаря.</p>}</Card>:<Card><div className="league-row head"><span>#</span><span>Команда</span><span>И</span><span>РМ</span><span>О</span></div>{league?.table?.length?league.table.map((r,i)=><div className={'league-row '+(r.id===club.id?'selected':'')} key={r.id}><span>{i+1}</span><b>{r.name}</b><span>{r.played}</span><span>{r.goals_for-r.goals_against}</span><strong>{r.points}</strong></div>):<p className="muted">Ваш клуб пока не участвует в лиге.</p>}<ActionButton secondary onClick={()=>{setFilter('fixtures');void loadPage('league');}}>Календарь матчей →</ActionButton></Card>}</>}
    {page==='training'&&<><ScreenHeader title="Тренировки" budget={club.budget} onBack={()=>go('home')} /><Card><h3>Тренировка команды</h3>{training?<><div className="teamstats"><div><small>Состав</small><b>{training.squad_size}</b></div><div><small>Средняя форма</small><b>{training.avg_fitness}%</b></div><div><small>План</small><b>{training.focus}</b></div></div><p className="muted">Интенсивность: {training.intensity}. Последняя тренировка: {dateText(training.last_training_at)}</p></>:<p className="muted">{loading?'Загрузка…':'Данные тренировки недоступны.'}</p>}<div className="training-controls"><label>Тип тренировки<select value={trainingFocus} onChange={e=>setTrainingFocus(e.target.value)}><option value="BALANCED">Баланс</option><option value="ATTACK">Атака</option><option value="DEFENSE">Защита</option><option value="PLAYMAKING">Розыгрыш мяча</option><option value="TECHNICAL">Техника</option><option value="PHYSICAL">Физическая подготовка</option><option value="MENTAL">Ментальная подготовка</option><option value="RECOVERY">Восстановление</option></select></label><label>Интенсивность<select value={trainingIntensity} onChange={e=>setTrainingIntensity(e.target.value)}><option value="LIGHT">Лёгкая</option><option value="NORMAL">Средняя</option><option value="HIGH">Интенсивная</option></select></label><p className="muted">Выбранный тип и интенсивность сохраняются в базе и применяются тренировочным сервисом.</p></div><ActionButton disabled={loading} onClick={async()=>{setLoading(true);setError('');try{const r=await completeTraining(trainingFocus,trainingIntensity);if(r.status==='cooldown')setTrainingResult(`Следующая тренировка будет доступна через ${Math.ceil((r.remaining_seconds||0)/3600)} ч.`);else setTrainingResult(`Тренировка завершена. Игроков обработано: ${r.players_trained}.`);setTraining(await getTrainingToday());await refreshClub();}catch(e){setError(errorText(e));}finally{setLoading(false);}}}>Завершить тренировку</ActionButton>{trainingResult&&<p className="muted">{trainingResult}</p>}</Card></>}
    {page==='academy'&&<><ScreenHeader title="Академия" budget={club.budget} onBack={()=>go('home')} /><Card><h3>Молодёжная академия · уровень {academyLevel}</h3><p className="muted">Ограниченный набор воспитанников с учётом уровня академии. Потенциал — не текущий рейтинг.</p>{youth.length?youth.map(p=><div className="player-row" key={p.id}><PlayerPortrait name={`${p.first_name} ${p.last_name}`} seed={p.id} imageUrl={p.portrait_url} className="avatar player-placeholder" /><div className="player-info"><b>{playerName(p)}</b><small>{p.age} лет · {p.position} · OVR {p.overall}</small><small>Потенциал {p.potential}</small></div><ActionButton disabled={busyId===p.id} onClick={async()=>{setBusyId(p.id);try{const r=await promoteYouth(p.id);notify(`${r.name} переведён в основной состав`);setYouth(y=>y.filter(x=>x.id!==p.id));await refreshClub();}catch(e){setError(errorText(e));}finally{setBusyId(null);}}}>Вызвать</ActionButton></div>):<p className="muted">{loading?'Загрузка академии…':'Нет доступных воспитанников.'}</p>}</Card></>}
    {page==='packs'&&<><ScreenHeader title="Паки" budget={club.budget} onBack={()=>go('home')} /><div className="pack-intro"><span className="pack-intro-kicker">FM · PLAYER COLLECTION</span><h2>Твой следующий талант</h2><p>Каждый пак — новый шанс усилить команду. Результат определяется сервером, а мы устроим ему достойное появление.</p></div><div className="pack-grid">{packs.map((p,i)=><Card key={p.id} cls={'pack-card pack-card-'+(i%4)}><div className={'pack pack'+(i%4)}><div className="pack-aura"/><div className="pack-foil"/><span className="pack-brand">FM</span><span className="pack-symbol">{p.min_ovr>=85?<Sparkles size={32}/>:p.min_ovr>=75?<Shield size={32}/>:<CirclePlay size={32}/> }</span><b className="pack-edition">{p.min_ovr>=85?'ELITE':p.min_ovr>=75?'PREMIUM':'PLAYER PACK'}</b><span className="pack-seal"><Sparkles size={13}/></span></div><b className="pack-name">{p.name}</b><small className="pack-ovr">Гарантированный диапазон · OVR {p.min_ovr}–{p.max_ovr}</small><strong className="pack-price">{money(p.price_coins)}</strong><ActionButton disabled={busyId===p.id||packOpening} onClick={async()=>{setBusyId(p.id);setError('');setPackPhase('charge');setPackOpening(true);setLastPackResult(null);try{const opening=openPack(p.id);await new Promise(resolve=>window.setTimeout(resolve,850));setPackPhase('burst');const r=await opening;setLastPackResult(r);await refreshClub();setPackPhase('reveal');await new Promise(resolve=>window.setTimeout(resolve,2600));setPackOpening(false);}catch(e){setPackOpening(false);setError(errorText(e));}finally{setBusyId(null);}}}>{busyId===p.id?'Подготовка…':<><Sparkles className="button-icon" size={14}/> Открыть пак</>}</ActionButton></Card>)}</div>{lastPackResult&&!packOpening&&<Card cls="pack-result-wrap"><div className="pack-result-heading"><span>НОВОЕ ПОДПИСАНИЕ</span><h3>Добро пожаловать в клуб</h3></div><div className={'player-card '+rarityClass(lastPackResult.rarity)}><div className="player-card-top"><span>{rarityLabel(lastPackResult.rarity)}</span><strong>OVR {lastPackResult.ovr}</strong></div><div className="player-card-art"><PlayerPortrait name={lastPackResult.name} seed={lastPackResult.player_id} imageUrl={lastPackResult.portrait_url} className="pack-player-portrait"/><b>{lastPackResult.position}</b></div><div className="player-card-info"><h2>{lastPackResult.name}</h2><p>{lastPackResult.age||'—'} лет · {lastPackResult.nationality||'Национальность не указана'}</p><div className="player-card-stats"><span><small>ОВР</small><b>{lastPackResult.ovr}</b></span><span><small>ПОТЕНЦИАЛ</small><b>{lastPackResult.potential??'—'}</b></span><span><small>РЕДКОСТЬ</small><b>{rarityLabel(lastPackResult.rarity)}</b></span></div></div></div><p className="muted">Игрок добавлен в твой клуб.</p></Card>}{!packs.length&&<p className="muted">{loading?'Загрузка паков…':'Паки пока недоступны.'}</p>}{packOpening&&<div className={'pack-opening-overlay phase-'+packPhase} role="dialog" aria-modal="true" aria-label="Открытие футбольного пака"><div className="pack-opening-stadium"><div className="opening-spotlight spotlight-left"/><div className="opening-spotlight spotlight-right"/><div className="opening-particles"/><div className="opening-pitch-lines"/></div><div className="pack-opening-content"><div className="opening-topline"><span>FOOTBALL MANAGER</span><span>{packPhase==='charge'?'01 / 03':packPhase==='burst'?'02 / 03':'03 / 03'}</span></div><p className="opening-caption">{packPhase==='charge'?'Стадион затаил дыхание':packPhase==='burst'?'ЭНЕРГИЯ ВЫРЫВАЕТСЯ НАРУЖУ':'НОВЫЙ ИГРОК В ТВОЁМ КЛУБЕ'}</p>{packPhase!=='reveal'||!lastPackResult?<div className={'pack-opening-back '+(packPhase==='burst'?'pack-burst':'')}><div className="opening-card-rim"/><span className="opening-monogram">FM</span><i className="opening-star"><Sparkles size={43}/></i><b>PLAYER PACK</b><small>{packs.find(p=>p.id===busyId)?.name||'SPECIAL EDITION'}</small><div className="opening-seal"><Sparkles size={24}/></div></div>:<div className="pack-result-stage"><div className="reveal-rays"/><div className={'player-card reveal-card '+rarityClass(lastPackResult.rarity)}><div className="player-card-top"><span>{rarityLabel(lastPackResult.rarity)}</span><strong>OVR {lastPackResult.ovr}</strong></div><div className="player-card-art"><PlayerPortrait name={lastPackResult.name} seed={lastPackResult.player_id} imageUrl={lastPackResult.portrait_url} className="pack-player-portrait"/><b>{lastPackResult.position}</b></div><div className="player-card-info"><h2>{lastPackResult.name}</h2><p>{lastPackResult.age||'—'} лет · {lastPackResult.nationality||'Игрок клуба'}</p><div className="player-card-stats"><span><small>ОВР</small><b>{lastPackResult.ovr}</b></span><span><small>ПОТЕНЦИАЛ</small><b>{lastPackResult.potential??'—'}</b></span><span><small>РЕДКОСТЬ</small><b>{rarityLabel(lastPackResult.rarity)}</b></span></div></div></div></div>}<p className="opening-subtitle">{packPhase==='charge'?'Проверяем контракт · Готовим выход на поле':packPhase==='burst'?'Определяем редкость и раскрываем карточку':'Трансфер подтверждён · Игрок добавлен в состав'}</p>{packPhase==='reveal'&&<ActionButton onClick={()=>setPackOpening(false)}>Забрать игрока →</ActionButton>}</div></div>}</>}
    {page==='stadium'&&<><ScreenHeader title="Стадион" budget={club.budget} onBack={()=>go('home')} /><Card><div className="stadium-art stadium-photo"><div className="stadium-lights"><Sparkles size={14}/><Sparkles size={18}/><Sparkles size={14}/></div><div className="stadium-field"></div><span>HOME GROUND</span></div><h2>{stadium?.name||club.stadium_name||'Стадион клуба'}</h2>{stadium?<><div className="teamstats"><div><small>Уровень</small><b>{stadium.level}/20</b></div><div><small>Вместимость</small><b>{new Intl.NumberFormat('ru-RU').format(stadium.capacity)}</b></div><div><small>Болельщики</small><b>{new Intl.NumberFormat('ru-RU').format(stadium.fans)}</b></div></div><div className="effect"><span>Цена билета</span><b>{money(stadium.ticket_price)}</b></div><div className="effect"><span>Стоимость улучшения</span><b>{money(stadium.upgrade_cost)}</b></div><ActionButton disabled={loading||stadium.upgrade_cost==null} onClick={async()=>{setLoading(true);setError('');try{const r=await upgradeStadium();notify(`Стадион улучшен до ${r.level} уровня`);setStadium(await getStadiumInfo());setClub(await getClub(initialClub.id));}catch(e){setError(errorText(e));}finally{setLoading(false);}}}>{stadium.upgrade_cost==null?'Максимальный уровень':'Улучшить стадион'}</ActionButton></>:<p className="muted">{loading?'Загрузка стадиона…':'Данные стадиона недоступны.'}</p>}</Card></>}
    {page==='match'&&<><ScreenHeader title={isMatchLive(nextMatch?.status)?'Матч · LIVE':'Матчи'} budget={club.budget} onBack={()=>go('home')} /><Card><div className="friendly-actions"><ActionButton disabled={friendlyBusy} onClick={async()=>{setFriendlyBusy(true);setError('');try{const r=await playFriendlyMatch('friendly');setLastFriendlyResult(r);notify(r.status==='live'?'Товарищеский матч начался — LIVE':'Товарищеский матч завершён');await loadPage('match');}catch(e){setError(errorText(e));}finally{setFriendlyBusy(false);}}}><Handshake className="button-icon" size={14}/> Товарищеский матч</ActionButton><ActionButton secondary disabled={friendlyBusy} onClick={async()=>{setFriendlyBusy(true);setError('');try{const r=await playFriendlyMatch('test');setLastFriendlyResult(r);notify(r.status==='live'?'Тестовый матч начался — LIVE':'Тестовый матч завершён');await loadPage('match');}catch(e){setError(errorText(e));}finally{setFriendlyBusy(false);}}}><FlaskConical className="button-icon" size={14}/> Запустить тестовый матч</ActionButton></div>{lastFriendlyResult&&<div className="friendly-result"><small>{lastFriendlyResult.competition_name} · матч #{lastFriendlyResult.match_id}</small><div><b>{lastFriendlyResult.home_name}</b><strong>{lastFriendlyResult.status==='live'&&nextMatch?.id===lastFriendlyResult.match_id?(nextMatch?.home_score ?? 0):lastFriendlyResult.home_score} : {lastFriendlyResult.status==='live'&&nextMatch?.id===lastFriendlyResult.match_id?(nextMatch?.away_score ?? 0):lastFriendlyResult.away_score}</strong><b>{lastFriendlyResult.away_name}</b></div><p>{lastFriendlyResult.status==='live'?'Матч идёт в реальном времени. Результат будет обновляться по мере событий.':'Матч завершён.'} На таблицу лиги и обычные награды не влияет.</p></div>}<div className={isMatchLive(nextMatch?.status)?'match-status-live':'prematch-hero'}><div className="prematch-top"><span>{isMatchLive(nextMatch?.status)?'МАТЧ В ПРЯМОМ ЭФИРЕ':'СЛЕДУЮЩИЙ МАТЧ'}</span><small>{nextMatch?.competition_name||'Календарь клуба'}</small></div><div className="prematch-teams"><div><ClubEmblem shape="shield" color="red" symbol="ball" size={58}/><b>{nextMatch?.home_name||'Домашняя команда'}</b></div><strong>{nextMatch&&(isMatchLive(nextMatch!.status)||String(nextMatch!.status).toUpperCase()==='FINISHED')?`${nextMatch!.home_score} : ${nextMatch!.away_score}`:'VS'}</strong><div><ClubEmblem shape="shield" color="blue" symbol="ball" size={58}/><b>{nextMatch?.away_name||'Гость'}</b></div></div><div className="prematch-footer"><span>{isMatchLive(nextMatch?.status)?`LIVE · ${nextMatch!.current_minute??0}′`:dateText(nextMatch?.scheduled_at)}</span><span>{nextMatch?.status==='FINISHED'?'Завершён':isMatchLive(nextMatch?.status)?'Идёт матч':'Подготовьте состав'}</span></div></div><MatchCanvas match={nextMatch}/>{!isMatchLive(nextMatch?.status)&&<div className="prematch-bench-picker"><div className="section-title"><h3>Запасные на матч</h3><span className="muted">{benchIds.length}/7</span></div><p className="muted">Выбери до 7 доступных запасных. Стартовые игроки исключены из списка, а выбор сохраняется в базе клуба.</p>{lineupPlayers.filter(p=>!startingIds.includes(p.id)).map(p=>{const onBench=benchIds.includes(p.id);const unavailable=p.is_injured||Number(p.suspension_matches||0)>0;return <div className="prematch-bench-pick-row" key={p.id}><div className="prematch-bench-pick-info"><b>{p.first_name} {p.last_name}</b><small>{p.position} · OVR {p.overall} · {p.age??'—'} лет</small>{unavailable&&<small className="unavailable">{p.is_injured?'Травмирован':'Дисквалификация'}</small>}</div><ActionButton secondary disabled={unavailable||(!onBench&&benchIds.length>=7)} onClick={()=>setBenchIds(ids=>onBench?ids.filter(id=>id!==p.id):[...ids,p.id])}>{onBench?'Убрать':'В запас'}</ActionButton></div>;})}{!lineupPlayers.length&&<p className="muted">Список игроков пока не загружен.</p>}<ActionButton disabled={loading||startingIds.length!==11||benchIds.some(id=>startingIds.includes(id))} onClick={async()=>{setLoading(true);setError('');try{const saved=await saveStartingLineup(startingIds,lineupFormation,benchIds);setStartingIds(saved.starting_ids);setBenchIds(saved.bench_ids||benchIds);setLineupFormation(saved.formation||lineupFormation);notify('Лавка на матч сохранена в базе клуба');}catch(e){setError(errorText(e));}finally{setLoading(false);}}}>Сохранить лавку · {benchIds.length}/7</ActionButton><ActionButton secondary onClick={()=>go('lineup')}><ClipboardList className="button-icon" size={14}/> Настроить стартовый состав →</ActionButton></div>}{isMatchLive(nextMatch?.status)&&<><Card cls="live-commentator"><div className="live-commentator-heading"><span><Mic className="button-icon" size={14}/> Комментатор матча</span><small>LIVE · AI</small></div>{(() => {const commentary=[...(nextMatch!.events||[])].sort((a,b)=>Number(b.minute||0)-Number(a.minute||0)||Number(b.id||0)-Number(a.id||0)).slice(0,3).reverse();return commentary.length?commentary.map(event=><p className="live-commentary-line" key={event.id}><b>{event.minute}′</b> {event.ai_commentary||event.commentary||event.comment||event.description||'Момент матча'}</p>):<p className="muted live-commentary-empty">Игра идет, ждем опасного момента</p>;})()}</Card><div className="live-match-actions"><ActionButton onClick={()=>{setLivePanel(livePanel==='substitute'?null:'substitute');setLivePlayerOutId(startingIds[0]??null);setLivePlayerInId(benchIds[0]??null);}}><Repeat2 className="button-icon" size={14}/> Замены</ActionButton><ActionButton secondary onClick={()=>{setLivePanel(livePanel==='tactics'?null:'tactics');}}><Target className="button-icon" size={14}/> Тактика</ActionButton></div>{livePanel==='substitute'&&<div className="live-action-panel"><h3>Замена игрока</h3><label>Уходит с поля<select value={livePlayerOutId??''} onChange={e=>setLivePlayerOutId(e.target.value?Number(e.target.value):null)}><option value="">Выбери игрока</option>{startingIds.map(id=>{const p=lineupPlayers.find(player=>player.id===id);return p?<option key={id} value={id}>{p.first_name} {p.last_name} · {p.position}</option>:null;})}</select></label><label>Выходит с лавки<select value={livePlayerInId??''} onChange={e=>setLivePlayerInId(e.target.value?Number(e.target.value):null)}><option value="">Выбери запасного</option>{benchIds.map(id=>{const p=lineupPlayers.find(player=>player.id===id);return p?<option key={id} value={id}>{p.first_name} {p.last_name} · {p.position}</option>:null;})}</select></label><small className="muted">Доступно не более пяти замен за матч. Смена попадёт в события матча.</small><ActionButton disabled={liveActionBusy||!livePlayerOutId||!livePlayerInId||livePlayerOutId===livePlayerInId} onClick={async()=>{if(!livePlayerOutId||!livePlayerInId)return;setLiveActionBusy(true);setError('');try{const r=await substituteLivePlayer(nextMatch!.id,livePlayerOutId,livePlayerInId);const [freshMatch,freshLineup]=await Promise.all([getNextMatch(),getLiveMatchLineup(nextMatch!.id)]);updateNextMatch(freshMatch.match);setStartingIds(freshLineup.starting_ids);setBenchIds(freshLineup.bench_ids);setLivePlayerOutId(freshLineup.starting_ids[0]??null);setLivePlayerInId(freshLineup.bench_ids[0]??null);notify(r.description);}catch(e){setError(errorText(e));}finally{setLiveActionBusy(false);}}}>Подтвердить замену</ActionButton></div>}{livePanel==='tactics'&&<div className="live-action-panel"><h3>Тактика на текущий матч</h3><label>Расстановка<select value={String(tactics.formation||'4-3-3')} onChange={e=>setTactics(t=>({...t,formation:e.target.value}))}>{['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2','4-1-2-1-2','4-3-1-2','4-5-1','3-4-3','4-1-4-1'].map(x=><option key={x}>{x}</option>)}</select></label><label>Стиль<select value={String(tactics.style||'BALANCE')} onChange={e=>setTactics(t=>({...t,style:e.target.value}))}>{['BALANCE','ATTACK','COUNTER','DEFENSE','POSSESSION'].map(x=><option key={x} value={x}>{({BALANCE:'Баланс',ATTACK:'Атака',COUNTER:'Контратаки',DEFENSE:'Оборона',POSSESSION:'Контроль мяча'} as Record<string,string>)[x]}</option>)}</select></label>{(['tempo','pressing','width','defensive_line','aggression'] as const).map(key=><div className="range" key={key}><label>{({tempo:'Темп',pressing:'Прессинг',width:'Ширина',defensive_line:'Линия защиты',aggression:'Агрессия'} as Record<string,string>)[key]}</label><input type="range" min="0" max="100" value={Number(tactics[key]??50)} onChange={e=>setTactics(t=>({...t,[key]:Number(e.target.value)}))}/><span>{tactics[key]??50}</span></div>)}<ActionButton disabled={liveActionBusy} onClick={async()=>{setLiveActionBusy(true);setError('');try{await updateLiveMatchTactics(nextMatch!.id,tactics);notify('Тактика обновлена для текущего матча');setLivePanel(null);}catch(e){setError(errorText(e));}finally{setLiveActionBusy(false);}}}>Применить тактику</ActionButton></div>}</>}{nextMatch?<><h3>{nextMatch!.home_name} — {nextMatch!.away_name}</h3><p className="muted">{nextMatch!.competition_name||nextMatch!.status} · {dateText(nextMatch!.scheduled_at)}</p>{[...(nextMatch!.events||[])].sort((a,b)=>b.minute-a.minute||b.id-a.id).map(event=><div className="event" key={event.id}><b>{event.minute}′</b><span className="match-event-icon">{String(event.event_type).toUpperCase()==='GOAL'?<Trophy size={15}/>:String(event.event_type).toUpperCase()==='SUBSTITUTION'?<Repeat2 size={15}/>:String(event.event_type).toUpperCase().includes('CARD')?<ShieldAlert size={15}/>:<CircleDot size={10}/>}</span>{event.description}</div>)}</>:<p className="muted">Матч пока не назначен.</p>}<ActionButton onClick={()=>void loadPage('match')}>Обновить информацию</ActionButton></Card></>}

    {selectedPlayer&&createPortal(<div className="modal-backdrop player-modal-backdrop" onClick={()=>{setSelectedPlayer(null);setPlayerAction(null);}}><section className="player-detail-modal player-profile-modal" role="dialog" aria-modal="true" aria-label="Карточка игрока" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Закрыть карточку" onClick={()=>{setSelectedPlayer(null);setPlayerAction(null);}}>×</button><div className="player-profile-hero"><div className="player-profile-portrait"><PlayerPortrait name={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`} seed={selectedPlayer.id} imageUrl={selectedPlayer.portrait_url} className="player-profile-portrait-art"/><b>{selectedPlayer.overall}<small>ОБЩ</small></b></div><div className="player-profile-identity"><small className="eyebrow">КАРТОЧКА ИГРОКА</small><h2>{selectedPlayer.first_name} {selectedPlayer.last_name}</h2><p>{selectedPlayer.position} · {selectedPlayer.age||'—'} лет</p><span className={`player-status-pill ${selectedPlayer.is_injured?'status-injured':Number(selectedPlayer.suspension_matches||0)>0?'status-suspended':'status-available'}`}>{selectedPlayer.is_injured?<><Activity size={12}/> Травмирован</>:Number(selectedPlayer.suspension_matches||0)>0?<><ShieldAlert size={12}/> Дисквалификация</>:<><Check size={12}/> В составе</>}</span></div></div><div className="player-quick-facts"><div><small>Возраст</small><b>{selectedPlayer.age??'—'} лет</b></div><div><small>Позиция</small><b>{selectedPlayer.position}</b></div><div><small>Форма</small><b>{selectedPlayer.fitness??'—'}%</b></div><div><small>Мораль</small><b>{selectedPlayer.morale??'—'}%</b></div></div><div className="player-profile-tabs"><button className={playerTab==='overview'?'active':''} onClick={()=>setPlayerTab('overview')}>Обзор</button><button className={playerTab==='attributes'?'active':''} onClick={()=>setPlayerTab('attributes')}>Характеристики</button><button className={playerTab==='statistics'?'active':''} onClick={()=>setPlayerTab('statistics')}>Статистика</button></div>{playerTab==='overview'&&<div className="player-profile-content"><div className="player-form-card"><span className="player-form-icon">↗</span><div><b>Текущая форма</b><strong>{Math.round(((selectedPlayer.fitness||0)+(selectedPlayer.morale||0))/20*10)/10}/10</strong><small>{(selectedPlayer.fitness||0)>=75?'Игрок готов к матчу':'Игроку требуется восстановление'}</small></div></div><div className="player-progress-row"><span>Физическая готовность</span><b>{selectedPlayer.fitness??0}%</b><div><i style={{width:`${Math.max(0,Math.min(100,selectedPlayer.fitness||0))}%`}}/></div></div><div className="player-progress-row"><span>Мораль</span><b>{selectedPlayer.morale??0}%</b><div><i style={{width:`${Math.max(0,Math.min(100,selectedPlayer.morale||0))}%`}}/></div></div><div className="player-contract-note"><b>Статус игрока</b><span>{selectedPlayer.is_injured?'Восстановление после травмы':Number(selectedPlayer.suspension_matches||0)>0?`Дисквалификация · осталось матчей: ${selectedPlayer.suspension_matches}`:'Доступен для выбора в состав'}</span></div></div>}{playerTab==='attributes'&&<div className="player-profile-content player-attribute-list">{[['Скорость',selectedPlayer.pace],['Удар',selectedPlayer.shooting],['Пас',selectedPlayer.passing],['Дриблинг',selectedPlayer.dribbling],['Защита',selectedPlayer.defending],['Физика',selectedPlayer.physical],['Выносливость',selectedPlayer.stamina],['Ментальность',selectedPlayer.mental]].map(([label,value])=><div className="player-attribute" key={String(label)}><span>{label}</span><div><i style={{width:`${Math.max(0,Math.min(100,Number(value)||0))}%`}}/></div><b>{value??'—'}</b></div>)}<p className="muted">Характеристики показаны из данных игрока. Если параметр не сохранён в базе, отображается «—».</p></div>}{playerTab==='statistics'&&<div className="player-profile-content player-stat-grid"><div><small>Общий рейтинг</small><b>{selectedPlayer.overall}</b></div><div><small>Форма</small><b>{selectedPlayer.fitness??'—'}%</b></div><div><small>Мораль</small><b>{selectedPlayer.morale??'—'}%</b></div><div><small>Возраст</small><b>{selectedPlayer.age??'—'}</b></div><p className="muted">Сезонная статистика матчей, голов и передач появится здесь после подключения отдельной статистики игрока на сервере; фиктивные значения не показываем.</p></div>}<ActionButton onClick={()=>setPlayerAction('menu')}><Settings2 className="button-icon" size={14}/> Действия с игроком <span>›</span></ActionButton>{playerAction==='menu'&&<div className="player-action-sheet"><div className="player-action-heading"><b>Действия с игроком</b><button onClick={()=>setPlayerAction(null)}>×</button></div><button onClick={()=>{setPlayerAction(null);setSelectedPlayer(null);go('lineup');}}><span><Shirt size={17}/></span><div><b>Изменить в составе</b><small>Поставить в основу или на замену</small></div><strong>›</strong></button><button onClick={()=>{setPlayerAction(null);setPlayerTab('attributes');}}><span><TrendingUp size={17}/></span><div><b>Развитие игрока</b><small>Посмотреть сильные стороны и зоны роста</small></div><strong>›</strong></button><button onClick={()=>setPlayerAction('sale')}><span><ArrowLeftRight size={17}/></span><div><b>Продать игрока</b><small>Указать цену и выставить на рынок</small></div><strong>›</strong></button><button onClick={()=>{setPlayerAction(null);notify('Аренда будет доступна после подключения соответствующего API');}}><span><ArrowUpRight size={17}/></span><div><b>Отправить в аренду</b><small>Передача игрового опыта</small></div><strong>›</strong></button></div>}{playerAction==='sale'&&<div className="player-sale-sheet"><div className="player-action-heading"><b>Продажа игрока</b><button onClick={()=>setPlayerAction(null)}>×</button></div><div className="player-sale-summary"><PlayerPortrait name={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`} seed={selectedPlayer.id} imageUrl={selectedPlayer.portrait_url} className="player-sale-avatar" /><div><b>{selectedPlayer.first_name} {selectedPlayer.last_name}</b><small>{selectedPlayer.position} · OVR {selectedPlayer.overall}</small></div></div><label className="field-label">Желаемая цена (€)</label><input className="club-name-input" type="number" min="1" inputMode="numeric" value={salePrice} onChange={e=>setSalePrice(e.target.value)}/><p className="muted">Цена должна быть положительной. В составе должно остаться минимум 11 игроков.</p><ActionButton disabled={loading||salePrice.trim()===''||!Number.isFinite(Number(salePrice))||Number(salePrice)<=0||players.length<=11} onClick={async()=>{setLoading(true);setError('');try{const r=await sellPlayer(selectedPlayer.id,Math.floor(Number(salePrice)));notify(`Игрок продан за ${money(r.sale_price)}`);setSelectedPlayer(null);setPlayerAction(null);await refreshClub();await loadPage('lineup');}catch(e){setError(errorText(e));}finally{setLoading(false);}}}><Check className="button-icon" size={14}/> Подтвердить продажу</ActionButton><ActionButton secondary onClick={()=>setPlayerAction('menu')}>Назад к действиям</ActionButton></div>}</section></div>, document.body)}
    {scoutReport&&scoutReportOpen&&createPortal(<div className="modal-backdrop scout-report-backdrop" role="presentation" onClick={()=>{setScoutReportOpen(false);setScoutReport(null);}}><section className="scout-report-modal" role="dialog" aria-modal="true" aria-label="Отчёт скаута" onClick={e=>e.stopPropagation()}><button className="scout-report-close" aria-label="Закрыть отчёт" onClick={()=>{setScoutReportOpen(false);setScoutReport(null);}}>×</button><h2>Отчёт скаута · {playerName(scoutReport.player)}</h2><div className="player-row"><PlayerPortrait name={playerName(scoutReport.player)} seed={scoutReport.player.id} className="avatar large" /><div className="player-info"><b>{scoutReport.player.position} · {scoutReport.player.age??'—'} лет</b><small>OVR {scoutReport.player.overall??'—'} · потенциал {scoutReport.player.potential??'—'}</small><small>Рыночная стоимость {money(scoutReport.player.market_value)}</small></div></div><p>{scoutReport.recommendation}</p><p className="muted">Разница потенциала: {scoutReport.potential_gap}</p><h4>Сильные стороны</h4>{scoutReport.strengths.map(a=><div className="effect" key={a.attribute}><span>{a.attribute}</span><b>{a.value}</b></div>)}<h4>Зоны развития</h4>{scoutReport.weaknesses.map(a=><div className="effect" key={a.attribute}><span>{a.attribute}</span><b>{a.value}</b></div>)}<ActionButton onClick={()=>{setScoutReportOpen(false);setScoutReport(null);}}>Закрыть отчёт</ActionButton></section></div>, document.body)}
    {error&&<div className="api-error"><b>Ошибка</b><p>{error}</p><ActionButton secondary onClick={reload}>Повторить</ActionButton></div>}
    {loading&&<div className="skeleton">Обновляем данные…</div>}
    <nav className="bottom-nav">{nav.map(n=>{const NavIcon=n.icon;return <button className={page===n.id?'current':''} key={n.id} onClick={()=>go(n.id)}><span><NavIcon size={20} strokeWidth={1.8}/></span><small>{n.label}</small></button>;})}</nav>{toast&&<div className="toast">{toast}</div>}</div>;
}
