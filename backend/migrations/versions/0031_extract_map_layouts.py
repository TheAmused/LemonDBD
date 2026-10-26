# backend/migrations/versions/0031_extract_map_layouts.py
"""extract map_layouts into separate table

Revision ID: 0031_extract_map_layouts
Revises: 0030_map_layouts
Create Date: 2026-10-25
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0031_extract_map_layouts"
down_revision = "0030_map_layouts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "map_layouts" not in tables:
        op.create_table(
            "map_layouts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "map_id",
                sa.Integer(),
                sa.ForeignKey("map_realms.id", ondelete="CASCADE"),
                unique=True,
                nullable=False,
            ),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column(
                "layout_data",
                sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index("ix_map_layouts_map_id", "map_layouts", ["map_id"])

    if "map_realms" in tables:
        columns = {col["name"] for col in inspector.get_columns("map_realms")}
        if "layout" in columns:
            bind.execute(
                sa.text(
                    "INSERT INTO map_layouts (map_id, version, layout_data, created_at) "
                    "SELECT id, 1, layout, CURRENT_TIMESTAMP FROM map_realms "
                    "WHERE layout IS NOT NULL "
                    "ON CONFLICT (map_id) DO NOTHING"
                    if bind.dialect.name == "postgresql"
                    else "INSERT OR IGNORE INTO map_layouts (map_id, version, layout_data, created_at) "
                         "SELECT id, 1, layout, CURRENT_TIMESTAMP FROM map_realms WHERE layout IS NOT NULL"
                )
            )
            with op.batch_alter_table("map_realms") as batch:
                batch.drop_column("layout")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "map_realms" in tables:
        columns = {col["name"] for col in inspector.get_columns("map_realms")}
        if "layout" not in columns:
            op.add_column(
                "map_realms",
                sa.Column(
                    "layout",
                    sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
                    nullable=True,
                ),
            )

    if "map_layouts" in tables:
        indexes = {idx["name"] for idx in inspector.get_indexes("map_layouts")}
        if "ix_map_layouts_map_id" in indexes:
            op.drop_index("ix_map_layouts_map_id", table_name="map_layouts")
        op.drop_table("map_layouts")
