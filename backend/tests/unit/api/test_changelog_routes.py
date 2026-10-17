# backend/tests/unit/api/test_changelog_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token
from app.models import User
from app.services import changelog_discord


@pytest.mark.unit
class TestChangelogRoutes:
    """Tests for the /api/v1/changelog admin CRUD + public feed routes."""

    @pytest.fixture
    def admin_user(self, db_session) -> User:
        user = User(
            login="route_admin", username="route_admin",
            email="route_admin@example.com",
            password_hash="hashed",
            role="admin",
        )
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def plain_user(self, db_session) -> User:
        user = User(
            login="route_user", username="route_user",
            email="route_user@example.com",
            password_hash="hashed",
            role="user",
        )
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

    # -- public feed --------------------------------------------------

    def test_public_feed_returns_200_with_empty_data(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/changelog")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["data"] == []

    def test_public_feed_does_not_require_auth(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/changelog?page=1&per_page=20")
        assert res.status_code == 200

    def test_public_feed_hides_unpublished_posts(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        client.post(
            "/api/v1/changelog",
            json={"title": "Draft post", "content_html": "<p>draft</p>", "is_published": False},
            headers=admin_headers,
        )
        res = client.get("/api/v1/changelog")
        assert res.get_json()["data"] == []

    # -- admin feed -----------------------------------------------------

    def test_admin_feed_requires_authentication(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/changelog/admin")
        assert res.status_code == 401

    def test_admin_feed_rejects_non_admin_user(
        self, client: FlaskClient, user_headers: dict[str, str]
    ) -> None:
        res = client.get("/api/v1/changelog/admin", headers=user_headers)
        assert res.status_code == 403

    def test_admin_feed_returns_drafts_for_admin(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        client.post(
            "/api/v1/changelog",
            json={"title": "Draft post", "content_html": "<p>draft</p>", "is_published": False},
            headers=admin_headers,
        )
        res = client.get("/api/v1/changelog/admin", headers=admin_headers)
        assert res.status_code == 200
        assert res.get_json()["total"] == 1

    # -- create -----------------------------------------------------------

    def test_create_requires_admin(self, client: FlaskClient, user_headers: dict[str, str]) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "Nope", "content_html": "<p>x</p>"},
            headers=user_headers,
        )
        assert res.status_code == 403

    def test_create_returns_201_with_sanitized_post(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={
                "title": "The Entity Stirs",
                "content_html": '<p>New killer! <script>alert(1)</script></p>',
                "is_published": True,
            },
            headers=admin_headers,
        )
        assert res.status_code == 201
        data = res.get_json()["data"]
        assert data["title"] == "The Entity Stirs"
        assert "alert(1)" not in data["content_html"]
        assert data["position"] == 0
        assert "author_name" not in data

    def _publish(self, client: FlaskClient, headers: dict[str, str], published: bool = True) -> int:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "Big patch", "content_html": "<h3>New</h3><ul><li>Thing</li></ul>", "is_published": published},
            headers=headers,
        )
        return res.get_json()["data"]["id"]

    def test_announce_requires_admin(
        self, client: FlaskClient, admin_headers: dict[str, str], user_headers: dict[str, str]
    ) -> None:
        post_id = self._publish(client, admin_headers)
        assert client.post(f"/api/v1/changelog/{post_id}/announce", headers=user_headers).status_code == 403

    def test_announce_unknown_post_is_404(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        assert client.post("/api/v1/changelog/999999/announce", headers=admin_headers).status_code == 404

    def test_announce_reports_not_configured_without_a_webhook(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        # The app reads the real webhook from the environment; clear it so this can never post to Discord.
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = ""
        post_id = self._publish(client, admin_headers)
        res = client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        assert res.status_code == 200
        body = res.get_json()
        assert body["discord"] == "not_configured"
        assert body["data"]["discord_announced_at"] is None

    def test_announce_posts_an_embed_and_only_once(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = "https://discord.test/api/webhooks/1/x"
        sent: list[dict] = []

        class _Resp:
            status_code = 200

            def json(self) -> dict[str, str]:
                return {"id": "555"}

        def fake_post(url: str, **kwargs):
            sent.append({"url": url, **kwargs})
            return _Resp()

        monkeypatch.setattr(changelog_discord.requests, "post", fake_post)
        post_id = self._publish(client, admin_headers)

        res = client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        body = res.get_json()
        assert body["discord"] == "sent"
        assert body["data"]["discord_announced_at"] is not None
        assert body["data"]["discord_synced_at"] is not None
        assert "discord_message_id" not in body["data"]
        assert sent[0]["params"] == {"wait": "true"}
        embed = sent[0]["json"]["embeds"][0]
        assert "title" not in embed and "url" not in embed and "footer" not in embed
        assert embed["description"].startswith("# Big patch\n\n")
        assert "### New" in embed["description"] and "- Thing" in embed["description"]

        again = client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        assert again.status_code == 409
        assert len(sent) == 1

    def test_failed_announcement_is_reported_and_can_be_retried(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = "https://discord.test/api/webhooks/1/x"

        def boom(*args, **kwargs):
            raise RuntimeError("network down")

        monkeypatch.setattr(changelog_discord.requests, "post", boom)
        post_id = self._publish(client, admin_headers)
        res = client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        assert res.status_code == 200
        assert res.get_json()["discord"] == "failed"
        assert res.get_json()["data"]["discord_announced_at"] is None

        class _Resp:
            status_code = 204

        monkeypatch.setattr(changelog_discord.requests, "post", lambda *a, **k: _Resp())
        retry = client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        assert retry.get_json()["discord"] == "sent"

    def test_a_draft_cannot_be_announced(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = "https://discord.test/api/webhooks/1/x"
        post_id = self._publish(client, admin_headers, published=False)
        res = client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        assert res.status_code == 400

    # -- edits: the "Edited" note and the Discord message update ------------

    def _announce_with_message_id(
        self, app: Flask, client: FlaskClient, headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> int:
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = "https://discord.test/api/webhooks/1/x"

        class _Resp:
            status_code = 200

            def json(self) -> dict[str, str]:
                return {"id": "555"}

        monkeypatch.setattr(changelog_discord.requests, "post", lambda *a, **k: _Resp())
        post_id = self._publish(client, headers)
        client.post(f"/api/v1/changelog/{post_id}/announce", headers=headers)
        return post_id

    def test_editing_a_live_entry_marks_it_edited_and_behind_on_discord(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)
        res = client.patch(f"/api/v1/changelog/{post_id}", json={"title": "Big patch v2"}, headers=admin_headers)
        data = res.get_json()["data"]
        assert data["edited_at"] is not None
        assert data["edited_at"] > data["discord_synced_at"]

    def test_update_announcement_patches_the_message_and_catches_up(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)
        client.patch(f"/api/v1/changelog/{post_id}", json={"title": "Big patch v2"}, headers=admin_headers)
        patched: list[dict] = []

        class _Resp:
            status_code = 200

        def fake_patch(url: str, **kwargs):
            patched.append({"url": url, **kwargs})
            return _Resp()

        monkeypatch.setattr(changelog_discord.requests, "patch", fake_patch)
        res = client.put(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        body = res.get_json()
        assert body["discord"] == "sent"
        assert body["data"]["discord_synced_at"] > body["data"]["edited_at"]
        assert patched[0]["url"] == "https://discord.test/api/webhooks/1/x/messages/555"
        assert patched[0]["json"]["embeds"][0]["description"].startswith("# Big patch v2")

    def test_update_announcement_needs_a_known_discord_message(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        post_id = self._publish(client, admin_headers)
        assert client.put(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers).status_code == 409

    def test_update_announcement_requires_admin(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], user_headers: dict[str, str]
    ) -> None:
        post_id = self._publish(client, admin_headers)
        assert client.put(f"/api/v1/changelog/{post_id}/announce", headers=user_headers).status_code == 403

    def test_a_message_deleted_on_discord_lets_the_entry_be_announced_again(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)

        class _Gone:
            status_code = 404

        monkeypatch.setattr(changelog_discord.requests, "patch", lambda *a, **k: _Gone())
        res = client.put(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        body = res.get_json()
        assert body["discord"] == "missing"
        assert body["data"]["discord_announced_at"] is None
        assert body["data"]["discord_synced_at"] is None

    def test_create_rejects_title_too_short(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "ab", "content_html": "<p>x</p>"},
            headers=admin_headers,
        )
        assert res.status_code == 400
        assert "details" in res.get_json()

    def test_create_rejects_missing_content(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "Valid Title"},
            headers=admin_headers,
        )
        assert res.status_code == 400

    def test_create_rejects_oversized_content(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "Valid Title", "content_html": "a" * 20001},
            headers=admin_headers,
        )
        assert res.status_code == 400

    # -- update -----------------------------------------------------------

    def test_update_requires_admin(self, client: FlaskClient, admin_headers: dict[str, str], user_headers: dict[str, str]) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "Original", "content_html": "<p>x</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.patch(
            f"/api/v1/changelog/{created['id']}",
            json={"title": "Hacked"},
            headers=user_headers,
        )
        assert res.status_code == 403

    def test_update_returns_404_for_missing_post(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.patch(
            "/api/v1/changelog/999999",
            json={"title": "Doesn't matter"},
            headers=admin_headers,
        )
        assert res.status_code == 404

    def test_update_applies_partial_changes(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "Original", "content_html": "<p>orig</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.patch(
            f"/api/v1/changelog/{created['id']}",
            json={"is_published": False},
            headers=admin_headers,
        )
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data["is_published"] is False
        assert data["title"] == "Original"

    def test_update_rejects_invalid_payload(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "Original", "content_html": "<p>orig</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.patch(
            f"/api/v1/changelog/{created['id']}",
            json={"title": "a"},  # below min_length=3
            headers=admin_headers,
        )
        assert res.status_code == 400

    # -- delete -----------------------------------------------------------

    def test_delete_requires_admin(self, client: FlaskClient, admin_headers: dict[str, str], user_headers: dict[str, str]) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "To delete", "content_html": "<p>x</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.delete(f"/api/v1/changelog/{created['id']}", headers=user_headers)
        assert res.status_code == 403

    def test_delete_returns_404_for_missing_post(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.delete("/api/v1/changelog/999999", headers=admin_headers)
        assert res.status_code == 404

    def test_delete_removes_post(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "To delete", "content_html": "<p>x</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.delete(f"/api/v1/changelog/{created['id']}", headers=admin_headers)
        assert res.status_code == 200

        follow_up = client.get("/api/v1/changelog/admin", headers=admin_headers)
        assert follow_up.get_json()["total"] == 0

    # -- reorder ------------------------------------------------------------

    def test_reorder_requires_admin(self, client: FlaskClient, user_headers: dict[str, str]) -> None:
        res = client.post(
            "/api/v1/changelog/reorder", json={"ordered_ids": [1, 2]}, headers=user_headers
        )
        assert res.status_code == 403

    def test_reorder_rejects_non_list_payload(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog/reorder", json={"ordered_ids": "not-a-list"}, headers=admin_headers
        )
        assert res.status_code == 400

    def test_reorder_rejects_non_integer_ids(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog/reorder",
            json={"ordered_ids": [1, "two", 3]},
            headers=admin_headers,
        )
        assert res.status_code == 400

    def test_reorder_persists_new_order(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        p1 = client.post(
            "/api/v1/changelog", json={"title": "Post One", "content_html": "<p>1</p>"}, headers=admin_headers
        ).get_json()["data"]
        p2 = client.post(
            "/api/v1/changelog", json={"title": "Post Two", "content_html": "<p>2</p>"}, headers=admin_headers
        ).get_json()["data"]

        res = client.post(
            "/api/v1/changelog/reorder",
            json={"ordered_ids": [p1["id"], p2["id"]]},
            headers=admin_headers,
        )
        assert res.status_code == 200

        feed = client.get("/api/v1/changelog/admin", headers=admin_headers).get_json()
        ids_in_order = [row["id"] for row in feed["data"]]
        assert ids_in_order == [p1["id"], p2["id"]]
