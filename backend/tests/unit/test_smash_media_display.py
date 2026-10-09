# backend/tests/unit/test_smash_media_display.py
"""`Entity.media_display`: the one place a portrait's card placement is overridden.

The card's default (`cover`, anchored to the top) suits nearly every portrait, so the override
must stay rare: it is carried by the Xenomorph Queen alone, whose art is cropped by that default.
"""
import json

import pytest
from sqlalchemy.orm import Session

from app.models.smash_or_pass import clean_media_display
from app.seeds.smash_roster_seeder import ROSTERS_DIR, seed_smash_rosters
from app.services.smash_or_pass_service import SmashOrPassService


def _seed_files() -> list[dict]:
    rosters: list[dict] = []
    for path in sorted(ROSTERS_DIR.glob("*.json")):
        rosters.extend(json.loads(path.read_text(encoding="utf-8"))["rosters"])
    return rosters


@pytest.mark.unit
class TestCleanMediaDisplay:
    def test_keeps_the_keys_the_card_understands(self) -> None:
        assert clean_media_display({"fit": "contain", "position": "50% 40%", "scale": 1.2}) == {
            "fit": "contain",
            "position": "50% 40%",
            "scale": 1.2,
        }

    @pytest.mark.parametrize("value", [None, {}, [], "contain", 3, {"fit": "stretch"}, {"scale": 9}, {"position": "url(x)"}])
    def test_nothing_usable_is_none(self, value: object) -> None:
        assert clean_media_display(value) is None

    def test_unknown_keys_and_bad_values_are_dropped_not_rejected(self) -> None:
        assert clean_media_display(
            {"fit": "contain", "position": "javascript:alert(1)", "scale": "big", "css": "x"}
        ) == {"fit": "contain"}

    def test_scale_must_be_a_sane_number(self) -> None:
        assert clean_media_display({"scale": 0.1}) is None
        assert clean_media_display({"scale": True}) is None
        assert clean_media_display({"scale": 1}) == {"scale": 1.0}


@pytest.mark.unit
class TestSeedData:
    def test_only_the_xenomorph_queen_overrides_placement(self) -> None:
        carriers = [
            (r["slug"], e["slug"])
            for r in _seed_files()
            for e in r["entities"]
            if "media_display" in e
        ]
        assert carriers == [("legendary_characters", "xenomorph_queen")]

    def test_the_queen_is_shown_whole(self) -> None:
        queen = next(
            e
            for r in _seed_files()
            if r["slug"] == "legendary_characters"
            for e in r["entities"]
            if e["slug"] == "xenomorph_queen"
        )
        assert clean_media_display(queen["media_display"]) == queen["media_display"]
        assert queen["media_display"]["fit"] == "cover"

    def test_activity_is_the_rosters_alone(self) -> None:
        for roster in _seed_files():
            for entity in roster["entities"]:
                assert "is_active" not in entity, f"{roster['slug']}/{entity['slug']}"
                assert "media_type" not in entity, f"{roster['slug']}/{entity['slug']}"

    def test_canon_gemini_is_switched_off_and_the_real_canon_is_not(self) -> None:
        active = {r["slug"]: r.get("is_active", True) for r in _seed_files()}
        assert active["canon_gemini"] is False
        assert active["canon"] is True


@pytest.mark.unit
class TestSeededRows:
    def test_feed_carries_the_override_for_the_queen_and_null_for_everyone_else(self, db_session: Session) -> None:
        seed_smash_rosters()
        feed = SmashOrPassService().get_feed(roster_slug="legendary_characters", limit=200)
        assert feed is not None
        by_slug = {e["slug"]: e for e in feed["entities"]}
        assert by_slug["xenomorph_queen"]["media_display"] == {"fit": "cover", "position": "20% 50%"}
        others = [e for s, e in by_slug.items() if s != "xenomorph_queen"]
        assert others and all(e["media_display"] is None for e in others)
        assert all("is_active" not in e and "media_type" not in e for e in by_slug.values())

    def test_reseeding_clears_an_override_removed_from_the_file(self, db_session: Session) -> None:
        from app.core.extensions import db
        from app.models.smash_or_pass import Entity

        seed_smash_rosters()
        row = db.session.query(Entity).filter_by(slug="the_trapper").first()
        row.media_display = {"fit": "contain"}
        db.session.commit()
        seed_smash_rosters()
        db.session.refresh(row)
        assert row.media_display is None
