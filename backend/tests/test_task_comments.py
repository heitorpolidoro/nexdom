"""Tests for task comment endpoints: list, create, and update."""

import pytest
from app.models.category import Category
from app.models.task import TaskComment
from app.models.user import User
from fastapi.testclient import TestClient
from sqlmodel import Session


def _login(client: TestClient, username: str, password: str) -> str:
    """Return a bearer token for the given credentials."""
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": password},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _create_task(client: TestClient, token: str, category_id: str) -> str:
    """Create a task as the given user and return its ID."""
    resp = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Comment Test Task", "category_id": category_id},
    )
    assert resp.status_code == 200
    return resp.json()["id"]


@pytest.fixture(name="task_id")
def task_id_fixture(
    client: TestClient, normal_user: User, default_category: Category
) -> str:
    """Create a task owned by the director user and return its ID."""
    token = _login(client, "user1", "test_user_password")
    return _create_task(client, token, str(default_category.id))


class TestListComments:
    """Tests for GET /tasks/{task_id}/comments."""

    def test_list_comments_returns_empty_list(
        self, client: TestClient, admin_user: User, normal_user: User, task_id: str
    ):
        """Authenticated user gets an empty list when no comments exist."""
        token = _login(client, "admin", "test_admin_password")
        resp = client.get(
            f"/api/v1/tasks/{task_id}/comments",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_comments_returns_existing_comments(
        self,
        client: TestClient,
        session: Session,
        admin_user: User,
        normal_user: User,
        task_id: str,
    ):
        """Comments are returned in the list response."""
        import uuid
        from uuid import UUID

        comment = TaskComment(
            task_id=UUID(task_id),
            created_by_id=normal_user.id,
            content="Hello world",
        )
        session.add(comment)
        session.commit()

        token = _login(client, "admin", "test_admin_password")
        resp = client.get(
            f"/api/v1/tasks/{task_id}/comments",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["content"] == "Hello world"

    def test_list_comments_404_for_missing_task(
        self, client: TestClient, admin_user: User
    ):
        """Returns 404 when the task does not exist."""
        import uuid

        token = _login(client, "admin", "test_admin_password")
        resp = client.get(
            f"/api/v1/tasks/{uuid.uuid4()}/comments",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    def test_list_comments_requires_auth(
        self, client: TestClient, task_id: str, admin_user: User
    ):
        """Unauthenticated request is rejected."""
        resp = client.get(f"/api/v1/tasks/{task_id}/comments")
        assert resp.status_code == 401


class TestCreateComment:
    """Tests for POST /tasks/{task_id}/comments."""

    def test_create_comment_succeeds(
        self, client: TestClient, admin_user: User, normal_user: User, task_id: str
    ):
        """Any authenticated user can create a comment."""
        token = _login(client, "user1", "test_user_password")
        resp = client.post(
            f"/api/v1/tasks/{task_id}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "My first comment"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "My first comment"
        assert data["created_by_id"] == str(normal_user.id)

    def test_create_comment_404_for_missing_task(
        self, client: TestClient, admin_user: User
    ):
        """Returns 404 when the task does not exist."""
        import uuid

        token = _login(client, "admin", "test_admin_password")
        resp = client.post(
            f"/api/v1/tasks/{uuid.uuid4()}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Orphan comment"},
        )
        assert resp.status_code == 404

    def test_create_comment_requires_auth(
        self, client: TestClient, task_id: str, admin_user: User
    ):
        """Unauthenticated request is rejected."""
        resp = client.post(
            f"/api/v1/tasks/{task_id}/comments",
            json={"content": "No auth"},
        )
        assert resp.status_code == 401

    def test_create_comment_empty_content_rejected(
        self, client: TestClient, admin_user: User, normal_user: User, task_id: str
    ):
        """Empty content is rejected with a validation error."""
        token = _login(client, "user1", "test_user_password")
        resp = client.post(
            f"/api/v1/tasks/{task_id}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": ""},
        )
        assert resp.status_code == 422


class TestDirectorFieldRestriction:
    """Tests for director field restriction on task updates (line 102)."""

    def test_director_cannot_update_title(
        self, client: TestClient, admin_user: User, normal_user: User, task_id: str
    ):
        """Director gets 403 when attempting to update restricted fields like title."""
        token = _login(client, "user1", "test_user_password")
        resp = client.patch(
            f"/api/v1/tasks/{task_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "Sneaky title change"},
        )
        assert resp.status_code == 403


class TestUpdateComment:
    """Tests for PATCH /tasks/{task_id}/comments/{comment_id}."""

    @pytest.fixture(name="comment_id")
    def comment_id_fixture(
        self,
        client: TestClient,
        admin_user: User,
        normal_user: User,
        task_id: str,
    ) -> str:
        """Create a comment as the director user and return its ID."""
        token = _login(client, "user1", "test_user_password")
        resp = client.post(
            f"/api/v1/tasks/{task_id}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Original content"},
        )
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_author_can_edit_comment(
        self,
        client: TestClient,
        admin_user: User,
        normal_user: User,
        task_id: str,
        comment_id: str,
    ):
        """Comment author can edit their own comment."""
        token = _login(client, "user1", "test_user_password")
        resp = client.patch(
            f"/api/v1/tasks/{task_id}/comments/{comment_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Updated content"},
        )
        assert resp.status_code == 200
        assert resp.json()["content"] == "Updated content"

    def test_non_author_cannot_edit_comment(
        self,
        client: TestClient,
        admin_user: User,
        normal_user: User,
        task_id: str,
        comment_id: str,
    ):
        """Non-author gets 403 when trying to edit a comment."""
        token = _login(client, "admin", "test_admin_password")
        resp = client.patch(
            f"/api/v1/tasks/{task_id}/comments/{comment_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Hijacked content"},
        )
        assert resp.status_code == 403

    def test_update_comment_404_for_missing_task(
        self,
        client: TestClient,
        admin_user: User,
        normal_user: User,
        task_id: str,
        comment_id: str,
    ):
        """Returns 404 when the task does not exist."""
        import uuid

        token = _login(client, "user1", "test_user_password")
        resp = client.patch(
            f"/api/v1/tasks/{uuid.uuid4()}/comments/{comment_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Updated"},
        )
        assert resp.status_code == 404

    def test_update_comment_404_for_missing_comment(
        self, client: TestClient, admin_user: User, normal_user: User, task_id: str
    ):
        """Returns 404 when the comment does not exist."""
        import uuid

        token = _login(client, "user1", "test_user_password")
        resp = client.patch(
            f"/api/v1/tasks/{task_id}/comments/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Updated"},
        )
        assert resp.status_code == 404

    def test_update_comment_requires_auth(
        self,
        client: TestClient,
        admin_user: User,
        normal_user: User,
        task_id: str,
        comment_id: str,
    ):
        """Unauthenticated request is rejected."""
        resp = client.patch(
            f"/api/v1/tasks/{task_id}/comments/{comment_id}",
            json={"content": "Updated"},
        )
        assert resp.status_code == 401
