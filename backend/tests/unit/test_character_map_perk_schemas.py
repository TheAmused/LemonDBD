# backend/tests/unit/test_character_map_perk_schemas.py
"""Unit tests for the character/map/perk Pydantic DTOs.

Pure schema tests -- no DB fixtures needed, same as
`test_schemas_and_serialization.py`'s add-on tests: these validate shape and
constraints only, independent of the (currently unwired) routes.
"""
import pytest
from pydantic import ValidationError

from app.schemas.character import (
    KillerBase,
    KillerPowerResponse,
    KillerResponse,
    SurvivorBase,
    SurvivorResponse,
)
from app.schemas.map import (
    DEFAULT_JUNGLE_GYMS,
    DEFAULT_LAYOUT_TYPE,
    DEFAULT_PALLET_DENSITY,
    DEFAULT_SHACK_HAS_BASEMENT,
    DEFAULT_SOURCE_CODE,
    DEFAULT_SOURCE_LABEL,
    DEFAULT_TOTEM_SPAWNS,
    MapRealmBase,
    MapRealmResponse,
    MapSourceBase,
    MapSourceResponse,
    RealmBase,
    RealmResponse,
)
from app.schemas.perk import PerkBase, PerkResponse
from app.schemas.user import UserCharacterOwnershipBase, UserCharacterOwnershipResponse
from app.schemas.changelog import ChangelogPostResponse
from app.schemas.chaos import ChaosRunResponse
from app.schemas.gauntlet import GauntletRunResponse
from app.schemas.history import HistoryRunResponse


@pytest.mark.unit
class TestSurvivorSchemas:
    def test_survivor_base_requires_name_and_chapter(self) -> None:
        with pytest.raises(ValidationError):
            SurvivorBase.model_validate({})

        survivor = SurvivorBase.model_validate({"name": "Feng Min", "chapter_id": 1})
        assert survivor.name == "Feng Min"
        assert survivor.chapter_id == 1
        assert survivor.is_disabled is False

    def test_survivor_base_has_no_role_field(self) -> None:
        # role is a class constant on the model, not a column -- there is
        # nothing to write, so the write shape has no role field at all.
        assert "role" not in SurvivorBase.model_fields

    def test_survivor_response_mirrors_to_dict_shape(self) -> None:
        # Mirrors what Survivor.to_dict() actually emits for id 1 (Dwight-shaped).
        payload = {
            "id": 1,
            "name": "Dwight Fairfield",
            "role": "Survivor",
            "category": "Survivor",
            "code_prefix": "S01",
            "portrait_url": "dwight.png",
            "real_name": "Dwight Fairfield",
            "avatar_url": "dwight.png",
            "avatar_local_path": "",
            "release_number": 1,
            "chapter_id": 1,
            "chapter_name": "Base Game",
            "dlc_type": "base_game",
            "is_licensed": False,
            "is_disabled": False,
            "disabled_reason": None,
            "release_year": 2016,
            "release_date": "14 June 2016",
            "dlc_counterparts": [],
            "lore": "",
            "translations": {},
        }
        resp = SurvivorResponse.model_validate(payload)
        assert resp.id == 1
        assert resp.role == "Survivor"
        assert resp.code_prefix == "S01"
        assert resp.dlc_counterparts == []

    def test_survivor_response_defaults_match_model_defaults(self) -> None:
        # Only the fields Survivor.to_dict() can never omit are required;
        # everything else falls back exactly like _base_dict()'s own defaults.
        resp = SurvivorResponse.model_validate(
            {
                "id": 2,
                "name": "Meg Thomas",
                "real_name": "Meg Thomas",
                "code_prefix": "S02",
                "release_number": 2,
                "chapter_id": 1,
            }
        )
        assert resp.role == "Survivor"
        assert resp.category == "Survivor"
        assert resp.chapter_name == "Base Game"
        assert resp.avatar_url == ""
        assert resp.translations == {}


