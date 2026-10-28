# backend/tests/guards/test_route_rules.py
"""Rules every route module follows, checked on the source: no view function shadows a name it
imports, and request limits come from the admin-editable settings."""
import ast
import inspect
import re
from pathlib import Path

import pytest

from app.routes import auth, auth_google, auth_two_factor, bug_reports, content_moderation, scoreboard

ROUTES = Path(__file__).resolve().parents[2] / "app" / "routes"


@pytest.mark.parametrize("module", sorted(ROUTES.glob("*.py")), ids=lambda p: p.name)
def test_no_view_function_shadows_an_import(module: Path) -> None:
    tree = ast.parse(module.read_text(encoding="utf-8"))
    imported = {
        (alias.asname or alias.name).split(".")[0]
        for node in tree.body
        if isinstance(node, (ast.Import, ast.ImportFrom))
        for alias in node.names
    }
    defined = {node.name for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))}
    assert not imported & defined, f"{module.name} redefines imported name(s): {sorted(imported & defined)}"


def test_every_email_code_endpoint_has_a_request_limit() -> None:
    """verify-email and resend-verification had none, so no Abuse-limit setting covered them."""
    source = inspect.getsource(auth)
    for path in ("/verify-email", "/resend-verification", "/forgot-password", "/reset-password"):
        block = re.search(rf'@auth_bp.route\("{re.escape(path)}".*?\ndef ', source, re.S).group(0)
        assert 'per_minute("rate_recovery_per_minute")' in block, path


def test_routes_use_the_dynamic_provider() -> None:
    for module in (auth, auth_google, auth_two_factor, bug_reports, content_moderation, scoreboard):
        assert "per_minute(" in inspect.getsource(module), module.__name__
