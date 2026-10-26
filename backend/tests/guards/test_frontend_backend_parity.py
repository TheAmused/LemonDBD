# backend/tests/guards/test_frontend_backend_parity.py
"""Lists the frontend keeps a copy of match the backend's.

The admin panel's backup picker used to send names the backend did not know ("characters",
"addons", ...). They were dropped without a word: a "full" backup had no survivors, killers,
add-ons or tier lists, and purge answered "success" for tables it never touched. These read the
frontend source as text, which is why they live in guards/ and not with the route tests.
"""
import re
from pathlib import Path

import pytest

from app.models.user import SHOWCASE_GRADE_RANKS, SHOWCASE_PLAYER_TITLES
from app.services.db.export_registry import NOT_PURGEABLE, PURGE_REQUIRES, SUPPORTED_EXPORT_TARGETS, TARGET_GROUPS

FRONTEND_SRC = Path(__file__).resolve().parents[3] / "frontend" / "src"
TARGETS_TS = FRONTEND_SRC / "components" / "scraper-config" / "scraperTargets.ts"
SHOWCASE_TS = FRONTEND_SRC / "types" / "userShowcase.ts"


def _ui_targets() -> list[tuple[str, str]]:
    """(id, category) of every entry in the frontend's ALL_TARGETS."""
    return re.findall(r"\{ id: '([a-z_]+)',.*?category: '([a-z]+)' \}", TARGETS_TS.read_text(encoding="utf-8"))


def test_the_frontend_picker_offers_exactly_the_backend_targets_in_the_same_groups() -> None:
    ui = _ui_targets()
    assert [target for target, _ in ui] == SUPPORTED_EXPORT_TARGETS
    assert {target: group for target, group in ui} == {t: g for g, targets in TARGET_GROUPS.items() for t in targets}


def test_the_frontend_purge_rules_match_the_backend() -> None:
    text = TARGETS_TS.read_text(encoding="utf-8")
    not_purgeable = re.search(r"NOT_PURGEABLE: readonly string\[\] = \[([^\]]*)\]", text).group(1)
    assert set(re.findall(r"'([a-z_]+)'", not_purgeable)) == set(NOT_PURGEABLE)
    requires_block = re.search(r"PURGE_REQUIRES[^=]*= \{(.*?)\};", text, re.S).group(1)
    ui_requires = {key: tuple(re.findall(r"'([a-z_]+)'", deps)) for key, deps in re.findall(r"([a-z_]+): \[([^\]]*)\]", requires_block)}
    assert ui_requires == PURGE_REQUIRES


def test_showcase_choices_match_the_frontend_lists() -> None:
    if not SHOWCASE_TS.exists():
        pytest.skip("frontend sources not available")
    text = SHOWCASE_TS.read_text(encoding="utf-8")

    def listed(name: str) -> tuple[str, ...]:
        body = re.search(rf"export const {name} = \[(.*?)\]", text, re.S).group(1)
        return tuple(re.findall(r"'([^']+)'", body))

    assert listed("PLAYER_TITLES") == SHOWCASE_PLAYER_TITLES
    assert listed("GRADE_EMBLEMS") == SHOWCASE_GRADE_RANKS