@pytest.mark.unit
class TestKillerSchemas:
    def test_killer_base_requires_power_name(self) -> None:
        # Every killer has a power, no survivor ever did -- power_name is
        # NOT NULL on the model and required here too.
        with pytest.raises(ValidationError):
            KillerBase.model_validate({"name": "The Trapper", "chapter_id": 1})

        killer = KillerBase.model_validate(
            {"name": "The Trapper", "chapter_id": 1, "power_name": "Bear Traps"}
        )
        assert killer.power_name == "Bear Traps"
        assert killer.power_description == ""

    def test_killer_base_height_pattern(self) -> None:
        with pytest.raises(ValidationError):
            KillerBase.model_validate(
                {
                    "name": "The Trapper",
                    "chapter_id": 1,
                    "power_name": "Bear Traps",
                    "height": "Enormous",
                }
            )

        killer = KillerBase.model_validate(
            {
                "name": "The Trapper",
                "chapter_id": 1,
                "power_name": "Bear Traps",
                "height": "Tall",
            }
        )
        assert killer.height == "Tall"

    def test_killer_base_movement_speed_must_be_positive(self) -> None:
        # Mirrors ck_killers_movement_speed_ms: NULL or > 0.
        with pytest.raises(ValidationError):
            KillerBase.model_validate(
                {
                    "name": "The Trapper",
                    "chapter_id": 1,
                    "power_name": "Bear Traps",
                    "movement_speed_ms": 0,
                }
            )
        with pytest.raises(ValidationError):
            KillerBase.model_validate(
                {
                    "name": "The Trapper",
                    "chapter_id": 1,
                    "power_name": "Bear Traps",
                    "movement_speed_ms": -1,
                }
            )

        killer = KillerBase.model_validate(
            {
                "name": "The Trapper",
                "chapter_id": 1,
                "power_name": "Bear Traps",
                "movement_speed_ms": 4.6,
            }
        )
        assert killer.movement_speed_ms == 4.6

    def test_killer_base_terror_radius_meters_cannot_be_negative(self) -> None:
        # Mirrors ck_killers_terror_radius_meters: NULL or >= 0.
        with pytest.raises(ValidationError):
            KillerBase.model_validate(
                {
                    "name": "The Trapper",
                    "chapter_id": 1,
                    "power_name": "Bear Traps",
                    "terror_radius_meters": -1,
                }
            )

        killer = KillerBase.model_validate(
            {
                "name": "The Trapper",
                "chapter_id": 1,
                "power_name": "Bear Traps",
                "terror_radius_meters": 0,
            }
        )
        assert killer.terror_radius_meters == 0

    def test_killer_response_embeds_power_dict_directly(self) -> None:
        # Killer.to_dict() nests power = self.power_dict(lang); the response
        # should accept that dict as-is, with no reshaping by the caller.
        payload = {
            "id": 1,
            "name": "The Trapper",
            "role": "Killer",
            "category": "Killer",
            "code_prefix": "K01",
            "real_name": "Evan MacMillan",
            "release_number": 1,
            "chapter_id": 1,
            "power": {
                "name": "Bear Traps",
                "description": "Set traps across the trial.",
                "icon_url": "",
                "icon_local_path": "",
                "movement_speed": "4.6 m/s (115%)",
                "terror_radius": "32 m",
                "terror_radius_meters": 32,
                "height": "Tall",
            },
        }
        resp = KillerResponse.model_validate(payload)
        assert isinstance(resp.power, KillerPowerResponse)
        assert resp.power.name == "Bear Traps"
        assert resp.power.terror_radius_meters == 32

    def test_killer_power_response_defaults_match_power_dict_fallbacks(self) -> None:
        # Killer.power_dict()'s own fallbacks when the nullable power columns
        # are unset (name is the one required field -- power_name is NOT NULL).
        power = KillerPowerResponse.model_validate({"name": "Bear Traps"})
        assert power.movement_speed == "4.6 m/s (115%)"
        assert power.terror_radius == "32 m"
        assert power.terror_radius_meters == 32
        assert power.height == "Tall"


