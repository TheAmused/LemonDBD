# backend/tests/unit/test_file_length_guard.py
"""No file in `backend/` may be longer than 600 lines.

A file that long is doing more than one job, and the next change to it is a
bigger review than it needs to be. The rule covers every text file under
`backend/` -- application code, tests, scripts, migrations, config -- and counts
physical lines (what `wc -l` prints).

Not counted, because the line count says nothing about them:

* JSON under `app/seeds/data/`: seed data, one entry per object, never read as
  code. The seed files are *meant* to be long.
* Binary files (images, audio, fonts, SQLite databases) -- anything with a NUL
  byte in its first 8 KiB.
* Dependency and tool output: virtualenvs, caches, `__pycache__`, `node_modules`,
  `instance/` and the like.

When this fails, split the file. Do not raise the limit or add an exception here.
"""
import os
from pathlib import Path

import pytest

MAX_LINES = 600

BACKEND_ROOT = Path(__file__).resolve().parents[2]

#: Directories that hold dependencies or tool output, never project code.
SKIPPED_DIRS = frozenset(
    {
        ".git",
        ".venv",
        "venv",
        "env",
        "node_modules",
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
        ".ruff_cache",
        "htmlcov",
        "instance",
    }
)

#: Seed data lives here; its `.json` files are exempt (see the module docstring).
SEED_DATA_DIR = ("app", "seeds", "data")

_BINARY_SNIFF_BYTES = 8192


def _is_seed_json(relative: Path) -> bool:
    return relative.suffix.lower() == ".json" and relative.parts[: len(SEED_DATA_DIR)] == SEED_DATA_DIR


def _line_count(path: Path) -> int | None:
    """Physical lines in a text file, or None for a binary file."""
    data = path.read_bytes()
    if b"\0" in data[:_BINARY_SNIFF_BYTES]:
        return None
    return data.count(b"\n") + (1 if data and not data.endswith(b"\n") else 0)


def find_oversized(root: Path, limit: int = MAX_LINES) -> dict[str, int]:
    """Relative path -> line count for every counted file under `root` longer than `limit`."""
    oversized: dict[str, int] = {}
    for directory, subdirs, filenames in os.walk(root):
        subdirs[:] = [d for d in subdirs if d not in SKIPPED_DIRS]
        for filename in filenames:
            path = Path(directory) / filename
            relative = path.relative_to(root)
            if _is_seed_json(relative):
                continue
            lines = _line_count(path)
            if lines is not None and lines > limit:
                oversized[relative.as_posix()] = lines
    return oversized


@pytest.mark.unit
def test_no_backend_file_is_longer_than_the_limit() -> None:
    oversized = find_oversized(BACKEND_ROOT)
    report = "\n".join(f"  {lines:>5} lines  backend/{path}" for path, lines in sorted(oversized.items(), key=lambda kv: -kv[1]))
    assert not oversized, (
        f"{len(oversized)} backend file(s) are longer than {MAX_LINES} lines -- split them "
        f"(seed-data JSON is exempt):\n{report}"
    )


def _write_lines(path: Path, count: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("x = 1\n" * count, encoding="utf-8")


@pytest.mark.unit
def test_guard_flags_a_file_one_line_over_the_limit_and_passes_one_exactly_at_it(tmp_path: Path) -> None:
    _write_lines(tmp_path / "app" / "at_limit.py", MAX_LINES)
    _write_lines(tmp_path / "app" / "over_limit.py", MAX_LINES + 1)

    assert find_oversized(tmp_path) == {"app/over_limit.py": MAX_LINES + 1}


@pytest.mark.unit
def test_guard_counts_a_last_line_that_has_no_trailing_newline(tmp_path: Path) -> None:
    (tmp_path / "no_newline.py").write_text("x = 1\n" * MAX_LINES + "x = 2", encoding="utf-8")

    assert find_oversized(tmp_path) == {"no_newline.py": MAX_LINES + 1}


@pytest.mark.unit
def test_guard_covers_tests_scripts_and_other_non_python_files(tmp_path: Path) -> None:
    _write_lines(tmp_path / "tests" / "unit" / "test_big.py", MAX_LINES + 5)
    _write_lines(tmp_path / "scripts" / "big.sh", MAX_LINES + 5)
    _write_lines(tmp_path / "migrations" / "versions" / "0100_big.py", MAX_LINES + 5)
    _write_lines(tmp_path / "config" / "settings.json", MAX_LINES + 5)  # JSON outside the seed data still counts

    assert set(find_oversized(tmp_path)) == {
        "tests/unit/test_big.py",
        "scripts/big.sh",
        "migrations/versions/0100_big.py",
        "config/settings.json",
    }


@pytest.mark.unit
def test_guard_ignores_json_under_the_seed_data_directory_only(tmp_path: Path) -> None:
    _write_lines(tmp_path / "app" / "seeds" / "data" / "content" / "perks.json", MAX_LINES * 20)
    _write_lines(tmp_path / "app" / "seeds" / "data" / "smash_or_pass" / "rosters" / "canon.JSON", MAX_LINES * 20)
    _write_lines(tmp_path / "app" / "seeds" / "data" / "loader.py", MAX_LINES + 1)  # code next to the data still counts
    _write_lines(tmp_path / "app" / "seeds" / "other" / "table.json", MAX_LINES + 1)

    assert set(find_oversized(tmp_path)) == {"app/seeds/data/loader.py", "app/seeds/other/table.json"}


@pytest.mark.unit
def test_guard_ignores_binary_files_and_dependency_directories(tmp_path: Path) -> None:
    (tmp_path / "blob.db").write_bytes(b"SQLite\0" + b"\n" * (MAX_LINES * 2))
    _write_lines(tmp_path / ".venv" / "lib" / "huge.py", MAX_LINES * 2)
    _write_lines(tmp_path / "node_modules" / "pkg" / "index.js", MAX_LINES * 2)
    _write_lines(tmp_path / "app" / "__pycache__" / "x.py", MAX_LINES * 2)
    _write_lines(tmp_path / "instance" / "dump.sql", MAX_LINES * 2)

    assert find_oversized(tmp_path) == {}
