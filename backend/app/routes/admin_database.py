# backend/app/routes/admin_database.py
"""Admin backup routes: the target list, export, import and purge (on the admin_control blueprint)."""
import logging
from datetime import datetime, timezone
from typing import Any

from flask import Response, current_app, g, jsonify, request
from pydantic import ValidationError

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps, safe_json_loads
from app.core.limiter import limiter
from app.core.reauth import reauth_error
from app.core.redis_cache import bump_catalog_version
from app.core.security import admin_required
from app.routes.admin_control import admin_control_bp
from app.schemas.admin import PurgeDatabaseDTO
from app.services import bug_report_files
from app.services.admin_control_service import log_admin_action, purge_database_tables
from app.services.db.export_import import IMPORT_MODES, DatabaseExportImportService
from app.services.db.export_registry import (
    PURGE_REQUIRES,
    PURGEABLE_TARGETS,
    SUPPORTED_EXPORT_TARGETS,
    TARGET_GROUPS,
    unknown_targets,
)
from app.services.user.admin import fetch_admin_metrics
from app.utils.responses import api_error

logger = logging.getLogger(__name__)


@admin_control_bp.route("/database/targets", methods=["GET"])
@admin_required
def list_database_targets():
    """What export, import and purge accept: the target names by group, which can be purged, and
    which tables a purge needs alongside (the admin panel's pickers are checked against this)."""
    return jsonify({
        "groups": TARGET_GROUPS,
        "purgeable": PURGEABLE_TARGETS,
        "purge_requires": {key: list(deps) for key, deps in PURGE_REQUIRES.items()},
    }), 200


@admin_control_bp.route("/database/purge", methods=["POST"])
@limiter.limit("10 per minute")
@admin_required
def purge_database_tables_route():
    """Purge specific database entity tables on demand.

    Named `*_route` on purpose: it used to be called `purge_database_tables`, the same name as the
    service it imports, so the module-level name became this view and every purge called itself
    with an argument (500: "takes 0 positional arguments but 1 was given").
    """
    body = request.get_json(silent=True) or {}
    try:
        dto = PurgeDatabaseDTO.model_validate(body)
    except ValidationError as err:
        return api_error("No valid purge targets specified.", 400, details=err.errors())
    if err_resp := reauth_error(g.current_user, body):
        return err_resp

    try:
        purged = purge_database_tables(dto.targets)
    except ValueError as err:  # a name that can't be purged, or a missing dependent table
        return api_error(str(err), 400)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error purging database tables: {e}", exc_info=True)
        return api_error("The purge failed. Details are in the server log.", 500)

    if "bug_reports" in purged:
        # Their screenshots are public files: remove them now rather than at the nightly sweep.
        bug_report_files.sweep_orphans(grace_seconds=0)
    # Cached catalogs (characters, perks, maps) would otherwise keep serving purged rows for a day.
    bump_catalog_version()
    logger.info(f"Admin {g.current_user.login} purged tables: {purged}")
    log_admin_action(g.current_user.id, action="database_purged", target_type="database", details={"targets": purged})
    return jsonify({
        "status": "success",
        "message": f"Successfully purged tables: {', '.join(purged)}",
        "purged_tables": purged,
        "stats": fetch_admin_metrics(),
    }), 200


def _target_list(raw: Any) -> list[str] | None:
    """A list of target names from a JSON list or a comma-separated string; None for "everything"."""
    if raw is None or raw == "":
        return None
    if isinstance(raw, str):
        raw = raw.split(",")
    if not isinstance(raw, list):
        raise ValueError("targets must be a list of names.")
    names = [str(item).strip() for item in raw if str(item).strip()]
    return names or None


