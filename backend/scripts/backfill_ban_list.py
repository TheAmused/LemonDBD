# backend/scripts/backfill_ban_list.py
"""Add running permanent bans to the ban-evasion e-mail list (for bans made while it was switched off).

Needs BAN_LIST_ENABLED=true and a valid BAN_LIST_PEPPERS in the environment. Look first, then apply:

    docker compose exec backend python scripts/backfill_ban_list.py --dry-run
    docker compose exec backend python scripts/backfill_ban_list.py

Only bans that are still running and have no entry yet are added; running it twice changes nothing.
Do this after the Privacy Policy describing the list is live.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # noqa: E402
from app.core.config import Config, ban_list_pepper_problems  # noqa: E402
from app.services import ban_list  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Add running permanent bans to the ban-evasion e-mail list.")
    parser.add_argument("--dry-run", action="store_true", help="only count what would be added")
    args = parser.parse_args(argv)

    app = create_app(Config)
    if not app.config.get("BAN_LIST_ENABLED"):
        print("BAN_LIST_ENABLED is off; nothing to do. Switch it on first.", file=sys.stderr)
        return 1
    problems = ban_list_pepper_problems(str(app.config.get("BAN_LIST_PEPPERS") or ""))
    if problems:
        print("Cannot run: " + "; ".join(problems), file=sys.stderr)
        return 1
    with app.app_context():
        counts = ban_list.backfill_from_bans(dry_run=args.dry_run)
    verb = "would add" if args.dry_run else "added"
    done = counts["missing"] if args.dry_run else counts["added"]
    print(
        f"{counts['bans']} running ban(s); {counts['missing']} without an entry; {verb} {done}; "
        f"{counts['skipped']} skipped (no usable e-mail)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
