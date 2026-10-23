# LIVE Match Engine Architecture

`MatchCanvas.tsx` is only the React presentation shell. `LiveMatchEngine.ts` owns the Phaser game's lifetime. `MatchScene.ts` owns the continuous frame loop and football visualization.

Contract:
1. `Phaser.Game` is created once when the first LIVE match opens.
2. API snapshots are queued into the existing scene; score, event, minute, and commentary updates do not recreate the canvas.
3. The scene consumes the latest snapshot during `update()` and deduplicates historical event IDs.
4. A new match ID resets match-specific visual state inside the same scene.
5. A transient non-LIVE response hides the view off-screen without removing the canvas host. The controller is destroyed only when the component is actually unmounted.
6. On Android, Canvas rendering and a CSS pitch fallback reduce the risk of a black surface. Context loss is handled without constructing a second engine from a React event.
