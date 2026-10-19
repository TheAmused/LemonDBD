# backend/app/routes/bug_reports.py
import base64
import logging
import uuid
from pathlib import Path

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import ColumnElement, case, desc, func, or_, select

from app.core.altcha_guard import altcha_rejection
from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.core.limiter import limiter, validate_honeypot
from app.core.rate_limits import per_minute
from app.core.security import admin_required, get_current_user
from app.core.transaction import transaction
from app.models import BugReport, User
from app.utils.api_i18n import error_response
from app.utils.lang import extract_lang
from app.utils.pagination import paginate_args
from app.schemas.community import BugReportResponse
from app.services import discord_webhook, site_settings
from app.services.admin_control_service import log_admin_action

logger = logging.getLogger(__name__)

bug_reports_bp = Blueprint("bug_reports", __name__, url_prefix="/api/v1")


#: Same limits as the report form (3 screenshots of at most 2 MB each), enforced here too.
MAX_BUG_REPORT_IMAGES = 3
MAX_BUG_REPORT_IMAGE_BYTES = 2 * 1024 * 1024
#: Refuse to decode anything bigger than this, whatever its file size (a decompression bomb).
MAX_BUG_REPORT_IMAGE_PIXELS = 40_000_000
#: Longest side of the stored copy; screenshots are re-encoded, never stored as sent.
MAX_BUG_REPORT_IMAGE_SIDE = 2560


def _save_base64_image(b64_data: str, base_dir: Path) -> str | None:
    """Decode one screenshot, check it really is an image, and store a re-encoded WebP copy.

    The bytes used to be written as sent under whatever extension the header claimed, so a guest
    could host any file on this domain. Now only something Pillow can decode is kept, at most
    `MAX_BUG_REPORT_IMAGE_BYTES` and `MAX_BUG_REPORT_IMAGE_PIXELS`, re-encoded (which also drops
    metadata such as GPS tags). Returns the public path, or None when the payload is refused.
    """
    from io import BytesIO

    from PIL import Image, ImageOps

    try:
        encoded = b64_data.split(",", 1)[1] if "," in b64_data else b64_data
        if len(encoded) > (MAX_BUG_REPORT_IMAGE_BYTES * 4) // 3 + 4:
            return None
        image_bytes = base64.b64decode(encoded, validate=False)
        if not image_bytes or len(image_bytes) > MAX_BUG_REPORT_IMAGE_BYTES:
            return None

        with Image.open(BytesIO(image_bytes)) as probe:
            width, height = probe.size
            if width * height > MAX_BUG_REPORT_IMAGE_PIXELS:
                return None
            probe.verify()
        with Image.open(BytesIO(image_bytes)) as image:
            image.seek(0)
            frame = ImageOps.exif_transpose(image)
            frame = frame.convert("RGBA" if frame.mode in ("RGBA", "LA", "P") else "RGB")
            frame.thumbnail((MAX_BUG_REPORT_IMAGE_SIDE, MAX_BUG_REPORT_IMAGE_SIDE))

            upload_dir = base_dir / "static" / "uploads" / "bug_reports"
            upload_dir.mkdir(parents=True, exist_ok=True)
            filename = f"bug_{uuid.uuid4().hex[:12]}.webp"
            frame.save(upload_dir / filename, format="WEBP", quality=85, method=4)

        return f"/static/uploads/bug_reports/{filename}"
    except Exception as err:
        logger.warning(f"Refused a bug report screenshot that is not a readable image: {err}")
        return None


