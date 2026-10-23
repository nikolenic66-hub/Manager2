from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLUB_SCREEN = (ROOT / "mini_app" / "src" / "ClubScreen.tsx").read_text(encoding="utf-8")
APP = (ROOT / "mini_app" / "src" / "App.tsx").read_text(encoding="utf-8")


def test_profile_form_is_declared_outside_club_screen_and_memoized():
    form_decl = CLUB_SCREEN.index("const ManagerClubIdentityForm = React.memo")
    main_decl = CLUB_SCREEN.index("export default function ClubScreen")
    assert form_decl < main_decl


def test_text_drafts_are_owned_by_the_isolated_form_not_club_screen():
    main_screen = CLUB_SCREEN[CLUB_SCREEN.index("export default function ClubScreen"):]
    assert "const [managerDraft" not in main_screen
    assert "const [clubNameDraft" not in main_screen
    assert "const [managerDraft, setManagerDraft] = useState(managerName)" in CLUB_SCREEN
    assert "const [clubNameDraft, setClubNameDraft] = useState(club.name)" in CLUB_SCREEN


def test_profile_route_renders_stable_form_and_inputs_have_stable_identity():
    assert "<ManagerClubIdentityForm managerName={managerName} club={club}" in CLUB_SCREEN
    assert 'id="manager-name-draft" name="managerName"' in CLUB_SCREEN
    assert 'id="club-name-draft" name="clubName"' in CLUB_SCREEN
    assert "onChange={event => setManagerDraft(event.currentTarget.value)}" in CLUB_SCREEN
    assert "onChange={event => setClubNameDraft(event.currentTarget.value)}" in CLUB_SCREEN


def test_club_screen_identity_is_not_keyed_to_manager_or_club_name_drafts():
    assert "<ClubScreen key={club?.id ?? 'club'}" in APP
    assert "key={managerDraft}" not in APP
    assert "key={clubNameDraft}" not in APP
