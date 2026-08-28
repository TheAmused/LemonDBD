#!/usr/bin/env python3
# scripts/inspect_streaks_components.py
"""
inspect_streaks_components.py

Finds and displays all streaks-related page components, tabs, cards, and panel definitions
to inspect how streak cards and role pickers receive dictionaries and render text.
"""

import os
import glob
from pathlib import Path

ROOT_CANDIDATES = [
    Path("."),
    Path("frontend"),
    Path(".."),
]

def find_frontend_root() -> Path:
    for candidate in ROOT_CANDIDATES:
        if (candidate / "src" / "components" / "streaks").exists():
            return candidate.resolve()
        if (candidate / "frontend" / "src" / "components" / "streaks").exists():
            return (candidate / "frontend").resolve()
    return Path(".").resolve()

def main():
    root = find_frontend_root()
    print(f"Scanning from root: {root}\n")

    patterns = [
        "src/app/[locale]/streaks/**/*.tsx",
        "src/components/streaks/**/*.tsx",
        "src/components/streaks/**/*.ts",
    ]

    found_files = []
    for pattern in patterns:
        for p in glob.glob(str(root / pattern), recursive=True):
            found_files.append(Path(p))

    found_files = sorted(list(set(found_files)))

    if not found_files:
        print("No streak files found matching pattern.")
        return

    separator = "=" * 80
    sub_sep = "-" * 80

    for file_path in found_files:
        rel_path = file_path.relative_to(root) if root in file_path.parents else file_path
        print(separator)
        print(f"FILE: {rel_path}")
        print(sub_sep)
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            for idx, line in enumerate(lines, 1):
                print(f"{idx:4d} | {line.rstrip()}")
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
        print(separator + "\n")

if __name__ == "__main__":
    main()