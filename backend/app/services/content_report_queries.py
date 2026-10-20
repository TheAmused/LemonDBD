# backend/app/services/content_report_queries.py
"""Read side of the admin content-report queue (listing and the case preview)."""
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import defer

from app.core.account_state import block_kind, is_blocked
from app.core.extensions import db
from app.models.content_moderation import ContentReport, ContentReportSubscriber
from app.models.user import User

REPORT_STATUSES = frozenset({"pending", "resolved_banned", "dismissed", "expired"})


def get_admin_reports(
    status: str | None = "pending",
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    """Retrieve paginated content reports ordered by report count descending.

    `stats` counts every report per status (and in total) whatever the filter, for the queue's filter chips.

    Raises:
        ValueError: If `status` is not a known report status (or "all").
    """
    base_stmt = select(ContentReport)
    count_stmt = select(func.count(ContentReport.id))

    clean_status = (status or "pending").strip().lower()
    if clean_status != "all":
        if clean_status not in REPORT_STATUSES:
            raise ValueError(f"Unknown report status '{clean_status}'")
        base_stmt = base_stmt.where(ContentReport.status == clean_status)
        count_stmt = count_stmt.where(ContentReport.status == clean_status)

    total = db.session.scalar(count_stmt) or 0
    by_status = dict(
        db.session.execute(
            select(ContentReport.status, func.count(ContentReport.id)).group_by(ContentReport.status)
        ).all()
    )
    stats = {status: by_status.get(status, 0) for status in sorted(REPORT_STATUSES)}
    stats["total"] = sum(stats.values())

    # The evidence (a whole reported document) is not loaded for the list: only whether it is there.
    stmt = (
        base_stmt.add_columns(ContentReport.evidence_payload.is_not(None).label("has_evidence"))
        .options(defer(ContentReport.evidence_payload))
        .order_by(
            ContentReport.report_count.desc(),
            ContentReport.created_at.desc(),
        )
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    items = [{**report.to_dict(), "has_evidence": bool(has_evidence)} for report, has_evidence in db.session.execute(stmt).all()]

    return {
        "items": items,
        "total": total,
        "stats": stats,
        "page": page,
        "per_page": per_page,
    }


def get_report_preview(report_id: int) -> dict[str, Any] | None:
    """Retrieve full preview of a report: evidence, every reporter's reason/notes, author state.

    Reporter identities are deliberately left out; the admin judges the content, not who flagged it.
    """
    report = db.session.get(ContentReport, report_id)
    if report is None:
        return None

    subscribers = db.session.scalars(
        select(ContentReportSubscriber)
        .where(ContentReportSubscriber.report_id == report.id)
        .order_by(ContentReportSubscriber.created_at.asc(), ContentReportSubscriber.id.asc())
    ).all()
    breakdown: dict[str, int] = {}
    for sub in subscribers:
        breakdown[sub.reason] = breakdown.get(sub.reason, 0) + 1

    author = db.session.get(User, report.author_id) if report.author_id is not None else None

    return {
        **report.to_dict(),
        "evidence_payload": report.evidence_payload,
        "reports": [
            {
                "reason": sub.reason,
                "notes": sub.notes,
                "created_at": sub.created_at.isoformat() if sub.created_at else None,
            }
            for sub in subscribers
        ],
        "reason_breakdown": breakdown,
        "attributed": report.author_id is not None,
        "author_active": not is_blocked(author) if author is not None else None,
        # "active", "suspended" or "banned": a suspended author can still be warned, suspended for
        # longer or banned from the report (author_active alone said "inactive" for both).
        "author_standing": (block_kind(author) or "active") if author is not None else None,
        "author_is_admin": author.role == "admin" if author is not None else False,
    }
