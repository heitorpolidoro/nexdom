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
        admin_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
        admin = session.get(User, admin_id)
        if not admin:
            statement = select(User).where(User.username == "admin")
            admin = session.exec(statement).first()
        
        if not admin:
            admin = User(
                id=admin_id,
                username="admin",
                email="admin@sigecon.com",
                hashed_password=get_password_hash("test_admin_password"),
                full_name="Administrador do Sistema",
                role=UserRole.ADMINISTRATOR,
            )
            session.add(admin)
            print("Admin seed criado.")
        else:
            admin.username = "admin"
            admin.role = UserRole.ADMINISTRATOR
            admin.hashed_password = get_password_hash("test_admin_password")
            session.add(admin)
            print("Admin atualizado.")

        # 2. Diretor Operacional
        user1_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
        user1 = session.get(User, user1_id)
        if not user1:
            statement = select(User).where(User.username == "user1")
            user1 = session.exec(statement).first()

        if not user1:
            user1 = User(
                id=user1_id,
                username="user1",
                email="user1@sigecon.com",
                hashed_password=get_password_hash("test_user_password"),
                full_name="Diretor Operacional",
                role=UserRole.DIRECTOR,
            )
            session.add(user1)
            print("Diretor operacional seed criado.")
        else:
            user1.username = "user1"
            user1.role = UserRole.DIRECTOR
            session.add(user1)
            print("Diretor operacional atualizado.")

        session.commit()


if __name__ == "__main__":
    seed_db()
