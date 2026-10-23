# LIVE 2D engine audit — 2026-10-23

## Scope and inputs

Audited the two supplied source archives `football-manager-live-old-2d-engine-part-1.zip` and `football-manager-live-old-2d-engine-part-2.zip`, their merged Mini App / FastAPI / match-simulation code, and public GitHub examples linked below. The original split archives passed ZIP integrity checks. The new renderer is original code written for this project; it borrows high-level engineering patterns, not copied source from those repositories.

## Existing engine findings

1. **Movement was segmented into separate tween batches.** `MatchScene.update()` waited for a 2.2-second interval before retargeting players into new two-second sine-wave tweens. This created a visible pause, made players drift without reference to the ball, and could produce awkward re-targeting around other effects.
2. **Player identity was guessed rather than resolved.** The old renderer used `player_id % 11` to choose a sprite. Two unrelated player IDs could therefore animate the wrong actor, and actual starting XI / formation data was not supplied to the renderer.
3. **The live event schema was not being used end-to-end.** Server-side event metadata already included `start` / `end` pitch coordinates, but the renderer largely derived its own target. Some open-play `PASS`, `CARRY`, `PRESSURE`, `TACKLE` and `INTERCEPTION` events lacked persisted participant IDs.
4. **Goal and shot records can describe the same goal.** They are separately persisted records. Playing both as full physical actions risks showing an out-of-order or duplicate goal animation.
5. **The browser and API lifecycles needed a stricter contract.** A React render must never recreate a Phaser scene, and a poll must never replay the complete event history. Sparse API snapshots need to be interpolated between, not treated as frame-by-frame coordinates.
6. **Visuals were too abstract for a live match.** The old scene used circles for all 22 players, a small field, limited match context and no trajectory-aware ball animation.

## Reference implementations reviewed

- **[cfpperche/2d-soccer-ai](https://github.com/cfpperche/2d-soccer-ai)** — plain Canvas 2D, role-based 11-v-11 behavior, gradual press, player inertia, goalkeeper positioning, possession HUD, ball trail, goal celebration, a short slow-motion replay buffer, and procedural audio. Its README declares MIT. Good reference for broadcast feel and lightweight rendering. The full simulation is standalone rather than wired to our API. [Repository](https://github.com/cfpperche/2d-soccer-ai)
- **[haeretici/soccer-js](https://github.com/haeretici/soccer-js)** — fixed-step simulation at 20 updates per second with 60-FPS rendering, deterministic runs, formations, support positions, pass-lane decisions, pressure, set-piece playbooks and match rules. MIT license. Best reference for separating simulation timing from display timing and for football-specific behaviors. [Repository](https://github.com/haeretici/soccer-js)
- **[eozgit/footballsim-demo](https://github.com/eozgit/footballsim-demo)** — React + Phaser visualizer with a Web Worker running heavier simulation work and a state bridge between simulation and rendering. MIT license. Most relevant architectural reference for keeping UI/render updates from blocking or recreating the match. [Repository](https://github.com/eozgit/footballsim-demo)
- **[DeltaBitsSystem/FootballEngine](https://github.com/DeltaBitsSystem/FootballEngine)** — F# simulation with steering behaviors and ball-physics ideas. The repository explicitly says GPL-3.0, so its source is **not copied** into this project; only general concepts were considered. [Repository](https://github.com/DeltaBitsSystem/FootballEngine)

## Changes implemented in this project

### Renderer and player movement

- Replaced repeating 2.2-second movement batches with a persistent Phaser scene and a fixed-step 60-Hz local motion loop. Catch-up work is capped after a WebView stall so the client does not teleport through accumulated frames.
- Added acceleration/braking, ball-aware team shifts, compact defensive blocks, limited nearest-player pressure, support runs, keeper positioning, and deterministic crowd separation. Movement follows the ball and possession rather than arbitrary player sine waves.
- Created stylized player actors with side-colored shirts, goalkeeper kits, limbs, running gait, depth ordering, a carrier indicator and player-name tags. Player objects survive API refreshes and are reconciled by real player ID.
- Removed per-tick scale resets that would overwrite actor pop/dive tweens. This also avoids unnecessary per-frame work.

### Live events and ball

- Added a lightweight server payload with the actual active starting XI and the formation saved for this match. The payload is limited to the 11 active players per team.
- Added missing actor/receiver IDs to open-play passes, carries, duels, interceptions and goal-sequence passes/shots, so the renderer can animate the correct player.
- Read server `metadata.start` / `metadata.end` coordinates and use them as the source of truth for passes, carries and shots. Sparse coordinate jumps are bridged by a short ball connector instead of an instant teleport.
- Normalized legacy shot targets, where the goal depth was encoded on the X axis, to the vertical pitch orientation.
- Changed interceptions to animate the ball from the intercepted pass target toward the interceptor. Added goalkeeper movement on saves, defender reaction on blocks, and different trajectories for blocked and wide shots.
- Deduplicated a paired `GOAL` record when its same-minute `SHOT(result=GOAL)` is available, so the kick into the net is animated once. Initial snapshot handling skips stale history, event backlog is bounded, and ID-based de-duplication prevents ordinary API polling from replaying the same event.

### Broadcast presentation

- Expanded the vertical match canvas and added a broadcast-style score/minute/competition header, a live indicator, modern field markings, goal nets, possession display, ball trail, kick particles, event toasts, card popups, goal flash, camera shake and celebration particles.
- Keeps authoritative score, minute, possession and events sourced from the server/API. The client-side tactical movement is a visualization layer, not a replacement for match simulation or DB state.

## Important boundaries / next step

This update substantially improves the **LIVE renderer and event replay**, but it does not convert the existing server's minute-based, deterministic event model into a continuously networked 22-player physics simulation. Between server events, the browser interpolates the ball and runs local tactical/off-ball motion. Truly continuous authoritative football physics would be a separate server-engine project with streamed or timestamped snapshots, possession transitions, ball physics and match-rule tests. This implementation deliberately preserves current score, season, rewards and DB ownership.

The short goal replay buffer and synthesized sound shown in `2d-soccer-ai` have not been added in this pass; goal effects here are flash, shake, particles and a broadcast toast. They should be added only after phone testing confirms stable frame pacing.

## Verification performed

- Python syntax: `app/server.py` and `app/game/engine.py` compile.
- TypeScript syntax transpilation: `MatchScene.ts`, `MatchCanvas.tsx` and `api.ts` transpile without syntax diagnostics. This is not a substitute for a full `tsc && vite build`.
- New event-contract test verifies that open-play pass/carry/pressure/tackle/interception records contain actor IDs and the required coordinate payload. It passes.
- Selected regression suite: 35 tests passed and 2 pre-existing `tests/test_live_screen.py` assertions failed in unrelated notification/AI-Coach source-string checks. The affected `app/bot.py` and `app/services.py` paths were not modified for this LIVE renderer task.
- Full frontend production build could not be completed in this environment because `mini_app/node_modules` and an npm dependency cache were absent; do not interpret syntax transpilation as a confirmed deployment build.

## Changed files

- `mini_app/src/game/MatchScene.ts`
- `mini_app/src/components/MatchCanvas.tsx`
- `mini_app/src/api.ts`
- `mini_app/src/style.css`
- `app/server.py`
- `app/game/engine.py`
- `tests/test_2d_live_events.py`
