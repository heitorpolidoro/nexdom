"""Add task_comment table."""

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "taskcomment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("content", sqlmodel.AutoString(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["task.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_taskcomment_task_id", "taskcomment", ["task_id"])
    op.create_index("ix_taskcomment_created_by_id", "taskcomment", ["created_by_id"])


def downgrade() -> None:
    op.drop_index("ix_taskcomment_created_by_id", table_name="taskcomment")
    op.drop_index("ix_taskcomment_task_id", table_name="taskcomment")
    op.drop_table("taskcomment")
