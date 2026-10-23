import React, { useEffect, useState } from 'react';

/** Branded launch screen. Progress is intentionally capped until the API responds. */
export default function LoadingAnimation() {
  const [progress, setProgress] = useState(3);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress(current => current >= 92 ? current : Math.min(92, current + (current < 35 ? 4 : current < 70 ? 2 : 1)));
    }, 180);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="game-splash" role="status" aria-live="polite" aria-label="Загрузка Football Manager">
      <img className="game-splash__art" src="/game-splash.png" alt="Football Manager" fetchPriority="high" />
      <div className="game-splash__shade" aria-hidden="true" />
      <div className="game-splash__loading">
        <div className="game-splash__status"><span className="game-splash__dot" /> ИГРА ЗАГРУЖАЕТСЯ <b>{progress}%</b></div>
        <div className="game-splash__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="game-splash__caption">Подключаем сервер · готовим вашу команду</div>
      </div>
    </section>
  );
}
