from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_source(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_mobile_live_renderer_has_canvas_and_transparency_fallback():
    source = read_source("mini_app/src/game/LiveMatchEngine.ts")
    styles = read_source("mini_app/src/style.css")

    assert "touchDevice ? Phaser.CANVAS : Phaser.AUTO" in source
    assert "transparent: true" in source
    assert "visibilitychange" in source
    assert "this.game.canvas.addEventListener('contextlost'" in source
    # The final .match-canvas rule must preserve the fallback pitch as well as
    # the earlier legacy rule; its background shorthand must not reset it.
    broadcast_styles = styles.split("/* Modern broadcast frame for the Phaser live-match engine. */", 1)[1]
    final_canvas_rule = broadcast_styles.split(".match-canvas {", 1)[1].split("}", 1)[0]
    assert "background-color:#073d30" in final_canvas_rule
    assert "repeating-linear-gradient" in final_canvas_rule


def test_player_action_does_not_expire_before_expected_travel_time():
    source = read_source("mini_app/src/game/MatchScene.ts")
    assert "const travelSeconds = distanceToTarget / Math.max(5, roleSpeed * 0.68) + 0.35;" in source
    assert "Math.max(0.55, durationMs / 1000, travelSeconds)" in source


def test_possession_movement_uses_ball_aware_support_runs():
    source = read_source("mini_app/src/game/MatchScene.ts")
    assert "const fieldThreat = clamp((ballProgress + 16) / 38, 0, 1);" in source
    assert "if (isForward) targetY += attackingDirection * (2.2 + fieldThreat * 3.8);" in source


def test_live_match_snapshot_guard_prevents_time_regression_and_transient_unmount():
    source = read_source("mini_app/src/ClubScreen.tsx")
    assert "if (newMinute < oldMinute || scoreWentBack) return current;" in source
    assert "if (!isMatchLive(snapshot.status) && !isTerminal) return current;" in source


def test_pass_reception_keeps_receiver_running_and_ball_attached():
    source = read_source("mini_app/src/game/MatchScene.ts")
    assert "kind === 'INTERCEPTION'" in source[source.index("private advanceBall"):source.index("private setBallPosition")]
    assert "const forwardRun = kind === 'CARRY' ? 8 : kind === 'CROSS' ? 3.5 : 6.5;" in source
    assert "this.carrier.actionUntil = Math.max(this.carrier.actionUntil, this.gameTime + minimumRun);" in source
    assert "previous 280-ms reset" in source


def test_substitution_reconciliation_does_not_keep_stale_player_identity():
    source = read_source("mini_app/src/game/MatchScene.ts")
    assert "this.playerActors.get(previousPlayerId) === actor" in source
    assert "this.playerActors.delete(previousPlayerId);" in source
    assert "private updateActorKit(actor: Actor, side: Side, keeper: boolean)" in source


def test_live_engine_lifecycle_is_independent_of_event_snapshot_renders():
    component = read_source("mini_app/src/components/MatchCanvas.tsx")
    controller = read_source("mini_app/src/game/LiveMatchEngine.ts")

    # Phaser is constructed in the dedicated controller only, not in the React
    # view. Snapshot/status/score changes are not controller effect dependencies.
    assert "new Phaser.Game" not in component
    assert controller.count("new Phaser.Game({") == 1
    assert "engine.destroy()" in component  # only the component lifetime cleanup
    assert "private applySnapshot(match: NextMatch)" in read_source("mini_app/src/game/MatchScene.ts")
    scene = read_source("mini_app/src/game/MatchScene.ts")
    assert "this.pendingSnapshot = match;" in scene
    assert "if (this.pendingSnapshotReady)" in scene
    assert "this.resetForNewMatch();" in scene


def test_canvas_host_survives_transient_non_live_status_after_first_start():
    component = read_source("mini_app/src/components/MatchCanvas.tsx")
    assert "if (!isLive && !engineStarted) return null;" in component
    assert "match-canvas-wrap-persistent-hidden" in component
    assert "}, [engineStarted]);" in component
    assert "const engine = new LiveMatchEngine({" in component
    assert "engineRef.current?.setSnapshot(match);" in component
    assert "}, [match, engineStarted]);" in component
