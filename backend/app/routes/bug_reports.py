# backend/app/routes/bug_reports.py
import base64
import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from curl_cffi import requests
from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import desc, func, or_, select

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.core.limiter import limiter, validate_honeypot
from app.core.security import admin_required, get_current_user
from app.models import BugReport
from app.schemas.community import BugReportResponse
from app.services.admin_control_service import log_admin_action

logger = logging.getLogger(__name__)

bug_reports_bp = Blueprint("bug_reports", __name__, url_prefix="/api/v1")


def _get_discord_webhook_url() -> str | None:
    """Retrieves Discord webhook URL from environment variables or app config."""
    env_url = os.getenv("DISCORD_WEBHOOK_URL")
    if env_url and env_url.strip():
        return env_url.strip()

    try:
        config_url = current_app.config.get("DISCORD_WEBHOOK_URL")
        if config_url and config_url.strip():
            return config_url.strip()
    except Exception:
        pass

    return None


def _save_base64_image(b64_data: str, base_dir: Path) -> str | None:
    """Decodes a base64 image payload and saves it to static uploads."""
    try:
        if "," in b64_data:
            header, encoded = b64_data.split(",", 1)
        else:
            header, encoded = "", b64_data

        ext = ".png"
        if "image/jpeg" in header or "image/jpg" in header:
            ext = ".jpg"
        elif "image/webp" in header:
            ext = ".webp"
        elif "image/gif" in header:
            ext = ".gif"

        upload_dir = base_dir / "static" / "uploads" / "bug_reports"
        upload_dir.mkdir(parents=True, exist_ok=True)

        filename = f"bug_{uuid.uuid4().hex[:12]}{ext}"
        filepath = upload_dir / filename

        image_bytes = base64.b64decode(encoded)
        filepath.write_bytes(image_bytes)

        return f"/static/uploads/bug_reports/{filename}"
    except Exception as err:
        logger.warning(f"Failed to decode and save base64 bug report image: {err}")
        return None


