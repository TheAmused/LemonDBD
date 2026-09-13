# backend/tests/unit/scripts/test_backfill_map_realms.py
import pytest
from sqlalchemy.orm import Session

from app.models import MapRealm
from scripts.backfill_map_realms import backfill_map_realms


@pytest.mark.unit
class TestBackfillMapRealms:
    def test_updates_general_realm_rows_from_callout_url(self, db_session: Session):
        row = MapRealm(
            map_id="hens_general_realm_blood_lodge",
            name="Blood Lodge",
            realm="General Realm",
            source="hens333",
            callout_image_url="https://hens333.com/img/dbd/callouts/Azarovs/Blood%20Lodge.webp",
            layout_type="Standard",
            jungle_gyms_count=4,
            totem_spawns_count=5,
            pallet_density="Medium",
            shack_has_basement=True,
        )
        db_session.add(row)
        db_session.commit()

        updated = backfill_map_realms(db_session)

        assert updated == 1
        assert row.realm == "Autohaven Wreckers"

    def test_is_idempotent(self, db_session: Session):
        row = MapRealm(
            map_id="hens_general_realm_blood_lodge",
            name="Blood Lodge",
            realm="General Realm",
            source="hens333",
            callout_image_url="https://hens333.com/img/dbd/callouts/Azarovs/Blood%20Lodge.webp",
            layout_type="Standard",
            jungle_gyms_count=4,
            totem_spawns_count=5,
            pallet_density="Medium",
            shack_has_basement=True,
        )
        db_session.add(row)
        db_session.commit()

        first_run = backfill_map_realms(db_session)
        second_run = backfill_map_realms(db_session)

        assert first_run == 1
        assert second_run == 0
        assert row.realm == "Autohaven Wreckers"

    def test_skips_non_hens333_rows(self, db_session: Session):
        row = MapRealm(
            map_id="samoel_dead_dawg_saloon_1",
            name="Dead Dawg Saloon",
            realm="Grave of Glenvale",
            source="samoelcolt",
            callout_image_url="https://images.steamusercontent.com/x.jpg",
            layout_type="Standard",
            jungle_gyms_count=4,
            totem_spawns_count=5,
            pallet_density="Medium",
            shack_has_basement=True,
        )
        db_session.add(row)
        db_session.commit()

        updated = backfill_map_realms(db_session)

        assert updated == 0
        assert row.realm == "Grave of Glenvale"
