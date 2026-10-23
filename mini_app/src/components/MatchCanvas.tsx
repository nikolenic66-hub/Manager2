import React, { useEffect, useRef, useState } from 'react';
import type { NextMatch } from '../api';
import { isMatchLive } from '../game/matchStatus';
import { LiveMatchEngine } from '../game/LiveMatchEngine';

type MatchCanvasProps = { match: NextMatch | null };

/** UI shell for the autonomous LIVE engine. The Phaser instance has its own controller. */
export default function MatchCanvas({ match }: MatchCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LiveMatchEngine | null>(null);
  const latestMatchRef = useRef<NextMatch | null>(match);
  const [engineStarted, setEngineStarted] = useState(false);
  const [error, setError] = useState('');
  const isLive = isMatchLive(match?.status);

  // The server may refresh after every shot, foul, card or goal. Keep the latest
  // snapshot in a ref and send it as data; changing it must not recreate Phaser.
  latestMatchRef.current = match;

  useEffect(() => {
    if (isLive && match?.id) setEngineStarted(true);
  }, [isLive, match?.id]);

  // This effect starts the game once, on first LIVE entry. Its lifetime is the
  // lifetime of this mounted engine host, not the lifetime of match snapshots.
  // engineStarted stays true through transient statuses and a new match ID.
  useEffect(() => {
    if (!engineStarted) return;
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    const engine = new LiveMatchEngine({
      host,
      initialMatch: latestMatchRef.current,
      onError: message => { if (alive) setError(message); },
    });
    engineRef.current = engine;
    return () => {
      alive = false;
      if (engineRef.current === engine) engineRef.current = null;
      engine.destroy();
    };
  }, [engineStarted]);

  useEffect(() => {
    if (!engineStarted || !match) return;
    engineRef.current?.setSnapshot(match);
  }, [match, engineStarted]);

  // Once created, keep the host node in the DOM. A brief status/API transition
  // must not remove the canvas and force a second engine to be constructed.
  if (!isLive && !engineStarted) return null;

  const minute = Math.max(0, Number(match?.current_minute) || 0);
  const homeName = String(match?.home_name || 'Хозяева');
  const awayName = String(match?.away_name || 'Гости');
  const persistHidden = engineStarted && !isLive;

  return (
    <section
      className={`match-canvas-wrap${persistHidden ? ' match-canvas-wrap-persistent-hidden' : ''}`}
      aria-label="Трансляция футбольного матча"
      aria-hidden={persistHidden ? true : undefined}
    >
      <header className="live-match-header">
        <div className="live-match-kicker">
          <span className="live-match-indicator" aria-hidden="true" />
          <span className="live-match-label">LIVE · 2D BROADCAST</span>
          <span className="live-match-minute">{minute}′</span>
        </div>
        <div className="live-match-scoreline">
          <span className="live-team-name live-team-home" title={homeName}>{homeName}</span>
          <strong className="live-match-score" aria-label={`Счёт ${match?.home_score ?? 0} ${match?.away_score ?? 0}`}>
            {Number(match?.home_score ?? 0)}<span>:</span>{Number(match?.away_score ?? 0)}
          </strong>
          <span className="live-team-name live-team-away" title={awayName}>{awayName}</span>
        </div>
        <div className="live-match-meta">
          <span>{match?.competition_name || (match?.is_test ? 'Тестовый матч' : 'Матч')}</span>
          <span className="live-match-status">{isLive ? 'ИДЁТ МАТЧ' : 'СОХРАНЯЕМ ТРАНСЛЯЦИЮ'}</span>
        </div>
      </header>
      <div ref={hostRef} className="match-canvas" aria-label="Непрерывная 2D-анимация LIVE-матча" />
      <footer className="live-match-footer">
        <span><i className="live-legend-dot live-legend-home" /> {homeName}</span>
        <span><i className="live-legend-dot live-legend-away" /> {awayName}</span>
      </footer>
      {error && <p className="api-error">{error}</p>}
    </section>
  );
}
