import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { MatchScene } from '../game/MatchScene';
import type { NextMatch } from '../api';

type MatchCanvasProps = { match: NextMatch | null };

const isLiveMatch = (status: unknown) => String(status ?? '').trim().toUpperCase() === 'LIVE';

export default function MatchCanvas({ match }: MatchCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MatchScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const matchRef = useRef<NextMatch | null>(match);
  const [error, setError] = useState('');
  const isLive = isLiveMatch(match?.status);

  // Keep the freshest server snapshot accessible to Phaser without rebuilding
  // the WebGL game when React receives a score or event update.
  matchRef.current = match;

  useEffect(() => {
    const snapshot = matchRef.current;
    const scene = sceneRef.current;
    if (scene && snapshot && scene.scene.isActive()) scene.syncSnapshot(snapshot);
  }, [match]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !isLive || !match?.id) return;
    let disposed = false;
    let attachTimer: number | null = null;
    let game: Phaser.Game | null = null;

    const attachScene = () => {
      if (disposed || !game || sceneRef.current) return;
      try {
        const scene = game.scene.getScene('MatchScene') as MatchScene | undefined;
        if (!scene || !scene.scene.isActive()) return;
        sceneRef.current = scene;
        const latest = matchRef.current;
        if (latest) scene.syncSnapshot(latest);
        if (attachTimer !== null) {
          window.clearInterval(attachTimer);
          attachTimer = null;
        }
        setError('');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Не удалось отобразить матч');
      }
    };

    try {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        width: 360,
        height: 470,
        backgroundColor: '#041a20',
        transparent: false,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        fps: { target: 60, min: 30, forceSetTimeOut: false },
        render: {
          antialias: true,
          pixelArt: false,
          roundPixels: false,
          powerPreference: 'high-performance',
        },
        resolution: Math.min(window.devicePixelRatio || 1, 1.5),
        scene: [MatchScene],
      });
      gameRef.current = game;
      attachTimer = window.setInterval(attachScene, 40);
      attachScene();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось запустить 2D-движок матча');
    }

    return () => {
      disposed = true;
      if (attachTimer !== null) window.clearInterval(attachTimer);
      if (sceneRef.current) {
        sceneRef.current = null;
      }
      if (gameRef.current === game) gameRef.current = null;
      game?.destroy(true);
    };
  }, [isLive, match?.id]);

  if (!match || !isLive) return null;

  const minute = Math.max(0, Number(match.current_minute) || 0);
  const homeName = String(match.home_name || 'Хозяева');
  const awayName = String(match.away_name || 'Гости');

  return (
    <section className="match-canvas-wrap" aria-label="Трансляция футбольного матча">
      <header className="live-match-header">
        <div className="live-match-kicker">
          <span className="live-match-indicator" aria-hidden="true" />
          <span className="live-match-label">LIVE · 2D BROADCAST</span>
          <span className="live-match-minute">{minute}′</span>
        </div>
        <div className="live-match-scoreline">
          <span className="live-team-name live-team-home" title={homeName}>{homeName}</span>
          <strong className="live-match-score" aria-label={`Счёт ${match.home_score} ${match.away_score}`}>
            {Number(match.home_score ?? 0)}<span>:</span>{Number(match.away_score ?? 0)}
          </strong>
          <span className="live-team-name live-team-away" title={awayName}>{awayName}</span>
        </div>
        <div className="live-match-meta">
          <span>{match.competition_name || (match.is_test ? 'Тестовый матч' : 'Матч')}</span>
          <span className="live-match-status">ИДЁТ МАТЧ</span>
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
