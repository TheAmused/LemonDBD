# backend/tests/unit/api/test_admin_challenge_reset.py
"""Admin view and reset of one user's challenge progress (GET/POST /api/v1/users/<id>/challenges...)."""
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.core.extensions import mail
from app.core.security import generate_token
from app.models import (
    AdminAuditLog,
    ChallengeCompletionRecord,
    ChaosMatchLog,
    ChaosRun,
    GauntletRun,
    HistoryRun,
    PageStreakRun,
    User,
)
from app.services.challenge_completions import record_challenge_completion


def _user(db_session: Session, login: str, role: str = "user") -> User:
    user = User(login=login, username=login, email=f"{login}@example.com", password_hash="hashed", role=role)
    db_session.add(user)
    db_session.commit()
    return user


def _headers(app: Flask, user: User) -> dict[str, str]:
    with app.app_context():
        return {"Authorization": f"Bearer {generate_token(user.id, role=user.role)}"}


def _complete(user: User, mode: str, variant: str) -> None:
    record_challenge_completion(
        user_id=user.id, mode=mode, variant=variant,
        attempts_taken=1, matches_played=3, unlocked_characters_count=2,
    )


@pytest.mark.unit
class TestAdminChallengeReset:
    @pytest.fixture
    def admin(self, db_session: Session) -> User:
        return _user(db_session, "reset_admin", "admin")

    @pytest.fixture
    def cheater(self, db_session: Session) -> User:
        return _user(db_session, "reset_cheater")

    @pytest.fixture
    def seeded(self, db_session: Session, cheater: User) -> User:
        """A chaos run with a match log and a win, a gauntlet run, and a page streak win with no run left."""
        chaos = ChaosRun(user_id=cheater.id, difficulty="easy", status="in_progress")
        chaos.match_logs.append(ChaosMatchLog(attempt=1, result="win", streak_before=0, streak_after=1, killer_id="trapper"))
        db_session.add_all([
            chaos,
            GauntletRun(user_id=cheater.id, role="killer", game_mode="original", current_character_id="1"),
            ChaosRun(user_id=cheater.id, difficulty="hell", status="in_progress"),
            HistoryRun(user_id=cheater.id, mode="medium"),
        ])
        _complete(cheater, "chaos", "easy")
        _complete(cheater, "chaos", "easy")
        _complete(cheater, "page_streak", "Trapper")
        db_session.commit()
        return cheater

    def test_lists_runs_and_completions_in_mode_order(
        self, app: Flask, client: FlaskClient, admin: User, seeded: User
    ) -> None:
        res = client.get(f"/api/v1/users/{seeded.id}/challenges", headers=_headers(app, admin))
        assert res.status_code == 200
        rows = [(c["mode"], c["variant"], c["completed"]) for c in res.get_json()["challenges"]]
        assert rows == [
            ("gauntlet", "killer_original", False),
            ("chaos", "easy", True),
            ("chaos", "hell", False),
            ("history", "medium", False),
            ("page_streak", "Trapper", True),
        ]

    def test_progress_is_the_streak_out_of_the_run_length(
        self, app: Flask, client: FlaskClient, db_session: Session, admin: User, cheater: User
    ) -> None:
        db_session.add_all([
            ChaosRun(user_id=cheater.id, difficulty="easy", current_streak=3, owned_killer_ids=[1, 2, 3, 4, 5]),
            ChaosRun(user_id=cheater.id, difficulty="hell", status="completed", current_streak=0, owned_killer_ids=[1, 2, 3]),
            GauntletRun(
                user_id=cheater.id, role="survivor", game_mode="lemon_duo", current_character_id="1",
                current_streak=2, owned_character_ids=[1, 2, 3, 4, 5],
            ),
            HistoryRun(user_id=cheater.id, mode="medium", total_killers_beaten=4, owned_killer_ids=[1, 2, 3, 4, 5, 6]),
            PageStreakRun(user_id=cheater.id, killer="Trapper", current_page=3, pages=[["a"]] * 5),
        ])
        db_session.commit()
        res = client.get(f"/api/v1/users/{cheater.id}/challenges", headers=_headers(app, admin))
        progress = {(c["mode"], c["variant"]): (c["current"], c["total"]) for c in res.get_json()["challenges"]}
        assert progress == {
            ("gauntlet", "survivor_lemon_duo"): (2, 3),
            ("chaos", "easy"): (3, 5),
            ("chaos", "hell"): (3, 3),
            ("history", "medium"): (4, 6),
            ("page_streak", "Trapper"): (2, 5),
        }

    def test_reset_deletes_run_logs_and_completions_of_that_challenge_only(
        self, app: Flask, client: FlaskClient, db_session: Session, admin: User, seeded: User
    ) -> None:
        res = client.post(
            f"/api/v1/users/{seeded.id}/challenges/reset", json={"mode": "chaos", "variant": "easy"}, headers=_headers(app, admin)
        )
        assert res.status_code == 200
        assert (res.get_json()["runs_deleted"], res.get_json()["completions_deleted"]) == (1, 2)
        assert db_session.query(ChaosMatchLog).count() == 0
        assert [r.difficulty for r in db_session.query(ChaosRun).all()] == ["hell"]
        assert db_session.query(GauntletRun).count() == 1
        assert [(c.mode, c.variant) for c in db_session.query(ChallengeCompletionRecord).all()] == [("page_streak", "Trapper")]

    def test_reset_matches_a_gauntlet_variant_and_a_completion_only_challenge(
        self, app: Flask, client: FlaskClient, db_session: Session, admin: User, seeded: User
    ) -> None:
        headers = _headers(app, admin)
        url = f"/api/v1/users/{seeded.id}/challenges/reset"
        assert client.post(url, json={"mode": "gauntlet", "variant": "killer_original"}, headers=headers).status_code == 200
        assert db_session.query(GauntletRun).count() == 0
        done = client.post(url, json={"mode": "page_streak", "variant": "Trapper"}, headers=headers).get_json()
        assert (done["runs_deleted"], done["completions_deleted"]) == (0, 1)

    def test_reset_leaves_other_users_alone(
        self, app: Flask, client: FlaskClient, db_session: Session, admin: User, seeded: User
    ) -> None:
        bystander = _user(db_session, "reset_bystander")
        db_session.add(ChaosRun(user_id=bystander.id, difficulty="easy", status="in_progress"))
        _complete(bystander, "chaos", "easy")
        db_session.commit()
        client.post(
            f"/api/v1/users/{seeded.id}/challenges/reset", json={"mode": "chaos", "variant": "easy"}, headers=_headers(app, admin)
        )
        assert db_session.query(ChaosRun).filter_by(user_id=bystander.id).count() == 1
        assert db_session.query(ChallengeCompletionRecord).filter_by(user_id=bystander.id).count() == 1

    def test_reset_is_audited(self, app: Flask, client: FlaskClient, db_session: Session, admin: User, seeded: User) -> None:
        client.post(
            f"/api/v1/users/{seeded.id}/challenges/reset", json={"mode": "history", "variant": "medium"}, headers=_headers(app, admin)
        )
        log = db_session.query(AdminAuditLog).filter_by(action="user_challenge_reset").one()
        assert log.admin_user_id == admin.id and log.target_id == str(seeded.id)
        assert '"history"' in log.details and '"medium"' in log.details

    def test_the_player_is_emailed_with_the_admins_note(
        self, app: Flask, client: FlaskClient, db_session: Session, admin: User, seeded: User
    ) -> None:
        seeded.preferred_language = "pl"
        db_session.commit()
        with mail.record_messages() as outbox:
            res = client.post(
                f"/api/v1/users/{seeded.id}/challenges/reset",
                json={"mode": "chaos", "variant": "easy", "note": "  Wynik z exploita.  "},
                headers=_headers(app, admin),
            )
        assert res.get_json()["emailed"] is True
        assert [m.recipients for m in outbox] == [[seeded.email]]
        assert outbox[0].subject == "LemonDBD: Postęp w Twoim wyzwaniu został zresetowany"
        assert "Chaos Streak: Easy" in outbox[0].body and "Wynik z exploita." in outbox[0].body
        assert "Wynik z exploita." in outbox[0].html and "Sekcja 2: Fair play" in outbox[0].body
        log = db_session.query(AdminAuditLog).filter_by(action="user_challenge_reset").one()
        assert '"emailed":true' in log.details and "Wynik z exploita." in log.details

    def test_the_email_works_without_a_note_and_in_english_by_default(
        self, app: Flask, client: FlaskClient, admin: User, seeded: User
    ) -> None:
        with mail.record_messages() as outbox:
            client.post(
                f"/api/v1/users/{seeded.id}/challenges/reset", json={"mode": "gauntlet", "variant": "killer_original"}, headers=_headers(app, admin)
            )
        assert outbox[0].subject == "LemonDBD: Your progress in a challenge was reset"
        assert "Gauntlet: Killer original" in outbox[0].body and "Note from the team" not in outbox[0].body

    def test_a_failed_email_does_not_undo_the_reset(
        self, app: Flask, client: FlaskClient, db_session: Session, admin: User, seeded: User, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def broken(_message: object) -> None:
            raise OSError("smtp down")

        monkeypatch.setattr(mail, "send", broken)
        res = client.post(
            f"/api/v1/users/{seeded.id}/challenges/reset", json={"mode": "chaos", "variant": "easy"}, headers=_headers(app, admin)
        )
        assert res.status_code == 200 and res.get_json()["emailed"] is False
        assert [r.difficulty for r in db_session.query(ChaosRun).all()] == ["hell"]

    def test_a_note_that_is_too_long_or_not_text_is_400_and_resets_nothing(
        self, app: Flask, client: FlaskClient, db_session: Session, admin: User, seeded: User
    ) -> None:
        url = f"/api/v1/users/{seeded.id}/challenges/reset"
        for note in ("x" * 501, 7):
            res = client.post(url, json={"mode": "chaos", "variant": "easy", "note": note}, headers=_headers(app, admin))
            assert res.status_code == 400
        assert db_session.query(ChaosRun).count() == 2

    @pytest.mark.parametrize(
        "body",
        [{}, {"mode": "nope", "variant": "easy"}, {"mode": "chaos"}, {"mode": "chaos", "variant": "  "}, {"mode": "chaos", "variant": 3}],
    )
    def test_bad_body_is_400(self, app: Flask, client: FlaskClient, admin: User, seeded: User, body: dict[str, object]) -> None:
        res = client.post(f"/api/v1/users/{seeded.id}/challenges/reset", json=body, headers=_headers(app, admin))
        assert res.status_code == 400

    def test_nothing_to_reset_is_404_and_not_audited(
        self, app: Flask, client: FlaskClient, db_session: Session, admin: User, seeded: User
    ) -> None:
        res = client.post(
            f"/api/v1/users/{seeded.id}/challenges/reset", json={"mode": "chaos", "variant": "medium"}, headers=_headers(app, admin)
        )
        assert res.status_code == 404
        assert db_session.query(AdminAuditLog).filter_by(action="user_challenge_reset").count() == 0

    def test_unknown_user_is_404(self, app: Flask, client: FlaskClient, admin: User) -> None:
        headers = _headers(app, admin)
        assert client.get("/api/v1/users/99999/challenges", headers=headers).status_code == 404
        res = client.post("/api/v1/users/99999/challenges/reset", json={"mode": "chaos", "variant": "easy"}, headers=headers)
        assert res.status_code == 404

    def test_only_admins(self, app: Flask, client: FlaskClient, cheater: User) -> None:
        headers = _headers(app, cheater)
        assert client.get(f"/api/v1/users/{cheater.id}/challenges", headers=headers).status_code == 403
        res = client.post(f"/api/v1/users/{cheater.id}/challenges/reset", json={"mode": "chaos", "variant": "easy"}, headers=headers)
        assert res.status_code == 403
