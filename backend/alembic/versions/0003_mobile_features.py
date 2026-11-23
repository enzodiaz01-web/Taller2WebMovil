"""add mobile geolocation on reviews and mobile_events table

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-23 14:48:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("reviews", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column("reviews", sa.Column("location_label", sa.String(length=200), nullable=True))

    op.create_table(
        "mobile_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_mobile_events_user_id", "mobile_events", ["user_id"])
    op.create_index("ix_mobile_events_type_created_at", "mobile_events", ["event_type", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_mobile_events_type_created_at", table_name="mobile_events")
    op.drop_index("ix_mobile_events_user_id", table_name="mobile_events")
    op.drop_table("mobile_events")

    op.drop_column("reviews", "location_label")
    op.drop_column("reviews", "longitude")
    op.drop_column("reviews", "latitude")
