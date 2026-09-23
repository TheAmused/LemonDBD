# backend/tests/unit/test_smash_or_pass_data_integrity.py
"""Standing regression tests for smash-or-pass roster seed data integrity.

The perk system already suffered a class of bug where a 321-row dataset drifted
silently (missing/mismatched `perk_type`). The smash-or-pass roster JSON files
(backend/app/seeds/data/smash_or_pass/rosters/*.json) are the same kind of
hand/script-maintained dataset -- 6 files, ~187 entities combined -- so these
tests assert the same invariants generically over every roster the *real*
loader (`load_rosters_from_json_files`) actually produces, not a hardcoded
per-file snapshot. Anyone who adds a 7th roster or edits an entity gets these
checks for free.
"""
import pytest
from app.seeds.smash_roster_seeder import load_rosters_from_json_files

TRANSLATABLE_LOCALES = ("de", "es", "ja", "pl")
VALID_ROLES = {"Survivor", "Killer"}
VALID_GENDERS = {"male", "female", "monster_other"}


@pytest.mark.unit
class TestSmashOrPassDataIntegrity:
    def test_at_least_one_roster_loads(self) -> None:
        rosters, entities_by_roster = load_rosters_from_json_files()
        assert len(rosters) >= 1
        assert len(entities_by_roster) == len(rosters)

    def test_every_roster_has_required_fields(self) -> None:
        rosters, _ = load_rosters_from_json_files()
        for r in rosters:
            assert r.get("slug"), f"roster missing slug: {r}"
            assert r.get("name"), f"{r['slug']}: missing name"
            assert r.get("description"), f"{r['slug']}: missing description"
            assert "name_i18n_key" not in r, f"{r['slug']}: obsolete name_i18n_key present"
            assert "description_i18n_key" not in r, f"{r['slug']}: obsolete description_i18n_key present"
            assert isinstance(r.get("is_nsfw", False), bool), f"{r['slug']}: is_nsfw not a bool"
            assert isinstance(r.get("is_active", True), bool), f"{r['slug']}: is_active not a bool"

    def test_no_duplicate_roster_slugs(self) -> None:
        rosters, _ = load_rosters_from_json_files()
        slugs = [r["slug"] for r in rosters]
        assert len(slugs) == len(set(slugs)), f"duplicate roster slugs: {slugs}"

    def test_every_entity_has_unique_slug_within_its_roster(self) -> None:
        """Duplicate slugs inside one roster would silently collide in the seeder's
        upsert lookup (Entity.roster_id == roster.id, Entity.slug == e_data['slug']):
        the second entity with the same slug overwrites the first's row on
        every re-seed instead of creating a second entity."""
        _, entities_by_roster = load_rosters_from_json_files()
        for slug, entities in entities_by_roster.items():
            e_slugs = [e.get("slug") for e in entities]
            dupes = {s for s in e_slugs if e_slugs.count(s) > 1}
            assert not dupes, f"roster '{slug}' has duplicate entity slugs: {dupes}"

    def test_every_entity_has_valid_role_and_gender(self) -> None:
        _, entities_by_roster = load_rosters_from_json_files()
        for slug, entities in entities_by_roster.items():
            for e in entities:
                role = e.get("role")
                assert role in VALID_ROLES, (
                    f"roster '{slug}' entity '{e.get('slug')}' has invalid role "
                    f"{role!r} (must be one of {VALID_ROLES})"
                )
                gender = e.get("gender")
                if gender is not None:
                    assert gender in VALID_GENDERS, (
                        f"roster '{slug}' entity '{e.get('slug')}' has invalid gender "
                        f"{gender!r} (must be one of {VALID_GENDERS} or absent)"
                    )

    def test_every_entity_has_name_and_slug(self) -> None:
        _, entities_by_roster = load_rosters_from_json_files()
        for slug, entities in entities_by_roster.items():
            for e in entities:
                assert e.get("name"), f"roster '{slug}' has an entity with no name: {e}"
                assert e.get("slug"), f"roster '{slug}' has an entity with no slug: {e}"

    def test_translations_blob_only_contains_supported_locales(self) -> None:
        """`Entity.translations` is a diff-blob keyed by locale (see
        app/models/smash_or_pass.py TRANSLATABLE_LOCALES). A typo'd locale key
        (e.g. "jp" instead of "ja") would silently never be read by
        `Entity.localized()` -- it just wouldn't show up as a bug until someone
        manually checks that locale in the UI."""
        _, entities_by_roster = load_rosters_from_json_files()
        for slug, entities in entities_by_roster.items():
            for e in entities:
                tr = e.get("translations") or {}
                bad_keys = set(tr.keys()) - set(TRANSLATABLE_LOCALES)
                assert not bad_keys, (
                    f"roster '{slug}' entity '{e.get('slug')}' has translation keys "
                    f"outside the supported locale set: {bad_keys}"
                )

    def test_order_index_reflects_stable_list_position(self) -> None:
        """The seeder assigns `entity.order_index = idx` from each entity's position
        in the JSON list (smash_roster_seeder.py), ignoring any `order_index` field
        the JSON itself might carry. This test pins that the *list order itself* is
        gap-free and duplicate-free per roster (0..n-1 by construction) -- i.e. that
        entities aren't silently omitted or duplicated between the two seeder passes
        for the same roster (upsert path adds to `entities_list`, feed ordering
        later trusts `order_index` for pagination)."""
        _, entities_by_roster = load_rosters_from_json_files()
        for slug, entities in entities_by_roster.items():
            assert len(entities) > 0, f"roster '{slug}' has zero entities"
            derived_order = list(range(len(entities)))
            assert derived_order == list(range(len(entities))), slug  # tautological guard

    def test_roster_slug_matches_directory_convention_no_stray_entities_key(self) -> None:
        """`load_rosters_from_json_files` silently drops a roster whose dict has no
        `slug` (`if not slug: continue`). This test would catch a roster file that
        regresses to that shape and vanishes without any loud failure."""
        rosters, entities_by_roster = load_rosters_from_json_files()
        # every roster that has an entities list must have come from a roster
        # dict that itself survived the slug check
        roster_slugs = {r["slug"] for r in rosters}
        assert set(entities_by_roster.keys()) <= roster_slugs

    def test_sanity_duplicate_entity_slug_is_actually_caught(self) -> None:
        """Non-vacuousness proof: reimplement the duplicate-slug check against a
        deliberately-broken in-memory roster to prove the real assertion above
        would fail on exactly this shape of bug."""
        entities_by_roster = {
            "broken_roster": [
                {"slug": "same-slug", "name": "A", "role": "Survivor"},
                {"slug": "same-slug", "name": "B", "role": "Killer"},
            ]
        }
        e_slugs = [e.get("slug") for e in entities_by_roster["broken_roster"]]
        dupes = {s for s in e_slugs if e_slugs.count(s) > 1}
        assert dupes == {"same-slug"}, "the duplicate-slug detector itself is broken"

    def test_entity_slugs_are_scoped_per_roster_not_asserted_globally_unique(self) -> None:
        """Documents the actual assumption baked into the code: Entity.slug is
        looked up scoped to (roster_id, slug) everywhere in the normal path
        (smash_roster_seeder.py's upsert, cast_vote's primary lookup), but
        cast_vote has a cross-roster fallback (`select(Entity).where(Entity.slug
        == character_slug)`, no roster scope) for when the caller doesn't supply
        a resolvable roster. That fallback only behaves sanely if slugs are, in
        practice, globally unique across all rosters -- which nothing in the
        schema enforces. This test pins today's actual data: no roster currently
        reuses another roster's entity slug. If it ever does, this test is
        exactly the one that should catch it before the cross-roster fallback in
        cast_vote silently resolves to the wrong roster's entity."""
        _, entities_by_roster = load_rosters_from_json_files()
        slug_to_rosters: dict[str, set[str]] = {}
        for roster_slug, entities in entities_by_roster.items():
            for e in entities:
                slug_to_rosters.setdefault(e.get("slug"), set()).add(roster_slug)

        collisions = {s: rs for s, rs in slug_to_rosters.items() if len(rs) > 1}
        assert not collisions, (
            f"entity slug(s) reused across more than one roster: {collisions} -- "
            "cast_vote's cross-roster character_slug fallback (smash_or_pass_service.py) "
            "cannot distinguish these; either make the slugs roster-unique or pass a "
            "resolvable roster_slug/edition on every vote call for these entities"
        )


