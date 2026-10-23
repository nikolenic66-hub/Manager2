import Phaser from 'phaser';
import type { NextMatch } from '../api';
import { MatchScene } from './MatchScene';

type EngineOptions = {
  host: HTMLDivElement;
  initialMatch: NextMatch | null;
  onError: (message: string) => void;
};

/**
 * Owns the Phaser lifecycle independently of React's score/commentary renders.
 * A new score, minute, or event is only queued into the existing MatchScene;
 * it never creates/destroys a Phaser.Game instance.
 */
export class LiveMatchEngine {
  private game: Phaser.Game | null = null;
  private scene: MatchScene | null = null;
  private latestMatch: NextMatch | null;
  private attachTimer: number | null = null;
  private destroyed = false;
  private contextLost = false;
  private readonly host: HTMLDivElement;
  private readonly onError: (message: string) => void;

  private readonly refreshRenderer = () => {
    if (this.destroyed || !this.game || this.contextLost || document.visibilityState !== 'visible') return;
    window.requestAnimationFrame(() => {
      if (this.destroyed || !this.game || this.contextLost || document.visibilityState !== 'visible') return;
      try {
        this.game.scale.refresh();
        if (this.latestMatch) this.scene?.syncSnapshot(this.latestMatch);
      } catch (error) {
        this.reportError(error, 'Не удалось обновить поле матча');
      }
    });
  };

  private readonly handleContextLost = (event: Event) => {
    // Ask browsers that support Canvas context restoration to recover it. The
    // CSS pitch underneath remains visible while the renderer is unavailable.
    event.preventDefault();
    this.contextLost = true;
  };

  private readonly handleContextRestored = () => {
    this.contextLost = false;
    this.refreshRenderer();
  };

  constructor({ host, initialMatch, onError }: EngineOptions) {
    this.host = host;
    this.latestMatch = initialMatch;
    this.onError = onError;

    try {
      const touchDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || window.matchMedia('(pointer: coarse)').matches;
      this.game = new Phaser.Game({
        type: touchDevice ? Phaser.CANVAS : Phaser.AUTO,
        parent: host,
        width: 360,
        height: 470,
        backgroundColor: '#041a20',
        transparent: true,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        fps: { target: 60, min: 30, forceSetTimeOut: false },
        render: {
          antialias: true,
          pixelArt: false,
          roundPixels: false,
          powerPreference: 'high-performance',
        },
        scene: [MatchScene],
      });
      this.game.canvas.style.background = 'transparent';
      this.game.canvas.addEventListener('contextlost', this.handleContextLost);
      this.game.canvas.addEventListener('contextrestored', this.handleContextRestored);

      window.addEventListener('resize', this.refreshRenderer);
      window.addEventListener('orientationchange', this.refreshRenderer);
      document.addEventListener('visibilitychange', this.refreshRenderer);
      this.attachTimer = window.setInterval(() => this.attachScene(), 40);
      this.attachScene();
    } catch (error) {
      this.reportError(error, 'Не удалось запустить 2D-движок матча');
    }
  }

  /** Latest server data goes into the existing scene; it never restarts Phaser. */
  setSnapshot(match: NextMatch | null) {
    if (this.destroyed || !match) return;
    this.latestMatch = match;
    if (this.scene?.scene.isActive()) this.scene.syncSnapshot(match);
  }

  private attachScene() {
    if (this.destroyed || !this.game || this.scene) return;
    try {
      const scene = this.game.scene.getScene('MatchScene') as MatchScene | undefined;
      if (!scene || !scene.scene.isActive()) return;
      this.scene = scene;
      if (this.latestMatch) scene.syncSnapshot(this.latestMatch);
      if (this.attachTimer !== null) {
        window.clearInterval(this.attachTimer);
        this.attachTimer = null;
      }
    } catch (error) {
      this.reportError(error, 'Не удалось подключить сцену матча');
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.attachTimer !== null) window.clearInterval(this.attachTimer);
    this.attachTimer = null;
    window.removeEventListener('resize', this.refreshRenderer);
    window.removeEventListener('orientationchange', this.refreshRenderer);
    document.removeEventListener('visibilitychange', this.refreshRenderer);
    if (this.game?.canvas) {
      this.game.canvas.removeEventListener('contextlost', this.handleContextLost);
      this.game.canvas.removeEventListener('contextrestored', this.handleContextRestored);
    }
    this.scene = null;
    const game = this.game;
    this.game = null;
    try {
      game?.destroy(true);
    } catch {
      // Teardown must not block React navigation/unmounting.
    }
  }

  private reportError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    this.onError(message || fallback);
  }
}
