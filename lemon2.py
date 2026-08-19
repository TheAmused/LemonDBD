#!/usr/bin/env python3
import re
import sys
from pathlib import Path

VALID_EXTENSIONS = {
    "py", "js", "ts", "jsx", "tsx", "json", "yaml", "yml",
    "html", "css", "sql", "md", "env", "sh", "toml", "txt",
    "c", "cpp", "h", "go", "rs", "java", "kt", "scss", "less"
}

COMMENT_STYLES = {
    ".py": "# {}",
    ".sh": "# {}",
    ".bash": "# {}",
    ".yaml": "# {}",
    ".yml": "# {}",
    ".toml": "# {}",
    ".env": "# {}",
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
    ".css": "/* {} */",
    ".scss": "/* {} */",
    ".less": "/* {} */",
    ".html": "<!-- {} -->",
    ".sql": "-- {}",
}


def clean_text(text: str) -> str:
    """Replaces non-breaking spaces (\xa0) and normalizes whitespace."""
    return text.replace('\xa0', ' ').replace('\r\n', '\n')


def resolve_project_path(raw_path_str: str) -> Path:
    """Smartly resolves relative paths based on project structure (backend/frontend)."""
    raw_path_str = raw_path_str.strip().replace("\\", "/")

    # 1. Do not touch if already explicitly prefixed with backend/ or frontend/
    if raw_path_str.startswith("backend/") or raw_path_str.startswith("frontend/"):
        return Path(raw_path_str)

    # 2. Frontend specific directories/files
    if any(raw_path_str.startswith(p) for p in ["src/", "components/", "pages/", "public/", "locales/"]):
        if Path("frontend").is_dir():
            return Path("frontend") / raw_path_str

    # 3. Disambiguate 'app/' path (Next.js vs Python backend app)
    if raw_path_str.startswith("app/"):
        ext = Path(raw_path_str).suffix.lower()
        if ext in [".tsx", ".ts", ".jsx", ".js", ".css", ".scss"] or "[locale]" in raw_path_str or "[" in raw_path_str:
            if Path("frontend").is_dir():
                return Path("frontend") / raw_path_str
        elif ext in [".py", ".sql"] or any(k in raw_path_str for k in ["services", "routes", "models", "core", "db"]):
            if Path("backend").is_dir():
                return Path("backend") / raw_path_str

    # 4. Fallback for python backend root paths
    if Path("backend").is_dir() and Path(raw_path_str).suffix.lower() == ".py":
        return Path("backend") / raw_path_str

    return Path(raw_path_str)


def extract_filepath_from_header(header_text: str) -> Path | None:
    header_text = clean_text(header_text)

    # 1. Look inside parentheses: (path/to/file.ext)
    match = re.search(r'\(([^)\s]+\.[a-zA-Z0-9]+)\)', header_text)
    if match:
        return resolve_project_path(match.group(1))

    # 2. Look inside backticks: `path/to/file.ext`
    match = re.search(r'`([^`\s]+\.[a-zA-Z0-9]+)`', header_text)
    if match:
        return resolve_project_path(match.group(1))

    # 3. Look for standalone paths with valid extensions (supports Next.js dynamic brackets [locale])
    tokens = re.findall(r'[a-zA-Z0-9_\-/\\\[\]@\.]+\.[a-zA-Z0-9]+', header_text)
    for token in tokens:
        ext = token.split(".")[-1].lower()
        if ext in VALID_EXTENSIONS:
            clean_token = token.strip("`()'\"#")
            return resolve_project_path(clean_token)

    return None


