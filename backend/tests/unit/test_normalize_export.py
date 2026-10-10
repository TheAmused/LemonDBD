# backend/tests/unit/test_normalize_export.py
"""The seed-normalizing script's package must import on its own and leave converted seed data alone."""
import pytest

from scripts.normalize_export.bootstrap import DEFAULT_CONTENT_DIR
from scripts.normalize_export.convert import normalize


@pytest.mark.unit
def test_normalize_export_is_importable_as_a_package() -> None:
    """The phases use relative imports, so tests (and other tools) can import them without a sys.path hack."""
    assert DEFAULT_CONTENT_DIR.is_dir()
    assert callable(normalize)


@pytest.mark.unit
def test_dry_run_over_the_committed_seed_content_is_a_no_op() -> None:
    """Seed files are already normalized, so a dry run must resolve every foreign key and drop nothing."""
    stats = normalize(DEFAULT_CONTENT_DIR, dry=True)

    assert stats["integrity"] == "every foreign key resolves; no duplicate ids"
    assert stats["chapters"]["dropped_cosmetic_dlc"] == 0
    # Already-converted rows carry nothing to move, promote or collapse.
    assert stats["translation_entries_moved_to_parent"] == 0
    assert stats["english_promoted_to_column"] == 0
    assert stats["duplicate_translation_entries_dropped"] == 0
    assert "unresolved_addon_targets" not in stats
