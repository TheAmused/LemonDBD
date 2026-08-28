# backend/tests/unit/test_schemas_and_serialization.py
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from app.schemas.character import CharacterBase, CharacterResponse, KillerPowerSchema
from app.schemas.community import (
    BugReportCreate,
    BugReportResponse,
    CommunityBuildCreate,
    CustomPerkCreate,
    DailyQuestResponse,
)
from app.schemas.equipment import AddonResponse, ItemResponse
from app.schemas.gauntlet import GauntletRunCreate, GauntletRunResponse
from app.schemas.chaos import ChaosRunResponse
from app.schemas.history import HistoryRunResponse
from app.schemas.page_streak import PageStreakRunCreate, PageStreakRunResponse
from app.schemas.perk import PerkBase, PerkResponse, PerkRuleResponse
from app.schemas.user import UserCreate, UserResponse, UserUpdate


@pytest.mark.unit
class TestUserSchemas:
    def test_user_create_valid(self) -> None:
        payload = {
            "username": "ClaudetteM",
            "email": "claudette@example.com",
            "password": "strongPassword123",
            "role": "user",
        }
        schema = UserCreate.model_validate(payload)
        assert schema.username == "ClaudetteM"
        assert schema.email == "claudette@example.com"
        assert schema.password == "strongPassword123"

    def test_user_create_invalid_email(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(
                username="InvalidUser",
                email="not-an-email",
                password="password123",
            )

    def test_user_create_short_password(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(
                username="ShortPassUser",
                email="short@example.com",
                password="123",
            )

    def test_user_response_from_attributes(self) -> None:
        now = datetime.now(timezone.utc)
        mock_data = {
            "id": 10,
            "username": "FengMin",
            "email": "feng@example.com",
            "role": "user",
            "avatar_url": "feng_avatar.png",
            "is_active": True,
            "is_verified": True,
            "created_at": now,
            "updated_at": now,
        }
        resp = UserResponse.model_validate(mock_data)
        assert resp.id == 10
        assert resp.username == "FengMin"
        assert resp.is_verified is True


@pytest.mark.unit
class TestCharacterAndPerkSchemas:
    def test_character_response_serialization(self) -> None:
        power = KillerPowerSchema(
            name="Spencer's Last Breath",
            description="Allows teleporting through obstacles.",
            movement_speed="3.85 m/s (96.25%)",
            terror_radius="32 m",
            terror_radius_meters=32,
            height="Average",
        )
        data = {
            "id": 1,
            "name": "The Nurse",
            "role": "Killer",
            "category": "Killer",
            "code_prefix": "NR",
            "portrait_url": "/nurse.png",
            "real_name": "Sally Smithson",
            "short_name": "nurse",
            "wiki_slug": "nurse",
            "avatar_url": "/nurse.png",
            "avatar_local_path": "/icons/nurse.png",
            "release_number": 4,
            "chapter_name": "The Last Breath",
            "chapter_number": "Chapter 2",
            "dlc_type": "original_chapter",
            "is_licensed": False,
            "is_disabled": False,
            "disabled_reason": None,
            "release_year": 2016,
            "release_date": "2016-08-18",
            "dlc_counterparts": ["Nea Karlsson"],
            "lore": "Sally Smithson worked at Disturbed Ward...",
            "power": power,
        }
        validated = CharacterResponse.model_validate(data)
        assert validated.name == "The Nurse"
        assert validated.power is not None
        assert validated.power.name == "Spencer's Last Breath"

    def test_perk_response_defaults(self) -> None:
        data = {
            "id": 101,
            "name": "Sprint Burst",
            "alternate_name": None,
            "is_generic_counterpart": False,
            "is_teachable": True,
            "category": "Survivor",
            "description": "Break into a sprint at 150% normal running speed for 3 seconds.",
            "icon_url": "/icons/sprint_burst.png",
            "icon_local_path": "icons/perks/sprint_burst.png",
            "character_id": 2,
            "character": "Meg Thomas",
            "character_real_name": "Meg Thomas",
            "character_avatar_path": "icons/avatars/meg.png",
            "is_disabled": False,
            "disabled_reason": None,
        }
        perk = PerkResponse.model_validate(data)
        assert perk.id == 101
        assert perk.name == "Sprint Burst"
        assert perk.character == "Meg Thomas"


@pytest.mark.unit
class TestCommunityAndStreakSchemas:
    def test_community_build_create_validation(self) -> None:
        valid_build = CommunityBuildCreate(
            title="Gen Rush Meta 2026",
            description="Optimal perks for rapid repair efficiency",
            role="Survivor",
            category="Objective",
            character_id="all",
            perks=["Prove Thyself", "Deja Vu", "Resilience", "Fast Track"],
        )
        assert len(valid_build.perks) == 4

        with pytest.raises(ValidationError):
            CommunityBuildCreate(
                title="Gen Rush Meta 2026",
                description="Too many perks",
                role="Survivor",
                category="Objective",
                character_id="all",
                perks=["Perk1", "Perk2", "Perk3", "Perk4", "Perk5"],
            )

    def test_gauntlet_run_create_validation(self) -> None:
        run_req = GauntletRunCreate(
            user_id=14,
            role="Killer",
            starting_character_id="trapper",
        )
        assert run_req.user_id == 14
        assert run_req.starting_character_id == "trapper"