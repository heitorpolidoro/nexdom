"""Add MANAGER value to userrole enum."""

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add MANAGER to the userrole PostgreSQL enum type."""
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'MANAGER'")


def downgrade() -> None:
    """Cannot remove an enum value in PostgreSQL without recreating the type.
    Left intentionally as no-op; remove manually if needed."""
