"""Initial tables: beans_catalog, user_beans, user_preferences

Revision ID: 001
Revises:
Create Date: 2026-03-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "beans_catalog",
        sa.Column("coffee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("roaster", sa.String(255), nullable=False),
        sa.Column("origin_country", sa.String(100), nullable=True),
        sa.Column("roaster_location", sa.String(255), nullable=True),
        sa.Column("roast_level", sa.String(50), nullable=True),
        sa.Column("process", sa.String(100), nullable=True),
        sa.Column("flavor_notes", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("body", sa.Integer(), nullable=True),
        sa.Column("brew_methods", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("is_blend", sa.Boolean(), nullable=True),
        sa.Column("price_min", sa.Float(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("flavor_categories", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("roast_profile", sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint("coffee_id"),
    )
    op.create_index("ix_beans_catalog_roaster", "beans_catalog", ["roaster"])

    op.create_table(
        "user_beans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.String(255), nullable=False),
        sa.Column("coffee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("roast_date", sa.Date(), nullable=True),
        sa.Column("is_pre_ground", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["coffee_id"], ["beans_catalog.coffee_id"]),
    )
    op.create_index("ix_user_beans_user_id", "user_beans", ["user_id"])

    op.create_table(
        "user_preferences",
        sa.Column("user_id", sa.String(255), nullable=False),
        sa.Column("last_used_bean_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_used_brew_method", sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_preferences")
    op.drop_index("ix_user_beans_user_id", table_name="user_beans")
    op.drop_table("user_beans")
    op.drop_index("ix_beans_catalog_roaster", table_name="beans_catalog")
    op.drop_table("beans_catalog")
