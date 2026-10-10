# backend/tests/unit/api/test_db_export_import_roundtrips.py
"""Export-then-import round trips for offerings, settings, logs and Smash or Pass rosters."""
import pytest
from sqlalchemy import select
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.user import User
from app.services.db.export_import import DatabaseExportImportService
from tests.unit.api.db_export_import_support import (
    _flat,
)
from tests.unit.api.db_export_import_support import (  # noqa: F401  (pytest fixtures)
    export_import_app,
)


@pytest.mark.unit
class TestDatabaseExportImportOfferingsAndChapters:
    def test_export_import_offerings_and_chapters_roundtrip(self, export_import_app):
        with export_import_app.app_context():
            from app.models.equipment import Offering
            from sqlalchemy import delete as sa_delete

            # `category` is gone from the column list: it restated `role` and
            # contradicted it in six rows, so it is derived from `role` now.
            db.session.add(Offering(name="Bloody Party Streamers", role="Killer"))
            db.session.add(Chapter(name="A Nightmare on Elm Street"))
            db.session.commit()

            # The fixture's Killer needs a chapter of its own -- `chapter_id`
            # is NOT NULL on both character tables -- so the chapters table is
            # never empty here and the count is not a constant.
            chapter_count = len(db.session.scalars(select(Chapter)).all())

            exported = DatabaseExportImportService.export_database(targets=["offerings", "chapters"])
            assert exported["counts"]["offerings"] == 1
            assert exported["counts"]["chapters"] == chapter_count

            db.session.execute(sa_delete(Offering))
            db.session.execute(sa_delete(Chapter))
            db.session.commit()

            summary = DatabaseExportImportService.import_database(exported, mode="merge", targets=["offerings", "chapters"])
            assert summary["summary"]["offerings"]["created"] == 1
            assert summary["summary"]["chapters"]["created"] == chapter_count
            assert db.session.scalars(select(Offering)).first().name == "Bloody Party Streamers"
            assert db.session.scalar(select(Chapter).where(Chapter.name == "A Nightmare on Elm Street")) is not None


@pytest.mark.unit
class TestDatabaseExportImportSettingsTables:
    def test_export_import_settings_tables_roundtrip(self, export_import_app):
        with export_import_app.app_context():
            from sqlalchemy import delete as sa_delete
            from app.models.admin import ChallengeModeSetting
            from app.models.user import UserShowcase

            user = db.session.scalars(select(User).where(User.username == "player_test")).first()
            db.session.add(ChallengeModeSetting(mode="gauntlet", is_enabled=True))
            db.session.add(UserShowcase(user_id=user.id, player_title="The Camper"))
            db.session.commit()

            targets = [
                "challenge_mode_settings", "user_showcases",
            ]
            exported = DatabaseExportImportService.export_database(targets=targets)
            for t in targets:
                assert exported["counts"][t] == 1

            db.session.execute(sa_delete(ChallengeModeSetting))
            db.session.execute(sa_delete(UserShowcase))
            db.session.commit()

            summary = DatabaseExportImportService.import_database(exported, mode="merge", targets=targets)
            for t in targets:
                assert summary["summary"][t]["created"] == 1

            assert db.session.scalars(select(UserShowcase)).first().user_id == user.id


@pytest.mark.unit
class TestDatabaseExportImportAuditLogAndChangelog:
    def test_export_import_audit_log_and_changelog_insert_only(self, export_import_app):
        with export_import_app.app_context():
            from app.models.admin import AdminAuditLog
            from app.models.changelog import ChangelogPost

            admin = db.session.scalars(select(User).where(User.username == "admin_test")).first()
            db.session.add(AdminAuditLog(admin_user_id=admin.id, action="disable_character", target_type="character", target_id="1"))
            db.session.add(ChangelogPost(title="Launch", content_html="<p>Hello</p>", author_id=admin.id, author_name="admin_test"))
            db.session.commit()

            exported = DatabaseExportImportService.export_database(targets=["admin_audit_logs", "changelog_posts"])
            assert exported["counts"]["admin_audit_logs"] == 1
            assert exported["counts"]["changelog_posts"] == 1
            assert _flat(exported)["admin_audit_logs"][0]["admin_username"] == "admin_test"

            summary = DatabaseExportImportService.import_database(
                exported, mode="merge", targets=["admin_audit_logs", "changelog_posts"]
            )
            assert summary["summary"]["admin_audit_logs"]["created"] == 1
            assert summary["summary"]["changelog_posts"]["created"] == 1
            assert len(db.session.scalars(select(AdminAuditLog)).all()) == 2
            assert len(db.session.scalars(select(ChangelogPost)).all()) == 2


@pytest.mark.unit
class TestDatabaseExportImportSmashOrPass:
    def test_export_import_smash_or_pass_roster_roundtrip(self, export_import_app):
        with export_import_app.app_context():
            from sqlalchemy import delete as sa_delete
            from app.models.smash_or_pass import Roster, Entity, EntityStat, Vote

            roster = Roster(
                slug="canon",
                name="Dead by Daylight: Fog Canon",
                description="Original trial survivors and killers.",
                translations={"pl": {"name": "Dead by Daylight: Kanon Mgły", "description": "Oficjalne postacie."}},
            )
            db.session.add(roster)
            db.session.flush()
            entity = Entity(roster_id=roster.id, slug="ada_wong", name="Ada Wong", role="Survivor")
            db.session.add(entity)
            db.session.flush()
            db.session.add(EntityStat(entity_id=entity.id, smash_count=5, pass_count=1))
            db.session.add(Vote(entity_id=entity.id, vote_type="smash", session_id="s1"))
            db.session.commit()

            exported = DatabaseExportImportService.export_database(targets=["rosters"])
            assert exported["counts"]["rosters"] == 1
            roster_row = _flat(exported)["rosters"][0]
            assert roster_row["slug"] == "canon"
            assert len(roster_row["entities"]) == 1
            assert roster_row["entities"][0]["stat"]["smash_count"] == 5
            assert len(roster_row["entities"][0]["votes"]) == 1

            db.session.execute(sa_delete(Vote))
            db.session.execute(sa_delete(EntityStat))
            db.session.execute(sa_delete(Entity))
            db.session.execute(sa_delete(Roster))
            db.session.commit()

            summary = DatabaseExportImportService.import_database(
                exported, mode="merge", targets=["rosters"]
            )
            assert summary["summary"]["rosters"]["created"] == 1

            restored_entity = db.session.scalars(select(Entity).where(Entity.slug == "ada_wong")).one()
            assert restored_entity.stat.smash_count == 5
            assert len(db.session.scalars(select(Vote).where(Vote.entity_id == restored_entity.id)).all()) == 1
