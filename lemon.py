# lemon.py
from pathlib import Path

# Directories to ignore anywhere in the project
IGNORE_DIRS = {
    # Version control
    ".git",
    ".github",
    # Python
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".venv",
    "venv",
    "env",
    ".tox",
    "eggs",
    ".eggs",
    # Node / Next.js / Build outputs
    "node_modules",
    ".next",
    ".turbo",
    "out",
    "build",
    "dist",
    ".parcel-cache",
    # IDEs & System
    ".vscode",
    ".idea",
    ".DS_Store",
}

# Directories to ignore ONLY if they are at the root level
ROOT_IGNORE_DIRS = {
    ".superpowers",
    "docs",
}

# General junk files to ignore completely
IGNORE_FILES = {
    ".DS_Store",
    "Thumbs.db",
    ".env.local",
    ".env.production",
}
IGNORE_EXTENSIONS = {".pyc", ".pyo", ".pyd"}

# Files to ignore ONLY if they are at the root level
ROOT_IGNORE_FILES = {
    "featuresPlan.md",
    "lemon.py",
    "README.md",
}

# Media extensions to collapse
MEDIA_EXTENSIONS = {
    # Images
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".bmp",
    ".tiff",
    # Audio / Video
    ".mp4",
    ".webm",
    ".mov",
    ".avi",
    ".mp3",
    ".wav",
    ".ogg",
}


def should_ignore(path: Path, root_path: Path) -> bool:
    is_root_child = path.parent.resolve() == root_path.resolve()

    if path.is_dir():
        if path.name in IGNORE_DIRS:
            return True
        if is_root_child and path.name in ROOT_IGNORE_DIRS:
            return True
        return False

    # Check files
    if is_root_child and path.name in ROOT_IGNORE_FILES:
        return True
    return path.name in IGNORE_FILES or path.suffix.lower() in IGNORE_EXTENSIONS


def is_media_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in MEDIA_EXTENSIONS


def inspect_subtree(dir_path: Path, root_path: Path) -> tuple[int, int]:
    """Recursively checks directory contents. Returns (media_count, non_media_count)."""
    media_count = 0
    non_media_count = 0

    try:
        for entry in dir_path.iterdir():
            if should_ignore(entry, root_path):
                continue
            if entry.is_dir():
                m_sub, nm_sub = inspect_subtree(entry, root_path)
                media_count += m_sub
                non_media_count += nm_sub
            elif is_media_file(entry):
                media_count += 1
            else:
                non_media_count += 1
    except PermissionError:
        pass

    return media_count, non_media_count


def generate_tree(dir_path: Path, root_path: Path, prefix: str = "") -> list[str]:
    lines = []

    try:
        raw_entries = [e for e in dir_path.iterdir() if not should_ignore(e, root_path)]
    except PermissionError:
        return [f"{prefix}└── [Permission Denied]"]

    direct_media_count = 0
    display_dirs = []
    display_files = []

    for entry in raw_entries:
        if entry.is_dir():
            media_total, non_media_total = inspect_subtree(entry, root_path)

            # Collapse directory if it contains only media files across all nested levels
            if non_media_total == 0 and media_total > 0:
                display_dirs.append(
                    (
                        entry,
                        f"{entry.name}/ [Contains only media across subdirectories ({media_total} files)]",
                        True,
                    )
                )
            else:
                display_dirs.append((entry, f"{entry.name}/", False))
        else:
            if is_media_file(entry):
                direct_media_count += 1
            else:
                display_files.append((entry, entry.name, False))

    display_dirs.sort(key=lambda x: x[0].name.lower())
    display_files.sort(key=lambda x: x[0].name.lower())

    items_to_render = []
    items_to_render.extend(display_dirs)
    items_to_render.extend(display_files)

    if direct_media_count > 0:
        label = f"[{direct_media_count} media file{'s' if direct_media_count > 1 else ''}]"
        items_to_render.append((None, label, False))

    total = len(items_to_render)
    for index, (item_path, display_name, is_collapsed_subtree) in enumerate(items_to_render):
        is_last = index == total - 1
        connector = "└── " if is_last else "├── "
        child_prefix = "    " if is_last else "│   "

        lines.append(f"{prefix}{connector}{display_name}")

        if item_path and item_path.is_dir() and not is_collapsed_subtree:
            lines.extend(generate_tree(item_path, root_path, prefix + child_prefix))

    return lines


def export_structure_to_md(root_dir: str = ".", output_file: str = "structure.md") -> None:
    root = Path(root_dir).resolve()
    tree_lines = [f"{root.name}/"] + generate_tree(root, root)

    md_content = (
        f"# Directory Structure\n\n"
        f"**Root:** `{root.name}`  \n\n"
        f"```text\n" + "\n".join(tree_lines) + "\n```\n"
    )

    Path(output_file).write_text(md_content, encoding="utf-8")
    print(f"Directory structure successfully written to: {output_file}")


if __name__ == "__main__":
    export_structure_to_md(root_dir=".", output_file="structure.md")