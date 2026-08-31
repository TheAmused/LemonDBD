# backend/tests/unit/test_changelog_service.py
import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.models import User
from app.services import changelog_service


@pytest.mark.unit
class TestChangelogService:
    """Tests for the changelog CRUD service backing the What's New drawer."""

    @pytest.fixture
    def admin(self, db_session) -> User:
        user = User(
            username="admin_tester",
            email="admin_tester@example.com",
            password_hash="hashed",
            role="admin",
        )
        db_session.add(user)
        db_session.commit()
        return user

    def test_create_post_sanitizes_html_and_defaults_tag(self, admin: User) -> None:
        post = changelog_service.create_post(
            admin,
            {
                "title": "  Patch Notes  ",
                "content_html": '<p onclick="steal()">Hello <script>bad()</script>world</p>',
                "tag": "not-a-real-tag",
                "is_published": True,
            },
        )
        assert post.title == "Patch Notes"
        assert "onclick" not in post.content_html
        assert "bad()" not in post.content_html
        assert "Hello" in post.content_html and "world" in post.content_html
        assert post.tag == "feature"  # invalid tag falls back to default
        assert post.author_id == admin.id
        assert post.author_name == admin.username

    def test_create_post_places_new_post_on_top(self, admin: User) -> None:
        first = changelog_service.create_post(
            admin, {"title": "First", "content_html": "<p>1</p>"}
        )
        second = changelog_service.create_post(
            admin, {"title": "Second", "content_html": "<p>2</p>"}
        )
        # Lower position sorts first -- the newer post must have a strictly
        # lower position than the one before it.
        assert second.position < first.position

    def test_list_posts_orders_by_position_then_newest_first(self, admin: User) -> None:
        p1 = changelog_service.create_post(admin, {"title": "P1", "content_html": "<p>1</p>"})
        p2 = changelog_service.create_post(admin, {"title": "P2", "content_html": "<p>2</p>"})
        p3 = changelog_service.create_post(admin, {"title": "P3", "content_html": "<p>3</p>"})

        result = changelog_service.list_posts(page=1, per_page=20, include_unpublished=True)
        ids_in_order = [row["id"] for row in result["data"]]
        # Most recently created lands first (lowest position).
        assert ids_in_order == [p3.id, p2.id, p1.id]
        assert result["total"] == 3

    def test_list_posts_excludes_unpublished_for_public_callers(self, admin: User) -> None:
        changelog_service.create_post(
            admin, {"title": "Draft", "content_html": "<p>d</p>", "is_published": False}
        )
        published = changelog_service.create_post(
            admin, {"title": "Live", "content_html": "<p>l</p>", "is_published": True}
        )

        public_result = changelog_service.list_posts(include_unpublished=False)
        assert public_result["total"] == 1
        assert public_result["data"][0]["id"] == published.id

        admin_result = changelog_service.list_posts(include_unpublished=True)
        assert admin_result["total"] == 2

    def test_list_posts_pagination(self, admin: User) -> None:
        for i in range(5):
            changelog_service.create_post(
                admin, {"title": f"Post {i}", "content_html": f"<p>{i}</p>"}
            )
        page1 = changelog_service.list_posts(page=1, per_page=2, include_unpublished=True)
        assert len(page1["data"]) == 2
        assert page1["has_more"] is True

        page3 = changelog_service.list_posts(page=3, per_page=2, include_unpublished=True)
        assert len(page3["data"]) == 1
        assert page3["has_more"] is False

    def test_list_posts_clamps_out_of_range_paging_params(self, admin: User) -> None:
        changelog_service.create_post(admin, {"title": "P1", "content_html": "<p>1</p>"})
        # Negative/zero page and an oversized per_page must not error or
        # return an unbounded result set.
        result = changelog_service.list_posts(page=0, per_page=9999, include_unpublished=True)
        assert result["page"] == 1
        assert result["per_page"] == 50

    def test_update_post_only_touches_provided_fields(self, admin: User) -> None:
        post = changelog_service.create_post(
            admin, {"title": "Original", "content_html": "<p>orig</p>", "tag": "feature"}
        )
        updated = changelog_service.update_post(post, {"title": "Renamed"})
        assert updated.title == "Renamed"
        assert "orig" in updated.content_html  # untouched
        assert updated.tag == "feature"  # untouched

    def test_update_post_sanitizes_new_content_html(self, admin: User) -> None:
        post = changelog_service.create_post(
            admin, {"title": "Original", "content_html": "<p>orig</p>"}
        )
        updated = changelog_service.update_post(
            post, {"content_html": '<p>new</p><script>evil()</script>'}
        )
        assert "evil()" not in updated.content_html
        assert "new" in updated.content_html

    def test_update_post_rejects_invalid_tag_silently(self, admin: User) -> None:
        post = changelog_service.create_post(
            admin, {"title": "Original", "content_html": "<p>orig</p>", "tag": "balance"}
        )
        updated = changelog_service.update_post(post, {"tag": "not-real"})
        # An invalid tag on update is ignored, not defaulted -- the existing
        # tag is left as-is (unlike create, which defaults to "feature").
        assert updated.tag == "balance"

    def test_delete_post_removes_it_from_the_database(self, admin: User) -> None:
        post = changelog_service.create_post(
            admin, {"title": "To delete", "content_html": "<p>x</p>"}
        )
        post_id = post.id
        changelog_service.delete_post(post)
        assert changelog_service.get_post(post_id) is None

    def test_get_post_returns_none_for_missing_id(self, admin: User) -> None:
        assert changelog_service.get_post(999999) is None

    def test_reorder_posts_applies_new_order(self, admin: User) -> None:
        p1 = changelog_service.create_post(admin, {"title": "P1", "content_html": "<p>1</p>"})
        p2 = changelog_service.create_post(admin, {"title": "P2", "content_html": "<p>2</p>"})
        p3 = changelog_service.create_post(admin, {"title": "P3", "content_html": "<p>3</p>"})

        changelog_service.reorder_posts([p1.id, p2.id, p3.id])

        result = changelog_service.list_posts(include_unpublished=True)
        ids_in_order = [row["id"] for row in result["data"]]
        assert ids_in_order == [p1.id, p2.id, p3.id]

    def test_reorder_posts_ignores_unknown_ids(self, admin: User) -> None:
        p1 = changelog_service.create_post(admin, {"title": "P1", "content_html": "<p>1</p>"})
        # Should not raise even though 999999 doesn't exist.
        changelog_service.reorder_posts([999999, p1.id])
        assert changelog_service.get_post(p1.id) is not None

    def test_reorder_posts_with_empty_list_is_a_safe_no_op(self, admin: User) -> None:
        p1 = changelog_service.create_post(admin, {"title": "P1", "content_html": "<p>1</p>"})
        original_position = p1.position
        changelog_service.reorder_posts([])
        db.session.refresh(p1)
        assert p1.position == original_position
