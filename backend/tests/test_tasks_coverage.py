import uuid

import pytest
from app.core.security import get_password_hash
from app.models.enums import TaskPriority, TaskStatus, UserRole
from app.models.task import Task
from app.models.user import User
from fastapi.testclient import TestClient
from sqlmodel import Session


def get_token(client, username, password):
    response = client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    return response.json()["access_token"]


@pytest.fixture(name="setup_data")
def setup_data_fixture(session: Session):
    admin = User(
        id=uuid.uuid4(),
        username="admin_cov",
        email="admin_cov@test.com",
        full_name="Admin Cov",
        hashed_password=get_password_hash("pass"),
        role=UserRole.ADMINISTRADOR,
    )
    director1 = User(
        id=uuid.uuid4(),
        username="dir1_cov",
        email="dir1_cov@test.com",
        full_name="Director 1",
        hashed_password=get_password_hash("pass"),
        role=UserRole.DIRETOR,
    )
    director2 = User(
        id=uuid.uuid4(),
        username="dir2_cov",
        email="dir2_cov@test.com",
        full_name="Director 2",
        hashed_password=get_password_hash("pass"),
        role=UserRole.DIRETOR,
    )
    session.add_all([admin, director1, director2])
    session.commit()

    task1 = Task(
        title="Task 1",
        status=TaskStatus.PENDING,
        priority=TaskPriority.LOW,
        assigned_to_id=director1.id,
        created_by_id=admin.id,
    )
    task2 = Task(
        title="Task 2",
        status=TaskStatus.IN_PROGRESS,
        priority=TaskPriority.MEDIUM,
        assigned_to_id=director2.id,
        created_by_id=admin.id,
    )
    session.add_all([task1, task2])
    session.commit()

    return {
        "admin": admin,
        "dir1": director1,
        "dir2": director2,
        "task1": task1,
        "task2": task2,
    }


def test_list_tasks_filters(client: TestClient, session: Session, setup_data):
    token = get_token(client, "admin_cov", "pass")

    # Filter by status
    response = client.get(
        "/api/v1/tasks/?status=PENDING", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Task 1"


def test_list_tasks_visibility(client: TestClient, session: Session, setup_data):
    # ADMINISTRADOR sees all tasks
    admin_token = get_token(client, "admin_cov", "pass")
    response = client.get(
        "/api/v1/tasks/", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert len(response.json()) == 2

    # DIRETOR only sees tasks assigned to them (dir1 is assigned task1 only)
    dir_token = get_token(client, "dir1_cov", "pass")
    response = client.get(
        "/api/v1/tasks/", headers={"Authorization": f"Bearer {dir_token}"}
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Task 1"


def test_delete_task_workflow(client: TestClient, session: Session, setup_data):
    token = get_token(client, "admin_cov", "pass")
    task_id = setup_data["task1"].id

    # Delete task
    response = client.delete(
        f"/api/v1/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204

    # Try to delete again (404)
    response = client.delete(
        f"/api/v1/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404

    # Try to update deleted task (404)
    response = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "New Title"},
    )
    assert response.status_code == 404

    # Try to get history of deleted task (404)
    response = client.get(
        f"/api/v1/tasks/{task_id}/history", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_history_not_found(client: TestClient, session: Session, setup_data):
    token = get_token(client, "admin_cov", "pass")
    random_id = uuid.uuid4()

    response = client.get(
        f"/api/v1/tasks/{random_id}/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
