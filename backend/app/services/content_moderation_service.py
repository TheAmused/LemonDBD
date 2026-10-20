# backend/app/services/content_moderation_service.py
"""Business logic service for content signing, reporting, and revocation checking."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.core.transaction import transaction
from app.models.admin import AdminAuditLog
from app.models.content_moderation import ContentReport, ContentReportSubscriber, ContentRevocation
from app.models.user import User
from app.services.content_report_queries import REPORT_STATUSES, get_admin_reports, get_report_preview  # noqa: F401
from app.services.mail_service import send_content_moderation_notice_email
from app.services.moderation_actions import ModerationError, create_sanction, default_report_facts
from app.services.sanction_outbox import dispatch_notifications, queued_notification_ids
from app.services.site_settings import contact_email, content_evidence_days
from app.services.content_crypto import (
    canonicalize_payload,
    compute_content_hash,
    sign_content,
    verify_content_signature,
)

logger = logging.getLogger(__name__)

HEX_CHARACTERS = frozenset("0123456789abcdefABCDEF")

CONTENT_TYPES = frozenset({"tier_list", "smash_roster", "minigame"})
REPORT_REASONS = frozenset({"hate_speech", "harassment", "explicit", "illegal", "spam", "other"})
MAX_EVIDENCE_CHARS = 500_000
EVIDENCE_TTL_DAYS = 14  # the Privacy Policy's promise: the admin setting can shorten it, never lengthen it
UNATTRIBUTED_LOGIN = ""


def evidence_days() -> int:
    return min(EVIDENCE_TTL_DAYS, content_evidence_days())


def _is_hex64(value: Any) -> bool:
    return isinstance(value, str) and len(value.strip()) == 64 and all(c in HEX_CHARACTERS for c in value.strip())


def _clean_notes(notes: Any) -> str | None:
    return notes.strip()[:500] if isinstance(notes, str) and notes.strip() else None


def _canonical_document(payload: Any) -> tuple[str, str]:
    """Return (canonical_json, sha256) for a document, raising ValueError when it cannot be hashed."""
    if not isinstance(payload, dict):
        raise ValueError("payload must be a dictionary")
    try:
        canonical_str = canonicalize_payload(payload)
        if len(canonical_str) > MAX_EVIDENCE_CHARS:
            raise ValueError("Evidence payload exceeds maximum allowed size (500KB)")
        return canonical_str, compute_content_hash(canonical_str)
    except (TypeError, ValueError, RecursionError) as err:
        if "maximum allowed size" in str(err):
            raise
        raise ValueError("Failed to canonicalize payload") from err


TIER_LIST_FORMAT = "lemondbd-tier-list"

# Fields that record how someone *uses* a document rather than what its author made. Ranking a tier
# list (which item sits in which tier) leaves it the same list: a ban on it still applies and the
# author's stamp stays valid. Only an edit saved from an editor (title, items, tiers, images...)
# makes new content. Smash votes and minigame progress are never part of the document at all.
# Mirrored in frontend/src/utils/contentHash.ts (USAGE_FIELDS).
USAGE_FIELDS: dict[str, tuple[str, ...]] = {TIER_LIST_FORMAT: ("placements",)}


def content_identity(payload: dict[str, Any]) -> dict[str, Any]:
    """The part of a document that identifies it: the document without its usage fields."""
    doc_format = payload.get("format")
    usage = USAGE_FIELDS.get(doc_format) if isinstance(doc_format, str) else None
    if not usage:
        return payload
    return {key: value for key, value in payload.items() if key not in usage}


def _document_hashes(payload: Any) -> tuple[str, str, frozenset[str]]:
    """Return (evidence_json, identity_hash, every hash a ban or stamp of this document may carry).

    New reports, bans and stamps use the identity hash. The whole-document hash is accepted too, so
    stamps and bans made before usage fields were left out keep matching.
    """
    canonical_str, full_hash = _canonical_document(payload)
    identity = content_identity(payload)
    identity_hash = full_hash if identity is payload else _canonical_document(identity)[1]
    return canonical_str, identity_hash, frozenset({identity_hash, full_hash})


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

    # The stamp names the content, not one ranking of it, so re-ranking a list keeps it valid.
    content_hash = compute_content_hash(canonicalize_payload(content_identity(payload)))
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


def _parse_manifest(data: dict[str, Any]) -> tuple[dict[str, Any] | None, bool]:
    """Read the optional author stamp from a report body.

    Returns (manifest, malformed). A body with none of the stamp fields is an unsigned
    report (manifest None). A stamp with some fields missing or badly formed is malformed.
    """
    content_hash = data.get("content_hash")
    author_id = data.get("author_id")
    signature = data.get("signature")
    if all(v in (None, "") for v in (content_hash, author_id, signature)):
        return None, False
    if (
        not _is_hex64(content_hash)
        or not isinstance(author_id, int)
        or isinstance(author_id, bool)
        or author_id <= 0
        or not _is_hex64(signature)
    ):
        return None, True
    author_login = data.get("author_login")
    return {
        "content_hash": content_hash.strip().lower(),
        "author_id": author_id,
        "signature": signature.strip(),
        "author_login": author_login.strip()[:50] if isinstance(author_login, str) else UNATTRIBUTED_LOGIN,
    }, False


def _join_pending_report(report: ContentReport, reporter: User, reason: str, notes: str | None) -> bool:
    """Record `reporter` against a pending report. Returns False when they already reported it.

    The count only moves when a new reporter row is inserted, and it moves in SQL so concurrent
    reporters cannot lose an increment.
    """
    try:
        with db.session.begin_nested():
            db.session.add(
                ContentReportSubscriber(
                    report_id=report.id,
                    reporter_id=reporter.id,
                    reason=reason,
                    notes=notes,
                )
            )
            db.session.flush()
    except IntegrityError:
        return False
    db.session.execute(
        update(ContentReport)
        .where(ContentReport.id == report.id)
        .values(report_count=ContentReport.report_count + 1)
    )
    db.session.commit()
    db.session.refresh(report)
    return True


def _queued_response(report: ContentReport, joined: bool) -> tuple[dict[str, Any], int]:
    return {
        "status": "queued",
        "message": "Report received and added to pending queue"
        if joined
        else "You have already reported this content",
        "already_reported": not joined,
        "report_count": report.report_count,
        "content_hash": report.content_hash,
    }, 200


def _find_pending_report(content_hash: str) -> ContentReport | None:
    return db.session.scalar(
        select(ContentReport).where(
            ContentReport.content_hash == content_hash,
            ContentReport.status == "pending",
        )
    )


def report_content(
    reporter: User,
    data: dict[str, Any],
    secret_key: str,
) -> tuple[dict[str, Any], int]:
    """Validate and process a content report submission.

    The server hashes the submitted document itself. If the report carries a valid author stamp
    for that exact hash the report is attributed to the stamped author. A report without a stamp,
    or whose stamp belongs to a different document (the content was edited after signing or the
    stamp was copied from elsewhere), is still accepted but stays unattributed, so unsigned
    content can be reviewed and revoked and nobody can be framed by a copied stamp.

    The report is filed under the document's identity hash (`content_identity`), so the ban that
    follows covers every ranking of a tier list, not only the reporter's.

    Returns:
        Tuple of (response_dict, http_status_code).
    """
    content_type = data.get("content_type")
    payload = data.get("payload")
    reason = data.get("reason")
    notes = _clean_notes(data.get("notes"))

    if not isinstance(content_type, str) or content_type.strip() not in CONTENT_TYPES:
        return {"error": "Unsupported content_type", "status": 400}, 400
    if not isinstance(reason, str) or reason.strip() not in REPORT_REASONS:
        return {"error": "Unsupported report reason", "status": 400}, 400
    if not isinstance(payload, dict):
        return {"error": "Missing or invalid fields", "status": 400}, 400

    try:
        canonical_str, computed_hash, known_hashes = _document_hashes(payload)
    except ValueError as err:
        logger.warning(f"Rejected report payload: {err}")
        return {"error": str(err), "status": 400}, 400

    manifest, malformed = _parse_manifest(data)
    if malformed:
        return {"error": "Missing or invalid fields", "status": 400}, 400

    content_type = content_type.strip()
    reason = reason.strip()
    persisted_author_id: int | None = None
    persisted_author_login = UNATTRIBUTED_LOGIN
    attributed = False

    if manifest is not None and manifest["content_hash"] in known_hashes:
        if not verify_content_signature(manifest["author_id"], manifest["content_hash"], manifest["signature"], secret_key):
            return {"error": "Invalid content signature", "status": 400}, 400
        attributed = True
        author = db.session.get(User, manifest["author_id"])
        persisted_author_id = author.id if author else None
        persisted_author_login = author.login if author else manifest["author_login"]

    revocation = db.session.scalar(
        select(ContentRevocation.id).where(ContentRevocation.content_hash.in_(known_hashes)).limit(1)
    )
    if revocation is not None:
        return {
            "status": "already_banned",
            "message": "Content is already revoked and blocked site-wide",
            "content_hash": computed_hash,
        }, 200

    existing_report = _find_pending_report(computed_hash)
    if existing_report is not None:
        return _queued_response(existing_report, _join_pending_report(existing_report, reporter, reason, notes))

    try:
        with db.session.begin_nested():
            report = ContentReport(
                content_type=content_type,
                content_hash=computed_hash,
                author_id=persisted_author_id,
                author_login=persisted_author_login,
                first_reporter_id=reporter.id,
                report_count=1,
                primary_reason=reason,
                status="pending",
                evidence_payload=canonical_str,
                expires_at=datetime.now(timezone.utc) + timedelta(days=evidence_days()),
            )
            db.session.add(report)
            db.session.flush()
            db.session.add(
                ContentReportSubscriber(
                    report_id=report.id,
                    reporter_id=reporter.id,
                    reason=reason,
                    notes=notes,
                )
            )
            db.session.flush()
    except IntegrityError:
        # Another reporter opened the pending report for this hash first: join theirs instead.
        raced_report = _find_pending_report(computed_hash)
        if raced_report is None:
            raise
        return _queued_response(raced_report, _join_pending_report(raced_report, reporter, reason, notes))

    db.session.commit()
    return {
        "status": "pending",
        "message": "Report created successfully",
        "report_id": report.id,
        "content_hash": computed_hash,
        "attributed": attributed,
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


def _has_valid_author_stamp(manifest: Any, content_hashes: frozenset[str], secret_key: str | None) -> bool:
    """True when `manifest` is a genuine stamp for exactly this document from an existing account."""
    if not isinstance(manifest, dict) or not secret_key:
        return False
    stamp, malformed = _parse_manifest(manifest)
    if stamp is None or malformed or stamp["content_hash"] not in content_hashes:
        return False
    if not verify_content_signature(stamp["author_id"], stamp["content_hash"], stamp["signature"], secret_key):
        return False
    return db.session.get(User, stamp["author_id"]) is not None


def check_document_revoked(
    payload: Any,
    manifest: Any = None,
    secret_key: str | None = None,
) -> dict[str, Any]:
    """Tell whether a document has been revoked, and whether it carries a genuine author stamp.

    The server hashes the document itself, so a ban cannot be dodged by stripping the stamp.
    `signed` is the server-side enforcement that custom content comes from an account: it is only
    true when `manifest` is a valid HMAC stamp for this exact document from an existing user. The
    client refuses to import or open shared content when it is false.

    Raises:
        ValueError: If the payload is not a hashable JSON object or is too large.
    """
    _, content_hash, known_hashes = _document_hashes(payload)
    revoked = db.session.scalar(
        select(ContentRevocation.id).where(ContentRevocation.content_hash.in_(known_hashes)).limit(1)
    )
    return {
        "revoked": revoked is not None,
        "content_hash": content_hash,
        "signed": _has_valid_author_stamp(manifest, known_hashes, secret_key),
    }


AUTHOR_ACTIONS = {"warn": "warning", "suspend": "suspension", "ban": "ban"}


def resolve_report(
    admin: User,
    report_id: int,
    action: str,
    ban_author: bool = False,
    admin_notes: str | None = None,
    author_action: str | None = None,
    duration_days: int | None = None,
    facts: str | None = None,
    rule_ref: str | None = None,
) -> tuple[dict[str, Any], int]:
    """Resolve a content report with ban or dismiss action and zero-retention hard wipe.

    `author_action` ("none", "warn", "suspend", "ban") is what happens to the author's account when the
    content is banned; the old `ban_author` flag means "ban" and is used only when it is not given.
    """
    if action not in ("ban", "dismiss"):
        return {"error": "Action must be 'ban' or 'dismiss'", "status": 400}, 400
    if author_action is None:
        author_action = "ban" if ban_author else "none"
    if author_action not in ("none", *AUTHOR_ACTIONS):
        return {"error": "author_action must be 'none', 'warn', 'suspend' or 'ban'", "status": 400}, 400

    clean_notes = admin_notes.strip() if isinstance(admin_notes, str) and admin_notes.strip() else None
    sanction_ids: list[int] = []

    try:
        return _resolve_report(
            admin, report_id, action, author_action, clean_notes, sanction_ids,
            duration_days=duration_days, facts=facts, rule_ref=rule_ref,
        )
    except ModerationError as err:
        return {"error": err.message, "status": err.status}, err.status


def _resolve_report(
    admin: User,
    report_id: int,
    action: str,
    author_action: str,
    clean_notes: str | None,
    sanction_ids: list[int],
    *,
    duration_days: int | None,
    facts: str | None,
    rule_ref: str | None,
) -> tuple[dict[str, Any], int]:
    ban_author = author_action != "none"
    with transaction():
        # Locked: two admins resolving the same report at once used to both pass the "pending" check
        # below and both sanction the author (two warnings, two emails). The second now waits and
        # then sees the first one's decision.
        report = db.session.get(ContentReport, report_id, with_for_update=True)
        if report is None:
            return {"error": "Content report not found", "status": 404}, 404

        if report.status == "expired":
            return {
                "error": f"Content report #{report_id} expired and its evidence was wiped; it can no longer be resolved",
                "status": 409,
            }, 409
        if report.status != "pending":
            return {
                "error": f"Content report #{report_id} has already been resolved as '{report.status}'",
                "status": 409,
            }, 409

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
                author = db.session.get(User, report.author_id, with_for_update=True)
                if author is not None and author.role != "admin":
                    sanction = create_sanction(
                        AUTHOR_ACTIONS[author_action],
                        admin,
                        author,
                        reason_code=report.primary_reason,
                        facts=facts or default_report_facts(report.content_type),
                        rule_ref=rule_ref,
                        internal_notes=clean_notes,
                        duration_days=duration_days,
                        source="content_report",
                        report_id=report.id,
                    )
                    sanction_ids.append(sanction.id)

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
                        "author_action": author_action,
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

        notice = None
        # An account decision sends its own (merged) email through the outbox; without one the
        # author still gets the plain statement about the blocked content.
        if action == "ban" and report.author_id is not None and not sanction_ids:
            notice = (report.author_id, report.content_type, report.primary_reason)

    if sanction_ids:
        dispatch_notifications(queued_notification_ids(sanction_ids))
    if notice is not None:
        # Statement of reasons for the author. Sent after the decision is committed and never raises.
        author = db.session.get(User, notice[0])
        if author is not None and author.email:
            send_content_moderation_notice_email(
                author, notice[1], notice[2], account_deactivated=not author.is_active, contact_email=contact_email()
            )

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

