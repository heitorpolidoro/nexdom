import uuid

import pytest
from app.core.security import get_password_hash
from app.models.category import Category
from app.models.enums import UserRole
from app.models.user import User
from fastapi.testclient import TestClient
from sqlmodel import Session


def test_manager_role_value_exists():
    """MANAGER must exist as a valid UserRole value."""
    from app.models.enums import UserRole
    assert UserRole.MANAGER == "MANAGER"


@pytest.fixture(name="test_data")
def test_data_fixture(session: Session):
    admin = User(
        id=uuid.uuid4(),
        username="admin_rbac",
        email="admin_rbac@test.com",
        full_name="Admin Test",
        hashed_password=get_password_hash("pass"),
        role=UserRole.ADMINISTRATOR,
    )
    director = User(
        id=uuid.uuid4(),
        username="director_rbac",
        email="dir_rbac@test.com",
        full_name="Director Test",
        hashed_password=get_password_hash("pass"),
        role=UserRole.DIRECTOR,
    )
    category = Category(id=uuid.uuid4(), name="Test Category", color="#FFFFFF")
    session.add(admin)
    session.add(director)
    session.add(category)
    session.commit()
    return {"admin": admin, "director": director, "category": category}


def get_token(client, username, password):
    response = client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    return response.json()["access_token"]


def test_rbac_task_workflow(client: TestClient, session: Session, test_data):
    admin_token = get_token(client, "admin_rbac", "pass")
    dir_token = get_token(client, "director_rbac", "pass")
    category_id = str(test_data["category"].id)

    # 1. Diretor PODE criar tarefas (novo privilégio na hierarquia Admin/Diretor)
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {dir_token}"},
        json={"title": "Director Task", "category_id": category_id},
    )
    assert response.status_code == 200

    # 2. Diretor cria outra tarefa (apenas diretores criam tarefas)
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {dir_token}"},
        json={
            "title": "Second Task",
            "assigned_to_id": str(test_data["director"].id),
            "category_id": category_id,
        },
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


def test_assert_can_edit_task_allows_admin(session: Session, test_data):
    """ADMINISTRATOR can always edit any task, even one assigned to someone else."""
    from app.api.deps import assert_can_edit_task
    from app.models.task import Task
    admin = test_data["admin"]
    task = Task(
        title="T",
        category_id=test_data["category"].id,
        created_by_id=admin.id,
        assigned_to_id=test_data["director"].id,
    )
    session.add(task)
    session.commit()
    # Should not raise
    assert_can_edit_task(admin, task)


def test_assert_can_edit_task_manager_unassigned(session: Session, test_data):
    """MANAGER can edit tasks with no assignee."""
    import uuid as _uuid
    from app.api.deps import assert_can_edit_task
    from app.core.security import get_password_hash
    from app.models.enums import UserRole
    from app.models.task import Task
    from app.models.user import User
    manager = User(
        id=_uuid.uuid4(),
        username="mgr_tmp",
        email="mgr_tmp@test.com",
        full_name="Manager Tmp",
        hashed_password=get_password_hash("pass"),
        role=UserRole.MANAGER,
    )
    session.add(manager)
    session.commit()
    task = Task(
        title="T",
        category_id=test_data["category"].id,
        created_by_id=test_data["admin"].id,
        assigned_to_id=None,
    )
    session.add(task)
    session.commit()
    assert_can_edit_task(manager, task)  # should not raise


def test_assert_can_edit_task_manager_other_user_raises(session: Session, test_data):
    """MANAGER cannot edit tasks assigned to someone else."""
    import uuid as _uuid
    import pytest
    from app.api.deps import assert_can_edit_task
    from app.core.exceptions import ForbiddenError
    from app.core.security import get_password_hash
    from app.models.enums import UserRole
    from app.models.task import Task
    from app.models.user import User
    manager = User(
        id=_uuid.uuid4(),
        username="mgr_tmp2",
        email="mgr_tmp2@test.com",
        full_name="Manager Tmp2",
        hashed_password=get_password_hash("pass"),
        role=UserRole.MANAGER,
    )
    session.add(manager)
    session.commit()
    task = Task(
        title="T",
        category_id=test_data["category"].id,
        created_by_id=test_data["admin"].id,
        assigned_to_id=test_data["director"].id,  # assigned to director, not manager
    )
    session.add(task)
    session.commit()
    with pytest.raises(ForbiddenError):
        assert_can_edit_task(manager, task)


