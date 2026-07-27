import sys
from pathlib import Path

# Base directory where the structure will be created (current working directory)
BASE_DIR = Path.cwd()

# Directories to explicitly create (useful for empty folders like icons/ and public/)
DIRECTORIES = [
    "backend/app/static/icons",
    "backend/data",
    "frontend/public",
    "frontend/src/app/[locale]",
    "frontend/src/components",
    "frontend/src/i18n",
    "frontend/src/locales",
]

# All target file paths
FILES = [
    # Backend files
    "backend/app/__init__.py",
    "backend/app/routes/__init__.py",
    "backend/app/routes/perks.py",
    "backend/app/services/perk_service.py",
    "backend/data/perks.json",
    "backend/requirements.txt",
    "backend/run.py",
    "backend/Dockerfile",
    
    # Frontend files
    "frontend/src/app/[locale]/layout.tsx",
    "frontend/src/app/[locale]/page.tsx",
    "frontend/src/app/globals.css",
    "frontend/src/components/Navbar.tsx",
    "frontend/src/components/PerkCard.tsx",
    "frontend/src/components/PerkFilters.tsx",
    "frontend/src/components/PerkModal.tsx",
    "frontend/src/components/ThemeProvider.tsx",
    "frontend/src/i18n/config.ts",
    "frontend/src/i18n/get-dictionary.ts",
    "frontend/src/locales/en.json",
    "frontend/src/locales/es.json",
    "frontend/postcss.config.mjs",
    "frontend/next.config.ts",
    "frontend/package.json",
    "frontend/tsconfig.json",
    "frontend/Dockerfile",
    
    # Root files
    "docker-compose.yml",
    "README.md",
]

def build_structure():
    print(f"Creating project structure in: {BASE_DIR}\n")

    # 1. Ensure explicit directories are created
    for dir_path in DIRECTORIES:
        target_dir = BASE_DIR / dir_path
        target_dir.mkdir(parents=True, exist_ok=True)

    # 2. Create all files (and missing parent dirs automatically)
    for file_path_str in FILES:
        file_path = BASE_DIR / file_path_str
        
        # Ensure parent folder exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        if not file_path.exists():
            # Add minimal valid content for JSON files to prevent immediate syntax errors
            if file_path.suffix == ".json":
                file_path.write_text("{}")
            else:
                file_path.touch()
            print(f"[CREATED] {file_path_str}")
        else:
            print(f"[SKIPPED] {file_path_str} (already exists)")

    print("\nProject structure created successfully!")

if __name__ == "__main__":
    build_structure()