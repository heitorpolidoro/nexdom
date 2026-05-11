import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session


def get_token(client, username, password):
    response = client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    return response.json()["access_token"]


def test_get_task_not_found(client: TestClient, session: Session, admin_user):
    token = get_token(client, "admin", "test_admin_password")
    random_id = uuid.uuid4()
    response = client.patch(
        f"/api/v1/tasks/{random_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "New Title"},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]
    assert str(random_id) in response.json()["detail"]


def test_create_task_validation_error(client: TestClient, session: Session, admin_user):
    token = get_token(client, "admin", "test_admin_password")
    # Title is required and must be min_length 1
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": ""},
    )
    assert response.status_code == 422


def test_update_task_validation_error(client: TestClient, session: Session, admin_user, default_category):
    token = get_token(client, "admin", "test_admin_password")

    # Create a task first
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Valid Task", "category_id": str(default_category.id)},
    )
    task_id = response.json()["id"]

    # Update with invalid status
    response = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "INVALID_STATUS"},
    )
    assert response.status_code == 422
