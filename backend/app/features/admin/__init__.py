# backend/app/features/admin/__init__.py
from app.features.admin.routes import (
    admin_control_bp,
    bug_reports_bp,
    changelog_bp,
)

__all__ = ["admin_control_bp", "bug_reports_bp", "changelog_bp"]