@pytest.mark.unit
class TestMapSchemas:
    def test_realm_base_requires_name(self) -> None:
        with pytest.raises(ValidationError):
            RealmBase.model_validate({})
        realm = RealmBase.model_validate({"name": "Autohaven Wreckers"})
        assert realm.name == "Autohaven Wreckers"

    def test_realm_response_mirrors_to_dict(self) -> None:
        resp = RealmResponse.model_validate(
            {"id": 1, "name": "Autohaven Wreckers", "raw_name": "Autohaven Wreckers"}
        )
        assert resp.image_url == ""
        assert resp.image_local_path == ""
        # translations is deliberately not part of Realm.to_dict()'s output.
        assert "translations" not in RealmResponse.model_fields

    def test_map_source_schemas_require_code_and_label(self) -> None:
        with pytest.raises(ValidationError):
            MapSourceBase.model_validate({"code": "hens333"})

        source = MapSourceBase.model_validate(
            {"code": "hens333", "label": "Hens333 12-Clock Callouts"}
        )
        assert source.code == "hens333"

        resp = MapSourceResponse.model_validate(
            {"id": 1, "code": "hens333", "label": "Hens333 12-Clock Callouts"}
        )
        assert resp.id == 1

    def test_map_realm_base_requires_both_foreign_keys(self) -> None:
        with pytest.raises(ValidationError):
            MapRealmBase.model_validate({"name": "Azarov's Resting Place"})
        with pytest.raises(ValidationError):
            MapRealmBase.model_validate(
                {"name": "Azarov's Resting Place", "realm_id": 1}
            )

        realm_map = MapRealmBase.model_validate(
            {"name": "Azarov's Resting Place", "realm_id": 1, "source_id": 1}
        )
        assert realm_map.realm_id == 1
        assert realm_map.source_id == 1

    def test_map_realm_response_serves_layout_from_defaults(self) -> None:
        # These five columns don't exist on the model any more; MapRealm.to_dict()
        # serves them from module-level constants, and the response does the same.
        resp = MapRealmResponse.model_validate(
            {
                "id": 1,
                "name": "Azarov's Resting Place",
                "realm_id": 1,
                "source_id": 1,
            }
        )
        assert resp.layout_type == DEFAULT_LAYOUT_TYPE
        assert resp.jungle_gyms_count == DEFAULT_JUNGLE_GYMS
        assert resp.totem_spawns_count == DEFAULT_TOTEM_SPAWNS
        assert resp.pallet_density == DEFAULT_PALLET_DENSITY
        assert resp.shack_has_basement == DEFAULT_SHACK_HAS_BASEMENT
        assert resp.source == DEFAULT_SOURCE_CODE
        assert resp.source_label == DEFAULT_SOURCE_LABEL

    def test_map_realm_response_image_url_mirrors_callout_image_url(self) -> None:
        # Byte-identical on the wire, one stored URL. The schema doesn't
        # derive it (that's the route/to_dict's job) but both keys exist.
        resp = MapRealmResponse.model_validate(
            {
                "id": 1,
                "name": "Azarov's Resting Place",
                "realm_id": 1,
                "source_id": 1,
                "callout_image_url": "azarovs.png",
                "image_url": "azarovs.png",
            }
        )
        assert resp.callout_image_url == resp.image_url == "azarovs.png"

    def test_no_map_tile_or_map_objective_schema_exists(self) -> None:
        # The tables are gone; nothing should reintroduce a schema for them.
        import app.schemas.map as map_schemas

        assert not hasattr(map_schemas, "MapTile")
        assert not hasattr(map_schemas, "MapObjective")

    def test_map_realm_response_has_no_tiles_or_objectives_field(self) -> None:
        # MapRealm.to_dict() no longer emits either key, so the response
        # schema doesn't declare them -- passing them is simply ignored,
        # not validated against, since pydantic drops unknown input fields
        # by default.
        assert "tiles" not in MapRealmResponse.model_fields
        assert "objectives" not in MapRealmResponse.model_fields


@pytest.mark.unit
class TestPerkSchemas:
    def test_perk_base_defaults_to_general_survivor_perk(self) -> None:
        perk = PerkBase.model_validate({"name": "Prove Thyself"})
        assert perk.role == "Survivor"
        assert perk.survivor_id is None
        assert perk.killer_id is None

    def test_perk_base_role_pattern_rejects_anything_but_survivor_or_killer(self) -> None:
        with pytest.raises(ValidationError):
            PerkBase.model_validate({"name": "Prove Thyself", "role": "General"})

    def test_perk_base_rejects_both_owners_set(self) -> None:
        # Mirrors ck_perks_single_owner_matches_role: at most one owner.
        with pytest.raises(ValidationError):
            PerkBase.model_validate(
                {
                    "name": "Deja Vu",
                    "role": "Survivor",
                    "survivor_id": 7,
                    "killer_id": 7,
                }
            )

    def test_perk_base_rejects_owner_on_the_wrong_side(self) -> None:
        # A killer perk can never acquire a survivor owner, and vice versa.
        with pytest.raises(ValidationError):
            PerkBase.model_validate(
                {"name": "Deja Vu", "role": "Killer", "survivor_id": 7}
            )
        with pytest.raises(ValidationError):
            PerkBase.model_validate(
                {"name": "Barbecue & Chili", "role": "Survivor", "killer_id": 7}
            )

    def test_perk_base_accepts_owner_matching_role(self) -> None:
        survivor_perk = PerkBase.model_validate(
            {"name": "Deja Vu", "role": "Survivor", "survivor_id": 7}
        )
        assert survivor_perk.survivor_id == 7
        assert survivor_perk.killer_id is None

        killer_perk = PerkBase.model_validate(
            {"name": "Barbecue & Chili", "role": "Killer", "killer_id": 7}
        )
        assert killer_perk.killer_id == 7
        assert killer_perk.survivor_id is None

    def test_perk_base_accepts_general_perk_with_no_owner(self) -> None:
        # 27 general perks have no character at all and still belong to a side.
        general = PerkBase.model_validate({"name": "Borrowed Time", "role": "Survivor"})
        assert general.survivor_id is None
        assert general.killer_id is None

    def test_perk_response_mirrors_to_dict_owner_fields(self) -> None:
        # Mirrors Perk.to_dict(): character_id is scoped to role now that
        # survivor 7 and killer 7 both exist, so survivor_id/killer_id ride
        # alongside it rather than replacing it.
        resp = PerkResponse.model_validate(
            {
                "id": 1,
                "name": "Deja Vu",
                "category": "Survivor",
                "role": "Survivor",
                "character": "Dwight Fairfield",
                "character_real_name": "Dwight Fairfield",
                "character_id": 1,
                "survivor_id": 1,
                "killer_id": None,
            }
        )
        assert resp.character_id == 1
        assert resp.survivor_id == 1
        assert resp.killer_id is None

    def test_perk_response_general_perk_defaults(self) -> None:
        resp = PerkResponse.model_validate(
            {"id": 99, "name": "Borrowed Time", "category": "Survivor", "role": "Survivor"}
        )
        assert resp.character == "General"
        assert resp.character_real_name == "General"
        assert resp.character_id is None


