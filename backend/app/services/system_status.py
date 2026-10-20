# backend/app/services/system_status.py
"""What the admin "System status" card shows: each dependency's real state, read on demand.

States: "ok" (working / switched on), "warn" (working in a degraded mode), "off" (not configured or
switched off on purpose), "error" (configured but failing). `detail` is a technical identifier
(engine, provider); `latency_ms` is set for the database ping and `last_run_at` for the scheduler,
which runs in its own process and is only visible through the runs it records.
"""
import time
from datetime import datetime, timezone
from typing import Any

from flask import current_app
from sqlalchemy import text

from app.core import redis_cache
from app.core.extensions import db
from app.services import discord_webhook, scoreboard_ocr, site_settings
from app.services.maintenance_jobs import SCHEDULER_STALE_AFTER, last_scheduled_run
from app.utils.privacy_info import mail_provider_name


def _check(key: str, state: str, detail: str | None = None, **extra: Any) -> dict[str, Any]:
    return {"key": key, "state": state, "detail": detail or None, **extra}


def _database() -> dict[str, Any]:
    started = time.perf_counter()
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        db.session.rollback()
        return _check("database", "error", db.engine.dialect.name)
    latency = round((time.perf_counter() - started) * 1000, 1)
    return _check("database", "ok", db.engine.dialect.name, latency_ms=latency)


def _scheduler() -> dict[str, Any]:
    """Alive when a scheduled job ran within the hour (one of them runs every few minutes)."""
    last = last_scheduled_run()
    if last is None:
        return _check("scheduler", "off")
    fresh = datetime.now(timezone.utc) - last <= SCHEDULER_STALE_AFTER
    return _check("scheduler", "ok" if fresh else "warn", last_run_at=last.isoformat())


def _switch(key: str, enabled: bool, detail: str | None = None) -> dict[str, Any]:
    return _check(key, "ok" if enabled else "off", detail)


#: `detail` of a check that works but is switched off in Settings (the panel names it in words).
SWITCHED_OFF = "switched_off"


def _admin_switched(check: dict[str, Any], enabled: bool) -> dict[str, Any]:
    """Off, and why, when the admin switch is off: it used to say "ok" while the feature was disabled."""
    if enabled or check["state"] == "error":
        return check
    return {**check, "state": "off", "detail": SWITCHED_OFF}


def system_checks() -> list[dict[str, Any]]:
    cfg = current_app.config
    mail_configured = bool(cfg.get("MAIL_USERNAME") and cfg.get("MAIL_PASSWORD"))
    cache_backend = redis_cache.stats()["backend"]
    return [
        _database(),
        _check("cache", "ok" if cache_backend == "redis" else "warn", cache_backend),
        _switch("mail", mail_configured, mail_provider_name(cfg.get("MAIL_SERVER", "")) if mail_configured else None),
        _admin_switched(_switch("discord", discord_webhook.webhook_url() is not None), site_settings.bug_report_discord_enabled()),
        _admin_switched(_switch("ocr", scoreboard_ocr.engine_available()), site_settings.scoreboard_ocr_enabled()),
        _scheduler(),
        _switch("email_verification", site_settings.email_verification_required()),
        _switch("altcha", site_settings.altcha_enforced()),
        _switch("ban_list", bool(cfg.get("BAN_LIST_ENABLED", False))),
    ]
