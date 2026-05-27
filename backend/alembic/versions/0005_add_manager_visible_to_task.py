"""Add manager_visible column to task table.

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "task",
        sa.Column(
            "manager_visible",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.create_index("ix_task_manager_visible", "task", ["manager_visible"])


def downgrade() -> None:
    op.drop_index("ix_task_manager_visible", table_name="task")
    op.drop_column("task", "manager_visible")
