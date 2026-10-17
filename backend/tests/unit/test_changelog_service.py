# backend/tests/unit/test_changelog_service.py
import pytest

from app.core.extensions import db
from app.models import User
from app.services import changelog_service


@pytest.mark.unit
class TestChangelogService:
    """Tests for the changelog CRUD service backing the What's New drawer."""

    @pytest.fixture
    def admin(self, db_session) -> User:
        user = User(
            login="admin_tester", username="admin_tester",
            email="admin_tester@example.com",
            password_hash="hashed",
            role="admin",
        )
        db_session.add(user)
        db_session.commit()
        return user

    def test_create_post_sanitizes_html_and_trims_title(self, admin: User) -> None:
        post = changelog_service.create_post(
            admin,
            {
                "title": "  Patch Notes  ",
                "content_html": '<p onclick="steal()">Hello <script>bad()</script>world</p>',
                "is_published": True,
            },
        )
        assert post.title == "Patch Notes"
        assert "onclick" not in post.content_html
        assert "bad()" not in post.content_html
        assert "Hello" in post.content_html and "world" in post.content_html
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
            admin, {"title": "Original", "content_html": "<p>orig</p>"}
        )
        updated = changelog_service.update_post(post, {"title": "Renamed"})
        assert updated.title == "Renamed"
        assert "orig" in updated.content_html  # untouched
        assert updated.is_published is True  # untouched

    def test_update_post_sanitizes_new_content_html(self, admin: User) -> None:
        post = changelog_service.create_post(
            admin, {"title": "Original", "content_html": "<p>orig</p>"}
        )
        updated = changelog_service.update_post(
            post, {"content_html": '<p>new</p><script>evil()</script>'}
        )
        assert "evil()" not in updated.content_html
        assert "new" in updated.content_html

    def test_published_post_gets_published_at_and_a_draft_does_not(self, admin: User) -> None:
        live = changelog_service.create_post(admin, {"title": "Live", "content_html": "<p>x</p>"})
        draft = changelog_service.create_post(
            admin, {"title": "Draft", "content_html": "<p>x</p>", "is_published": False}
        )
        assert live.published_at is not None
        assert draft.published_at is None

    def test_publishing_a_draft_stamps_published_at_once(self, admin: User) -> None:
        draft = changelog_service.create_post(
            admin, {"title": "Draft", "content_html": "<p>x</p>", "is_published": False}
        )
        published = changelog_service.update_post(draft, {"is_published": True})
        stamp = published.published_at
        assert stamp is not None

        # Unpublishing and publishing again keeps the date readers already saw.
        changelog_service.update_post(published, {"is_published": False})
        again = changelog_service.update_post(published, {"is_published": True})
        assert again.published_at == stamp

    def test_editing_a_live_post_stamps_edited_at(self, admin: User) -> None:
        post = changelog_service.create_post(admin, {"title": "Live", "content_html": "<p>x</p>"})
        assert post.edited_at is None
        edited = changelog_service.update_post(post, {"content_html": "<p>fixed</p>"})
        assert edited.edited_at is not None

    def test_saving_without_changes_or_editing_a_draft_is_not_an_edit(self, admin: User) -> None:
        post = changelog_service.create_post(admin, {"title": "Live", "content_html": "<p>x</p>"})
        same = changelog_service.update_post(post, {"title": "Live", "content_html": "<p>x</p>"})
        assert same.edited_at is None

        draft = changelog_service.create_post(
            admin, {"title": "Draft", "content_html": "<p>x</p>", "is_published": False}
        )
        changed = changelog_service.update_post(draft, {"content_html": "<p>y</p>", "is_published": True})
        assert changed.edited_at is None

    def test_editing_after_it_has_been_live_counts_even_while_it_is_a_draft_again(self, admin: User) -> None:
        post = changelog_service.create_post(admin, {"title": "Live", "content_html": "<p>x</p>"})
        changelog_service.update_post(post, {"is_published": False})
        edited = changelog_service.update_post(post, {"content_html": "<p>fixed</p>"})
        assert edited.edited_at is not None

    def test_post_dict_hides_the_author(self, admin: User) -> None:
        post = changelog_service.create_post(admin, {"title": "Anon", "content_html": "<p>x</p>"})
        data = post.to_dict()
        assert "author_name" not in data and "author_id" not in data
        assert data["title"] == "Anon"

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

    def test_reorder_posts_of_a_loaded_prefix_keeps_the_rest_below(self, admin: User) -> None:
        p1 = changelog_service.create_post(admin, {"title": "P1", "content_html": "<p>1</p>"})
        p2 = changelog_service.create_post(admin, {"title": "P2", "content_html": "<p>2</p>"})
        p3 = changelog_service.create_post(admin, {"title": "P3", "content_html": "<p>3</p>"})
        # Feed order is p3, p2, p1. Swap the first two while p1 was never loaded.
        changelog_service.reorder_posts([p2.id, p3.id])

        result = changelog_service.list_posts(include_unpublished=True)
        assert [row["id"] for row in result["data"]] == [p2.id, p3.id, p1.id]

    def test_reorder_posts_with_tied_positions_still_applies_the_order(self, admin: User) -> None:
        p1 = changelog_service.create_post(admin, {"title": "P1", "content_html": "<p>1</p>"})
        p2 = changelog_service.create_post(admin, {"title": "P2", "content_html": "<p>2</p>"})
        p1.position = 0
        p2.position = 0
        db.session.commit()

        changelog_service.reorder_posts([p1.id, p2.id])

        result = changelog_service.list_posts(include_unpublished=True)
        assert [row["id"] for row in result["data"]] == [p1.id, p2.id]

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
