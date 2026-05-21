from fastapi.testclient import TestClient
from sqlmodel import Session


def get_token(client, username, password):
    response = client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    return response.json()["access_token"]


def test_e2e_task_lifecycle(
    client: TestClient, session: Session, admin_user, normal_user, default_category
):
    # 1. Login as Director (only directors can create tasks)
    director_token = get_token(client, "user1", "test_user_password")
    admin_token = get_token(client, "admin", "test_admin_password")

    # 2. Create Task as Director
    create_resp = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {director_token}"},
        json={
            "title": "E2E Task",
            "description": "Testing full flow",
            "priority": "HIGH",
            "assigned_to_id": str(normal_user.id),
            "category_id": str(default_category.id),
        },
    )
    assert create_resp.status_code == 200
    task_id = create_resp.json()["id"]

    # 3. List Tasks as Admin
    list_resp = client.get(
        "/api/v1/tasks/", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert any(t["id"] == task_id for t in list_resp.json())

    # 4. Update Task status as Director
    update_resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {director_token}"},
        json={"status": "COMPLETED"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "COMPLETED"

    # 5. Read History as Admin
    history_resp = client.get(
        f"/api/v1/tasks/{task_id}/history",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert any(
        h["field_name"] == "status" and h["new_value"] == "COMPLETED" for h in history
    )
    assert history[0]["user_name"] == "Normal User"
