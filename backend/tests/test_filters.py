from fastapi.testclient import TestClient
from sqlmodel import Session


def get_token(client, username, password):
    response = client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    return response.json()["access_token"]


def test_list_tasks_filters(
    client: TestClient, session: Session, admin_user, normal_user, default_category
):
    token = get_token(client, "admin", "test_admin_password")

    # Create tasks with different properties
    client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Task 1",
            "status": "IN_PROGRESS",
            "priority": "HIGH",
            "category_id": str(default_category.id),
        },
    )
    client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Task 2",
            "status": "PENDING",
            "priority": "LOW",
            "assigned_to_id": str(normal_user.id),
            "category_id": str(default_category.id),
        },
    )

    # Test filter by status
    response = client.get(
        "/api/v1/tasks/?status=IN_PROGRESS",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Task 1"

    # Test filter by priority
    response = client.get(
        "/api/v1/tasks/?priority=LOW", headers={"Authorization": f"Bearer {token}"}
    )
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Task 2"

    # Test filter by assigned_to_id
    response = client.get(
        f"/api/v1/tasks/?assigned_to_id={normal_user.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Task 2"

    # Test combined filters
    response = client.get(
        "/api/v1/tasks/?status=PENDING&priority=LOW",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Task 2"
