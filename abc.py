#!/usr/bin/env python3
"""
CLI utility that dynamically finds and bundles ALL English locale files 
(everything inside the `src/locales/en/` directory) into a single Markdown file.
"""

import sys
from pathlib import Path

def find_frontend_root() -> Path:
    current = Path.cwd()
    if (current / "src").is_dir() and (current / "package.json").is_file():
        return current
    if (current / "frontend" / "src").is_dir():
        return current / "frontend"
    return current

def main() -> None:
    frontend_root = find_frontend_root()
    locales_dir = frontend_root / "src" / "locales" / "en"

    print("=" * 70)
    print(" LemonDBD - Dynamic EN Locales Exporter")
    print("=" * 70)

    if not locales_dir.is_dir():
        print(f"❌ Error: Directory not found at {locales_dir.resolve()}")
        sys.exit(1)

    # Dynamically scan all files inside src/locales/en/ recursively
    locale_files = sorted([p for p in locales_dir.rglob("*") if p.is_file()])

    if not locale_files:
        print(f"⚠️  No files found in {locales_dir.resolve()}")
        sys.exit(0)

    out_filename = "en_locales_bundle.md"
    out_path = frontend_root / out_filename
    exported_locales = 0

    with open(out_path, "w", encoding="utf-8") as out:
        out.write("# English Locale Dictionaries (Dynamic Bundle)\n\n")

        for file_path in locale_files:
            # Format path relative to workspace root (e.g. src/locales/en/admin.ts)
            rel_path = file_path.relative_to(frontend_root).as_posix()

            try:
                content = file_path.read_text(encoding="utf-8")
                
                # Determine syntax highlighting tag from file extension
                ext = file_path.suffix.lstrip(".")
                lang_tag = ext if ext else "text"

                out.write(f"### {rel_path}\n")
                out.write(f"```{lang_tag}\n")
                out.write(content)
                if not content.endswith("\n"):
                    out.write("\n")
                out.write("```\n\n")
                
                exported_locales += 1
                print(f"  [+] Bundled: {rel_path}")
            except Exception as e:
                print(f"⚠️  Error reading {rel_path}: {e}")

    print("\n" + "-" * 70)
    print("✅ Locales bundle created successfully!")
    print(f"📄 Output file     : {out_path.resolve()}")
    print(f"📚 Locales bundled : {exported_locales} files")
    print("-" * 70)

if __name__ == "__main__":
    main()