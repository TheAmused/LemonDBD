# backend/scripts/reset_two_factor.py
"""Switch two-factor sign-in off for one account, from the server's shell.

For the case no admin can fix from the website: the only administrator lost their phone and
their recovery codes. Run it where the backend runs, e.g.

    docker compose exec backend python scripts/reset_two_factor.py <username-or-email>

The account's TOTP secret and recovery codes are deleted and a notice is emailed to it.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import or_, select  # noqa: E402

from app import create_app  # noqa: E402
from app.core.config import Config  # noqa: E402
from app.core.extensions import db  # noqa: E402
from app.models import User  # noqa: E402
from app.services.user import two_factor  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Turn off two-factor sign-in for one account.")
    parser.add_argument("account", help="username or email of the account")
    args = parser.parse_args(argv)

    app = create_app(Config)
    with app.app_context():
        needle = args.account.strip()
        user = db.session.scalars(
            select(User).where(or_(User.username.ilike(needle), User.email.ilike(needle.lower())))
        ).first()
        if user is None:
            print(f"No account matches '{needle}'.", file=sys.stderr)
            return 1
        if two_factor.admin_reset(user):
            print(f"Two-factor sign-in turned off for '{user.username}'.")
        else:
            print(f"'{user.username}' did not have two-factor sign-in turned on.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