@admin_control_bp.route("/database/export", methods=["POST"])
@limiter.limit("6 per minute")
@admin_required
def export_database():
    """Export complete or selective database entities as a JSON download.

    A POST, not a GET: a GET could be started by an `<img>` in reported content or by a link from
    another site (the session cookie is SameSite=Lax), and every export copies all password hashes.
    Body: ``{"targets": [...], "include_assets": true}``; no targets means everything.
    """
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return api_error("Invalid JSON body", 400)
    try:
        targets = _target_list(body.get("targets"))
    except ValueError as err:
        return api_error(str(err), 400)
    if targets and (unknown := unknown_targets(targets, SUPPORTED_EXPORT_TARGETS)):
        return api_error(f"Unknown export target(s): {', '.join(unknown)}.", 400)
    include_assets = body.get("include_assets", True) is not False

    try:
        data = DatabaseExportImportService.export_database(targets=targets, include_assets=include_assets)
    except Exception as e:
        logger.error(f"Database export error: {e}", exc_info=True)
        return api_error("The export failed. Details are in the server log.", 500)

    # The export holds every account's password hash: who took one, and of what, is on record.
    log_admin_action(
        g.current_user.id,
        action="database_exported",
        target_type="database",
        details={"targets": targets or "all", "include_assets": include_assets},
    )
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Response(
        safe_json_dumps(data),
        mimetype="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="lemondbd_backup_{timestamp}.json"',
            "Cache-Control": "no-store",
        },
    )


@admin_control_bp.route("/database/import", methods=["POST"])
@limiter.limit("6 per minute")
@admin_required
def import_database():
    """Import database entities from an uploaded .json file (multipart) or a JSON body.

    A backup with its images is far larger than the site-wide upload cap, so this route alone (admin
    only, checked above before anything is read) accepts up to DATABASE_IMPORT_MAX_MB.
    """
    request.max_content_length = int(current_app.config.get("DATABASE_IMPORT_MAX_MB", 512)) * 1024 * 1024

    uploaded = request.files.get("file")
    body: dict[str, Any] = {}
    if uploaded is None:
        parsed = request.get_json(silent=True)
        if (parsed is None and request.get_data(cache=True)) or (parsed is not None and not isinstance(parsed, dict)):
            return api_error("Invalid JSON payload: root must be an object.", 400)
        body = parsed or {}
    fields: dict[str, Any] = request.form.to_dict() if uploaded is not None else body

    # An import can rewrite accounts in bulk: the acting admin re-authenticates first.
    if err_resp := reauth_error(g.current_user, fields):
        return err_resp

    mode = fields.get("mode") or request.args.get("mode") or "merge"
    if mode not in IMPORT_MODES:
        return api_error("mode must be 'merge' or 'replace'.", 400)
    try:
        targets = _target_list(fields.get("targets", request.args.get("targets")))
    except ValueError as err:
        return api_error(str(err), 400)
    if targets and (unknown := unknown_targets(targets, SUPPORTED_EXPORT_TARGETS)):
        return api_error(f"Unknown import target(s): {', '.join(unknown)}.", 400)

    if uploaded is not None:
        if not uploaded.filename:
            return api_error("Uploaded file is empty.", 400)
        try:
            payload = safe_json_loads(uploaded.read().decode("utf-8"))
        except Exception:
            return api_error("The file is not valid JSON.", 400)
    else:
        payload = body.get("data", body)

    if not payload or not isinstance(payload, dict):
        return api_error("No valid JSON payload provided for import.", 400)

    try:
        result = DatabaseExportImportService.import_database(payload=payload, mode=mode, targets=targets)
    except ValueError as err:
        return api_error(str(err), 400)
    except Exception as e:
        logger.error(f"Database import error: {e}", exc_info=True)
        return api_error("The import failed and nothing was changed. Details are in the server log.", 500)

    logger.info(f"Admin {g.current_user.login} imported database (mode={mode}): {result.get('summary')}")
    log_admin_action(
        g.current_user.id,
        action="database_imported",
        target_type="database",
        details={"mode": mode, "targets": targets or "all", "summary": result.get("summary")},
    )
    return jsonify(result), 200
