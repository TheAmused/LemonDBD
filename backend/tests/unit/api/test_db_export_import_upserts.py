# backend/tests/unit/api/test_db_export_import_upserts.py
"""Grouped export format and upsert hardening on import."""
from decimal import Decimal
import pytest
from sqlalchemy import select
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.models.user import User
from app.services.db.export_import import DatabaseExportImportService
from tests.unit.api.db_export_import_support import (  # noqa: F401  (pytest fixtures)
    export_import_app,
)


@pytest.mark.unit
class TestDatabaseExportImportGroupsAndUpsertHardening:
    def test_export_database_organized_into_groups(self, export_import_app):
        with export_import_app.app_context():
            exported = DatabaseExportImportService.export_database()
            assert "groups" in exported
            assert "data" not in exported, "export_database should no longer return a redundant flat 'data' key"
            assert "content" in exported["groups"]
            assert "users" in exported["groups"]

            content_group = exported["groups"]["content"]
            assert "survivors" in content_group
            assert "killers" in content_group
            assert "perks" in content_group

            users_group = exported["groups"]["users"]
            assert "users" in users_group

    def test_import_database_from_grouped_payload(self, export_import_app):
        with export_import_app.app_context():
            chapter_id = db.session.scalars(select(Chapter)).first().id
            payload = {
                "version": "1.0",
                "groups": {
                    "content": {
                        "survivors": [
                            {"id": 1, "name": "Grouped Dwight", "chapter_id": chapter_id}
                        ]
                    }
                }
            }
            summary = DatabaseExportImportService.import_database(payload, mode="merge", targets=["survivors"])
            assert summary["summary"]["survivors"]["created"] == 1
            char = db.session.scalar(select(Survivor).where(Survivor.name == "Grouped Dwight"))
            assert char is not None
            assert char.id == 1
            assert char.chapter_id == chapter_id

    def test_import_database_upsert_characters_updates_existing_row(self, export_import_app):
        """An incoming row whose id already exists updates that row in place.

        This used to key on `wiki_slug`, a column that held `name` respelled
        for all 98 characters and is gone. Rows are addressed by their integer
        primary key now, and names stay unique across `survivors` and
        `killers`, so a rename is visible as exactly one row changing name --
        never as a second row appearing beside the old one.
        """
        with export_import_app.app_context():
            chapter_id = db.session.scalars(select(Chapter)).first().id
            char = Killer(
                id=7,
                name="Old Trapper Name",
                chapter_id=chapter_id,
                power_name="Bear Trap",
            )
            db.session.add(char)
            db.session.commit()

            payload = {
                "data": {
                    "killers": [
                        {
                            "id": 7,
                            "name": "Updated Trapper Name",
                            "movement_speed_ms": "4.6",
                        }
                    ]
                }
            }
            summary = DatabaseExportImportService.import_database(payload, mode="merge", targets=["killers"])
            assert summary["summary"]["killers"]["updated"] == 1
            assert summary["summary"]["killers"]["created"] == 0

            updated_char = db.session.scalar(select(Killer).where(Killer.name == "Updated Trapper Name"))
            assert updated_char is not None
            assert updated_char.id == 7
            # The old name resolves to nothing: the row was renamed, not copied.
            assert db.session.scalar(select(Killer).where(Killer.name == "Old Trapper Name")) is None
            # `movement_speed_ms` arrives as a string and lands in a NUMERIC
            # column; the display form the old `movement_speed` column held is
            # rendered from it.
            assert updated_char.movement_speed_ms == Decimal("4.6")
            assert updated_char.movement_speed == "4.6 m/s (115%)"

    def test_import_database_upsert_users_safe_email_conflict(self, export_import_app):
        with export_import_app.app_context():
            u1 = User(username="user_alpha", email="alpha@conflict.com", password_hash="h1", role="user")
            u2 = User(username="user_beta", email="beta@conflict.com", password_hash="h2", role="user")
            db.session.add_all([u1, u2])
            db.session.commit()

            # Attempt to update user_beta with user_alpha's email; should gracefully avoid IntegrityError
            payload = {
                "data": {
                    "users": [
                        {
                            "username": "user_beta",
                            "email": "alpha@conflict.com",
                            "role": "admin"
                        }
                    ]
                }
            }
            summary = DatabaseExportImportService.import_database(payload, mode="merge", targets=["users"])
            assert summary["summary"]["users"]["updated"] == 1

            reloaded_beta = db.session.scalar(select(User).where(User.username == "user_beta"))
            assert reloaded_beta.role == "admin"
            # Email was protected from causing a unique constraint crash
            assert reloaded_beta.email == "beta@conflict.com"



    def test_import_database_partial_perks_update_descriptions_only(self, export_import_app):
        with export_import_app.app_context():
            # Setup: ensure 2 existing perks with baseline data
            p1 = db.session.scalar(select(Perk).where(Perk.name == "Brutal Strength"))
            p1.description = "Original Brutal Strength Description"
            p1.role = "Killer"

            p2 = db.session.scalar(select(Perk).where(Perk.name == "Sprint Burst"))
            if not p2:
                p2 = Perk(name="Sprint Burst", role="Survivor", description="Original Sprint Burst Description")
                db.session.add(p2)
            else:
                p2.description = "Original Sprint Burst Description"

            # Baseline 3rd perk that shouldn't be touched
            p3 = db.session.scalar(select(Perk).where(Perk.name == "Dead Hard"))
            if not p3:
                p3 = Perk(name="Dead Hard", role="Survivor", description="Original Dead Hard Description")
                db.session.add(p3)

            db.session.commit()

            # User edits ONLY the 2 perks with updated descriptions in a partial .json.
            # The rows carry their ids because that is the only thing the import
            # consults to decide which row a payload entry is; the name is here
            # for the reader.
            partial_payload = {
                "perks": [
                    {
                        "id": p1.id,
                        "name": "Brutal Strength",
                        "description": "Custom updated description for Brutal Strength."
                    },
                    {
                        "id": p2.id,
                        "name": "Sprint Burst",
                        "description": "Custom updated description for Sprint Burst."
                    }
                ]
            }

            # Import in merge mode (default)
            summary = DatabaseExportImportService.import_database(partial_payload, mode="merge", targets=["perks"])

            assert summary["status"] == "success"
            assert summary["summary"]["perks"]["updated"] == 2
            assert summary["summary"]["perks"]["created"] == 0

            # Verify the 2 perks have the new descriptions
            reloaded_p1 = db.session.scalar(select(Perk).where(Perk.name == "Brutal Strength"))
            assert reloaded_p1.description == "Custom updated description for Brutal Strength."
            assert reloaded_p1.role == "Killer"  # `category` renamed to `role`, preserved untouched!

            reloaded_p2 = db.session.scalar(select(Perk).where(Perk.name == "Sprint Burst"))
            assert reloaded_p2.description == "Custom updated description for Sprint Burst."
            assert reloaded_p2.role == "Survivor"  # Preserved untouched!

            # Verify untouched perks in the database are intact
            reloaded_p3 = db.session.scalar(select(Perk).where(Perk.name == "Dead Hard"))
            assert reloaded_p3.description == "Original Dead Hard Description"

    def test_export_import_character_created_at_roundtrip(self, export_import_app):
        """Killer.created_at (and Survivor.created_at) drive the roster
        full-roster milestone's cutoff -- a restore that silently reset it to
        "now" for every character would collapse that feature's whole notion
        of "who existed before whom"."""
        from datetime import datetime, timezone
        from app.services.db.serializers import serialize_killer

        with export_import_app.app_context():
            chapter = db.session.scalar(select(Chapter)) or Chapter(name="Roundtrip Chapter")
            if chapter.id is None:
                db.session.add(chapter)
                db.session.flush()

            trapper = Killer(
                name="Export Roundtrip Trapper",
                chapter_id=chapter.id,
                power_name="Bear Trap",
                created_at=datetime(2020, 5, 1, tzinfo=timezone.utc),
            )
            db.session.add(trapper)
            db.session.commit()

            exported = serialize_killer(trapper)
            assert exported["created_at"].startswith("2020-05-01T00:00:00")

            db.session.delete(trapper)
            db.session.commit()

            DatabaseExportImportService.import_database(
                {"killers": [exported]}, mode="merge", targets=["killers"]
            )

            restored = db.session.scalar(
                select(Killer).where(Killer.name == "Export Roundtrip Trapper")
            )
            assert restored.created_at.replace(tzinfo=None) == datetime(2020, 5, 1)

    def test_import_database_ignores_removed_draft_sessions_key(self, export_import_app):
        """`draft_sessions` has no importer any more (the model is gone); a backup that still
        carries it must import the rest instead of failing."""
        with export_import_app.app_context():
            chapter_id = db.session.scalars(select(Chapter)).first().id
            payload = {
                "draft_sessions": [{"room_code": "ABCD", "phase": "bans"}],
                "survivors": [{"id": 1, "name": "Draftless Dwight", "chapter_id": chapter_id}],
            }
            result = DatabaseExportImportService.import_database(payload, mode="merge")
            assert result["status"] == "success"
            assert "draft_sessions" not in result["summary"]
            assert result["summary"]["survivors"]["created"] == 1
