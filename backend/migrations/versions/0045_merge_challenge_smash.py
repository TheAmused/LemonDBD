# backend/migrations/versions/0045_merge_challenge_smash.py
"""Join the challenge completion branch and the Smash or Pass branch into one history

Both were cut from 0039/0040 and merged into develop separately, which left two heads and stopped
`flask db upgrade`. The two touch different tables, so nothing here changes the schema.

Revision ID: 0045_merge_challenge_smash
Revises: 0041_completion_pages_count, 0044_fix_legendary_genders
Create Date: 2026-11-07
"""

revision = "0045_merge_challenge_smash"
down_revision = ("0041_completion_pages_count", "0044_fix_legendary_genders")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
