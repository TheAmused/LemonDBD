# backend/tests/unit/test_static_db_seeder.py
import json
import pytest
from pathlib import Path
from sqlalchemy import select, func
from app.core.extensions import db
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.models.smash_or_pass import Roster
from app.models.admin import SeedUpdateLog
from app.seeds.static_db_seeder import seed_from_static_json, import_update_file, apply_pending_updates, SEEDS_UPDATES_DIR


def test_static_db_seeder_initializes_empty_db(app):
    with app.app_context():
        db.drop_all()
        db.create_all()

        result = seed_from_static_json(force=True)
        assert result["status"] == "success"

        # Two tables, so two counts. "How many characters are there" is the
        # sum; there is no table holding both.
        char_count = (db.session.scalar(select(func.count(Survivor.id))) or 0) + (
            db.session.scalar(select(func.count(Killer.id))) or 0
        )
        perk_count = db.session.scalar(select(func.count(Perk.id)))
        roster_count = db.session.scalar(select(func.count(Roster.id)))

        assert char_count >= 98
        assert perk_count >= 321
        assert roster_count >= 6


def test_static_db_seeder_applies_folder_update(app, tmp_path, monkeypatch):
    with app.app_context():
        # Baseline seed
        seed_from_static_json(force=True)

        # Create a mock patch file in a temp updates directory
        fake_updates_dir = tmp_path / "updates"
        fake_updates_dir.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr("app.seeds.static_db_seeder._find_updates_dirs", lambda: [fake_updates_dir])

        patch_file = fake_updates_dir / "001_sprint_burst_update.json"
        updated_desc = "TEST PATCH: Sprint Burst granted 200% movement speed for 5 seconds."
        patch_file.write_text(
            json.dumps({
                "perks": [
                    {
                        "name": "Sprint Burst",
                        "description": updated_desc,
                    }
                ]
            }),
            encoding="utf-8"
        )

        # Run seeder - should detect and apply the update
        upd_res = apply_pending_updates()
        assert upd_res["applied_count"] == 1
        assert "001_sprint_burst_update.json" in upd_res["applied_files"]

        # Check that the perk description in database was actually updated
        sprint_burst = db.session.scalar(select(Perk).where(Perk.name == "Sprint Burst"))
        assert sprint_burst is not None
        assert sprint_burst.description == updated_desc

        # Check that hash was recorded
        log_entry = db.session.scalar(
            select(SeedUpdateLog).where(SeedUpdateLog.file_identifier == "update:001_sprint_burst_update.json")
        )
        assert log_entry is not None

        # Second run should skip since hash is unchanged
        second_res = apply_pending_updates()
        assert second_res["applied_count"] == 0


def test_import_update_file_directly(app, tmp_path):
    with app.app_context():
        seed_from_static_json(force=True)

        custom_patch = tmp_path / "custom_patch.json"
        new_lore = "TEST CUSTOM LORE: The Trapper became the ultimate guardian."
        custom_patch.write_text(
            json.dumps({
                "characters": [
                    {
                        "name": "The Trapper",
                        "lore": new_lore,
                    }
                ]
            }),
            encoding="utf-8"
        )

        res = import_update_file(custom_patch)
        assert res["status"] == "success"

        trapper = db.session.scalar(select(Killer).where(Killer.name == "The Trapper"))
        assert trapper is not None
        assert trapper.lore == new_lore
