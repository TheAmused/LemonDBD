# backend/migrations/versions/0035_id_please_lanes.py
"""give every ID, Please run a lane (mixed, survivor or killer) and widen the unique key to (user, lane, difficulty)

Databases that already ran 0034 before lanes existed have no `lane` column; fresh ones get it from 0034 and
this revision changes nothing there. Every existing run is a mixed run.

Revision ID: 0035_id_please_lanes
Revises: 0034_id_please
Create Date: 2026-10-28
"""
import sqlalchemy as sa
from alembic import op

revision = "0035_id_please_lanes"
down_revision = "0034_id_please"
branch_labels = None
depends_on = None

TABLE = "id_please_runs"
OLD_UNIQUE = "uq_id_please_run_user_difficulty"
NEW_UNIQUE = "uq_id_please_run_user_lane_difficulty"


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return

    has_lane = "lane" in {column["name"] for column in inspector.get_columns(TABLE)}
    uniques = {unique["name"] for unique in inspector.get_unique_constraints(TABLE)}
    add_lane = not has_lane
    drop_old = OLD_UNIQUE in uniques
    add_new = NEW_UNIQUE not in uniques
    if not (add_lane or drop_old or add_new):
        return

    with op.batch_alter_table(TABLE) as batch:
        if add_lane:
            batch.add_column(sa.Column("lane", sa.String(10), nullable=False, server_default="mixed"))
        if drop_old:
            batch.drop_constraint(OLD_UNIQUE, type_="unique")
        if add_new:
            batch.create_unique_constraint(NEW_UNIQUE, ["user_id", "lane", "difficulty"])


def downgrade() -> None:
    # Only mixed runs fit the old one-run-per-difficulty key, so the solo lanes' runs go with the column.
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return
    if "lane" not in {column["name"] for column in inspector.get_columns(TABLE)}:
        return
    op.execute(sa.text(f"DELETE FROM {TABLE} WHERE lane <> 'mixed'"))
    uniques = {unique["name"] for unique in inspector.get_unique_constraints(TABLE)}
    with op.batch_alter_table(TABLE) as batch:
        if NEW_UNIQUE in uniques:
            batch.drop_constraint(NEW_UNIQUE, type_="unique")
        batch.drop_column("lane")
        batch.create_unique_constraint(OLD_UNIQUE, ["user_id", "difficulty"])
