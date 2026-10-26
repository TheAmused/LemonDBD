# backend/tests/unit/changelog/test_changelog_discord_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.services import changelog_discord
from tests.unit.changelog.changelog_support import ChangelogRouteFixtures


@pytest.mark.unit
class TestChangelogDiscordRoutes(ChangelogRouteFixtures):
    """Announcing an entry on Discord, keeping that message in line with edits, and taking it down with a draft."""

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

    class _Ok:
        status_code = 200

        def json(self) -> dict[str, str]:
            return {"id": "555"}

    def _announce_with_message_id(
        self, app: Flask, client: FlaskClient, headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> int:
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = "https://discord.test/api/webhooks/1/x"
        monkeypatch.setattr(changelog_discord.requests, "post", lambda *a, **k: self._Ok())
        post_id = self._publish(client, headers)
        client.post(f"/api/v1/changelog/{post_id}/announce", headers=headers)
        return post_id

    def _fake_patch(self, monkeypatch: pytest.MonkeyPatch, status_code: int = 200) -> list[dict]:
        calls: list[dict] = []

        class _Resp:
            pass

        _Resp.status_code = status_code

        def fake_patch(url: str, **kwargs):
            calls.append({"url": url, **kwargs})
            return _Resp()

        monkeypatch.setattr(changelog_discord.requests, "patch", fake_patch)
        return calls

    def test_editing_a_live_entry_rewrites_its_discord_message_by_itself(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)
        patched = self._fake_patch(monkeypatch)

        res = client.patch(f"/api/v1/changelog/{post_id}", json={"title": "Big patch v2"}, headers=admin_headers)
        body = res.get_json()
        assert body["discord"] == "sent"
        assert body["data"]["edited_at"] is not None
        assert body["data"]["discord_synced_at"] > body["data"]["edited_at"]
        assert patched[0]["url"] == "https://discord.test/api/webhooks/1/x/messages/555"
        assert patched[0]["json"]["embeds"][0]["description"].startswith("# Big patch v2")

    def test_a_malformed_message_id_from_discord_is_not_kept(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = "https://discord.test/api/webhooks/1/x"

        class _Odd:
            status_code = 200

            def json(self) -> dict[str, str]:
                return {"id": "../../x"}

        monkeypatch.setattr(changelog_discord.requests, "post", lambda *a, **k: _Odd())
        post_id = self._publish(client, admin_headers)
        body = client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers).get_json()
        assert body["discord"] == "sent"
        assert body["data"]["discord_announced_at"] is not None
        assert body["data"]["discord_synced_at"] is None  # no usable id, so it cannot be edited or deleted later

    def test_an_unannounced_entry_is_edited_without_touching_discord(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = "https://discord.test/api/webhooks/1/x"
        patched = self._fake_patch(monkeypatch)
        post_id = self._publish(client, admin_headers)
        res = client.patch(f"/api/v1/changelog/{post_id}", json={"title": "Big patch v2"}, headers=admin_headers)
        assert res.get_json()["discord"] is None
        assert patched == []

    def test_a_failed_automatic_rewrite_leaves_the_entry_behind_and_can_be_retried(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)

        def boom(*args, **kwargs):
            raise RuntimeError("network down")

        monkeypatch.setattr(changelog_discord.requests, "patch", boom)
        res = client.patch(f"/api/v1/changelog/{post_id}", json={"title": "Big patch v2"}, headers=admin_headers)
        body = res.get_json()
        assert res.status_code == 200
        assert body["discord"] == "failed"
        assert body["data"]["edited_at"] > body["data"]["discord_synced_at"]

        self._fake_patch(monkeypatch)
        retry = client.put(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        assert retry.get_json()["discord"] == "sent"
        assert retry.get_json()["data"]["discord_synced_at"] > body["data"]["edited_at"]

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
        self._fake_patch(monkeypatch, status_code=404)
        res = client.put(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        body = res.get_json()
        assert body["discord"] == "missing"
        assert body["data"]["discord_announced_at"] is None
        assert body["data"]["discord_synced_at"] is None

    # -- back to draft ----------------------------------------------------

    def _fake_delete(self, monkeypatch: pytest.MonkeyPatch, status_code: int = 204) -> list[dict]:
        calls: list[dict] = []

        class _Resp:
            pass

        _Resp.status_code = status_code

        def fake_delete(url: str, **kwargs):
            calls.append({"url": url, **kwargs})
            return _Resp()

        monkeypatch.setattr(changelog_discord.requests, "delete", fake_delete)
        return calls

    def _draft(self, client: FlaskClient, headers: dict[str, str], post_id: int):
        return client.patch(f"/api/v1/changelog/{post_id}", json={"is_published": False}, headers=headers)

    def test_a_live_entry_saved_as_a_draft_disappears_for_readers_and_from_discord(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)
        deleted = self._fake_delete(monkeypatch)
        assert len(client.get("/api/v1/changelog").get_json()["data"]) == 1

        body = self._draft(client, admin_headers, post_id).get_json()
        assert body["discord"] == "removed"
        assert deleted[0]["url"] == "https://discord.test/api/webhooks/1/x/messages/555"
        assert body["data"]["discord_announced_at"] is None and body["data"]["discord_synced_at"] is None
        assert client.get("/api/v1/changelog").get_json()["data"] == []  # gone for readers
        admin_feed = client.get("/api/v1/changelog/admin", headers=admin_headers).get_json()["data"]
        assert [p["id"] for p in admin_feed] == [post_id]  # still there for the admin

        # Back on the site it can be announced again, as a fresh message.
        client.patch(f"/api/v1/changelog/{post_id}", json={"is_published": True}, headers=admin_headers)
        again = client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        assert again.get_json()["discord"] == "sent"

    def test_a_message_already_deleted_by_hand_counts_as_removed(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)
        self._fake_delete(monkeypatch, status_code=404)
        body = self._draft(client, admin_headers, post_id).get_json()
        assert body["discord"] == "removed"
        assert body["data"]["discord_announced_at"] is None

    def test_a_failed_delete_keeps_the_message_and_saving_the_draft_again_retries_it(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)

        def boom(*args, **kwargs):
            raise RuntimeError("network down")

        monkeypatch.setattr(changelog_discord.requests, "delete", boom)
        failed = self._draft(client, admin_headers, post_id)
        assert failed.status_code == 200
        assert failed.get_json()["discord"] == "failed"
        assert failed.get_json()["data"]["discord_announced_at"] is not None  # still announced
        assert client.get("/api/v1/changelog").get_json()["data"] == []  # but hidden from readers all the same

        deleted = self._fake_delete(monkeypatch)
        retry = client.patch(f"/api/v1/changelog/{post_id}", json={"title": "Big patch"}, headers=admin_headers)
        assert retry.get_json()["discord"] == "removed"
        assert len(deleted) == 1

    def test_an_entry_announced_before_message_ids_were_kept_just_goes_to_draft(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        app.config["DISCORD_CHANGELOG_WEBHOOK_URL"] = "https://discord.test/api/webhooks/1/x"

        class _NoId:
            status_code = 204

        monkeypatch.setattr(changelog_discord.requests, "post", lambda *a, **k: _NoId())
        post_id = self._publish(client, admin_headers)
        client.post(f"/api/v1/changelog/{post_id}/announce", headers=admin_headers)
        deleted = self._fake_delete(monkeypatch)

        body = self._draft(client, admin_headers, post_id).get_json()
        assert body["discord"] is None and deleted == []
        assert body["data"]["discord_announced_at"] is not None  # nothing to delete, so it stays "announced"

    def test_editing_after_a_failed_delete_is_pushed_when_the_entry_goes_live_again(
        self, app: Flask, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        post_id = self._announce_with_message_id(app, client, admin_headers, monkeypatch)

        def boom(*args, **kwargs):
            raise RuntimeError("network down")

        monkeypatch.setattr(changelog_discord.requests, "delete", boom)
        self._draft(client, admin_headers, post_id)
        patched = self._fake_patch(monkeypatch)
        monkeypatch.setattr(changelog_discord.requests, "delete", boom)

        edited = client.patch(f"/api/v1/changelog/{post_id}", json={"title": "Big patch v2"}, headers=admin_headers)
        assert edited.get_json()["discord"] == "failed"  # a draft is never rewritten, only (re)deleted
        assert patched == []
        assert edited.get_json()["data"]["edited_at"] is not None

        live = client.patch(f"/api/v1/changelog/{post_id}", json={"is_published": True}, headers=admin_headers)
        assert live.get_json()["discord"] == "sent"
        assert patched[0]["json"]["embeds"][0]["description"].startswith("# Big patch v2")
