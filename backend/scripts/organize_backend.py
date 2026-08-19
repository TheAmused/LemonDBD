#!/usr/bin/env python3
# backend/scripts/organize_backend.py
"""
Backend Structural Refactoring Script
- Groups core files into app/core/ (config.py, extensions.py, security.py)
- Organizes flat tests/ into tests/unit/, tests/api/, and tests/scrapers/
- Moves root-level CLI scripts into scripts/
- Automatically scans and updates import statements across all .py files
"""

import os
import re
import shutil
from pathlib import Path


def find_backend_dir() -> Path:
    """Locate the backend directory based on current execution path."""
    current = Path.cwd()
    if (current / "backend").is_dir() and (current / "backend" / "app").is_dir():
        return current / "backend"
    if (current / "app").is_dir() and (current / "tests").is_dir():
        return current
    raise FileNotFoundError(
        "Could not locate 'backend' directory. Run this script from the project root or inside 'backend/'."
    )


def ensure_init(directory: Path) -> None:
    """Ensure a directory has an __init__.py file to remain a valid package."""
    init_file = directory / "__init__.py"
    if not init_file.exists():
        init_file.write_text("", encoding="utf-8")
        print(f"[Created] {init_file}")


def move_file(source: Path, destination: Path) -> bool:
    """Move a file safely if the source exists."""
    if not source.exists():
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(destination))
    print(f"[Moved] {source} -> {destination}")
    return True


def categorize_test_file(filename: str) -> str:
    """Classify test files into api, scrapers, or unit buckets."""
    lower_name = filename.lower()
    if "route" in lower_name:
        return "api"
    if "scraper" in lower_name or "wikigg" in lower_name:
        return "scrapers"
    return "unit"


def update_imports_in_file(file_path: Path) -> None:
    """Update legacy import references inside a single python file using regex."""
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return

    original_content = content

    replacements = [
        # Absolute imports: config
        (r"\bfrom\s+app\.config\b", "from app.core.config"),
        (r"\bimport\s+app\.config\b", "import app.core.config"),
        # Absolute imports: extensions
        (r"\bfrom\s+app\.extensions\b", "from app.core.extensions"),
        (r"\bimport\s+app\.extensions\b", "import app.core.extensions"),
        # Absolute imports: auth_helper -> security
        (r"\bfrom\s+app\.utils\.auth_helper\b", "from app.core.security"),
        (r"\bimport\s+app\.utils\.auth_helper\b", "import app.core.security"),
        (
            r"\bfrom\s+app\.utils\s+import\s+auth_helper\b",
            "from app.core import security as auth_helper",
        ),
        # Relative imports: single dot (.config, .extensions, .utils.auth_helper)
        (r"\bfrom\s+\.config\b", "from app.core.config"),
        (r"\bfrom\s+\.extensions\b", "from app.core.extensions"),
        (r"\bfrom\s+\.utils\.auth_helper\b", "from app.core.security"),
        (
            r"\bfrom\s+\.utils\s+import\s+auth_helper\b",
            "from app.core import security as auth_helper",
        ),
        # Relative imports: double dot (..config, ..extensions, ..utils.auth_helper)
        (r"\bfrom\s+\.\.config\b", "from app.core.config"),
        (r"\bfrom\s+\.\.extensions\b", "from app.core.extensions"),
        (r"\bfrom\s+\.\.utils\.auth_helper\b", "from app.core.security"),
        (
            r"\bfrom\s+\.\.utils\s+import\s+auth_helper\b",
            "from app.core import security as auth_helper",
        ),
    ]

    for pattern, substitution in replacements:
        content = re.sub(pattern, substitution, content)

    if content != original_content:
        file_path.write_text(content, encoding="utf-8")
        print(f"[Updated Imports] {file_path}")


def main() -> None:
    backend_dir = find_backend_dir()
    print(f"Working in: {backend_dir.resolve()}\n")

    app_dir = backend_dir / "app"
    core_dir = app_dir / "core"
    scripts_dir = backend_dir / "scripts"
    tests_dir = backend_dir / "tests"

    # Step 1: Core Setup
    core_dir.mkdir(parents=True, exist_ok=True)
    ensure_init(core_dir)

    move_file(app_dir / "config.py", core_dir / "config.py")
    move_file(app_dir / "extensions.py", core_dir / "extensions.py")
    move_file(app_dir / "utils" / "auth_helper.py", core_dir / "security.py")

    # Clean up app/utils if empty
    utils_dir = app_dir / "utils"
    if utils_dir.exists() and not any(utils_dir.iterdir()):
        utils_dir.rmdir()
        print(f"[Removed Empty Dir] {utils_dir}")

    # Step 2: Organize Root CLI Scripts
    scripts_dir.mkdir(parents=True, exist_ok=True)
    cli_scripts = [
        "check_missing_perks.py",
        "migrate_killer_powers.py",
        "run_scrapper.py",
    ]
    for script_name in cli_scripts:
        move_file(backend_dir / script_name, scripts_dir / script_name)

    # Step 3: Organize Test Suite
    test_subdirs = {
        "unit": tests_dir / "unit",
        "api": tests_dir / "api",
        "scrapers": tests_dir / "scrapers",
    }
    for folder in test_subdirs.values():
        folder.mkdir(parents=True, exist_ok=True)
        ensure_init(folder)

    for item in list(tests_dir.glob("test_*.py")):
        if item.is_file():
            category = categorize_test_file(item.name)
            target_path = test_subdirs[category] / item.name
            move_file(item, target_path)

    # Step 4: Scan and Update Imports Across All Backend Python Files
    print("\nScanning and rewriting import statements across backend...")
    for py_file in backend_dir.rglob("*.py"):
        update_imports_in_file(py_file)

    print("\nBackend reorganization and import updates complete.")


if __name__ == "__main__":
    main()