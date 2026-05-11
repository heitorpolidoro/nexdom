import uuid
import importlib
from unittest.mock import patch

import pytest
from app.core import security
from app.core.config import settings
from app.models.enums import TaskStatus, UserRole
from app.models.task import Task
from app.models.user import User
from app.services.task_service import TaskService
from fastapi import status


def test_signup_duplicate_email(client, session):
    """Test signup with an email that already exists."""
    # Create a user first
    existing_user = User(
        username="existing_user",
        email="duplicate@example.com",
        full_name="Existing User",
        hashed_password="...",
        role=UserRole.DIRECTOR,
        is_active=True,
    )
    session.add(existing_user)
    session.commit()

    # Try to signup with same email
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "username": "new_user",
            "email": "duplicate@example.com",
            "full_name": "New User",
            "password": "Password123!",
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "email already exists" in response.json()["detail"]


def test_dev_users_success(client, session):
    """Test get_dev_users in development environment."""
    with patch("app.api.v1.endpoints.auth.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "development"
        response = client.get("/api/v1/auth/dev-users")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)


def test_dev_users_not_found(client):
    """Test get_dev_users in non-development environment."""
    with patch("app.api.v1.endpoints.auth.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "production"
        response = client.get("/api/v1/auth/dev-users")
        assert response.status_code == status.HTTP_404_NOT_FOUND


def test_dev_login_success(client, session, normal_user):
    """Test dev_login in development environment."""
    with patch("app.api.v1.endpoints.auth.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "development"
        response = client.post(
            f"/api/v1/auth/dev-login?username={normal_user.username}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()


def test_dev_login_not_found_env(client, normal_user):
    """Test dev_login in non-development environment."""
    with patch("app.api.v1.endpoints.auth.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "production"
        response = client.post(
            f"/api/v1/auth/dev-login?username={normal_user.username}"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


def test_dev_login_user_not_found(client):
    """Test dev_login with non-existent user."""
    with patch("app.api.v1.endpoints.auth.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "development"
        response = client.post("/api/v1/auth/dev-login?username=nonexistent")
        assert response.status_code == status.HTTP_404_NOT_FOUND


def test_dev_login_inactive_user(client, session):
    """Test dev_login with inactive user."""
    inactive_user = User(
        username="inactive_dev",
        email="inactive_dev@example.com",
        full_name="Inactive Dev",
        hashed_password="...",
        role=UserRole.DIRECTOR,
        is_active=False,
    )
    session.add(inactive_user)
    session.commit()

    with patch("app.api.v1.endpoints.auth.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "development"
        response = client.post(
            f"/api/v1/auth/dev-login?username={inactive_user.username}"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Inactive user" in response.json()["detail"]


def test_get_task_history_rbac_failure(client, session, normal_user, default_category):
    """Test DIRECTOR trying to view history of a task not assigned to them."""
    # Create a task assigned to someone else
    other_user_id = uuid.uuid4()
    task = Task(
        title="Other Task",
        description="...",
        created_by_id=other_user_id,
        assigned_to_id=other_user_id,
        category_id=default_category.id,
    )
    session.add(task)
    session.commit()
    session.refresh(task)

    token = security.create_access_token(normal_user.id)
    response = client.get(
        f"/api/v1/tasks/{task.id}/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_read_users_filter_active(client, admin_user):
    """Test reading users with is_active filter."""
    token = security.create_access_token(admin_user.id)
    response = client.get(
        "/api/v1/users/?is_active=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    users = response.json()
    assert all(u["is_active"] for u in users)


def test_update_user_not_found(client, admin_user):
    """Test updating a non-existent user."""
    token = security.create_access_token(admin_user.id)
    response = client.patch(
        f"/api/v1/users/{uuid.uuid4()}",
        json={"is_active": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_self_admin_deactivate_fail(client, admin_user):
    """Test admin trying to deactivate themselves."""
    token = security.create_access_token(admin_user.id)
    response = client.patch(
        f"/api/v1/users/{admin_user.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "cannot deactivate themselves" in response.json()["detail"]


def test_update_self_admin_change_role_fail(client, admin_user):
    """Test admin trying to change their own role."""
    token = security.create_access_token(admin_user.id)
    response = client.patch(
        f"/api/v1/users/{admin_user.id}",
        json={"role": UserRole.DIRECTOR},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "cannot change their own role" in response.json()["detail"]


def test_update_task_service_rbac_failures(session, normal_user, default_category):
    """Test TaskService.update_task RBAC failures directly."""
    task = Task(
        title="Task",
        description="...",
        created_by_id=uuid.uuid4(),
        assigned_to_id=uuid.uuid4(),  # Not normal_user
        category_id=default_category.id,
    )
    from app.schemas.task import TaskUpdate

    # Test updating task not assigned to them
    with pytest.raises(Exception) as excinfo:
        TaskService.update_task(
            session=session,
            db_task=task,
            task_in=TaskUpdate(status=TaskStatus.COMPLETED),
            current_user=normal_user,
        )
    # The actual exception might be ForbiddenError or wrapped
    assert "ForbiddenError" in str(excinfo.type) or "Not enough privileges" in str(
        excinfo.value
    )

    # Test updating non-status field
    task.assigned_to_id = normal_user.id
    with pytest.raises(Exception) as excinfo:
        TaskService.update_task(
            session=session,
            db_task=task,
            task_in=TaskUpdate(title="New Title"),
            current_user=normal_user,
        )
    assert "ForbiddenError" in str(excinfo.type) or "Not enough privileges" in str(
        excinfo.value
    )


def test_security_get_token_expiration_remember_me():
    """Test get_token_expiration with remember_me=True (line 24)."""
    delta = security.get_token_expiration(remember_me=True)
    assert delta.days == 7


def test_get_origins_json_string():
    """Test get_origins with a JSON string."""
    from app.main import get_origins
    with patch("app.main.settings") as mock_settings:
        mock_settings.BACKEND_CORS_ORIGINS = '["http://test.com"]'
        origins = get_origins()
        assert "http://test.com" in origins


def test_get_origins_comma_string():
    """Test get_origins with a comma-separated string."""
    from app.main import get_origins
    with patch("app.main.settings") as mock_settings:
        mock_settings.BACKEND_CORS_ORIGINS = "http://test1.com, http://test2.com"
        origins = get_origins()
        assert "http://test1.com" in origins
        assert "http://test2.com" in origins


def test_get_origins_list_without_dev():
    """Test get_origins with a list."""
    from app.main import get_origins
    with patch("app.main.settings") as mock_settings:
        mock_settings.BACKEND_CORS_ORIGINS = ["http://test.com"]
        origins = get_origins()
        assert "http://test.com" in origins


def test_get_origins_list_with_dev():
    """Test get_origins with a list that already includes the dev origin."""
    from app.main import get_origins
    with patch("app.main.settings") as mock_settings:
        mock_settings.BACKEND_CORS_ORIGINS = ["http://localhost:5175", "http://test.com"]
        origins = get_origins()
        assert "http://test.com" in origins
        assert "http://localhost:5175" in origins
        # Should not have duplicate
        assert origins.count("http://localhost:5175") == 1


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
