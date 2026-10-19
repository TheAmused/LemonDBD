# backend/tests/unit/api/test_ownership_summary_cost.py
"""`/auth/me` computes the ownership summary on every page load: a fixed, small number of SELECTs."""
import pytest
from sqlalchemy import event

from app.core.extensions import db
from app.services.ownership.summary import calculate_ownership_summary
from tests.unit.api.test_bulk_ownership import roster  # noqa: F401  (fixture)


@pytest.mark.unit
def test_summary_cost_does_not_grow_with_the_roster(roster) -> None:  # noqa: F811
    statements: list[str] = []

    def count(_conn, _cursor, statement, *_args) -> None:
        statements.append(statement)

    uid = roster["user"].id
    db.session.expire_all()
    event.listen(db.engine, "before_cursor_execute", count)
    try:
        summary = calculate_ownership_summary(uid)
    finally:
        event.remove(db.engine, "before_cursor_execute", count)

    assert summary["perks"]["total"] == 120 and summary["characters"]["total"] == 40
    # user, survivors, killers, perks, the user's character rows and perk rows.
    assert len(statements) <= 6, statements
    assert not any("JOIN chapters" in s for s in statements)
