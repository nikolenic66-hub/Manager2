"""Contract tests for event data consumed by the Phaser LIVE match renderer."""
from app.models import Player
from app.game.board import TacticalBoard
from app.game.engine import _add_open_play_events
from app.game.tactics import Tactics


def _squad(first_id: int):
    positions = ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST']
    return [
        Player(id=first_id + n, first_name='P', last_name=str(first_id + n), position=position,
               age=25, pace=70, shooting=70, passing=70, dribbling=70, defending=70,
               physical=70, stamina=70, mental=70)
        for n, position in enumerate(positions)
    ]


def test_open_play_events_include_real_actor_ids_and_coordinates():
    home = _squad(1)
    away = _squad(101)
    home_tactics = Tactics()
    away_tactics = Tactics()
    home_board = TacticalBoard('4-3-3')
    away_board = TacticalBoard('4-3-3')
    seen = set()

    # The one-event generator is seeded, so this deterministically exercises
    # each action shape without depending on probabilistic match outcomes.
    for seed in range(1, 240):
        events = []
        _add_open_play_events(
            events, home, away, home_tactics, away_tactics, home_board, away_board,
            seed, 5, 90, 1.1, 1.0, count=1,
        )
        if not events:
            continue
        event = events[0]
        if event.type in {'PASS', 'CARRY', 'PRESSURE', 'TACKLE', 'INTERCEPTION'}:
            assert event.player_id is not None, f'{event.type} must identify its actor'
            metadata = event.metadata or {}
            assert len(metadata.get('start', [])) == 2, f'{event.type} must have a start point'
            if event.type == 'PASS':
                assert event.secondary_player_id is not None
                assert len(metadata.get('end', [])) == 2
            if event.type in {'PRESSURE', 'TACKLE', 'INTERCEPTION'}:
                assert event.secondary_player_id is not None
                assert len(metadata.get('end', [])) == 2
            seen.add(event.type)
        if seen == {'PASS', 'CARRY', 'PRESSURE', 'TACKLE', 'INTERCEPTION'}:
            break

    assert seen == {'PASS', 'CARRY', 'PRESSURE', 'TACKLE', 'INTERCEPTION'}
