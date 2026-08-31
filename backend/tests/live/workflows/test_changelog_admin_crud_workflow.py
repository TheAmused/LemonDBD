# backend/tests/live/workflows/test_changelog_admin_crud_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestChangelogAdminCrudWorkflow:
    """Workflow asserting the full What's New? admin CRUD + public visibility
    + drag-reorder lifecycle against a real PostgreSQL database."""

    def test_public_feed_starts_empty_and_admin_feed_requires_admin(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, user_headers, _user = auth_client_factory(
            "changelog_plain_user", "changelog_plain@example.com", "pass123"
        )

        res = client.get("/api/v1/changelog/admin", headers=user_headers)
        assert res.status_code == 403

    def test_full_admin_crud_and_public_visibility_lifecycle(
        self, live_client: FlaskClient, admin_client: Any
    ) -> None:
        # 1. Create a draft (unpublished) post as admin.
        create_res = admin_client.post(
            "/api/v1/changelog",
            json={
                "title": "The Entity Stirs — Balance Update",
                "content_html": '<p>New <b>killer</b> perk rework. <script>alert(1)</script></p>',
                "tag": "balance",
                "is_published": False,
            },
        )
        assert create_res.status_code == 201
        post = create_res.get_json()["data"]
        assert "alert(1)" not in post["content_html"]
        assert post["is_published"] is False

        # 2. Draft must not appear on the public feed.
        public_res = live_client.get("/api/v1/changelog")
        public_ids = [p["id"] for p in public_res.get_json()["data"]]
        assert post["id"] not in public_ids

        # 3. But it must appear on the admin feed.
        admin_feed = admin_client.get("/api/v1/changelog/admin")
        admin_ids = [p["id"] for p in admin_feed.get_json()["data"]]
        assert post["id"] in admin_ids

        # 4. Publish it via update.
        update_res = admin_client.patch(
            f"/api/v1/changelog/{post['id']}", json={"is_published": True}
        )
        assert update_res.status_code == 200
        assert update_res.get_json()["data"]["is_published"] is True

        # 5. Now it must appear on the public feed too.
        public_after = live_client.get("/api/v1/changelog")
        public_ids_after = [p["id"] for p in public_after.get_json()["data"]]
        assert post["id"] in public_ids_after

        # 6. Delete it and confirm it's gone from both feeds.
        delete_res = admin_client.delete(f"/api/v1/changelog/{post['id']}")
        assert delete_res.status_code == 200

        admin_feed_after = admin_client.get("/api/v1/changelog/admin")
        admin_ids_after = [p["id"] for p in admin_feed_after.get_json()["data"]]
        assert post["id"] not in admin_ids_after

    def test_reorder_workflow_changes_public_feed_order(
        self, live_client: FlaskClient, admin_client: Any
    ) -> None:
        titles = ["Reorder Alpha", "Reorder Beta", "Reorder Gamma"]
        created_ids = []
        for title in titles:
            res = admin_client.post(
                "/api/v1/changelog",
                json={"title": title, "content_html": f"<p>{title}</p>", "is_published": True},
            )
            assert res.status_code == 201
            created_ids.append(res.get_json()["data"]["id"])

        # Reverse the natural (newest-first) order.
        desired_order = list(reversed(created_ids))
        reorder_res = admin_client.post(
            "/api/v1/changelog/reorder", json={"ordered_ids": desired_order}
        )
        assert reorder_res.status_code == 200

        feed = live_client.get("/api/v1/changelog?per_page=50").get_json()["data"]
        feed_ids = [p["id"] for p in feed if p["id"] in created_ids]
        assert feed_ids == desired_order

        # Cleanup so this workflow leaves no residue for other live tests.
        for post_id in created_ids:
            admin_client.delete(f"/api/v1/changelog/{post_id}")
