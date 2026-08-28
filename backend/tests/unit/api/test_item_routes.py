# backend/tests/unit/api/test_item_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app import create_app
from app.models import Item, Addon
from app.services.perk_service import PerkService


@pytest.fixture(autouse=True)
def setup_items_and_addons(db_session: Session) -> None:
    existing_medkit = db_session.scalars(select(Item).where(Item.name == "Emergency Med-Kit")).first()
    if not existing_medkit:
        db_session.add(
            Item(
                name="Emergency Med-Kit",
                category="Med-Kit",
                role="Survivor",
                description="Heals survivors quickly",
                rarity="Rare",
            )
        )
    else:
        existing_medkit.category = "Med-Kit"

    existing_flash = db_session.scalars(select(Item).where(Item.name == "Flashlight")).first()
    if not existing_flash:
        db_session.add(
            Item(
                name="Flashlight",
                category="Flashlight",
                role="Survivor",
                description="Blinds killers",
                rarity="Uncommon",
            )
        )
    else:
        existing_flash.category = "Flashlight"
        existing_flash.description = "Blinds killers"

    existing_gel = db_session.scalars(select(Addon).where(Addon.name == "Gel Dressings")).first()
    if not existing_gel:
        db_session.add(
            Addon(
                name="Gel Dressings",
                associated_target="Emergency Med-Kit",
                category="Med-Kit",
                description="Adds charges",
                rarity="Rare",
            )
        )
    else:
        existing_gel.category = "Med-Kit"
        existing_gel.associated_target = "Emergency Med-Kit"
        existing_gel.description = "Adds charges"

    existing_battery = db_session.scalars(select(Addon).where(Addon.name == "Heavy Duty Battery")).first()
    if not existing_battery:
        db_session.add(
            Addon(
                name="Heavy Duty Battery",
                associated_target="Flashlight",
                category="Flashlight",
                description="Increases battery duration",
                rarity="Uncommon",
            )
        )
    else:
        existing_battery.category = "Flashlight"
        existing_battery.associated_target = "Flashlight"

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

        medkit_addons = service.get_addons(category="Med-Kit")
        assert len(medkit_addons) >= 1
        assert any(a["name"] == "Gel Dressings" for a in medkit_addons)

        target_addons = service.get_addons(target="Flashlight")
        assert len(target_addons) >= 1
        assert any(a["name"] == "Heavy Duty Battery" for a in target_addons)

        addon_search = service.get_addons(search="charges")
        assert len(addon_search) >= 1
        assert any(a["name"] == "Gel Dressings" for a in addon_search)
