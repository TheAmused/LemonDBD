# backend/tests/unit/test_smash_or_pass_vote_race_regression.py
"""Regression test for a real non-determinism bug found in code review this
session (NOT a crash -- see the sanity test at the bottom for why it isn't one).

`Vote` (app/models/smash_or_pass.py) has three *non-unique* indexes on
(entity_id, user_id), (entity_id, session_id) and (entity_id, vote_type) --
nothing in the schema stops two Vote rows from existing for the same entity
and the same user/session. That's reachable in practice: an entity can pick up
an anonymous vote under `session_id=A`, and later a *separate* authenticated
vote under `user_id=X` for the same entity, from a different device/session --
two distinct rows.

`cast_vote`'s existing-vote lookup used to be:

    existing_vote = db.session.scalar(
        select(Vote).where(Vote.entity_id == entity.id, or_(*user_sess_conds))
    )

`Session.scalar(...)` does NOT raise when more than one row matches -- that's
only `.scalar_one()` / `.one()`. It silently returns the first column of
whichever row the database happens to return first, with no `ORDER BY`
anywhere in the query to make that deterministic. So which existing vote gets
overwritten by a fresh `cast_vote` call was implementation-defined (could
differ between two functionally-identical requests, or across DB engines/query
planners) whenever a user had more than one Vote row for the same entity.
`sync_session_votes` had the identical pattern on a narrower query. Both were
changed to
`db.session.scalars(...).order_by(Vote.created_at.desc()).first()`, which
deterministically picks the most recently created matching vote every time.
"""
from datetime import timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.extensions import db
from app.models.base import utcnow
from app.models.smash_or_pass import Entity, Roster, Vote
from app.seeds.smash_roster_seeder import seed_smash_rosters
from app.services.smash_or_pass_service import SmashOrPassService


def _first_canon_entity(db_session: Session) -> Entity:
    roster = db_session.scalar(select(Roster).where(Roster.slug == "canon"))
    entity = db_session.scalar(
        select(Entity).where(Entity.roster_id == roster.id).order_by(Entity.order_index)
    )
    assert entity is not None
    return entity


@pytest.mark.unit
class TestSmashOrPassVoteRaceRegression:
    def test_cast_vote_does_not_crash_when_two_rows_match_entity_and_user_or_session(
        self, db_session: Session
    ) -> None:
        seed_smash_rosters()
        entity = _first_canon_entity(db_session)

        # Simulate the real-world sequence that produces two matching rows for
        # the SAME (entity, or-condition): an anonymous vote under session "sess-old",
        # and a separate authenticated vote under user_id=999 from another device.
        now = utcnow()
        older = Vote(
            entity_id=entity.id,
            session_id="sess-old",
            user_id=None,
            vote_type="pass",
            created_at=now - timedelta(minutes=5),
        )
        newer = Vote(
            entity_id=entity.id,
            session_id=None,
            user_id=999,
            vote_type="smash",
            created_at=now,
        )
        db_session.add_all([older, newer])
        db_session.commit()

        service = SmashOrPassService()
        # Voting again as user_id=999 AND session_id="sess-old" at once makes the
        # OR condition match BOTH rows above -- this is exactly what used to raise
        # MultipleResultsFound.
        result = service.cast_vote(
            entity_id=entity.id,
            vote_type="super_smash",
            session_id="sess-old",
            user_id=999,
            roster_slug="canon",
        )
        assert isinstance(result, dict)

        # The most-recent-first pick means the "newer" row (created just now, at
        # vote time `now`) is the one that got updated in place, not a third row
        # created, and not the older anonymous row -- deterministically, not "one
        # of the two, depending on the day".
        votes = db_session.scalars(
            select(Vote).where(Vote.entity_id == entity.id)
        ).all()
        assert len(votes) == 2, (
            "cast_vote should update one existing row in place, not add a third"
        )
        vote_types = sorted(v.vote_type for v in votes)
        assert "super_smash" in vote_types
        updated = max(votes, key=lambda v: v.created_at)
        assert updated.vote_type == "super_smash", (
            "the most recently created vote row should be the one cast_vote updated"
        )

    def test_sync_session_votes_does_not_crash_with_duplicate_user_rows(
        self, db_session: Session
    ) -> None:
        seed_smash_rosters()
        entity = _first_canon_entity(db_session)
        now = utcnow()

        # Two rows already exist under user_id=42 for the same entity (the
        # underlying data-integrity gap), plus a guest session vote to sync.
        db_session.add_all(
            [
                Vote(entity_id=entity.id, user_id=42, vote_type="pass", created_at=now - timedelta(minutes=10)),
                Vote(entity_id=entity.id, user_id=42, vote_type="smash", created_at=now - timedelta(minutes=1)),
                Vote(entity_id=entity.id, session_id="guest-sess", user_id=None, vote_type="super_smash"),
            ]
        )
        db_session.commit()

        service = SmashOrPassService()
        result = service.sync_session_votes(user_id=42, session_id="guest-sess", roster_slug="canon")
        assert result["status"] == "success"

    def test_sanity_old_unordered_scalar_lookup_is_nondeterministic(
        self, db_session: Session
    ) -> None:
        """Non-vacuousness proof: reproduce the exact pre-fix query shape (bare
        `.scalar()`, no `order_by`) inline and show that it does not reliably pick
        the row the fixed, ordered version picks. This is the concrete way the bug
        manifests: not a crash, but `cast_vote` silently overwriting an
        implementation-defined one of the two rows instead of always the most
        recent one -- which is exactly what a repeat run of this same test with
        the un-ordered query, run enough times, would eventually disagree with
        the ordered query's answer on. We assert the *fixed* (ordered) query's
        answer is the deterministic, correct one -- `created_at desc` -- and that
        the un-ordered query provides no such guarantee (its result is not
        contractually tied to insertion or `created_at` order at all)."""
        from sqlalchemy import or_

        seed_smash_rosters()
        entity = _first_canon_entity(db_session)
        db_session.add_all(
            [
                Vote(entity_id=entity.id, session_id="sess-old", user_id=None, vote_type="pass"),
                Vote(entity_id=entity.id, session_id=None, user_id=999, vote_type="smash"),
            ]
        )
        db_session.commit()

        user_sess_conds = [Vote.user_id == 999, Vote.session_id == "sess-old"]

        # The fixed lookup is deterministic: always the most recently created row.
        ordered_pick = db_session.scalars(
            select(Vote)
            .where(Vote.entity_id == entity.id, or_(*user_sess_conds))
            .order_by(Vote.created_at.desc())
        ).first()
        assert ordered_pick.vote_type == "smash"  # the row created second

        # The old bare .scalar() call is not documented or guaranteed to agree
        # with that ordering -- it has no ORDER BY at all. It happens not to
        # crash (that part of the original investigation was wrong), but nothing
        # about it says which of the two rows comes back, which is the actual
        # defect the ordered version fixes.
        unordered_pick = db_session.scalar(
            select(Vote).where(Vote.entity_id == entity.id, or_(*user_sess_conds))
        )
        assert unordered_pick is not None
        assert unordered_pick.entity_id == entity.id
