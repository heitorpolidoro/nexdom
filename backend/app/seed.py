import uuid

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.enums import UserRole
from app.models.user import User
from sqlmodel import Session, create_engine, select


def seed_db():
    engine = create_engine(settings.database_url)
    with Session(engine) as session:
        # 1. Admin / Administrador do Sistema
        statement = select(User).where(User.username == "admin")
        admin = session.exec(statement).first()
        if not admin:
            admin = User(
                id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                username="admin",
                email="admin@sigecon.com",
                hashed_password=get_password_hash("test_admin_password"),
                full_name="Administrador do Sistema",
                role=UserRole.ADMINISTRADOR,
            )
            session.add(admin)
            print("Admin seed criado.")
        else:
            admin.role = UserRole.ADMINISTRADOR
            admin.hashed_password = get_password_hash("test_admin_password")
            session.add(admin)
            print("Admin atualizado.")

        # 2. Diretor Operacional
        statement = select(User).where(User.username == "user1")
        user1 = session.exec(statement).first()
        if not user1:
            user1 = User(
                id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
                username="user1",
                email="user1@sigecon.com",
                hashed_password=get_password_hash("test_user_password"),
                full_name="Diretor Operacional",
                role=UserRole.DIRETOR,
            )
            session.add(user1)
            print("Diretor operacional seed criado.")
        else:
            user1.role = UserRole.DIRETOR
            session.add(user1)
            print("Diretor operacional atualizado.")

        session.commit()


if __name__ == "__main__":
    seed_db()
