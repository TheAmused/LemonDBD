# backend/app/routes/admin_tools.py
"""Admin "Tools": live system status, run-now maintenance jobs and delivery tests (email, Discord)."""
import logging

from flask import Blueprint, g, jsonify

from app.core.limiter import limiter
from app.core.security import admin_required
from app.services import discord_webhook
from app.services.admin_control_service import log_admin_action
from app.services.mail_service import send_test_email
from app.services.maintenance_jobs import JOB_BY_KEY, JOBS, JobBusyError, last_runs, run_locked
from app.services.system_status import system_checks
from app.utils.responses import api_error

logger = logging.getLogger(__name__)

admin_tools_bp = Blueprint("admin_tools", __name__, url_prefix="/api/v1/admin")


@admin_tools_bp.route("/system", methods=["GET"])
@admin_required
def system_status():
    return jsonify({"checks": system_checks()}), 200


@admin_tools_bp.route("/maintenance", methods=["GET"])
@admin_required
def list_maintenance_jobs():
    """Every job, with when it last ran (and how many records it touched) if it ever did."""
    runs = last_runs()
    return jsonify({"jobs": [{"key": job.key, "last_run": runs.get(job.key)} for job in JOBS]}), 200


@admin_tools_bp.route("/maintenance/<string:key>", methods=["POST"])
@limiter.limit("20 per minute")
@admin_required
def run_maintenance_job(key: str):
    """Run one housekeeping job now (the same code the scheduler runs); answers how many records it touched."""
    job = JOB_BY_KEY.get(key)
    if job is None:
        return api_error(f"Unknown maintenance job '{key}'.", 404)
    try:
        affected = run_locked(job)
    except JobBusyError:
        return api_error("This job is already running. Try again in a moment.", 409)
    except Exception as err:
        logger.error("Maintenance job %s failed: %s", key, err, exc_info=True)
        return api_error("The job failed. Details are in the server log.", 500)

    log_admin_action(g.current_user.id, action="maintenance_run", target_type="maintenance", target_id=key, details={"affected": affected})
    return jsonify({"key": key, "affected": affected, "last_run": last_runs().get(key)}), 200


@admin_tools_bp.route("/diagnostics/email", methods=["POST"])
@limiter.limit("5 per minute")
@admin_required
def send_diagnostic_email():
    """Send a test message to the signed-in admin's own address."""
    admin = g.current_user
    try:
        send_test_email(admin)
    except Exception as err:
        logger.warning("Test email to admin %s failed: %s", admin.id, err)
        return api_error(f"Sending failed: {err}", 502)
    return jsonify({"sent_to": admin.email}), 200


@admin_tools_bp.route("/diagnostics/discord", methods=["POST"])
@limiter.limit("5 per minute")
@admin_required
def send_diagnostic_discord():
    """Post a test notification to the bug-report Discord webhook."""
    url = discord_webhook.webhook_url()
    if not url:
        return api_error("No Discord webhook is configured (DISCORD_WEBHOOK_URL).", 409)
    try:
        status = discord_webhook.post_embed(discord_webhook.diagnostic_embed(g.current_user.login), url)
    except Exception as err:
        logger.warning("Test Discord notification failed: %s", err)
        return api_error(f"Sending failed: {err}", 502)
    if status >= 300:
        return api_error(f"Discord answered HTTP {status}.", 502)
    return jsonify({"status": status}), 200
