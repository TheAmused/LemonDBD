# backend/migrations/versions/0023_sanction_drop_message.py
"""user_sanctions: no free-text "message to the user" any more

Revision ID: 0023_sanction_drop_message
Revises: 0022_maintenance_job_runs
Create Date: 2026-10-17

The decision form had two free-text boxes that said nearly the same thing ("what happened" and
"message to the user"). Only the facts remain; the notice and the email are built from the facts, the
reason and the cited Rules section. The `public_message` column goes away. A database built after
this change never had it (create_all() made the table), so the step only runs when the column is
still there.
"""
import sqlalchemy as sa
from alembic import op

revision = "0023_sanction_drop_message"
down_revision = "0022_maintenance_job_runs"
branch_labels = None
depends_on = None

TABLE = "user_sanctions"
COLUMN = "public_message"


def _columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(TABLE)}


def upgrade() -> None:
    if COLUMN not in _columns():
        return
    with op.batch_alter_table(TABLE) as batch:
        batch.drop_column(COLUMN)


def downgrade() -> None:
    columns = _columns()
    if not columns or COLUMN in columns:
        return
    op.add_column(TABLE, sa.Column(COLUMN, sa.Text(), nullable=True))
