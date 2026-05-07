"""rename userrole to english

Revision ID: a1b2c3d4e5f6
Revises: 3c3d7b518f38
Create Date: 2026-05-05 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "3c3d7b518f38"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Cast to text to detach from the enum, swap values, recreate enum
    op.execute('ALTER TABLE "user" ALTER COLUMN role TYPE text')
    op.execute("DROP TYPE userrole")
    op.execute("CREATE TYPE userrole AS ENUM ('ADMINISTRATOR', 'DIRECTOR')")
    op.execute(
        "UPDATE \"user\" SET role = 'ADMINISTRATOR' WHERE role = 'ADMINISTRADOR'"
    )
    op.execute("UPDATE \"user\" SET role = 'DIRECTOR' WHERE role = 'DIRETOR'")
    op.execute(
        'ALTER TABLE "user" ALTER COLUMN role TYPE userrole USING role::userrole'
    )


def downgrade() -> None:
    op.execute('ALTER TABLE "user" ALTER COLUMN role TYPE text')
    op.execute("DROP TYPE userrole")
    op.execute(
        "CREATE TYPE userrole AS ENUM ('DIRETOR', 'FUNCIONARIO', 'ADMINISTRADOR')"
    )
    op.execute(
        "UPDATE \"user\" SET role = 'ADMINISTRADOR' WHERE role = 'ADMINISTRATOR'"
    )
    op.execute("UPDATE \"user\" SET role = 'DIRETOR' WHERE role = 'DIRECTOR'")
    op.execute(
        'ALTER TABLE "user" ALTER COLUMN role TYPE userrole USING role::userrole'
    )
