# backend/app/services/content_moderation_service.py
"""Business logic service for content signing, reporting, and revocation checking."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import desc, func, select

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.core.transaction import transaction
from app.models.admin import AdminAuditLog
from app.models.content_moderation import ContentReport, ContentReportSubscriber, ContentRevocation
from app.models.user import User
from app.services.content_crypto import (
    canonicalize_payload,
    compute_content_hash,
    sign_content,
    verify_content_signature,
)

logger = logging.getLogger(__name__)

HEX_CHARACTERS = frozenset("0123456789abcdefABCDEF")


def sign_user_content(
    user: User,
    content_type: str,
    payload: dict[str, Any],
    secret_key: str,
) -> dict[str, Any]:
    """Deterministically sign user-generated content payload with HMAC-SHA256.

    Args:
        user: Active User instance who is the author.
        content_type: Classification of the content (e.g. 'tier_list').
        payload: Dict containing the content data.
        secret_key: Application secret key.

    Returns:
        Dict containing content_type, content_hash, author_id, author_login, signature, created_at.
    """
    if not isinstance(content_type, str) or not content_type.strip():
        raise ValueError("content_type is required and must be a non-empty string")
    if not isinstance(payload, dict):
        raise ValueError("payload must be a dictionary")

    canonical_str = canonicalize_payload(payload)
    content_hash = compute_content_hash(canonical_str)
    signature = sign_content(user.id, content_hash, secret_key)
    created_at = datetime.now(timezone.utc).isoformat()

    return {
        "content_type": content_type.strip(),
        "content_hash": content_hash,
        "author_id": user.id,
        "author_login": user.login,
        "signature": signature,
        "created_at": created_at,
    }


def report_content(
    reporter: User,
    data: dict[str, Any],
    secret_key: str,
) -> tuple[dict[str, Any], int]:
    """Validate and process a content report submission.

    Args:
        reporter: Authenticated User submitting the report.
        data: Dict containing report submission data.
        secret_key: Server secret key for signature verification.

    Returns:
        Tuple of (response_dict, http_status_code).
    """
    content_type = data.get("content_type")
    content_hash = data.get("content_hash")
    author_id = data.get("author_id")
    author_login = data.get("author_login")
    signature = data.get("signature")
    payload = data.get("payload")
    reason = data.get("reason")
    notes = data.get("notes")

    # Basic field validation
    if (
        not isinstance(content_type, str)
        or not content_type.strip()
        or not isinstance(content_hash, str)
        or len(content_hash.strip()) != 64
        or not isinstance(author_id, int)
        or isinstance(author_id, bool)
        or author_id <= 0
        or not isinstance(author_login, str)
        or not author_login.strip()
        or not isinstance(signature, str)
        or len(signature.strip()) != 64
        or not isinstance(payload, dict)
        or not isinstance(reason, str)
        or not reason.strip()
    ):
        return {"error": "Missing or invalid fields", "status": 400}, 400

    clean_hash = content_hash.strip().lower()

    # 1. Canonicalize payload and verify hash match
    try:
        canonical_str = canonicalize_payload(payload)
        computed_hash = compute_content_hash(canonical_str)
    except Exception as err:
        logger.warning(f"Failed to canonicalize payload: {err}")
        return {"error": "Failed to canonicalize payload", "status": 400}, 400

    # Enforce maximum evidence payload size (500KB)
    if len(canonical_str) > 500_000:
        return {"error": "Evidence payload exceeds maximum allowed size (500KB)", "status": 400}, 400

    if computed_hash != clean_hash:
        return {"error": "Payload hash mismatch", "status": 400}, 400

    # 2. Verify HMAC signature
    if not verify_content_signature(author_id, clean_hash, signature, secret_key):
        return {"error": "Invalid content signature", "status": 400}, 400

    # 3. Check if already revoked
    revocation = db.session.scalar(
        select(ContentRevocation).where(ContentRevocation.content_hash == clean_hash)
    )
    if revocation is not None:
        return {
            "status": "already_banned",
            "message": "Content is already revoked and blocked site-wide",
            "content_hash": clean_hash,
        }, 200

    # 4. Check if pending report exists
    existing_report = db.session.scalar(
        select(ContentReport).where(
            ContentReport.content_hash == clean_hash,
            ContentReport.status == "pending",
        )
    )
    if existing_report is not None:
        with transaction():
            existing_report.report_count += 1

            # Check if reporter is already subscribed
            existing_sub = db.session.scalar(
                select(ContentReportSubscriber).where(
                    ContentReportSubscriber.report_id == existing_report.id,
                    ContentReportSubscriber.reporter_id == reporter.id,
                )
            )
            if existing_sub is None:
                sub = ContentReportSubscriber(
                    report_id=existing_report.id,
                    reporter_id=reporter.id,
                    reason=reason.strip()[:64],
                    notes=notes.strip()[:500] if isinstance(notes, str) and notes.strip() else None,
                )
                db.session.add(sub)

        return {
            "status": "queued",
            "message": "Report received and added to pending queue",
            "report_count": existing_report.report_count,
            "content_hash": clean_hash,
        }, 200

    # 5. Create new pending report
    expires_at = datetime.now(timezone.utc) + timedelta(days=14)

    # Check author existence for foreign key safety and derive author login from DB
    author_exists = db.session.get(User, author_id)
    persisted_author_id = author_id if author_exists else None
    persisted_author_login = author_exists.login if author_exists else author_login.strip()[:50]

    with transaction():
        report = ContentReport(
            content_type=content_type.strip()[:32],
            content_hash=clean_hash,
            author_id=persisted_author_id,
            author_login=persisted_author_login,
            first_reporter_id=reporter.id,
            report_count=1,
            primary_reason=reason.strip()[:64],
            status="pending",
            evidence_payload=canonical_str,
            expires_at=expires_at,
        )
        db.session.add(report)
        db.session.flush()

        sub = ContentReportSubscriber(
            report_id=report.id,
            reporter_id=reporter.id,
            reason=reason.strip()[:64],
            notes=notes.strip()[:500] if isinstance(notes, str) and notes.strip() else None,
        )
        db.session.add(sub)

    return {
        "status": "pending",
        "message": "Report created successfully",
        "report_id": report.id,
        "content_hash": clean_hash,
    }, 201


def check_revocations(hashes: list[str]) -> list[str]:
    """Query list of content hashes to find which ones are revoked.

    Args:
        hashes: List of 64-character SHA-256 content hashes (max 200).

    Returns:
        List of revoked hashes.

    Raises:
        ValueError: If input is not a list, exceeds 200 items, or contains invalid hex strings.
    """
    if not isinstance(hashes, list):
        raise ValueError("hashes must be a list")

    if len(hashes) > 200:
        raise ValueError("Cannot check more than 200 hashes at once")

    if any(
        not isinstance(h, str)
        or len(h.strip()) != 64
        or not all(c in HEX_CHARACTERS for c in h.strip())
        for h in hashes
    ):
        raise ValueError("Each hash must be a 64-character hexadecimal string")

    clean_hashes = [h.strip().lower() for h in hashes]
    if not clean_hashes:
        return []

    revoked = db.session.scalars(
        select(ContentRevocation.content_hash).where(
            ContentRevocation.content_hash.in_(clean_hashes)
        )
    ).all()

    return list(revoked)


def get_admin_reports(
    status: str | None = "pending",
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    """Retrieve paginated content reports ordered by report count descending."""
    base_stmt = select(ContentReport)
    count_stmt = select(func.count(ContentReport.id))

    if status and status.strip().lower() != "all":
        clean_status = status.strip()
        base_stmt = base_stmt.where(ContentReport.status == clean_status)
        count_stmt = count_stmt.where(ContentReport.status == clean_status)

    total = db.session.scalar(count_stmt) or 0

    stmt = (
        base_stmt.order_by(
            ContentReport.report_count.desc(),
            ContentReport.created_at.desc(),
        )
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    reports = db.session.scalars(stmt).all()
    items = [r.to_dict() for r in reports]

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def get_report_preview(report_id: int) -> dict[str, Any] | None:
    """Retrieve full preview of a report including evidence payload."""
    report = db.session.get(ContentReport, report_id)
    if report is None:
        return None
    return {
        "id": report.id,
        "content_type": report.content_type,
        "content_hash": report.content_hash,
        "author_login": report.author_login,
        "report_count": report.report_count,
        "primary_reason": report.primary_reason,
        "status": report.status,
        "evidence_payload": report.evidence_payload,
    }


def resolve_report(
    admin: User,
    report_id: int,
    action: str,
    ban_author: bool = False,
    admin_notes: str | None = None,
) -> tuple[dict[str, Any], int]:
    """Resolve a content report with ban or dismiss action and zero-retention hard wipe."""
    if action not in ("ban", "dismiss"):
        return {"error": "Action must be 'ban' or 'dismiss'", "status": 400}, 400

    clean_notes = admin_notes.strip() if isinstance(admin_notes, str) and admin_notes.strip() else None

    with transaction():
        report = db.session.get(ContentReport, report_id)
        if report is None:
            return {"error": "Content report not found", "status": 404}, 404

        if action == "ban":
            existing_rev = db.session.scalar(
                select(ContentRevocation).where(ContentRevocation.content_hash == report.content_hash)
            )
            if existing_rev is None:
                rev = ContentRevocation(
                    content_hash=report.content_hash,
                    content_type=report.content_type,
                    author_id=report.author_id,
                    reason=report.primary_reason,
                    revoked_by_id=admin.id,
                )
                db.session.add(rev)

            if ban_author and report.author_id is not None:
                author = db.session.get(User, report.author_id)
                if author is not None:
                    author.is_active = False

            report.status = "resolved_banned"

            db.session.add(
                AdminAuditLog(
                    admin_user_id=admin.id,
                    action="content_ban",
                    target_type="content",
                    target_id=str(report.content_hash),
                    details=safe_json_dumps({
                        "report_id": report.id,
                        "admin_notes": clean_notes,
                        "ban_author": ban_author,
                    }),
                )
            )
        elif action == "dismiss":
            report.status = "dismissed"

            db.session.add(
                AdminAuditLog(
                    admin_user_id=admin.id,
                    action="content_dismiss",
                    target_type="content",
                    target_id=str(report.content_hash),
                    details=safe_json_dumps({
                        "report_id": report.id,
                        "admin_notes": clean_notes,
                    }),
                )
            )

        # CRITICAL ZERO-RETENTION HARD WIPE: wipe evidence payload permanently
        report.evidence_payload = None
        report.resolved_by_id = admin.id
        report.resolved_at = datetime.now(timezone.utc)
        report.admin_notes = clean_notes

    return {
        "message": f"Report successfully resolved with action '{action}'",
        "report_id": report.id,
    }, 200


def purge_expired_evidence() -> int:
    """Wipe evidence payloads and mark expired for all pending reports past their expiry date."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(ContentReport)
        .where(
            ContentReport.status == "pending",
            ContentReport.expires_at <= now,
        )
    )
    with transaction():
        reports = db.session.scalars(stmt).all()
        for r in reports:
            r.evidence_payload = None
            r.status = "expired"
        return len(reports)