@bug_reports_bp.route("/bug-reports", methods=["POST"])
@limiter.limit(per_minute("rate_bug_report_per_minute"))
def submit_bug_report():
    """Submits a new bug report from authenticated users or guest players."""
    data = request.get_json(silent=True) or {}

    if not validate_honeypot(data):
        return jsonify({"error": "Spam detected.", "status": 400}), 400

    user = get_current_user()
    if not user:
        if not site_settings.guest_bug_reports_allowed():
            return error_response("guest_bug_reports_closed", 403, lang=extract_lang())
        rejected = altcha_rejection(data)
        if rejected is not None:
            return rejected

    title = data.get("title", "").strip()
    message = data.get("message", "").strip()
    raw_images = data.get("images", [])

    if not title or not message:
        return jsonify({"error": "Title and description are required."}), 400

    if user:
        reporter_name = user.username
        reporter_email = user.email
        user_id = user.id
    else:
        reporter_name = data.get("reporter_name", "").strip() or "Guest Player"
        reporter_email = data.get("reporter_email", "").strip() or None
        user_id = None
        if not reporter_email:
            return jsonify({"error": "Email address is required for guest bug reports."}), 400

    processed_images: list[str] = []
    base_dir = Path(current_app.root_path)

    # Only uploaded screenshots are kept. A remote URL (or any other string) used to be stored
    # as-is and then loaded by every admin who opened the ticket: a tracking pixel anyone could plant.
    if not isinstance(raw_images, list):
        raw_images = []
    for img in raw_images[:MAX_BUG_REPORT_IMAGES]:
        if isinstance(img, str) and img.startswith("data:image"):
            saved_path = _save_base64_image(img, base_dir)
            if saved_path:
                processed_images.append(saved_path)

    new_report = BugReport(
        user_id=user_id,
        reporter_name=reporter_name,
        reporter_email=reporter_email,
        title=title,
        message=message,
        images_json=safe_json_dumps(processed_images, default_val="[]"),
        status="pending",
    )

    try:
        with transaction():
            db.session.add(new_report)


        report_dict = {
            "id": new_report.id,
            "title": new_report.title,
            "message": new_report.message,
            "status": new_report.status,
            "reporter_name": new_report.reporter_name,
            "reporter_email": new_report.reporter_email,
            "images": processed_images,
        }

        if site_settings.bug_report_discord_enabled():
            discord_webhook.announce_bug_report(report_dict)

        return jsonify({
            "message": "Bug report submitted successfully!",
            "report": BugReportResponse.model_validate(new_report).model_dump(),
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save bug report: {e}", exc_info=True)
        return jsonify({"error": "Internal server error while saving bug report."}), 500


def _owned_by(user: User) -> ColumnElement[bool]:
    """A report belongs to the account that filed it, and to nobody else.

    It used to be matched on `reporter_email` as well, but that address is not proof of anything: an
    unverified account, or one that just changed its email, could claim any guest's reports that
    way. Guest reports join an account only when its owner proves the address with a verification
    code (see `verify_email_code`), which sets `user_id`.
    """
    return BugReport.user_id == user.id


@bug_reports_bp.route("/bug-reports/my", methods=["GET"])
def get_my_bug_reports():
    """Retrieves the authenticated user's bug reports, paginated (newest first).

    Optional `page` (default 1) and `per_page` (default 10, max 50) query
    params keep the payload bounded even for a prolific reporter; omitting
    them still returns page 1 so existing callers keep working.
    """
    lang = extract_lang()
    user = get_current_user()
    if not user:
        return error_response("auth_required", 401, lang=lang)

    try:
        page, per_page = paginate_args(default_per_page=10, max_per_page=50, strict=True)
    except ValueError:
        return error_response("invalid_pagination", 400, lang=lang)

    try:
        owned = _owned_by(user)
        stmt = select(BugReport).where(owned).order_by(desc(BugReport.created_at), desc(BugReport.id))

        total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        unread_count = db.session.scalar(
            select(func.count()).select_from(BugReport).where(owned, BugReport.feedback_unread.is_(True))
        ) or 0
        paginated_stmt = stmt.offset((page - 1) * per_page).limit(per_page)
        reports = db.session.scalars(paginated_stmt).all()

        total_pages = max(1, (total + per_page - 1) // per_page)

        return jsonify({
            "reports": [BugReportResponse.model_validate(r).model_dump() for r in reports],
            "total": total,
            "unread_count": unread_count,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }), 200
    except Exception as e:
        logger.error(f"Error fetching user bug reports: {e}", exc_info=True)
        return error_response("bug_reports_fetch_failed", 500, lang=lang)


@bug_reports_bp.route("/bug-reports/<int:report_id>/seen", methods=["POST"])
def mark_bug_report_seen(report_id: int):
    lang = extract_lang()
    user = get_current_user()
    if not user:
        return error_response("auth_required", 401, lang=lang)

    report = db.session.scalar(select(BugReport).where(BugReport.id == report_id, _owned_by(user)))
    if not report:
        return error_response("bug_report_not_found", 404, lang=lang)

    if report.feedback_unread:
        try:
            with transaction():
                report.feedback_unread = False
        except Exception as e:
            logger.error(f"Error marking bug report #{report_id} as seen: {e}", exc_info=True)
            return error_response("bug_report_seen_failed", 500, lang=lang)
    return jsonify({"report": BugReportResponse.model_validate(report).model_dump()}), 200


@bug_reports_bp.route("/admin/bug-reports", methods=["GET"])
@admin_required
def admin_get_bug_reports():
    """Retrieves all bug reports with pagination and filtering for administrators."""
    page, per_page = paginate_args(default_per_page=15)
    status = request.args.get("status", "all").strip().lower()
    search = request.args.get("search", "").strip()

    stmt = select(BugReport)

    if status and status != "all":
        stmt = stmt.where(func.lower(BugReport.status) == status)

    if search:
        search_fmt = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(BugReport.title).like(search_fmt),
                func.lower(BugReport.message).like(search_fmt),
                func.lower(BugReport.reporter_name).like(search_fmt),
                func.lower(BugReport.reporter_email).like(search_fmt),
            )
        )

    stmt = stmt.order_by(desc(BugReport.created_at), desc(BugReport.id))

    total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    paginated_stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    reports = db.session.scalars(paginated_stmt).all()

    total_count, pending_count, in_progress_count, resolved_count, rejected_count = db.session.execute(
        select(
            func.count(BugReport.id),
            func.count(case((BugReport.status == "pending", 1))),
            func.count(case((BugReport.status == "in_progress", 1))),
            func.count(case((BugReport.status == "resolved", 1))),
            func.count(case((BugReport.status == "rejected", 1))),
        )
    ).one()
    stats = {
        "total": total_count or 0,
        "pending": pending_count or 0,
        "in_progress": in_progress_count or 0,
        "resolved": resolved_count or 0,
        "rejected": rejected_count or 0,
    }

    return jsonify({
        "reports": [BugReportResponse.model_validate(r).model_dump() for r in reports],
        "stats": stats,
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


@bug_reports_bp.route("/admin/bug-reports/<int:report_id>", methods=["PUT"])
@admin_required
def admin_update_bug_report(report_id: int):
    """Allows an administrator to update the status and notes of a bug report."""
    report = db.session.get(BugReport, report_id)
    if not report:
        return jsonify({"error": "Bug report not found."}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    admin_notes = data.get("admin_notes")

    if new_status:
        valid_statuses = ["pending", "in_progress", "resolved", "rejected"]
        if new_status.lower() not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of {valid_statuses}."}), 400

    try:
        with transaction():
            if new_status:
                report.status = new_status.lower()

            if admin_notes is not None and admin_notes.strip() != (report.admin_notes or ""):
                report.admin_notes = admin_notes.strip()
                report.feedback_unread = bool(report.admin_notes)

        log_admin_action(
            g.current_user.id,
            action="bug_report_updated",
            target_type="bug_report",
            target_id=report_id,
            details={"status": new_status} if new_status else None,
        )
        return jsonify({
            "message": f"Bug report #{report_id} updated successfully.",
            "report": BugReportResponse.model_validate(report).model_dump(),
        }), 200
    except Exception as e:
        logger.error(f"Error updating bug report #{report_id}: {e}")
        return jsonify({"error": "Failed to update bug report."}), 500


@bug_reports_bp.route("/admin/bug-reports/<int:report_id>", methods=["DELETE"])
@admin_required
def admin_delete_bug_report(report_id: int):
    """Allows an administrator to delete a bug report."""
    report = db.session.get(BugReport, report_id)
    if not report:
        return jsonify({"error": "Bug report not found."}), 404

    try:
        with transaction():
            db.session.delete(report)
        log_admin_action(g.current_user.id, action="bug_report_deleted", target_type="bug_report", target_id=report_id)
        return jsonify({"message": f"Bug report #{report_id} deleted."}), 200
    except Exception as e:
        logger.error(f"Error deleting bug report #{report_id}: {e}")
        return jsonify({"error": "Failed to delete bug report."}), 500

