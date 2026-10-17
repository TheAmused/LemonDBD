# backend/app/features/admin/routes.py
from app.routes.admin_control import admin_control_bp
from app.routes.admin_tools import admin_tools_bp
from app.routes.bug_reports import bug_reports_bp
from app.routes.changelog import changelog_bp

__all__ = ["admin_control_bp", "admin_tools_bp", "bug_reports_bp", "changelog_bp"]
