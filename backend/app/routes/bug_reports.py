# backend/app/routes/bug_reports.py
import base64
import logging
import mimetypes
import uuid

from flask import Blueprint, g, jsonify, request, send_file
from pydantic import ValidationError
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
from app.utils.responses import api_error
from app.utils.lang import extract_lang
from app.utils.pagination import paginate_args
from app.schemas.community import BugReportResponse, BugReportSubmitDTO
from app.services import bug_report_files, discord_webhook, site_settings
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
#: The reply the reporter reads on their profile.
MAX_ADMIN_NOTES_LENGTH = 5000


def _save_base64_image(b64_data: str) -> str | None:
    """Decode one screenshot, check it really is an image, and store a re-encoded WebP copy.

    The bytes used to be written as sent under whatever extension the header claimed, so a guest
    could host any file on this domain. Now only something Pillow can decode is kept, at most
    `MAX_BUG_REPORT_IMAGE_BYTES` and `MAX_BUG_REPORT_IMAGE_PIXELS`, re-encoded (which also drops
    metadata such as GPS tags), in the private attachment folder (bug_report_files). Returns the
    stored path (the attachment route), or None when the payload is refused.
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

            upload_dir = bug_report_files.upload_dir()
            upload_dir.mkdir(parents=True, exist_ok=True)
            filename = f"bug_{uuid.uuid4().hex[:12]}.webp"
            frame.save(upload_dir / filename, format="WEBP", quality=85, method=4)

        return bug_report_files.attachment_path(filename)
    except Exception as err:
        logger.warning(f"Refused a bug report screenshot that is not a readable image: {err}")
        return None


def _reporter(user: User | None, dto: BugReportSubmitDTO) -> tuple[str, str | None, int | None]:
    """(name, e-mail, user id) for the report: the account's own, or what a guest typed."""
    if user:
        return user.username, user.email, user.id
    return dto.reporter_name or "Guest Player", dto.reporter_email, None


def _store_screenshots(raw_images: list[object]) -> list[str]:
    """Store the uploaded screenshots (at most MAX_BUG_REPORT_IMAGES) and return their paths.

    Only uploaded screenshots are kept. A remote URL (or any other string) used to be stored
    as-is and then loaded by every admin who opened the ticket: a tracking pixel anyone could plant.
    """
    stored: list[str] = []
    for img in raw_images[:MAX_BUG_REPORT_IMAGES]:
        if isinstance(img, str) and img.startswith("data:image"):
            saved_path = _save_base64_image(img)
            if saved_path:
                stored.append(saved_path)
    return stored


def _announce(report: BugReport, images: list[str]) -> None:
    if site_settings.bug_report_discord_enabled():
        discord_webhook.announce_bug_report({
            "id": report.id,
            "title": report.title,
            "message": report.message,
            "status": report.status,
            "reporter_name": report.reporter_name,
            "reporter_email": report.reporter_email,
            "images": images,
        })


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

    try:
        dto = BugReportSubmitDTO.model_validate(data)
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors(include_url=False, include_context=False))
    if not dto.title or not dto.message:
        return jsonify({"error": "Title and description are required."}), 400
    reporter_name, reporter_email, user_id = _reporter(user, dto)
    if not user and not reporter_email:
        return jsonify({"error": "Email address is required for guest bug reports."}), 400

    report = BugReport(
        user_id=user_id,
        reporter_name=reporter_name,
        reporter_email=reporter_email,
        title=dto.title,
        message=dto.message,
        status="pending",
    )
    return _save_report(report, _store_screenshots(dto.images))