def add_dynamic_path_comment(file_path: Path, code_lines: list[str]) -> str:
    """Prepends dynamic path comment, keeping 'use client' / 'use server' / shebangs on top."""
    rel_path_str = str(file_path).replace("\\", "/")
    ext = file_path.suffix.lower()

    # JSON does not support comments natively; return code as-is
    if ext == ".json" or ext not in COMMENT_STYLES:
        return "\n".join(code_lines) + "\n"

    comment_template = COMMENT_STYLES[ext]
    path_comment = comment_template.format(rel_path_str)

    # Prevent duplicate path headers if already present in first few lines
    header_check_block = "\n".join(code_lines[:5])
    if rel_path_str in header_check_block:
        return "\n".join(code_lines) + "\n"

    # Determine insertion point (preserve shebangs, encoding, or 'use client' / 'use server')
    insert_idx = 0
    while insert_idx < len(code_lines):
        line_clean = code_lines[insert_idx].strip().strip(";'\"")
        if (
            code_lines[insert_idx].startswith("#!") or
            "coding:" in code_lines[insert_idx] or
            line_clean in ["use client", "use server"]
        ):
            insert_idx += 1
        else:
            break

    lines_copy = list(code_lines)
    lines_copy.insert(insert_idx, path_comment)
    return "\n".join(lines_copy) + "\n"


def parse_and_create_ascii_trees(content: str):
    tree_lines = content.splitlines()
    i = 0
    created_items = 0

    while i < len(tree_lines):
        line = tree_lines[i]
        if re.match(r'^\s*([a-zA-Z0-9_\-/\\]+/)\s*$', line):
            root_path = resolve_project_path(line.strip())
            i += 1
            stack = [(0, root_path)]

            while i < len(tree_lines):
                curr_line = tree_lines[i]
                if not any(char in curr_line for char in ['├', '└', '│', '└──', '├──']):
                    break

                clean_line = re.sub(r'#.*$', '', curr_line)
                prefix_match = re.search(r'[├└]──\s*', clean_line)
                if not prefix_match:
                    i += 1
                    continue

                indent = prefix_match.start()
                item_name = clean_line[prefix_match.end():].strip()

                if not item_name:
                    i += 1
                    continue

                while stack and stack[-1][0] >= indent:
                    stack.pop()

                parent_path = stack[-1][1] if stack else root_path
                is_dir = item_name.endswith("/")
                item_name = item_name.rstrip("/")

                full_path = parent_path / item_name

                if is_dir:
                    full_path.mkdir(parents=True, exist_ok=True)
                    stack.append((indent, full_path))
                else:
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    if not full_path.exists():
                        full_path.touch()
                        print(f"[TREE] Created empty file: {full_path.resolve()}")
                        created_items += 1

                i += 1
            continue
        i += 1

    return created_items


def process_ai_output(content: str):
    content = clean_text(content)

    print("\n" + "=" * 70)
    print("STEP 1: Parsing directory tree diagrams...")
    print("=" * 70)
    parse_and_create_ascii_trees(content)

    print("\n" + "=" * 70)
    print("STEP 2: Extracting and writing code blocks...")
    print("=" * 70)
    lines = content.splitlines()
    written_count = 0

    current_filepath = None
    in_code_block = False
    code_lines = []

    for line_num, line in enumerate(lines, 1):
        if line.startswith("#") and not in_code_block:
            detected_path = extract_filepath_from_header(line)
            if detected_path:
                current_filepath = detected_path
                print(f"[LINE {line_num:03d}] 🎯 HEADER MATCH  -> Target: '{current_filepath}' | Absolute: '{current_filepath.resolve()}'")
            else:
                print(f"[LINE {line_num:03d}] ⚠️ HEADER IGNORED -> '{line}'")

        elif line.strip().startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_lines = []
            else:
                in_code_block = False
                if current_filepath:
                    current_filepath.parent.mkdir(parents=True, exist_ok=True)
                    code_to_write = add_dynamic_path_comment(current_filepath, code_lines)

                    with open(current_filepath, "w", encoding="utf-8") as f:
                        f.write(code_to_write)

                    print(f"[LINE {line_num:03d}] ✅ FILE WRITTEN   -> {current_filepath.resolve()} ({len(code_lines)} lines)\n")
                    written_count += 1
                    current_filepath = None

        elif in_code_block:
            code_lines.append(line)

    print("=" * 70)
    print(f"SUMMARY: Successfully wrote {written_count} file(s).")
    print("=" * 70 + "\n")


def main():
    input_file = Path("response.md")

    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])

    if not input_file.exists():
        print(f"❌ Error: Input file '{input_file.name}' not found.")
        sys.exit(1)

    print(f"Reading '{input_file.resolve()}'...\n")
    content = input_file.read_text(encoding="utf-8")
    process_ai_output(content)


if __name__ == "__main__":
    main()