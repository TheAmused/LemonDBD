# backend/tests/unit/test_schemas_and_serialization.py
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from app.schemas.community import (
    BugReportCreate,
    BugReportResponse,
)
from app.schemas.equipment import (
    ItemAddonBase,
    ItemAddonResponse,
    ItemResponse,
    KillerAddonBase,
    KillerAddonResponse,
)
from app.schemas.user import UserCreate, UserResponse, UserUpdate


@pytest.mark.unit
class TestUserSchemas:
    """Tests for User schema validation and responses."""

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
class TestCommunityAndStreakSchemas:
    """Tests for Community builds and challenge streak request payloads."""

    def test_bug_report_create_validation(self) -> None:
        report = BugReportCreate(
            reporter_name="TrapperMain",
            title="Trap stuck in rock",
            message="Bear trap placed near rock became unreachable.",
        )
        assert report.reporter_name == "TrapperMain"
        assert report.title == "Trap stuck in rock"


@pytest.mark.unit
class TestAddonSchemas:
    """The two add-on tables replaced one table with two nullable keys."""

    def test_owner_key_is_required_on_each_write_shape(self) -> None:
        # The old AddonBase accepted a row with neither key and leaned on a
        # validator to reject one with both. Neither case is reachable now:
        # each table has exactly one owner column, and it is NOT NULL.
        with pytest.raises(ValidationError):
            KillerAddonBase.model_validate({"name": "Bloody Coil"})
        with pytest.raises(ValidationError):
            ItemAddonBase.model_validate({"name": "Battery"})

        killer_addon = KillerAddonBase.model_validate({"name": "Bloody Coil", "killer_id": 1})
        item_addon = ItemAddonBase.model_validate({"name": "Battery", "item_category_id": 1})
        assert killer_addon.killer_id == 1
        assert item_addon.item_category_id == 1
        assert not hasattr(killer_addon, "item_category_id")
        assert not hasattr(item_addon, "killer_id")

    def test_both_responses_expose_the_same_fields(self) -> None:
        # A client holding a mixed list of add-ons should not have to know
        # which table a row came from, so the two responses are one shape.
        assert set(KillerAddonResponse.model_fields) == set(ItemAddonResponse.model_fields)

        killer_row = KillerAddonResponse.model_validate(
            {"id": 1, "name": "Bloody Coil", "killer_id": 1, "associated_target": "The Trapper"}
        )
        item_row = ItemAddonResponse.model_validate(
            {"id": 1, "name": "Battery", "item_category_id": 1, "associated_target": "Flashlights"}
        )
        assert killer_row.item_category_id is None
        assert item_row.killer_id is None
