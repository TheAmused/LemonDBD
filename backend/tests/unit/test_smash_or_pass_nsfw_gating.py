# backend/tests/unit/test_smash_or_pass_nsfw_gating.py
"""Coverage for real end-to-end NSFW gating on Smash or Pass rosters.

Before this change, `is_nsfw` was carried through the model, schema, seeder
and the frontend type with zero enforcement anywhere -- flagged as a judgment
call in the prior review round. This pins down the resulting behavior:

  - GET /rosters (and get_rosters(active_only=..., include_nsfw=False), its
    default) hides any roster with is_nsfw=True from the *listing* entirely.
  - An explicit opt-in (?include_nsfw=true) makes it listed again.
  - Fetching that roster's feed directly by slug (GET /rosters/<slug>/feed)
    still succeeds either way -- a direct link isn't blocked outright -- but
    the response always carries `is_nsfw: true` so the frontend can gate
    display on it.

No roster in the real seed data is currently flagged NSFW, so a temporary
fixture roster is inserted directly for these tests (not added to the real
seed JSON files -- that's a separate, real-data decision left alone here).
"""
import uuid

import pytest
from flask import Flask
from sqlalchemy.orm import Session

from app.core.extensions import db
from app.models.smash_or_pass import Entity, Roster
from app.seeds.smash_roster_seeder import seed_smash_rosters
from app.services.smash_or_pass_service import SmashOrPassService


def _insert_nsfw_fixture_roster(db_session: Session) -> Roster:
    roster = Roster(
        id=str(uuid.uuid4()),
        slug="test_nsfw_fixture_roster",
        name="Test NSFW Roster",
        description="Test NSFW Description",
        theme_color="#ff0055",
        category="Test",
        is_nsfw=True,
        is_active=True,
    )
    db_session.add(roster)
    db_session.flush()
    entity = Entity(
        id=str(uuid.uuid4()),
        roster_id=roster.id,
        slug="test-nsfw-entity",
        name="Test NSFW Entity",
        role="Survivor",
        gender="female",
        order_index=0,
        is_active=True,
    )
    db_session.add(entity)
    db_session.commit()
    return roster


@pytest.mark.unit
class TestSmashOrPassNsfwGatingService:
    def test_get_rosters_excludes_nsfw_by_default(self, db_session: Session) -> None:
        seed_smash_rosters()
        _insert_nsfw_fixture_roster(db_session)

        service = SmashOrPassService()
        rosters = service.get_rosters(active_only=False)
        slugs = {r["slug"] for r in rosters}
        assert "test_nsfw_fixture_roster" not in slugs

    def test_get_rosters_includes_nsfw_with_opt_in(self, db_session: Session) -> None:
        seed_smash_rosters()
        _insert_nsfw_fixture_roster(db_session)

        service = SmashOrPassService()
        rosters = service.get_rosters(active_only=False, include_nsfw=True)
        slugs = {r["slug"] for r in rosters}
        assert "test_nsfw_fixture_roster" in slugs
        nsfw_roster = next(r for r in rosters if r["slug"] == "test_nsfw_fixture_roster")
        assert nsfw_roster["is_nsfw"] is True

    def test_get_feed_for_nsfw_roster_still_works_without_opt_in_and_exposes_flag(
        self, db_session: Session
    ) -> None:
        """A direct link to an NSFW roster's feed should still resolve -- the
        listing gate isn't a hard block -- but the roster payload must always
        carry is_nsfw so the frontend can gate display of the actual cards."""
        seed_smash_rosters()
        _insert_nsfw_fixture_roster(db_session)

        service = SmashOrPassService()
        feed = service.get_feed(roster_slug="test_nsfw_fixture_roster")
        assert feed is not None
        assert feed["roster"]["is_nsfw"] is True
        assert feed["roster"]["slug"] == "test_nsfw_fixture_roster"

    def test_sanity_nsfw_fixture_roster_would_have_been_listed_without_the_gate(
        self, db_session: Session
    ) -> None:
        """Non-vacuousness proof: with the gate explicitly bypassed (the exact
        pre-fix call shape -- no include_nsfw kwarg passed, but reproduced here by
        calling with include_nsfw=True and confirming presence, then proving the
        default excludes it) -- shows the default parameter is actually doing
        the filtering, not a no-op default that always includes everything."""
        seed_smash_rosters()
        _insert_nsfw_fixture_roster(db_session)
        service = SmashOrPassService()

        without_gate = {r["slug"] for r in service.get_rosters(active_only=False, include_nsfw=True)}
        with_gate = {r["slug"] for r in service.get_rosters(active_only=False, include_nsfw=False)}

        assert "test_nsfw_fixture_roster" in without_gate
        assert "test_nsfw_fixture_roster" not in with_gate
        assert without_gate - with_gate == {"test_nsfw_fixture_roster"}


@pytest.mark.unit
class TestSmashOrPassNsfwGatingApi:
    def test_rosters_endpoint_excludes_nsfw_by_default(self, app: Flask, db_session: Session) -> None:
        seed_smash_rosters()
        _insert_nsfw_fixture_roster(db_session)
        client = app.test_client()

        res = client.get("/api/v1/smash-or-pass/rosters")
        assert res.status_code == 200
        slugs = {r["slug"] for r in res.get_json()["data"]}
        assert "test_nsfw_fixture_roster" not in slugs

    def test_rosters_endpoint_include_nsfw_query_param_opts_in(
        self, app: Flask, db_session: Session
    ) -> None:
        seed_smash_rosters()
        _insert_nsfw_fixture_roster(db_session)
        client = app.test_client()

        res = client.get("/api/v1/smash-or-pass/rosters?include_nsfw=true")
        assert res.status_code == 200
        data = res.get_json()["data"]
        slugs = {r["slug"] for r in data}
        assert "test_nsfw_fixture_roster" in slugs
        nsfw_roster = next(r for r in data if r["slug"] == "test_nsfw_fixture_roster")
        assert nsfw_roster["is_nsfw"] is True

    def test_rosters_endpoint_still_excludes_normal_rosters_count_unaffected(
        self, app: Flask, db_session: Session
    ) -> None:
        """Confirms the gate is additive, not a regression on the un-flagged
        rosters: without an NSFW fixture present, count stays exactly what the
        pre-existing test_get_rosters test already locks in (6)."""
        seed_smash_rosters()
        client = app.test_client()
        res = client.get("/api/v1/smash-or-pass/rosters")
        assert res.get_json()["count"] == 6

    def test_feed_endpoint_for_nsfw_roster_resolves_without_opt_in(
        self, app: Flask, db_session: Session
    ) -> None:
        seed_smash_rosters()
        _insert_nsfw_fixture_roster(db_session)
        client = app.test_client()

        res = client.get("/api/v1/smash-or-pass/rosters/test_nsfw_fixture_roster/feed")
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data["roster"]["is_nsfw"] is True
