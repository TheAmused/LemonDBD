# backend/tests/unit/api/test_item_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app import create_app
from app.models import Item, ItemAddon, ItemCategory
from app.services.perk_service import PerkService


@pytest.fixture(autouse=True)
def setup_items_and_addons(db_session: Session) -> None:
    medkit_category = db_session.scalars(
        select(ItemCategory).where(ItemCategory.name == "Med-Kit")
    ).first()
    if not medkit_category:
        medkit_category = ItemCategory(
            name="Med-Kit", addon_target_label="Med-Kits", role="Survivor"
        )
        db_session.add(medkit_category)
        db_session.flush()

    flashlight_category = db_session.scalars(
        select(ItemCategory).where(ItemCategory.name == "Flashlight")
    ).first()
    if not flashlight_category:
        flashlight_category = ItemCategory(
            name="Flashlight", addon_target_label="Flashlights", role="Survivor"
        )
        db_session.add(flashlight_category)
        db_session.flush()

    existing_medkit = db_session.scalars(select(Item).where(Item.name == "Emergency Med-Kit")).first()
    if not existing_medkit:
        db_session.add(
            Item(
                name="Emergency Med-Kit",
                category_id=medkit_category.id,
                description="Heals survivors quickly",
                rarity="Rare",
            )
        )
    else:
        existing_medkit.category_id = medkit_category.id

    existing_flash = db_session.scalars(select(Item).where(Item.name == "Flashlight")).first()
    if not existing_flash:
        db_session.add(
            Item(
                name="Flashlight",
                category_id=flashlight_category.id,
                description="Blinds killers",
                rarity="Uncommon",
            )
        )
    else:
        existing_flash.category_id = flashlight_category.id
        existing_flash.description = "Blinds killers"

    db_session.flush()

    existing_gel = db_session.scalars(select(ItemAddon).where(ItemAddon.name == "Gel Dressings")).first()
    if not existing_gel:
        db_session.add(
            ItemAddon(
                name="Gel Dressings",
                item_category_id=medkit_category.id,
                description="Adds charges",
                rarity="Rare",
            )
        )
    else:
        existing_gel.item_category_id = medkit_category.id
        existing_gel.description = "Adds charges"

    existing_battery = db_session.scalars(select(ItemAddon).where(ItemAddon.name == "Heavy Duty Battery")).first()
    if not existing_battery:
        db_session.add(
            ItemAddon(
                name="Heavy Duty Battery",
                item_category_id=flashlight_category.id,
                description="Increases battery duration",
                rarity="Uncommon",
            )
        )
    else:
        existing_battery.item_category_id = flashlight_category.id

    db_session.commit()


@pytest.mark.unit
class TestItemRoutes:
    """Tests for Equipment items and add-on catalog listing and search."""

    def test_list_items(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/items")
        assert response.status_code == 200
        data = response.get_json()
        assert "count" in data
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_list_addons(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/addons")
        assert response.status_code == 200
        data = response.get_json()
        assert "count" in data
        assert "data" in data
        assert isinstance(data["data"], list)

        response_filtered = client.get("/api/v1/addons?category=Med-Kit&search=Gel")
        assert response_filtered.status_code == 200
        data_filtered = response_filtered.get_json()
        assert data_filtered["count"] >= 1
        assert any(a["name"] == "Gel Dressings" for a in data_filtered["data"])

    def test_perk_service_items_and_addons(self) -> None:
        service = PerkService()
        medkits = service.get_items(category="Med-Kit")
        assert len(medkits) >= 1
        assert any(i["name"] == "Emergency Med-Kit" for i in medkits)

        search_result = service.get_items(search="blind")
        assert len(search_result) >= 1
        assert any(i["name"] == "Flashlight" for i in search_result)

        medkit_addons = service.get_addons(category="Survivor", target="Med-Kit")
        assert len(medkit_addons) >= 1
        assert any(a["name"] == "Gel Dressings" for a in medkit_addons)

        target_addons = service.get_addons(target="Flashlight")
        assert len(target_addons) >= 1
        assert any(a["name"] == "Heavy Duty Battery" for a in target_addons)

        addon_search = service.get_addons(search="charges")
        assert len(addon_search) >= 1
        assert any(a["name"] == "Gel Dressings" for a in addon_search)
