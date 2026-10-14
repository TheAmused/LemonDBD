# backend/app/services/content_moderation_service.py
"""Business logic service for content signing, reporting, and revocation checking."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models.content_moderation import ContentReport, ContentReportSubscriber, ContentRevocation
from app.models.user import User
from app.services.content_crypto import (
    canonicalize_payload,
    compute_content_hash,
    sign_content,
    verify_content_signature,
)

logger = logging.getLogger(__name__)


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

        db.session.commit()
        return {
            "status": "queued",
            "message": "Report received and added to pending queue",
            "report_count": existing_report.report_count,
            "content_hash": clean_hash,
        }, 200

    # 5. Create new pending report
    expires_at = datetime.now(timezone.utc) + timedelta(days=14)

    # Check author existence for foreign key safety
    author_exists = db.session.get(User, author_id)
    persisted_author_id = author_id if author_exists else None

    report = ContentReport(
        content_type=content_type.strip()[:32],
        content_hash=clean_hash,
        author_id=persisted_author_id,
        author_login=author_login.strip()[:50],
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
    db.session.commit()

    return {
        "status": "pending",
        "message": "Report created successfully",
        "report_id": report.id,
        "content_hash": clean_hash,
    }, 201


def check_revocations(hashes: list[str]) -> list[str]:
    """Query list of content hashes to find which ones are revoked.

    Args:
        hashes: List of 64-character SHA-256 content hashes.

    Returns:
        List of revoked hashes.

    Raises:
        ValueError: If input is not a list or contains invalid hash strings.
    """
    if not isinstance(hashes, list):
        raise ValueError("hashes must be a list")

    if any(not isinstance(h, str) or len(h.strip()) != 64 for h in hashes):
        raise ValueError("Each hash must be a 64-character string")

    clean_hashes = [h.strip().lower() for h in hashes]
    if not clean_hashes:
        return []

    revoked = db.session.scalars(
        select(ContentRevocation.content_hash).where(
            ContentRevocation.content_hash.in_(clean_hashes)
        )
    ).all()

    return list(revoked)
