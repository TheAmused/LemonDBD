# backend/tests/unit/test_smash_or_pass_vote_state_edges.py
"""Vote/feed state-machine boundary coverage the existing test_smash_api.py /
test_smash_seeder_service.py suites don't already hit: an empty roster, a
single-entity roster, and a fully-voted roster (the "last card" / "no cards
left" state) -- plus the cross-roster character_slug fallback determinism fix
in cast_vote.
"""
import uuid

import pytest
from flask import Flask
from sqlalchemy.orm import Session

from app.models.smash_or_pass import Entity, Roster
from app.seeds.smash_roster_seeder import seed_smash_rosters
from app.services.smash_or_pass_service import SmashOrPassService


def _make_roster(db_session: Session, slug: str, n_entities: int) -> Roster:
    roster = Roster(
        id=str(uuid.uuid4()),
        slug=slug,
        name_i18n_key=f"smashOrPass.rosters.{slug}.name",
        description_i18n_key=f"smashOrPass.rosters.{slug}.desc",
        theme_color="#ff0055",
        category="Test",
        is_nsfw=False,
        is_active=True,
    )
    db_session.add(roster)
    db_session.flush()
    for i in range(n_entities):
        db_session.add(
            Entity(
                id=str(uuid.uuid4()),
                roster_id=roster.id,
                slug=f"{slug}-entity-{i}",
                name=f"Entity {i}",
                role="Survivor",
                gender="female",
                order_index=i,
                is_active=True,
            )
        )
    db_session.commit()
    return roster


@pytest.mark.unit
class TestSmashOrPassVoteStateEdges:
    def test_feed_for_roster_with_zero_entities_returns_empty_deck_not_none_or_crash(
        self, db_session: Session
    ) -> None:
        _make_roster(db_session, "empty_roster", n_entities=0)
        service = SmashOrPassService()
        feed = service.get_feed(roster_slug="empty_roster")
        assert feed is not None, "an existing (but entity-less) roster should still return a feed shape, not None"
        assert feed["entities"] == []
        assert feed["total_remaining"] == 0

    def test_feed_for_single_entity_roster_returns_exactly_that_one_entity(
        self, db_session: Session
    ) -> None:
        _make_roster(db_session, "single_entity_roster", n_entities=1)
        service = SmashOrPassService()
        feed = service.get_feed(roster_slug="single_entity_roster")
        assert len(feed["entities"]) == 1
        assert feed["total_remaining"] == 1
        assert feed["entities"][0]["slug"] == "single_entity_roster-entity-0"

    def test_feed_after_voting_on_every_entity_returns_empty_not_a_repeat(
        self, db_session: Session, app: Flask
    ) -> None:
        """The 'last card' -> 'deck exhausted' transition: once every entity in a
        roster has a vote from this session, the feed must report zero remaining,
        not loop back and hand out an already-voted entity."""
        roster = _make_roster(db_session, "small_roster", n_entities=3)
        service = SmashOrPassService()
        session_id = "state-edge-session"

        for i in range(3):
            service.cast_vote(
                character_slug=f"small_roster-entity-{i}",
                vote_type="smash",
                session_id=session_id,
                roster_slug="small_roster",
            )

        feed = service.get_feed(roster_slug="small_roster", session_id=session_id)
        assert feed["entities"] == []
        assert feed["total_remaining"] == 0

    def test_cast_vote_character_slug_cross_roster_fallback_is_deterministic(
        self, db_session: Session
    ) -> None:
        """No real roster currently reuses a slug across rosters (see the
        standing regression test in test_smash_or_pass_data_integrity.py), but
        cast_vote's fallback lookup for an unresolvable roster_slug has to
        degrade sanely if that ever changes. This constructs the collision
        directly and confirms the same slug always resolves to the same
        (lowest id) entity across repeated calls, instead of an
        implementation-defined one."""
        from sqlalchemy import select as _select

        roster_a = _make_roster(db_session, "collide_a", n_entities=1)
        roster_b = _make_roster(db_session, "collide_b", n_entities=1)
        # Force both entities to share a slug, simulating the collision.
        ent_a = db_session.scalars(_select(Entity).where(Entity.roster_id == roster_a.id)).first()
        ent_b = db_session.scalars(_select(Entity).where(Entity.roster_id == roster_b.id)).first()
        ent_a.slug = "shared-slug"
        ent_b.slug = "shared-slug"
        db_session.commit()

        service = SmashOrPassService()
        # No resolvable roster_slug/edition ("nonexistent") -> falls through to
        # the cross-roster fallback both times.
        result1 = service.cast_vote(character_slug="shared-slug", vote_type="smash", roster_slug="nonexistent")
        service.reset_session_votes(session_id="unused")  # no-op, just confirms no crash between calls
        result2 = service.cast_vote(character_slug="shared-slug", vote_type="pass", roster_slug="nonexistent")

        assert result1["id"] == result2["id"], (
            "the cross-roster character_slug fallback should deterministically resolve "
            "to the same entity on repeated calls, not an arbitrary one of the two matches"
        )

        # SANITY: prove the two entities really are distinguishable/orderable
        # (so "deterministic" is a meaningful claim here, not vacuously true
        # because there's only one candidate row or they're indistinguishable).
        # An ascending vs descending order_by on the same ambiguous slug must
        # pick DIFFERENT rows -- if it doesn't, the collision fixture itself
        # isn't exercising a real ambiguity.
        from sqlalchemy import select as _select2

        asc_pick = db_session.scalars(
            _select2(Entity).where(Entity.slug == "shared-slug").order_by(Entity.id.asc())
        ).first()
        desc_pick = db_session.scalars(
            _select2(Entity).where(Entity.slug == "shared-slug").order_by(Entity.id.desc())
        ).first()
        assert asc_pick.id != desc_pick.id, (
            "the fixture should produce two genuinely different, orderable rows for the "
            "same slug -- otherwise the determinism claim above isn't testing anything real"
        )
        assert result1["id"] == asc_pick.id, (
            "cast_vote's fallback (order_by(Entity.id) ascending) should match the "
            "ascending pick specifically, confirming it's really using that ordering "
            "and not coincidentally agreeing with an unordered query"
        )
