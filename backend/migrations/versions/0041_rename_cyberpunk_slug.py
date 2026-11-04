# backend/migrations/versions/0041_rename_cyberpunk_slug.py
"""rename the "Cyberpunk Fog 2077" roster's slug cyberpunk_2077 -> cyberpunk (and its cover file name), keeping its votes

Revision ID: 0041_rename_cyberpunk_slug
Revises: 0040_remove_canon_gemini_roster
Create Date: 2026-11-04
"""
import sqlalchemy as sa
from alembic import op

revision = "0041_rename_cyberpunk_slug"
down_revision = "0040_remove_canon_gemini_roster"
branch_labels = None
depends_on = None

OLD, NEW = "cyberpunk_2077", "cyberpunk"
OLD_COVER, NEW_COVER = "/static/avatars/rosters/cyberpunk_2077.webp", "/static/avatars/rosters/cyberpunk.webp"

_ENTITY_IDS = "SELECT e.id FROM entities e JOIN rosters r ON r.id = e.roster_id WHERE r.slug = :slug"


def _rename(old: str, new: str, old_cover: str, new_cover: str) -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "rosters" not in tables:
        return
    if "entities" in tables:
        # A roster already seeded under the new slug is empty (nobody has voted in it): drop it so the
        # old one, with its votes, takes the slug.
        if "votes" in tables:
            op.execute(sa.text(f"DELETE FROM votes WHERE entity_id IN ({_ENTITY_IDS})").bindparams(slug=new))
        if "entity_stats" in tables:
            op.execute(sa.text(f"DELETE FROM entity_stats WHERE entity_id IN ({_ENTITY_IDS})").bindparams(slug=new))
        op.execute(
            sa.text("DELETE FROM entities WHERE roster_id IN (SELECT id FROM rosters WHERE slug = :slug)").bindparams(
                slug=new
            )
        )
    op.execute(sa.text("DELETE FROM rosters WHERE slug = :slug").bindparams(slug=new))
    op.execute(
        sa.text(
            "UPDATE rosters SET slug = :new, cover_image_url = CASE WHEN cover_image_url = :old_cover "
            "THEN :new_cover ELSE cover_image_url END WHERE slug = :old"
        ).bindparams(new=new, old=old, old_cover=old_cover, new_cover=new_cover)
    )


def upgrade() -> None:
    _rename(OLD, NEW, OLD_COVER, NEW_COVER)


def downgrade() -> None:
    _rename(NEW, OLD, NEW_COVER, OLD_COVER)
