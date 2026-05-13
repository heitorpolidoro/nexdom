"""Add user_type table and type_id to user."""

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_type",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sqlmodel.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_user_type_name", "user_type", ["name"], unique=True)

    op.add_column("user", sa.Column("type_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_user_type_id", "user", ["type_id"], unique=False)
    op.create_foreign_key("fk_user_type_id", "user", "user_type", ["type_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_user_type_id", "user", type_="foreignkey")
    op.drop_index("ix_user_type_id", table_name="user")
    op.drop_column("user", "type_id")
    op.drop_index("ix_user_type_name", table_name="user_type")
    op.drop_table("user_type")