@pytest.fixture(name="manager_user")
def manager_user_fixture(session: Session):
    """Create and persist a MANAGER user for RBAC tests."""
    import uuid as _uuid
    from app.core.security import get_password_hash
    manager = User(
        id=_uuid.uuid4(),
        username="manager_rbac",
        email="manager_rbac@test.com",
        full_name="Manager Test",
        hashed_password=get_password_hash("pass"),
        role=UserRole.MANAGER,
    )
    session.add(manager)
    session.commit()
    return manager


def test_manager_can_create_task(client: TestClient, session: Session, test_data, manager_user):
    """MANAGER can create tasks."""
    token = get_token(client, "manager_rbac", "pass")
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Manager Task", "category_id": str(test_data["category"].id)},
    )
    assert response.status_code == 200


def test_admin_can_create_task(client: TestClient, session: Session, test_data):
    """ADMINISTRATOR can create tasks."""
    token = get_token(client, "admin_rbac", "pass")
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Admin Task", "category_id": str(test_data["category"].id)},
    )
    assert response.status_code == 200


def test_manager_cannot_edit_other_assigned_task(
    client: TestClient, session: Session, test_data, manager_user
):
    """MANAGER gets 403 when editing a task assigned to another user."""
    dir_token = get_token(client, "director_rbac", "pass")
    mgr_token = get_token(client, "manager_rbac", "pass")
    category_id = str(test_data["category"].id)

    resp = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {dir_token}"},
        json={
            "title": "Director Task",
            "category_id": category_id,
            "assigned_to_id": str(test_data["director"].id),
        },
    )
    assert resp.status_code == 200
    task_id = resp.json()["id"]

    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {mgr_token}"},
        json={"status": "IN_PROGRESS"},
    )
    assert resp.status_code == 403


def test_manager_can_edit_self_assigned_task(
    client: TestClient, session: Session, test_data, manager_user
):
    """MANAGER can edit a task assigned to themselves."""
    dir_token = get_token(client, "director_rbac", "pass")
    mgr_token = get_token(client, "manager_rbac", "pass")
    category_id = str(test_data["category"].id)

    resp = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {dir_token}"},
        json={
            "title": "Manager Own Task",
            "category_id": category_id,
            "assigned_to_id": str(manager_user.id),
        },
    )
    assert resp.status_code == 200
    task_id = resp.json()["id"]

    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {mgr_token}"},
        json={"status": "IN_PROGRESS"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "IN_PROGRESS"


def test_manager_can_edit_unassigned_task(
    client: TestClient, session: Session, test_data, manager_user
):
    """MANAGER can edit a task with no assignee."""
    dir_token = get_token(client, "director_rbac", "pass")
    mgr_token = get_token(client, "manager_rbac", "pass")

    resp = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {dir_token}"},
        json={"title": "Unassigned Task", "category_id": str(test_data["category"].id)},
    )
    assert resp.status_code == 200
    task_id = resp.json()["id"]

    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {mgr_token}"},
        json={"status": "IN_PROGRESS"},
    )
    assert resp.status_code == 200


def test_manager_cannot_delete_task(
    client: TestClient, session: Session, test_data, manager_user
):
    """MANAGER gets 403 when trying to delete a task."""
    dir_token = get_token(client, "director_rbac", "pass")
    mgr_token = get_token(client, "manager_rbac", "pass")

    resp = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {dir_token}"},
        json={"title": "Task To Delete", "category_id": str(test_data["category"].id)},
    )
    task_id = resp.json()["id"]

    resp = client.delete(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {mgr_token}"},
    )
    assert resp.status_code == 403


def test_manager_visible_field_exists_on_task():
    """Task model must have a manager_visible boolean field defaulting to False."""
    from app.models.task import Task
    task = Task(title="t", created_by_id=__import__("uuid").uuid4())
    assert task.manager_visible is False


def test_task_read_schema_includes_manager_visible():
    """TaskRead schema must expose manager_visible."""
    from app.schemas.task import TaskRead
    assert "manager_visible" in TaskRead.model_fields


def test_task_update_schema_includes_manager_visible():
    """TaskUpdate schema must accept manager_visible."""
    from app.schemas.task import TaskUpdate
    update = TaskUpdate(manager_visible=True)
    assert update.manager_visible is True
