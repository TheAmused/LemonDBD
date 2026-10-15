# backend/app/services/content_report_queries.py
"""Read side of the admin content-report queue (listing and the case preview)."""
from typing import Any

from sqlalchemy import func, select

from app.core.account_state import is_blocked
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
    pending_total = db.session.scalar(
        select(func.count(ContentReport.id)).where(ContentReport.status == "pending")
    ) or 0

    stmt = (
        base_stmt.order_by(
            ContentReport.report_count.desc(),
            ContentReport.created_at.desc(),
        )
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    reports = db.session.scalars(stmt).all()
    items = [{**r.to_dict(), "has_evidence": r.evidence_payload is not None} for r in reports]

    return {
        "items": items,
        "total": total,
        "pending_total": pending_total,
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
        "author_is_admin": author.role == "admin" if author is not None else False,
    }
