"""Add task categorization

Revision ID: e7a1b2c3d4e6
Revises: f6d2e0b038d1
Create Date: 2024-05-09 10:00:00.000000

"""

from collections.abc import Sequence
import sqlalchemy as sa
import sqlmodel
from alembic import op
from uuid import uuid4

# revision identifiers, used by Alembic.
revision: str = "e7a1b2c3d4e6"
down_revision: str | Sequence[str] | None = "f6d2e0b038d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create category table
    op.create_table(
        "category",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("color", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name")
    )
    op.create_index(op.f("ix_category_name"), "category", ["name"], unique=True)

    # 2. Insert default category "Geral"
    default_category_id = str(uuid4())
    op.execute(
        f"INSERT INTO category (id, name, color, is_active) VALUES ('{default_category_id}', 'Geral', '#808080', true)"
    )

    # 3. Add category_id to task as nullable
    op.add_column("task", sa.Column("category_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_task_category_id"), "task", ["category_id"], unique=False)

    # 4. Update all existing tasks to point to "Geral"
    op.execute(f"UPDATE task SET category_id = '{default_category_id}'")

    # 5. Make category_id NOT NULL
    op.alter_column("task", "category_id", nullable=False)

    # 6. Add Foreign Key
    op.create_foreign_key(
        "fk_task_category_id_category",
        "task",
        "category",
        ["category_id"],
        ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("fk_task_category_id_category", "task", type_="foreignkey")
    op.drop_index(op.f("ix_task_category_id"), table_name="task")
    op.drop_column("task", "category_id")
    op.drop_index(op.f("ix_category_name"), table_name="category")
    op.drop_table("category")
