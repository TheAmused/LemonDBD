# backend/tests/unit/api/test_tier_list_routes.py
import json
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.models import TierList, User
from app.services.db.export_import import DatabaseExportImportService

SEED_FILE = Path(__file__).resolve().parents[3] / "app" / "seeds" / "data" / "content" / "tier_lists.json"


def _make(db_session: Session, **overrides) -> TierList:
    row = TierList(
        id=overrides.pop("id", 1),
        slug=overrides.pop("slug", "survivors"),
        kind=overrides.pop("kind", "survivors"),
        title=overrides.pop("title", "Survivors"),
        description=overrides.pop("description", "Rank them"),
        **overrides,
    )
    db_session.add(row)
    db_session.commit()
    return row


@pytest.mark.unit
class TestTierListModel:
    def test_rejects_unknown_kind(self) -> None:
        with pytest.raises(ValueError):
            TierList(slug="x", kind="addons", title="X")

    @pytest.mark.parametrize("slug", ["Has Caps", "under_score", "-lead", "custom", "new", ""])
    def test_rejects_bad_or_reserved_slugs(self, slug: str) -> None:
        with pytest.raises(ValueError):
            TierList(slug=slug, kind="maps", title="X")

    def test_rejects_invalid_tier_color_and_duplicate_ids(self) -> None:
        with pytest.raises(ValueError):
            TierList(slug="x", kind="maps", title="X", tiers=[{"id": "s", "label": "S", "color": "red"}])
        with pytest.raises(ValueError):
            TierList(slug="x", kind="maps", title="X", tiers=[{"id": "s"}, {"id": "s"}])

    def test_accepts_token_and_hex_colors(self) -> None:
        row = TierList(
            slug="x", kind="maps", title="X",
            tiers=[{"id": "s", "label": "S", "color": "s"}, {"id": "z", "label": "Z", "color": "#12AbeF"}],
        )
        assert len(row.tiers) == 2

    def test_localizes_title_tiers_and_custom_items(self, db_session: Session) -> None:
        _make(
            db_session,
            slug="snacks",
            kind="custom",
            title="Snacks",
            tiers=[{"id": "top", "label": "Top", "color": "s"}],
            custom_items=[{"id": "chips", "name": "Chips", "image_url": "https://x/chips.png"}],
            translations={"pl": {"title": "Przekąski", "tiers": {"top": "Szczyt"}, "items": {"chips": "Czipsy"}}},
        )
        row = db_session.scalar(select(TierList))
        data = row.to_dict("pl")
        assert data["title"] == "Przekąski"
        assert data["tiers"][0]["label"] == "Szczyt"
        assert data["custom_items"][0]["name"] == "Czipsy"
        assert data["item_count"] == 1
        # English is the column itself.
        assert row.to_dict("en")["title"] == "Snacks"


@pytest.mark.unit
class TestTierListRoutes:
    def test_lists_only_active_featured_first(self, client: FlaskClient, db_session: Session) -> None:
        _make(db_session, id=1, slug="maps", kind="maps", title="Maps", sort_order=5)
        _make(db_session, id=2, slug="killers", kind="killers", title="Killers", is_featured=True, sort_order=9)
        _make(db_session, id=3, slug="retired", kind="survivors", title="Old", is_active=False)

        res = client.get("/api/v1/tier-lists?lang=en")

        assert res.status_code == 200
        body = res.get_json()
        assert [r["slug"] for r in body["data"]] == ["killers", "maps"]
        assert body["count"] == 2
        # Summaries never carry item payloads.
        assert "custom_items" not in body["data"][0]

    def test_detail_returns_full_template(self, client: FlaskClient, db_session: Session) -> None:
        _make(
            db_session,
            slug="top-survivors",
            item_ids=[1, 2, 3],
            default_placements={"s": ["survivor:1"]},
        )

        res = client.get("/api/v1/tier-lists/top-survivors")

        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data["kind"] == "survivors"
        assert data["item_ids"] == [1, 2, 3]
        assert data["tiers"] is None  # frontend default ladder
        assert data["default_placements"] == {"s": ["survivor:1"]}
        assert data["has_default_placements"] is True

    def test_detail_404_for_unknown_or_inactive(self, client: FlaskClient, db_session: Session) -> None:
        _make(db_session, slug="hidden", is_active=False)
        assert client.get("/api/v1/tier-lists/nope").status_code == 404
        assert client.get("/api/v1/tier-lists/hidden").status_code == 404

    def test_catalog_cache_headers_and_304(self, client: FlaskClient, db_session: Session) -> None:
        _make(db_session)
        first = client.get("/api/v1/tier-lists?lang=en")
        etag = first.headers.get("ETag")
        assert etag and etag.startswith('W/"cat-')
        assert "public" in first.headers.get("Cache-Control", "")

        second = client.get("/api/v1/tier-lists?lang=en", headers={"If-None-Match": etag})
        assert second.status_code == 304


