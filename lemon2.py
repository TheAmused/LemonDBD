#!/usr/bin/env python3
import re
import sys
from pathlib import Path

def process_ai_output(content: str):
    """
    Parses AI markdown output, extracts filenames, creates parent directories,
    and writes code blocks to their specified locations.
    """
    # Regex to capture file headings and their corresponding code block content
    # Matches patterns like: #### 1. `path/to/file.ext` or ### `path/to/file.ext`
    pattern = re.compile(
        r'(?:#+\s*(?:\d+\.\s*)?`?([a-zA-Z0-9_\-/\.\\]+\.[a-zA-Z0-9]+)`?)\s*\n\s*```(?:\w+)?\n(.*?)```',
        re.DOTALL
    )

    matches = pattern.findall(content)
    
    if not matches:
        print("❌ No matching file/code-block patterns found in input.")
        return

    written_count = 0
    
    for filepath_str, code_content in matches:
        # Normalize file path
        filepath = Path(filepath_str.strip())
        
        # Create parent directories if they don't exist
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        # Write content to file
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(code_content)
            
        print(f"  Created/Updated: {filepath}")
        written_count += 1

    print(f"\n Successfully wrote {written_count} file(s).")

def main():
    # Target file defaults to response.md
    input_file = Path("response.md")
    
    # Allow overriding via argument if needed (e.g. py lemon2.py custom.md)
    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])
        
    if not input_file.exists():
        print(f"❌ Error: File '{input_file.name}' not found in the current directory.")
        print(f"Please create '{input_file.name}' and paste the AI response into it first.")
        sys.exit(1)

    print(f" Reading from '{input_file.name}'...")
    content = input_file.read_text(encoding="utf-8")
    process_ai_output(content)

if __name__ == "__main__":
    main()