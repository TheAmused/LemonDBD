# backend/tests/unit/test_escalation.py
"""The escalation ladder is a suggestion computed from admin-editable thresholds; nothing applies it."""
import pytest
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import UserSanction
from app.models.user import User
from app.services import moderation_actions as actions
from app.services import site_settings
from app.services.escalation import suggest_next_step

DEFAULTS = {"warnings_before_suspension": 3, "first_suspension_days": 7, "second_suspension_days": 30}
FACTS = "Repeated insults in tier list titles."


def _suggest(warnings: int = 0, suspensions: int = 0, banned: bool = False, **thresholds: int):
    return suggest_next_step(
        active_warnings=warnings, suspensions=suspensions, banned=banned, thresholds={**DEFAULTS, **thresholds}
    )


@pytest.mark.parametrize(
    ("warnings", "suspensions", "kind", "days"),
    [
        (0, 0, "warning", None),
        (2, 0, "warning", None),
        (3, 0, "suspension", 7),
        (5, 0, "suspension", 7),
        (0, 1, "suspension", 30),
        (3, 1, "suspension", 30),
        (0, 2, "ban", None),
        (4, 3, "ban", None),
    ],
)
def test_ladder(warnings: int, suspensions: int, kind: str, days: int | None) -> None:
    result = _suggest(warnings, suspensions)
    assert result is not None
    assert (result["kind"], result["duration_days"]) == (kind, days)
    assert result["basis"] == {"active_warnings": warnings, "warnings_before_suspension": 3, "suspensions": suspensions}


def test_a_banned_account_gets_no_suggestion() -> None:
    assert _suggest(banned=True) is None


def test_thresholds_are_honoured() -> None:
    assert _suggest(1, warnings_before_suspension=1)["kind"] == "suspension"
    assert _suggest(1, 1, second_suspension_days=45)["duration_days"] == 45


@pytest.fixture
def admin(db_session: Session) -> User:
    return _make(db_session, "esc_admin", "admin")


@pytest.fixture
def player(db_session: Session) -> User:
    return _make(db_session, "esc_player")


def _make(db_session: Session, login: str, role: str = "user") -> User:
    user = User(
        login=login, username=login, email=f"{login}@example.com",
        password_hash=hash_password("correct-horse-1"), role=role, is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_summary_walks_up_the_ladder_as_decisions_are_made(admin, player, db_session) -> None:
    assert actions.moderation_summary(player.id)["suggestion"]["kind"] == "warning"

    for _ in range(3):
        actions.issue_warning(admin, player.id, reason_code="harassment")
    assert actions.moderation_summary(player.id)["suggestion"] | {} == {
        "kind": "suspension",
        "duration_days": 7,
        "basis": {"active_warnings": 3, "warnings_before_suspension": 3, "suspensions": 0},
    }

    first = actions.suspend(admin, player.id, reason_code="harassment", facts=FACTS, duration_days=7)
    assert actions.moderation_summary(player.id)["suggestion"]["duration_days"] == 30

    # A revoked suspension no longer counts as a rung.
    actions.revoke_sanction(admin, first.id, "Appeal accepted")
    assert actions.moderation_summary(player.id)["suggestion"]["duration_days"] == 7

    actions.suspend(admin, player.id, reason_code="harassment", facts=FACTS, duration_days=7)
    actions.restore_account(admin, player.id, "Time served")
    actions.suspend(admin, player.id, reason_code="harassment", facts=FACTS, duration_days=7)
    third = actions.moderation_summary(player.id)["suggestion"]
    assert (third["kind"], third["duration_days"]) == ("suspension", 30)

    actions.ban(admin, player.id, reason_code="harassment", facts=FACTS)
    assert actions.moderation_summary(player.id)["suggestion"] is None


def test_admin_settings_change_the_suggestion_and_are_validated(admin, player, db_session) -> None:
    site_settings.update_settings({"warnings_before_suspension": 1, "suspension_first_days": 14})
    actions.issue_warning(admin, player.id, reason_code="spam")

    suggestion = actions.moderation_summary(player.id)["suggestion"]
    assert (suggestion["kind"], suggestion["duration_days"]) == ("suspension", 14)

    for key, bad in (("warnings_before_suspension", 0), ("suspension_first_days", 366), ("ban_list_retention_days", 10)):
        with pytest.raises(ValueError):
            site_settings.update_settings({key: bad})

    assert db_session.query(UserSanction).filter_by(user_id=player.id, kind="suspension").count() == 0
