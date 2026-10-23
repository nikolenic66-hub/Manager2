# LIVE 2D Engine — lifecycle isolation and black-frame fix

Date: 2026-10-23
Baseline: the latest `football-manager-live-engine-stable-part-1.zip` and `football-manager-live-engine-stable-part-2.zip`, including `game-splash.png` and the blue loading bar.

## Findings

- `MatchCanvas` previously created `Phaser.Game` in a React effect keyed to `isLive` and `match.id`. Any transition of those values destroyed the prior game in the effect cleanup and created another canvas. This is not required for score, event, or snapshot updates.
- The React effect called `MatchScene.syncSnapshot()` directly. That method reconciled actors, event queues, and display objects directly from a React/network effect instead of the Phaser frame loop.
- A temporary non-LIVE status caused `MatchCanvas` to return `null`, removing the canvas host. If the status then became LIVE again, the renderer had no persistent host to resume.
- The screen already had a CSS field fallback, but a black backing canvas could obscure it if the renderer stalled or lost its context.

## Implemented

- Added `mini_app/src/game/LiveMatchEngine.ts`. This controller owns the single `Phaser.Game`, scene attachment, resize/visibility recovery, context-loss listeners, and final cleanup. A snapshot never calls `new Phaser.Game` or `destroy`.
- Changed `MatchCanvas.tsx` to start the controller once on first LIVE entry, send changing match snapshots as data, and keep the host mounted off-screen during a temporary status change. React keeps updating the scoreboard, but the Phaser instance remains alive.
- Changed `MatchScene.syncSnapshot()` into a queue-only method. `MatchScene.update()` consumes the newest pending snapshot from its own frame loop, so React/API callbacks don't reconcile Phaser display objects directly.
- Added a visual-state reset when the immutable match ID actually changes. That clears old events, ball flight, possession, goal effects and player movement state while retaining the existing game, scene, field and canvas.
- Kept the phone-oriented Canvas renderer, transparent canvas, CSS pitch fallback, and context loss/restoration hooks.
- Updated regression tests to assert the new lifecycle contract and removed outdated source-string assumptions that described older UI labels/movement helpers.
- Preserved the supplied Football Manager splash image and launch progress bar.

## Verification

- Targeted Python regression suite: 34 passed across `test_2d_live_events.py`, `test_friendly_live_contract.py`, `test_live_clock.py`, `test_live_renderer_regressions.py`, `test_minapp_pack_lineup_friendly.py`, and `test_admin_test_tools.py`.
- TypeScript transpile/syntax diagnostics: `MatchCanvas.tsx`, `LiveMatchEngine.ts`, `MatchScene.ts`, and `ClubScreen.tsx` passed.
- Full repository pytest collection is blocked in this environment by missing installed dependency `aiogram`; another existing collection error references missing `_promotion_pairs` in `app/game/season.py`.
- A full `npm run build`/semantic `tsc` build could not be confirmed because node dependencies are not installed in this workspace. Syntax transpilation is not a substitute for that build.
- The final archives are independently tested for ZIP integrity and are kept below 24 MB each.

## Remaining real-device check

After deployment, open a LIVE test match and watch it across several event updates (pass, foul, shot, goal) and a minute/status refresh. Expected: scoreboard/commentary can update, but the canvas stays on the same scene and players continue moving. Browser/WebView GPU or context behavior must still be confirmed on the target Android Telegram client.
