# backend/tests/guards/test_migration_revisions.py
"""Rules every Alembic revision must follow so `flask db upgrade` works on Postgres, not just SQLite."""
import re
from pathlib import Path

import pytest

VERSIONS = Path(__file__).resolve().parents[2] / "migrations" / "versions"
# alembic_version.version_num is VARCHAR(32) on Postgres; SQLite does not enforce it, so a longer id
# passes the sqlite-backed tests and then fails the upgrade when the container starts.
MAX_REVISION_LENGTH = 32

pytestmark = pytest.mark.unit


def _revisions() -> dict[str, str | None]:
    found: dict[str, str | None] = {}
    for path in sorted(VERSIONS.glob("*.py")):
        text = path.read_text(encoding="utf-8")
        revision = re.search(r'^revision\s*=\s*"([^"]+)"', text, re.M)
        if not revision:
            continue
        down = re.search(r'^down_revision\s*=\s*(?:"([^"]+)"|None)', text, re.M)
        found[revision.group(1)] = down.group(1) if down else None
    return found


def test_revision_ids_fit_the_alembic_version_column():
    too_long = {r: len(r) for r in _revisions() if len(r) > MAX_REVISION_LENGTH}
    assert too_long == {}


def test_the_migration_chain_has_exactly_one_head():
    revisions = _revisions()
    parents = {down for down in revisions.values() if down}
    heads = sorted(set(revisions) - parents)
    assert len(heads) == 1, heads
    assert parents <= set(revisions), "a revision points at a parent that does not exist"
