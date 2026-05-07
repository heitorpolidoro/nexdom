import uuid

import pytest
from app.core.security import get_password_hash
from app.models.enums import UserRole
from app.models.user import User
from fastapi.testclient import TestClient
from sqlmodel import Session


@pytest.fixture(name="test_users")
def test_users_fixture(session: Session):
    admin = User(
        id=uuid.uuid4(),
        username="admin_rbac",
        email="admin_rbac@test.com",
        full_name="Admin Test",
        hashed_password=get_password_hash("pass"),
        role=UserRole.ADMINISTRADOR,
    )
    director = User(
        id=uuid.uuid4(),
        username="director_rbac",
        email="dir_rbac@test.com",
        full_name="Director Test",
        hashed_password=get_password_hash("pass"),
        role=UserRole.DIRETOR,
    )
    session.add(admin)
    session.add(director)
    session.commit()
    return {"admin": admin, "director": director}


def get_token(client, username, password):
    response = client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    return response.json()["access_token"]


def test_rbac_task_workflow(client: TestClient, session: Session, test_users):
    admin_token = get_token(client, "admin_rbac", "pass")
    dir_token = get_token(client, "director_rbac", "pass")

    # 1. Diretor PODE criar tarefas (novo privilégio na hierarquia Admin/Diretor)
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {dir_token}"},
        json={"title": "Director Task"},
    )
    assert response.status_code == 200
    task_id = response.json()["id"]

    # 2. Administrador cria tarefa para o diretor
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"title": "Admin Task", "assigned_to_id": str(test_users["director"].id)},
    )
    assert response.status_code == 200
    admin_task_id = response.json()["id"]

    # 3. Diretor muda o STATUS da sua tarefa (Permitido)
    response = client.patch(
        f"/api/v1/tasks/{admin_task_id}",
        headers={"Authorization": f"Bearer {dir_token}"},
        json={"status": "IN_PROGRESS"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "IN_PROGRESS"

    # 4. Apenas Administrador pode EXCLUIR tarefas
    response = client.delete(
        f"/api/v1/tasks/{admin_task_id}",
        headers={"Authorization": f"Bearer {dir_token}"},
    )
    assert response.status_code == 403

    response = client.delete(
        f"/api/v1/tasks/{admin_task_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 204