@pytest.mark.unit
class TestUserCharacterOwnershipSchemaAudit:
    """UserCharacterOwnershipBase/Response used to write/read a single
    character_id, pointed at the old shared `characters` table. Regression
    coverage for re-shaping them to the survivor_id/killer_id split."""

    def test_base_no_longer_has_a_bare_character_id_field(self) -> None:
        assert "character_id" not in UserCharacterOwnershipBase.model_fields

    def test_base_rejects_neither_side_set(self) -> None:
        with pytest.raises(ValidationError):
            UserCharacterOwnershipBase.model_validate({"user_id": 1})

    def test_base_rejects_both_sides_set(self) -> None:
        with pytest.raises(ValidationError):
            UserCharacterOwnershipBase.model_validate(
                {"user_id": 1, "survivor_id": 7, "killer_id": 7}
            )

    def test_base_accepts_exactly_one_side(self) -> None:
        survivor_owned = UserCharacterOwnershipBase.model_validate(
            {"user_id": 1, "survivor_id": 7}
        )
        assert survivor_owned.survivor_id == 7
        assert survivor_owned.killer_id is None

        killer_owned = UserCharacterOwnershipBase.model_validate(
            {"user_id": 1, "killer_id": 7}
        )
        assert killer_owned.killer_id == 7

    def test_response_mirrors_to_dict_with_both_scoped_and_unscoped_ids(self) -> None:
        # UserCharacterOwnership.to_dict(): character_id is scoped by
        # character_role now that survivor 7 and killer 7 both exist.
        resp = UserCharacterOwnershipResponse.model_validate(
            {
                "id": 1,
                "user_id": 1,
                "character_id": 7,
                "character_role": "Survivor",
                "survivor_id": 7,
                "killer_id": None,
                "character_name": "Nea Karlsson",
                "is_owned": True,
            }
        )
        assert resp.character_id == 7
        assert resp.character_role == "Survivor"
        assert resp.survivor_id == 7


@pytest.mark.unit
class TestOtherSchemaAuditFixes:
    """Small gaps between to_dict() and the existing schemas, found while
    auditing for the character/killer split -- fixed alongside it."""

    def test_changelog_response_carries_position_and_author_id(self) -> None:
        # ChangelogPost.to_dict() emits both; the schema was missing them.
        resp = ChangelogPostResponse.model_validate(
            {
                "id": 1,
                "title": "Patch Notes",
                "content_html": "<p>...</p>",
                "tag": "feature",
                "position": 3,
                "is_published": True,
                "author_id": 2,
                "author_name": "The Entity",
            }
        )
        assert resp.position == 3
        assert resp.author_id == 2

    @pytest.mark.parametrize(
        "response_cls",
        [ChaosRunResponse, GauntletRunResponse, HistoryRunResponse],
    )
    def test_run_responses_carry_attempts(self, response_cls) -> None:
        # Each *Run.to_dict() emits attempts; the response schemas omitted it.
        assert "attempts" in response_cls.model_fields