def _dispatch_discord_webhook(report_dict: dict[str, Any], webhook_url: str | None = None) -> None:
    """Dispatches an embed notification to Discord asynchronously."""
    target_webhook = webhook_url or _get_discord_webhook_url()
    if not target_webhook:
        logger.warning("[Discord Webhook] DISCORD_WEBHOOK_URL not configured. Skipping notification.")
        return

    def _send():
        report_id = report_dict.get("id", 0)
        try:
            status_colors = {
                "pending": 14423100,
                "in_progress": 16097035,
                "resolved": 1096065,
                "rejected": 6583371,
            }

            color = status_colors.get(report_dict.get("status", "pending"), 14423100)
            images = report_dict.get("images", [])

            fields = [
                {"name": "👤 Submitter", "value": f"`{report_dict.get('reporter_name', 'Guest')}`", "inline": True},
                {"name": "📧 Contact", "value": f"`{report_dict.get('reporter_email') or 'Not Provided'}`", "inline": True},
                {"name": "📂 Category", "value": f"`{report_dict.get('category', 'General')}`", "inline": True},
                {"name": "📌 Status", "value": f"**{str(report_dict.get('status', 'pending')).upper()}**", "inline": True},
                {"name": "🆔 Ticket ID", "value": f"#{report_id}", "inline": True},
                {"name": "🖼️ Attachments", "value": f"{len(images)} screenshot(s)", "inline": True},
            ]

            embed = {
                "title": f"🚨 [Bug Report #{report_id}] {report_dict.get('title', 'Untitled')[:200]}",
                "description": (report_dict.get("message") or "No description provided.")[:1900],
                "color": color,
                "fields": fields,
                "footer": {"text": "LemonDBD Bug Tracking System"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            payload = {
                "username": "LemonDBD Bug Watcher",
                "embeds": [embed],
            }

            resp = requests.post(
                target_webhook,
                json=payload,
                impersonate="chrome120",
                timeout=15,
                headers={"Content-Type": "application/json"},
            )
            logger.info(f"[Discord Webhook] Discord API responded with HTTP {resp.status_code}")
        except Exception as err:
            logger.error(f"[Discord Webhook] Error firing Discord webhook for report #{report_id}: {err}", exc_info=True)

    threading.Thread(target=_send, daemon=True).start()


@bug_reports_bp.route("/bug-reports", methods=["POST"])
@limiter.limit("15 per minute")
def submit_bug_report():
    """Submits a new bug report from authenticated users or guest players."""
    data = request.get_json(silent=True) or {}

    if not validate_honeypot(data):
        return jsonify({"error": "Spam detected.", "status": 400}), 400

    user = get_current_user()

    title = data.get("title", "").strip()
    message = data.get("message", "").strip()
    category = data.get("category", "General").strip()
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

    for img in raw_images:
        if isinstance(img, str):
            if img.startswith("data:image"):
                saved_path = _save_base64_image(img, base_dir)
                if saved_path:
                    processed_images.append(saved_path)
            elif img.startswith("http") or img.startswith("/static"):
                processed_images.append(img)

    new_report = BugReport(
        user_id=user_id,
        reporter_name=reporter_name,
        reporter_email=reporter_email,
        title=title,
        category=category,
        message=message,
        images_json=safe_json_dumps(processed_images, default_val="[]"),
        status="pending",
    )

    try:
        db.session.add(new_report)
        db.session.commit()

        report_dict = {
            "id": new_report.id,
            "title": new_report.title,
            "message": new_report.message,
            "category": new_report.category,
            "status": new_report.status,
            "reporter_name": new_report.reporter_name,
            "reporter_email": new_report.reporter_email,
            "images": processed_images,
        }

        _dispatch_discord_webhook(report_dict)

        return jsonify({
            "message": "Bug report submitted successfully! The team has been notified via Discord.",
            "report": BugReportResponse.model_validate(new_report).model_dump(),
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save bug report: {e}", exc_info=True)
        return jsonify({"error": "Internal server error while saving bug report."}), 500


@bug_reports_bp.route("/bug-reports/my", methods=["GET"])
def get_my_bug_reports():
    """Retrieves all bug reports submitted by the authenticated user."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    try:
        conditions = [BugReport.user_id == user.id]
        if user.email:
            conditions.append(func.lower(BugReport.reporter_email) == user.email.lower())
        if user.username:
            conditions.append(func.lower(BugReport.reporter_name) == user.username.lower())

        stmt = (
            select(BugReport)
            .where(or_(*conditions))
            .order_by(desc(BugReport.created_at))
        )
        reports = db.session.scalars(stmt).all()
        return jsonify({
            "reports": [BugReportResponse.model_validate(r).model_dump() for r in reports],
            "total": len(reports),
        }), 200
    except Exception as e:
        logger.error(f"Error fetching user bug reports: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch bug reports."}), 500


@bug_reports_bp.route("/admin/bug-reports", methods=["GET"])
@admin_required
def admin_get_bug_reports():
    """Retrieves all bug reports with pagination and filtering for administrators."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 15, type=int)
    status = request.args.get("status", "all").strip().lower()
    category = request.args.get("category", "all").strip()
    search = request.args.get("search", "").strip()

    stmt = select(BugReport)

    if status and status != "all":
        stmt = stmt.where(func.lower(BugReport.status) == status)

    if category and category != "all":
        stmt = stmt.where(func.lower(BugReport.category) == category.lower())

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

    stmt = stmt.order_by(desc(BugReport.created_at))

    total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    paginated_stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    reports = db.session.scalars(paginated_stmt).all()

    stats = {
        "total": db.session.scalar(select(func.count(BugReport.id))) or 0,
        "pending": db.session.scalar(select(func.count(BugReport.id)).where(BugReport.status == "pending")) or 0,
        "in_progress": db.session.scalar(select(func.count(BugReport.id)).where(BugReport.status == "in_progress")) or 0,
        "resolved": db.session.scalar(select(func.count(BugReport.id)).where(BugReport.status == "resolved")) or 0,
        "rejected": db.session.scalar(select(func.count(BugReport.id)).where(BugReport.status == "rejected")) or 0,
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
        report.status = new_status.lower()

    if admin_notes is not None:
        report.admin_notes = admin_notes.strip()

    try:
        db.session.commit()
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
        db.session.rollback()
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
        db.session.delete(report)
        db.session.commit()
        log_admin_action(g.current_user.id, action="bug_report_deleted", target_type="bug_report", target_id=report_id)
        return jsonify({"message": f"Bug report #{report_id} deleted."}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting bug report #{report_id}: {e}")
        return jsonify({"error": "Failed to delete bug report."}), 500