@pytest.mark.unit
class TestTierListSeedAndImport:
    def test_shipped_seed_file_imports_cleanly(self, db_session: Session) -> None:
        payload = json.loads(SEED_FILE.read_text(encoding="utf-8"))

        result = DatabaseExportImportService.import_database(payload, mode="merge")

        assert result["summary"]["tier_lists"] == {"created": 5, "updated": 0}
        slugs = set(db_session.scalars(select(TierList.slug)).all())
        assert slugs == {"survivor-perks", "killer-perks", "survivors", "killers", "maps"}
        # Every shipped row is fully translated for the four non-English locales.
        for row in db_session.scalars(select(TierList)).all():
            for lang in ("de", "es", "ja", "pl"):
                assert row.translations[lang]["title"]
                assert row.translations[lang]["description"]

    def test_bad_row_is_skipped_without_aborting_the_import(self, db_session: Session) -> None:
        payload = {
            "target": "tier_lists",
            "tier_lists": [
                {"id": 1, "slug": "maps", "kind": "maps", "title": "Maps"},
                {"id": 2, "slug": "Bad Slug", "kind": "maps", "title": "Broken"},
                {"id": 3, "slug": "empty-custom", "kind": "custom", "title": "No items"},
                {"id": 4, "slug": "mixed", "kind": "maps", "title": "Mixed",
                 "custom_items": [{"id": "a", "name": "A"}]},
                {"id": 5, "slug": "bad-placement", "kind": "maps", "title": "Bad",
                 "default_placements": {"zzz": ["map:1"]}},
            ],
        }

        result = DatabaseExportImportService.import_database(payload, mode="merge")

        assert result["summary"]["tier_lists"] == {"created": 1, "updated": 0, "rejected": 4}
        assert db_session.scalars(select(TierList.slug)).all() == ["maps"]

    def test_export_import_roundtrip_preserves_every_field(self, db_session: Session) -> None:
        _make(
            db_session,
            slug="snacks",
            kind="custom",
            title="Snacks",
            cover_image_url="https://x/cover.png",
            tiers=[{"id": "top", "label": "Top", "color": "#ff0000"}],
            custom_items=[{"id": "chips", "name": "Chips"}],
            default_placements={"top": ["chips"]},
            translations={"de": {"title": "Snacks DE"}},
            is_featured=True,
            sort_order=7,
        )
        exported = DatabaseExportImportService.export_database(targets=["tier_lists"])
        row = exported["groups"]["content"]["tier_lists"][0]
        assert "item_ids" not in row  # not-applicable keys are omitted, like every seed file

        db_session.query(TierList).delete()
        db_session.commit()
        DatabaseExportImportService.import_database(exported, mode="merge")

        restored = db_session.scalar(select(TierList))
        assert restored.slug == "snacks" and restored.kind == "custom"
        assert restored.tiers == [{"id": "top", "label": "Top", "color": "#ff0000"}]
        assert restored.translations == {"de": {"title": "Snacks DE"}}
        assert restored.custom_items == [{"id": "chips", "name": "Chips"}]
        assert restored.default_placements == {"top": ["chips"]}
        assert restored.cover_image_url == "https://x/cover.png"
        assert restored.is_featured is True and restored.sort_order == 7

    def test_reimport_updates_in_place_and_clears_removed_optional_keys(self, db_session: Session) -> None:
        DatabaseExportImportService.import_database(
            {"target": "tier_lists", "tier_lists": [
                {"id": 1, "slug": "maps", "kind": "maps", "title": "Maps",
                 "default_placements": {"s": ["map:1"]}},
            ]},
            mode="merge",
        )
        result = DatabaseExportImportService.import_database(
            {"target": "tier_lists", "tier_lists": [
                {"id": 1, "slug": "maps", "kind": "maps", "title": "All Maps"},
            ]},
            mode="merge",
        )
        assert result["summary"]["tier_lists"] == {"created": 0, "updated": 1}
        row = db_session.get(TierList, 1)
        assert row.title == "All Maps"
        assert not row.default_placements