def _save_report(report: BugReport, images: list):
    """Saves a new report and announces it; a failed save deletes the screenshots already stored."""
    report.images_json = safe_json_dumps(images, default_val="[]")
    try:
        with transaction():
            db.session.add(report)
        _announce(report, images)
        return jsonify({
            "message": "Bug report submitted successfully!",
            "report": BugReportResponse.model_validate(report).model_dump(),
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save bug report: {e}", exc_info=True)
        bug_report_files.delete_files(images)
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
        return jsonify(_my_reports_page(user, page, per_page)), 200
    except Exception as e:
        logger.error(f"Error fetching user bug reports: {e}", exc_info=True)
        return error_response("bug_reports_fetch_failed", 500, lang=lang)


def _my_reports_page(user: User, page: int, per_page: int) -> dict:
    """One page of the user's reports (newest first) with the total and unread counts."""
    owned = _owned_by(user)
    stmt = select(BugReport).where(owned).order_by(desc(BugReport.created_at), desc(BugReport.id))
    total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    unread_count = db.session.scalar(
        select(func.count()).select_from(BugReport).where(owned, BugReport.feedback_unread.is_(True))
    ) or 0
    reports = db.session.scalars(stmt.offset((page - 1) * per_page).limit(per_page)).all()
    return {
        "reports": [BugReportResponse.model_validate(r).model_dump() for r in reports],
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    }


@bug_reports_bp.route("/bug-reports/attachments/<name>", methods=["GET"])
@limiter.limit("240 per minute")
def get_bug_report_attachment(name: str):
    """One screenshot, for an admin or for the account that filed the report it belongs to.

    Anyone else gets the same 404 as for a name that does not exist, so a guessed name reveals
    nothing. Sent `private` so no shared cache keeps a copy.
    """
    user = get_current_user()
    if not user:
        return error_response("auth_required", 401, lang=extract_lang())
    not_found = (jsonify({"error": "Not found", "status": 404}), 404)
    if not bug_report_files.NAME_PATTERN.match(name):
        return not_found
    # `name` is a validated hex file name, so it cannot carry LIKE wildcards.
    references = BugReport.images_json.contains(name)
    visible = references if user.role == "admin" else (references & _owned_by(user))
    if db.session.scalar(select(BugReport.id).where(visible).limit(1)) is None:
        return not_found
    path = bug_report_files.stored_file(name)
    if path is None:
        return not_found
    mimetype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    response = send_file(path, mimetype=mimetype, conditional=True, max_age=3600)
    response.headers["Cache-Control"] = "private, max-age=3600"
    return response


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


BUG_REPORT_STATUSES = ("pending", "in_progress", "resolved", "rejected")


def _admin_report_filter(status: str, search: str) -> list[ColumnElement[bool]]:
    """WHERE clauses for the admin list: one status (or all) and a case-insensitive text search."""
    clauses: list[ColumnElement[bool]] = []
    if status and status != "all":
        clauses.append(func.lower(BugReport.status) == status)
    if search:
        pattern = f"%{search.lower()}%"
        clauses.append(
            or_(
                func.lower(BugReport.title).like(pattern),
                func.lower(BugReport.message).like(pattern),
                func.lower(BugReport.reporter_name).like(pattern),
                func.lower(BugReport.reporter_email).like(pattern),
            )
        )
    return clauses


def _status_counts() -> dict[str, int]:
    """How many reports there are in total and per status, in one query."""
    row = db.session.execute(
        select(
            func.count(BugReport.id),
            *(func.count(case((BugReport.status == status, 1))) for status in BUG_REPORT_STATUSES),
        )
    ).one()
    total, *per_status = row
    return {"total": total or 0, **{status: count or 0 for status, count in zip(BUG_REPORT_STATUSES, per_status)}}


@bug_reports_bp.route("/admin/bug-reports", methods=["GET"])
@admin_required
def admin_get_bug_reports():
    """Retrieves all bug reports with pagination and filtering for administrators."""
    page, per_page = paginate_args(default_per_page=15)
    status = request.args.get("status", "all").strip().lower()
    search = request.args.get("search", "").strip()

    stmt = (
        select(BugReport)
        .where(*_admin_report_filter(status, search))
        .order_by(desc(BugReport.created_at), desc(BugReport.id))
    )
    total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    reports = db.session.scalars(stmt.offset((page - 1) * per_page).limit(per_page)).all()

    return jsonify({
        "reports": [BugReportResponse.model_validate(r).model_dump() for r in reports],
        "stats": _status_counts(),
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


def _admin_update_problem(new_status: object, admin_notes: object) -> str | None:
    """Why an admin update body is invalid, or None.

    Checked before use: a number or a list here used to be a 500 (AttributeError on .lower())."""
    if new_status is not None and not isinstance(new_status, str):
        return "status must be a string."
    if admin_notes is not None and not isinstance(admin_notes, str):
        return "admin_notes must be a string."
    if isinstance(admin_notes, str) and len(admin_notes) > MAX_ADMIN_NOTES_LENGTH:
        return f"admin_notes must be at most {MAX_ADMIN_NOTES_LENGTH} characters."
    if new_status and new_status.lower() not in BUG_REPORT_STATUSES:
        return f"Invalid status. Must be one of {list(BUG_REPORT_STATUSES)}."
    return None


@bug_reports_bp.route("/admin/bug-reports/<int:report_id>", methods=["PUT"])
@admin_required
def admin_update_bug_report(report_id: int):
    """Allows an administrator to update the status and notes of a bug report."""
    report = db.session.get(BugReport, report_id)
    if not report:
        return jsonify({"error": "Bug report not found."}), 404

    data = request.get_json(silent=True)
    data = data if isinstance(data, dict) else {}
    new_status, admin_notes = data.get("status"), data.get("admin_notes")
    if problem := _admin_update_problem(new_status, admin_notes):
        return jsonify({"error": problem}), 400

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
        logger.error(f"Error updating bug report #{report_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to update bug report."}), 500


@bug_reports_bp.route("/admin/bug-reports/<int:report_id>", methods=["DELETE"])
@admin_required
def admin_delete_bug_report(report_id: int):
    """Allows an administrator to delete a bug report."""
    report = db.session.get(BugReport, report_id)
    if not report:
        return jsonify({"error": "Bug report not found."}), 404

    images = report.images
    try:
        with transaction():
            db.session.delete(report)
        # The screenshots are public files: they go with the report (after the commit, so a failed
        # delete never leaves a report pointing at missing files).
        bug_report_files.delete_files(images)
        log_admin_action(g.current_user.id, action="bug_report_deleted", target_type="bug_report", target_id=report_id)
        return jsonify({"message": f"Bug report #{report_id} deleted."}), 200
    except Exception as e:
        logger.error(f"Error deleting bug report #{report_id}: {e}")
        return jsonify({"error": "Failed to delete bug report."}), 500

