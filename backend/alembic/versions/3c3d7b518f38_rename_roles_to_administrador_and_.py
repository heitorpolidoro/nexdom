"""Rename roles to ADMINISTRADOR and DIRETOR

Revision ID: 3c3d7b518f38
Revises: f6d2e0b038d1
Create Date: 2026-04-30 17:02:49.755414

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3c3d7b518f38"
down_revision: str | Sequence[str] | None = "f6d2e0b038d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL
    connection = op.get_bind()
    connection.execution_options(isolation_level="AUTOCOMMIT").execute(
        sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMINISTRADOR'")
    )

    # Data migration can run in a normal transaction
    # Antigo DIRETOR -> ADMINISTRADOR
    # Antigo FUNCIONARIO -> DIRETOR
    op.execute("UPDATE \"user\" SET role = 'ADMINISTRADOR' WHERE role = 'DIRETOR'")
    op.execute("UPDATE \"user\" SET role = 'DIRETOR' WHERE role = 'FUNCIONARIO'")


def downgrade() -> None:
    """Downgrade schema."""
    # O inverso da migração de dados
    op.execute("UPDATE \"user\" SET role = 'FUNCIONARIO' WHERE role = 'DIRETOR'")
    op.execute("UPDATE \"user\" SET role = 'DIRETOR' WHERE role = 'ADMINISTRADOR'")
    # Nota: Remover valores de ENUM no Postgres é complexo e requer recriar o tipo.
    # Por segurança, manteremos o valor ADMINISTRADOR no tipo, apenas os dados serão revertidos.