@pytest.mark.unit
class TestTierListAdminCreate:
    """POST /api/v1/tier-lists -- the "Official?" checkbox in the creator."""

    @pytest.fixture
    def admin_user(self, db_session: Session) -> User:
        user = User(username="tl_admin", email="tl_admin@example.com", password_hash="hashed", role="admin")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def plain_user(self, db_session: Session) -> User:
        user = User(username="tl_user", email="tl_user@example.com", password_hash="hashed", role="user")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def admin_headers(self, app: Flask, admin_user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(admin_user.id, role="admin")
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    def user_headers(self, app: Flask, plain_user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(plain_user.id, role="user")
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture(autouse=True)
    def _seed_file_sandbox(self, tmp_path, monkeypatch):
        """`create_tier_list` rewrites the real seed file on disk (see
        `_rewrite_seed_file`) -- point it at a throwaway directory for every
        test in this class so a run can never touch the repo's actual
        content, no matter how the test ends."""
        (tmp_path / "content").mkdir()
        monkeypatch.setattr("app.seeds.static_db_seeder.SEEDS_DATA_DIR", tmp_path)
        self.seed_path = tmp_path / "content" / "tier_lists.json"

    @staticmethod
    def _payload(**overrides) -> dict:
        payload = {
            "title": "Best Chase Music",
            "description": "Rank the chase themes",
            "tiers": [
                {"id": "s", "label": "S", "color": "s"},
                {"id": "a", "label": "A", "color": "a"},
            ],
            "items": [
                {"id": "item-1", "name": "Hex: Ruin theme", "image_url": "https://example.com/a.png"},
                {"id": "item-2", "name": "Doctor chase"},
            ],
        }
        payload.update(overrides)
        return payload

    def test_requires_auth(self, client: FlaskClient) -> None:
        res = client.post("/api/v1/tier-lists", json=self._payload())
        assert res.status_code == 401

    def test_requires_admin(self, client: FlaskClient, user_headers: dict[str, str]) -> None:
        res = client.post("/api/v1/tier-lists", json=self._payload(), headers=user_headers)
        assert res.status_code == 403

    def test_creates_a_published_custom_list_visible_on_the_public_hub(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        res = client.post("/api/v1/tier-lists", json=self._payload(), headers=admin_headers)

        assert res.status_code == 201
        data = res.get_json()["data"]
        assert data["kind"] == "custom"
        assert data["slug"] == "best-chase-music"
        assert data["is_featured"] is False
        assert data["item_count"] == 2

        row = db_session.scalar(select(TierList).where(TierList.slug == "best-chase-music"))
        assert row is not None
        assert row.is_active is True

        hub = client.get("/api/v1/tier-lists")
        assert "best-chase-music" in [r["slug"] for r in hub.get_json()["data"]]

    def test_deduplicates_slug_collisions_rather_than_overwriting(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        _make(
            db_session, id=1, slug="best-chase-music", kind="custom", title="Existing",
            custom_items=[{"id": "x", "name": "X"}],
        )

        res = client.post("/api/v1/tier-lists", json=self._payload(), headers=admin_headers)

        assert res.status_code == 201
        assert res.get_json()["data"]["slug"] == "best-chase-music-2"

    def test_rewrites_the_seed_file_with_every_row_not_just_the_new_one(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        _make(db_session, id=1, slug="maps", kind="maps", title="Maps")

        client.post("/api/v1/tier-lists", json=self._payload(), headers=admin_headers)

        assert self.seed_path.exists()
        written = json.loads(self.seed_path.read_text(encoding="utf-8"))
        assert written["target"] == "tier_lists"
        assert {row["slug"] for row in written["tier_lists"]} == {"maps", "best-chase-music"}

    def test_rejects_no_items(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        res = client.post("/api/v1/tier-lists", json=self._payload(items=[]), headers=admin_headers)
        assert res.status_code == 400

    def test_rejects_invalid_tier_color(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        res = client.post(
            "/api/v1/tier-lists",
            json=self._payload(tiers=[{"id": "s", "label": "S", "color": "not-a-color"}]),
            headers=admin_headers,
        )
        assert res.status_code == 400

    def test_drops_an_unsafe_image_url_instead_of_failing_the_whole_request(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/tier-lists",
            json=self._payload(items=[{"id": "item-1", "name": "X", "image_url": "javascript:alert(1)"}]),
            headers=admin_headers,
        )

        assert res.status_code == 201
        assert res.get_json()["data"]["custom_items"][0]["image_url"] == ""

    def test_tier_background_image_round_trips_through_the_api(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/tier-lists",
            json=self._payload(
                tiers=[{"id": "s", "label": "S", "color": "s", "backgroundImage": "https://example.com/s.png"}]
            ),
            headers=admin_headers,
        )

        assert res.status_code == 201
        assert res.get_json()["data"]["tiers"][0]["backgroundImage"] == "https://example.com/s.png"
