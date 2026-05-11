from fastapi.testclient import TestClient
from sqlmodel import Session


def get_token(client, username, password):
    response = client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    return response.json()["access_token"]


def test_soft_delete_flow(client: TestClient, session: Session, admin_user, default_category):
    token = get_token(client, "admin", "test_admin_password")

    # 1. Create a task
    create_response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Task to delete", "category_id": str(default_category.id)},
    )
    task_id = create_response.json()["id"]

    # 2. List tasks - should be present
    list_response = client.get(
        "/api/v1/tasks/", headers={"Authorization": f"Bearer {token}"}
    )
    assert any(t["id"] == task_id for t in list_response.json())

    # 3. Delete task (Soft Delete)
    delete_response = client.delete(
        f"/api/v1/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert delete_response.status_code == 204

    # 4. List tasks - should NOT be present
    list_response_after = client.get(
        "/api/v1/tasks/", headers={"Authorization": f"Bearer {token}"}
    )
    assert not any(t["id"] == task_id for t in list_response_after.json())

    # 5. Get history - should show the deletion
    history_response = client.get(
        f"/api/v1/tasks/{task_id}/history", headers={"Authorization": f"Bearer {token}"}
    )
    # Note: Our update_task/get_history endpoints now block deleted tasks.
    # Let's verify it returns 404
    assert history_response.status_code == 404


def test_delete_unauthorized(
    client: TestClient, session: Session, normal_user, admin_user, default_category
):
    # Create task as admin
    admin_token = get_token(client, "admin", "test_admin_password")
    create_response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"title": "Admin Task", "category_id": str(default_category.id)},
    )
    task_id = create_response.json()["id"]

    # Try to delete as normal user
    user_token = get_token(client, "user1", "test_user_password")
    delete_response = client.delete(
        f"/api/v1/tasks/{task_id}", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert delete_response.status_code == 403
