# backend/migrations/versions/0040_remove_canon_gemini_roster.py
"""remove the "Fog Canon (Gemini)" roster: its seed file is retired, so a database that already holds it drops it

The roster's text is kept in `app/seeds/data/smash_or_pass/retired/canon_gemini.json`; only the
rows go. Votes and stats hang on the entities, the entities on the roster.

Revision ID: 0040_remove_canon_gemini_roster
Revises: 0039_background_animation_eco
Create Date: 2026-11-04
"""
import sqlalchemy as sa
from alembic import op

revision = "0040_remove_canon_gemini_roster"
down_revision = "0039_background_animation_eco"
branch_labels = None
depends_on = None

SLUG = "canon_gemini"

_ENTITY_IDS = "SELECT e.id FROM entities e JOIN rosters r ON r.id = e.roster_id WHERE r.slug = :slug"


def upgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "rosters" not in tables:
        return
    if "entities" in tables:
        if "votes" in tables:
            op.execute(sa.text(f"DELETE FROM votes WHERE entity_id IN ({_ENTITY_IDS})").bindparams(slug=SLUG))
        if "entity_stats" in tables:
            op.execute(sa.text(f"DELETE FROM entity_stats WHERE entity_id IN ({_ENTITY_IDS})").bindparams(slug=SLUG))
        op.execute(
            sa.text("DELETE FROM entities WHERE roster_id IN (SELECT id FROM rosters WHERE slug = :slug)").bindparams(
                slug=SLUG
            )
        )
    op.execute(sa.text("DELETE FROM rosters WHERE slug = :slug").bindparams(slug=SLUG))


def downgrade() -> None:
    # The rows are gone for good; the seed file that made them is retired. Nothing to restore.
    pass
