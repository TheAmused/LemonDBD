# backend/migrations/versions/0003_gauntlet_tokens.py
"""gauntlet run tokens and bought perk slots

Revision ID: 0003_gauntlet_tokens
Revises: 0002_baseline
Create Date: 2026-10-05

A database built after this change already has the columns (create_all() made
the table), so each one is only added when it is missing.
"""
import sqlalchemy as sa
from alembic import op

revision = "0003_gauntlet_tokens"
down_revision = "0002_baseline"
branch_labels = None
depends_on = None

COLUMNS = ("tokens", "last_token_roll", "bonus_perk_slots")


def upgrade() -> None:
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("gauntlet_runs")}
    for name in COLUMNS:
        if name not in existing:
            op.add_column("gauntlet_runs", sa.Column(name, sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    for name in COLUMNS:
        op.drop_column("gauntlet_runs", name)
