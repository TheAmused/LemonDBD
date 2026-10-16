# backend/app/services/changelog_service.py
"""CRUD service backing the "What's New?" changelog drawer and its admin editor."""
from typing import Any

from sqlalchemy import desc, func, select

from app.core.extensions import db
from app.models import ChangelogPost, User
from app.models.base import utcnow
from app.utils.sanitize import sanitize_changelog_html


def list_posts(
    page: int = 1,
    per_page: int = 20,
    include_unpublished: bool = False,
) -> dict[str, Any]:
    """Lists changelog posts, newest first. Public callers only ever see
    published posts; admins (include_unpublished=True) see everything so
    drafts can be reviewed before going live."""
    page = max(1, page)
    per_page = max(1, min(per_page, 50))

    stmt = select(ChangelogPost)
    if not include_unpublished:
        stmt = stmt.where(ChangelogPost.is_published.is_(True))

    total = db.session.scalar(
        select(func.count()).select_from(stmt.subquery())
    ) or 0

    rows = db.session.scalars(
        stmt.order_by(ChangelogPost.position.asc(), desc(ChangelogPost.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()

    return {
        "data": [p.to_dict() for p in rows],
        "page": page,
        "per_page": per_page,
        "total": total,
        "has_more": page * per_page < total,
    }


def get_post(post_id: int) -> ChangelogPost | None:
    return db.session.get(ChangelogPost, post_id)


def create_post(admin_user: User, payload: dict[str, Any]) -> ChangelogPost:
    # New posts land on top of the feed by default (lower position = shown
    # first); admins can then drag-reorder freely via reorder_posts().
    is_published = payload.get("is_published", True)
    min_position = db.session.scalar(select(func.min(ChangelogPost.position)))
    next_position = (min_position - 1) if min_position is not None else 0

    post = ChangelogPost(
        title=payload["title"].strip(),
        content_html=sanitize_changelog_html(payload["content_html"]),
        is_published=is_published,
        published_at=utcnow() if is_published else None,
        position=next_position,
        author_id=admin_user.id,
        author_name=admin_user.username or "The Entity",
    )
    db.session.add(post)
    db.session.commit()
    return post


def update_post(post: ChangelogPost, payload: dict[str, Any]) -> ChangelogPost:
    if payload.get("title") is not None:
        post.title = payload["title"].strip()
    if payload.get("content_html") is not None:
        post.content_html = sanitize_changelog_html(payload["content_html"])
    if payload.get("is_published") is not None:
        post.is_published = payload["is_published"]
        if post.is_published and post.published_at is None:
            post.published_at = utcnow()

    db.session.commit()
    return post


def mark_announced(post: ChangelogPost) -> ChangelogPost:
    post.discord_announced_at = utcnow()
    db.session.commit()
    return post


def delete_post(post: ChangelogPost) -> None:
    db.session.delete(post)
    db.session.commit()


def reorder_posts(ordered_ids: list[int]) -> None:
    """Applies a new admin-chosen sort order (drag-and-drop in the "What's
    New?" modal). `ordered_ids` is the desired top-to-bottom order of the
    posts the modal has loaded, which may be only the first pages of the feed.
    The posts trade the positions they already hold, so entries that were not
    loaded keep their place below. Ids not owned by an existing post are
    silently ignored.
    """
    posts = {p.id: p for p in db.session.scalars(
        select(ChangelogPost).where(ChangelogPost.id.in_(ordered_ids))
    ).all()}
    ordered = [posts[post_id] for post_id in dict.fromkeys(ordered_ids) if post_id in posts]
    if not ordered:
        return

    # Legacy rows can share a position; keep them strictly increasing so the new order sticks.
    positions: list[int] = []
    for position in sorted(p.position for p in ordered):
        positions.append(max(position, positions[-1] + 1) if positions else position)

    for post, position in zip(ordered, positions):
        post.position = position

    db.session.commit()
