# backend/tests/unit/test_audit_labels_guard.py
"""Every audit action and target type the backend writes has a label and a category in the admin panel.

Several did not (tier list, roster and minigame deletions, the changelog's Discord announcements,
minigame challenges): they showed up as raw keys and under "All" only.
"""
import re
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[2] / "app"
AUDIT_TSX = Path(__file__).resolve().parents[3] / "frontend" / "src" / "components" / "admin" / "AdminAuditSection.tsx"


def _backend_actions_and_targets() -> tuple[set[str], set[str]]:
    actions: set[str] = set()
    targets: set[str] = set()
    for path in APP.rglob("*.py"):
        if "__pycache__" in path.parts or "services/db" in path.as_posix():
            continue  # the importer copies rows; it writes no action of its own
        text = path.read_text(encoding="utf-8")
        for expr in re.findall(r"action=([^,)\n]+)", text):
            actions.update(re.findall(r'"([a-z_.]+)"', expr))
        actions.update(re.findall(r'log_admin_action\(\s*g\.current_user\.id,\s*"([a-z_.]+)"', text))
        actions.update(re.findall(r'_audit\(\s*admin,\s*"([a-z_.]+)"', text))
        for mapping in re.findall(r'\{"warning": "([a-z_]+)", "suspension": "([a-z_]+)", "ban": "([a-z_]+)"\}', text):
            actions.update(mapping)
        targets.update(re.findall(r'target_type="([a-z_]+)"', text))
    return actions, targets


@pytest.mark.unit
def test_every_backend_audit_action_has_a_label() -> None:
    labelled = set(re.findall(r"^\s*'?([a-z_.]+)'?: 'auditAction", AUDIT_TSX.read_text(encoding="utf-8"), re.M))
    actions, _ = _backend_actions_and_targets()
    assert actions, "the scan found no audit actions"
    assert sorted(actions - labelled) == []


@pytest.mark.unit
def test_every_backend_target_type_has_a_label_and_a_category() -> None:
    text = AUDIT_TSX.read_text(encoding="utf-8")
    labelled = set(re.findall(r"^\s*([a-z_]+): 'auditTarget", text, re.M))
    categories = re.search(r"const CATEGORIES = \{(.*?)\} as const", text, re.S).group(1)
    categorised = set(re.findall(r"'([a-z_]+)'", categories))
    _, targets = _backend_actions_and_targets()
    assert sorted(targets - labelled) == []
    assert sorted(targets - categorised) == []