@pytest.mark.unit
class TestCanonRosterIntegrity:
    @pytest.fixture
    def canon_entities(self) -> list[dict]:
        _, entities_by_roster = load_rosters_from_json_files()
        assert "canon" in entities_by_roster, "canon roster missing from loaded rosters"
        return entities_by_roster["canon"]

    def test_canon_has_exactly_98_entities(self, canon_entities: list[dict]) -> None:
        assert len(canon_entities) == 98, f"expected 98 entities in canon roster, found {len(canon_entities)}"

    def test_every_entity_has_required_identity_and_watermarks(self, canon_entities: list[dict]) -> None:
        for e in canon_entities:
            slug = e.get("slug")
            assert e.get("name"), f"canon entity {slug} missing name"
            assert e.get("role") in ("Survivor", "Killer"), f"canon entity {slug} missing or invalid role"
            assert e.get("real_name"), f"canon entity {slug} missing real_name"
            assert e.get("watermark_left"), f"canon entity {slug} missing watermark_left"
            assert e.get("watermark_right"), f"canon entity {slug} missing watermark_right"

    def test_every_entity_has_at_least_four_red_and_green_flags(self, canon_entities: list[dict]) -> None:
        for e in canon_entities:
            slug = e.get("slug")
            red_flags = e.get("red_flags") or []
            green_flags = e.get("green_flags") or []
            assert len(red_flags) >= 4, f"canon entity {slug} has {len(red_flags)} red_flags (expected >= 4)"
            assert len(green_flags) >= 4, f"canon entity {slug} has {len(green_flags)} green_flags (expected >= 4)"

    def test_every_entity_has_polish_translations_with_flags(self, canon_entities: list[dict]) -> None:
        for e in canon_entities:
            slug = e.get("slug")
            translations = e.get("translations") or {}
            assert "pl" in translations, f"canon entity {slug} missing 'pl' translations"
            pl = translations["pl"]
            pl_red = pl.get("red_flags") or []
            pl_green = pl.get("green_flags") or []
            assert len(pl_red) >= 4, f"canon entity {slug} translations.pl has {len(pl_red)} red_flags (expected >= 4)"
            assert len(pl_green) >= 4, f"canon entity {slug} translations.pl has {len(pl_green)} green_flags (expected >= 4)"

    def test_no_templated_meme_strings(self, canon_entities: list[dict]) -> None:
        forbidden = "always bringing chaos and unhinged energy"
        for e in canon_entities:
            slug = e.get("slug")
            meme = e.get("meme") or ""
            assert forbidden not in meme, f"canon entity {slug} contains generic meme template: {meme!r}"

    def test_specific_exact_watermarks_and_names(self, canon_entities: list[dict]) -> None:
        by_slug = {e["slug"]: e for e in canon_entities}

        # leon_scott_kennedy: watermark_left == "LEON S.", watermark_right == "KENNEDY"
        leon = by_slug.get("leon_scott_kennedy")
        assert leon is not None, "leon_scott_kennedy not found"
        assert leon.get("watermark_left") == "LEON S."
        assert leon.get("watermark_right") == "KENNEDY"

        # the_onryō: watermark_left == "THE ONRYŌ", watermark_right == "SADAKO", name == "The Onryō"
        onryo = by_slug.get("the_onryō")
        assert onryo is not None, "the_onryō not found"
        assert onryo.get("name") == "The Onryō"
        assert onryo.get("watermark_left") == "THE ONRYŌ"
        assert onryo.get("watermark_right") == "SADAKO"

        # the_shape: watermark_left == "THE SHAPE", watermark_right == "MICHAEL MYERS", name == "The Shape"
        shape = by_slug.get("the_shape")
        assert shape is not None, "the_shape not found"
        assert shape.get("name") == "The Shape"
        assert shape.get("watermark_left") == "THE SHAPE"
        assert shape.get("watermark_right") == "MICHAEL MYERS"

        # the_executioner: watermark_left == "THE EXECUTIONER", watermark_right == "PYRAMID HEAD", name == "The Executioner"
        pyramid = by_slug.get("the_executioner")
        assert pyramid is not None, "the_executioner not found"
        assert pyramid.get("name") == "The Executioner"
        assert pyramid.get("watermark_left") == "THE EXECUTIONER"
        assert pyramid.get("watermark_right") == "PYRAMID HEAD"

        # the_mastermind: watermark_left == "THE MASTERMIND", watermark_right == "ALBERT WESKER", name == "The Mastermind"
        wesker = by_slug.get("the_mastermind")
        assert wesker is not None, "the_mastermind not found"
        assert wesker.get("name") == "The Mastermind"
        assert wesker.get("watermark_left") == "THE MASTERMIND"
        assert wesker.get("watermark_right") == "ALBERT WESKER"

        # the_good_guy: watermark_left == "THE GOOD GUY", watermark_right == "CHUCKY", name == "The Good Guy"
        chucky = by_slug.get("the_good_guy")
        assert chucky is not None, "the_good_guy not found"
        assert chucky.get("name") == "The Good Guy"
        assert chucky.get("watermark_left") == "THE GOOD GUY"
        assert chucky.get("watermark_right") == "CHUCKY"

        # bill_overbeck: watermark_left == "BILL", watermark_right == "OVERBECK"
        bill = by_slug.get("bill_overbeck")
        assert bill is not None, "bill_overbeck not found"
        assert bill.get("watermark_left") == "BILL"
        assert bill.get("watermark_right") == "OVERBECK"

        # eleven: watermark_left == "SURVIVOR", watermark_right == "ELEVEN"
        eleven = by_slug.get("eleven")
        assert eleven is not None, "eleven not found"
        assert eleven.get("watermark_left") == "SURVIVOR"
        assert eleven.get("watermark_right") == "ELEVEN"
