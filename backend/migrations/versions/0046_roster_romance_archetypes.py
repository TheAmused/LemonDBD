# backend/migrations/versions/0046_roster_romance_archetypes.py
"""Add romance_archetypes JSON column to rosters

Revision ID: 0046_roster_romance_archetypes
Revises: 0045_merge_challenge_smash
Create Date: 2026-11-14
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0046_roster_romance_archetypes"
down_revision = "0045_merge_challenge_smash"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rosters",
        sa.Column(
            "romance_archetypes",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("rosters", "romance_archetypes")
