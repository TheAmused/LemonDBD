# backend/tests/unit/api/test_admin_purge.py
"""Admin purge works end to end, and no route module shadows a name it imports."""
import ast
from pathlib import Path

import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import Perk, User
from tests.unit.conftest import make_survivor

ROUTES = Path(__file__).resolve().parents[3] / "app" / "routes"


@pytest.mark.unit
def test_purge_succeeds_and_empties_the_target(client: FlaskClient, db_session) -> None:
    admin = User(login="boss", username="boss", email="boss@example.com", password_hash=hash_password("password123"), role="admin", is_verified=True)
    db.session.add(admin)
    meg = make_survivor(db_session, "Meg Thomas", id=2)
    db.session.add(Perk(name="Sprint Burst", role="Survivor", survivor_id=meg.id))
    db.session.commit()

    res = client.post(
        "/api/v1/admin/database/purge",
        json={"targets": ["perks"]},
        headers={"Authorization": f"Bearer {generate_token(admin.id, role='admin')}"},
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["purged_tables"] == ["perks"]
    assert db.session.query(Perk).count() == 0


@pytest.mark.unit
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
