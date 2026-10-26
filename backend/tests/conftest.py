# backend/tests/conftest.py
import os
from pathlib import Path

import pytest

os.environ.setdefault("TESTING", "True")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

TESTS_DIR = Path(__file__).resolve().parent

#: Folder -> marker. The tier of a test is where it lives, so `-m unit` / `-m live` / `-m workflow`
#: select exactly the folders and nobody has to remember a decorator.
#: (`pytestmark` in a conftest.py is ignored by pytest; this hook is the way to mark by folder.)
FOLDER_MARKERS = (
    (TESTS_DIR / "unit", "unit"),
    (TESTS_DIR / "live", "live"),
    (TESTS_DIR / "live" / "workflows", "workflow"),
)


def pytest_configure(config: pytest.Config) -> None:
    """Configure custom pytest markers and test environment flags."""
    config.addinivalue_line("markers", "unit: isolated in-memory unit test (everything under tests/unit)")
    config.addinivalue_line("markers", "live: runs against a PostgreSQL copy of dbd_db (everything under tests/live)")
    config.addinivalue_line("markers", "workflow: multi-step end-to-end workflow (tests/live/workflows)")


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    for item in items:
        path = Path(str(item.fspath)).resolve()
        for folder, marker in FOLDER_MARKERS:
            if folder in path.parents:
                item.add_marker(marker)
