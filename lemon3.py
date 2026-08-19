#!/usr/bin/env python3
# lemon3.py
import os
import sys
from pathlib import Path

# Directories to ignore
IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "env",
    "build",
    "dist",
    ".next",
    ".cache",
    ".idea",
    ".vscode",
    "coverage",
    ".pytest_cache",
}

# Supported file extensions and their corresponding comment syntax
COMMENT_STYLES = {
    # Hash / Pound comment
    ".py": "# {}",
    ".sh": "# {}",
    ".bash": "# {}",
    ".yaml": "# {}",
    ".yml": "# {}",
    ".toml": "# {}",
    ".env": "# {}",
    "Dockerfile": "# {}",
    
    # Double-slash comment
    ".js": "// {}",
    ".jsx": "// {}",
    ".ts": "// {}",
    ".tsx": "// {}",
    ".c": "// {}",
    ".cpp": "// {}",
    ".h": "// {}",
    ".go": "// {}",
    ".rs": "// {}",
    ".java": "// {}",
    ".kt": "// {}",
    
    # CSS block comment
    ".css": "/* {} */",
    ".scss": "/* {} */",
    ".less": "/* {} */",
    
    # HTML comment
    ".html": "<!-- {} -->",
    ".xml": "<!-- {} -->",
    ".svg": "<!-- {} -->",
    
    # SQL comment
    ".sql": "-- {}",
}


def get_comment_line(file_path: Path, rel_path_str: str) -> str | None:
    """Generates the appropriate comment line based on file extension."""
    if file_path.name in COMMENT_STYLES:
        return COMMENT_STYLES[file_path.name].format(rel_path_str)
        
    ext = file_path.suffix.lower()
    if ext in COMMENT_STYLES:
        return COMMENT_STYLES[ext].format(rel_path_str)
        
    return None


def process_file(file_path: Path, root_dir: Path):
    """Inserts relative path comment at top of file, preserving shebangs."""
    try:
        rel_path = file_path.relative_to(root_dir)
        rel_path_str = str(rel_path).replace("\\", "/")  # Standardize for cross-platform Windows/Linux
        
        comment_line = get_comment_line(file_path, rel_path_str)
        if not comment_line:
            return

        content = file_path.read_text(encoding="utf-8", errors="ignore")
        lines = content.splitlines(keepends=True)

        # Check if relative path is already added in the first 5 lines
        first_few_lines = "".join(lines[:5])
        if rel_path_str in first_few_lines:
            return

        # Determine insertion point (preserve shebang or encoding headers)
        insert_idx = 0
        if lines:
            if lines[0].startswith("#!") or "coding:" in lines[0]:
                insert_idx = 1
                if len(lines) > 1 and "coding:" in lines[1]:
                    insert_idx = 2

        new_comment = comment_line + "\n"
        lines.insert(insert_idx, new_comment)

        file_path.write_text("".join(lines), encoding="utf-8")
        print(f"✅ Added header to: {rel_path_str}")

    except Exception as e:
        print(f"❌ Failed to process {file_path}: {e}")


def main():
    root_dir = Path.cwd()
    print(f"🔍 Scanning files starting from root directory: {root_dir}\n")

    for file_path in root_dir.rglob("*"):
        if file_path.is_dir():
            continue
            
        # Ignore target directories
        if any(ignored in file_path.parts for ignored in IGNORED_DIRS):
            continue

        process_file(file_path, root_dir)

    print("\n✨ Done processing file path headers.")


if __name__ == "__main__":
    main()