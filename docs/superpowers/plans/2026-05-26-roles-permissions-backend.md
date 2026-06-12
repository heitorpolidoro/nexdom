# Roles, Permissões e Audit — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the MANAGER role, reorganize endpoint permissions, and enrich task history with resolved user names for `assigned_to_id` entries.

**Architecture:** Additive changes only — new enum value via Alembic migration, permission logic updated in-place in the existing endpoint functions, history enrichment added to `TaskService.get_history()`. No new files needed beyond the migration.

**Tech Stack:** Python 3.12, FastAPI, SQLModel, PostgreSQL, Alembic, pytest

**Spec:** `docs/superpowers/specs/2026-05-26-roles-permissions-audit-design.md`

---

## File Map

| File | Change |
|---|---|
| `backend/app/models/enums.py` | Add `MANAGER` to `UserRole` |
| `backend/alembic/versions/0004_add_manager_role.py` | Migrate PostgreSQL enum |
| `backend/app/api/deps.py` | Remove `get_current_active_director`, add `assert_can_edit_task()` |
| `backend/app/api/v1/endpoints/tasks.py` | Open `create_task` to all auth users; add MANAGER ownership check to `update_task` |
| `backend/app/api/v1/endpoints/categories.py` | Block MANAGER from create/update/delete |
| `backend/app/schemas/task.py` | Add `resolved_old_value` and `resolved_new_value` to `TaskHistoryRead` |
| `backend/app/services/task_service.py` | Resolve `assigned_to_id` UUID in `get_history()` |
| `backend/app/seed.py` | Add a manager user |
| `backend/tests/conftest.py` | Add `manager_user` fixture |
| `backend/tests/test_tasks_api.py` | Remove now-invalid test for director-only create |
| `backend/tests/test_tasks_rbac.py` | Add MANAGER cases |
| `backend/tests/test_categories.py` | Add DIRECTOR can create/edit; MANAGER cannot |

---

## Task 1: Add MANAGER to the UserRole enum + Alembic migration

**Files:**
- Modify: `backend/app/models/enums.py`
- Create: `backend/alembic/versions/0004_add_manager_role.py`

- [ ] **Step 1: Write the failing test**

  ```python
  # Add to backend/tests/test_tasks_rbac.py (before the test_data fixture)
  def test_manager_role_value_exists():
      """MANAGER must exist as a valid UserRole value."""
      from app.models.enums import UserRole
      assert UserRole.MANAGER == "MANAGER"
  ```

- [ ] **Step 2: Run it to confirm it fails**

  ```bash
  cd backend && uv run pytest tests/test_tasks_rbac.py::test_manager_role_value_exists -v
  ```

  Expected: `AttributeError: MANAGER`

- [ ] **Step 3: Add MANAGER to the enum**

  Edit `backend/app/models/enums.py` — add `MANAGER` after `DIRECTOR`:

  ```python
  class UserRole(StrEnum):
      """Enumeration for user roles."""

      ADMINISTRATOR = "ADMINISTRATOR"
      DIRECTOR = "DIRECTOR"
      MANAGER = "MANAGER"
  ```

- [ ] **Step 4: Create the Alembic migration**

  Create `backend/alembic/versions/0004_add_manager_role.py`:

  ```python
  """Add MANAGER value to userrole enum."""

  from alembic import op

  revision = "0004"
  down_revision = "0003"
  branch_labels = None
  depends_on = None


  def upgrade() -> None:
      """Add MANAGER to the userrole PostgreSQL enum type."""
      op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'MANAGER'")


  def downgrade() -> None:
      """Cannot remove an enum value in PostgreSQL without recreating the type.
      Left intentionally as no-op; remove manually if needed."""
  ```

- [ ] **Step 5: Run the test to confirm it passes**

  ```bash
  cd backend && uv run pytest tests/test_tasks_rbac.py::test_manager_role_value_exists -v
  ```

  Expected: `PASSED`

- [ ] **Step 6: Run the full test suite to confirm no regressions**

  ```bash
  cd backend && uv run pytest -x -q
  ```

  Expected: All tests pass. (Migration only runs on a real DB; SQLite tests use the enum string directly.)

- [ ] **Step 7: Commit**

  ```bash
  git add backend/app/models/enums.py backend/alembic/versions/0004_add_manager_role.py backend/tests/test_tasks_rbac.py
  git commit -m "feat(backend): add MANAGER to UserRole enum + Alembic migration"
  ```

---

## Task 2: Update `deps.py` — remove director guard, add task-edit helper

**Files:**
- Modify: `backend/app/api/deps.py`

- [ ] **Step 1: Write the failing test**

  Add to `backend/tests/test_tasks_rbac.py` (inside the existing `test_data` fixture scope, after it):

  ```python
  def test_assert_can_edit_task_allows_admin(session: Session, test_data):
      """ADMINISTRATOR can always edit any task."""
      from app.api.deps import assert_can_edit_task
      from app.models.task import Task
      admin = test_data["admin"]
      task = Task(
          title="T",
          category_id=test_data["category"].id,
          created_by_id=admin.id,
          assigned_to_id=test_data["director"].id,  # assigned to someone else
      )
      session.add(task)
      session.commit()
      # Should not raise
      assert_can_edit_task(admin, task)


  def test_assert_can_edit_task_manager_unassigned(session: Session, test_data):
      """MANAGER can edit tasks with no assignee."""
      from app.api.deps import assert_can_edit_task
      from app.models.enums import UserRole
      from app.models.task import Task
      manager = test_data.get("manager")
      if manager is None:
          import uuid
          from app.core.security import get_password_hash
          from app.models.user import User
          manager = User(
              id=uuid.uuid4(),
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
      from app.api.deps import assert_can_edit_task
      from app.core.exceptions import ForbiddenError
      from app.models.enums import UserRole
      from app.models.task import Task
      import uuid
      from app.core.security import get_password_hash
      from app.models.user import User
      manager = User(
          id=uuid.uuid4(),
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
      import pytest
      with pytest.raises(ForbiddenError):
          assert_can_edit_task(manager, task)
  ```

- [ ] **Step 2: Run to confirm failure**

  ```bash
  cd backend && uv run pytest tests/test_tasks_rbac.py::test_assert_can_edit_task_allows_admin -v
  ```

  Expected: `ImportError: cannot import name 'assert_can_edit_task' from 'app.api.deps'`

- [ ] **Step 3: Implement the changes in `deps.py`**

  Replace the entire `get_current_active_director` function with `assert_can_edit_task`. The final `deps.py` after the edit:

  ```python
  """
  Authentication and authorization dependencies for the API.
  """

  import uuid
  from typing import Annotated

  from app.core.config import settings
  from app.core.exceptions import ForbiddenError
  from app.db import get_session
  from app.models.enums import UserRole
  from app.models.task import Task
  from app.models.user import User
  from fastapi import Depends, HTTPException, status
  from fastapi.security import OAuth2PasswordBearer
  from jose import JWTError, jwt
  from pydantic import ValidationError
  from sqlmodel import Session

  reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


  def get_current_user(
      session: Annotated[Session, Depends(get_session)],
      token: Annotated[str, Depends(reusable_oauth2)],
  ) -> User:
      """
      Retrieve the current authenticated user from the JWT token.

      Args:
          session: Database session.
          token: JWT access token.

      Returns:
          User: The authenticated user object.

      Raises:
          HTTPException: If token is invalid, expired, or user not found.
      """
      all_keys = [settings.SECRET_KEY, *settings.SECRET_KEYS]
      payload = None

      for key in all_keys:
          try:
              payload = jwt.decode(token, key, algorithms=[settings.ALGORITHM])
              break
          except (JWTError, ValidationError):
              continue

      credentials_exception = HTTPException(
          status_code=status.HTTP_403_FORBIDDEN,
          detail="Could not validate credentials",
      )

      if payload is None:
          raise credentials_exception

      try:
          user_id: str = payload.get("sub")
          if user_id is None:
              raise credentials_exception
          token_data = uuid.UUID(user_id)
      except ValueError as err:
          raise credentials_exception from err
      user = session.get(User, token_data)
      if not user:
          raise HTTPException(
              status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
          )
      if not user.is_active:
          raise HTTPException(
              status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
          )
      return user


  def get_current_active_admin(
      current_user: Annotated[User, Depends(get_current_user)],
  ) -> User:
      """
      Verify the current user has the ADMINISTRATOR role.

      Args:
          current_user: The authenticated user.

      Returns:
          User: The user if they have the administrator role.

      Raises:
          HTTPException: If the user role is not ADMINISTRATOR.
      """
      if current_user.role != UserRole.ADMINISTRATOR:
          raise HTTPException(
              status_code=status.HTTP_403_FORBIDDEN,
              detail="The user doesn't have enough privileges",
          )
      return current_user


  def assert_can_edit_task(current_user: User, task: Task) -> None:
      """Raise ForbiddenError if MANAGER tries to edit a task not assigned to them.

      ADMINISTRATOR and DIRECTOR may edit any task.
      MANAGER may only edit tasks that are unassigned or assigned to themselves.

      Args:
          current_user: The authenticated user making the request.
          task: The task being edited.

      Raises:
          ForbiddenError: If a MANAGER attempts to edit a task assigned to another user.
      """
      if current_user.role == UserRole.MANAGER:
          if task.assigned_to_id is not None and task.assigned_to_id != current_user.id:
              raise ForbiddenError(
                  "Managers can only edit unassigned or self-assigned tasks"
              )
  ```

- [ ] **Step 4: Run the new tests**

  ```bash
  cd backend && uv run pytest tests/test_tasks_rbac.py::test_assert_can_edit_task_allows_admin tests/test_tasks_rbac.py::test_assert_can_edit_task_manager_unassigned tests/test_tasks_rbac.py::test_assert_can_edit_task_manager_other_user_raises -v
  ```

  Expected: All 3 PASSED

- [ ] **Step 5: Run full test suite**

  ```bash
  cd backend && uv run pytest -x -q
  ```

  Expected: All pass. (`get_current_active_director` is still referenced in `tasks.py` — check for import errors.)

  > ⚠️ If you see `ImportError: cannot import name 'get_current_active_director'`, proceed to Task 3 immediately.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/app/api/deps.py backend/tests/test_tasks_rbac.py
  git commit -m "feat(backend): replace director guard with assert_can_edit_task helper"
  ```

---

## Task 3: Update task and category endpoints

**Files:**
- Modify: `backend/app/api/v1/endpoints/tasks.py`
- Modify: `backend/app/api/v1/endpoints/categories.py`
- Modify: `backend/tests/test_tasks_api.py` (remove one now-invalid test)

### 3a — tasks.py

- [ ] **Step 1: Write the failing tests**

  Add to `backend/tests/test_tasks_rbac.py`:

  ```python
  @pytest.fixture(name="manager_user")
  def manager_user_fixture(session: Session):
      """Create and persist a MANAGER user for tests."""
      import uuid
      from app.core.security import get_password_hash
      from app.models.user import User
      user = User(
          id=uuid.uuid4(),
          username="manager_rbac",
          email="manager_rbac@test.com",
          full_name="Manager Test",
          hashed_password=get_password_hash("pass"),
          role=UserRole.MANAGER,
      )
      session.add(user)
      session.commit()
      return user


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

      # Director creates a task assigned to themselves (not the manager)
      resp = client.post(
          "/api/v1/tasks/",
          headers={"Authorization": f"Bearer {dir_token}"},
          json={
              "title": "Director's Task",
              "category_id": category_id,
              "assigned_to_id": str(test_data["director"].id),
          },
      )
      assert resp.status_code == 200
      task_id = resp.json()["id"]

      # Manager tries to edit — should get 403
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

      # Director creates a task assigned to the manager
      resp = client.post(
          "/api/v1/tasks/",
          headers={"Authorization": f"Bearer {dir_token}"},
          json={
              "title": "Manager's Task",
              "category_id": category_id,
              "assigned_to_id": str(manager_user.id),
          },
      )
      assert resp.status_code == 200
      task_id = resp.json()["id"]

      # Manager edits — should succeed
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
      category_id = str(test_data["category"].id)

      resp = client.post(
          "/api/v1/tasks/",
          headers={"Authorization": f"Bearer {dir_token}"},
          json={"title": "Unassigned Task", "category_id": category_id},
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
  ```

- [ ] **Step 2: Run to confirm they fail**

  ```bash
  cd backend && uv run pytest tests/test_tasks_rbac.py::test_manager_can_create_task -v
  ```

  Expected: `403` (because create_task still uses `get_current_active_director`)

- [ ] **Step 3: Update `tasks.py`**

  In `backend/app/api/v1/endpoints/tasks.py`, make these two changes:

  **`create_task`** — change dependency from `get_current_active_director` to `get_current_user`:
  ```python
  @router.post("/", response_model=TaskRead)
  def create_task(
      task_in: TaskCreate,
      session: Annotated[Session, Depends(get_session)],
      current_user: Annotated[User, Depends(api_deps.get_current_user)],
  ) -> TaskRead:
      """Create a new task. Any authenticated user can create tasks."""
      db_task = TaskService.create_task(
          session=session, task_in=task_in, created_by_id=current_user.id
      )
      return TaskService.get_task_with_names(session=session, db_task=db_task)
  ```

  **`update_task`** — replace the DIRECTOR field restriction with the MANAGER ownership check:
  ```python
  @router.patch("/{task_id}", response_model=TaskRead)
  def update_task(
      task_id: UUID,
      task_in: TaskUpdate,
      session: Annotated[Session, Depends(get_session)],
      current_user: Annotated[User, Depends(api_deps.get_current_user)],
  ) -> TaskRead:
      """Update an existing task."""
      db_task = session.get(Task, task_id)
      if not db_task or db_task.is_deleted:
          raise TaskNotFoundError(task_id)

      api_deps.assert_can_edit_task(current_user, db_task)

      updated_task = TaskService.update_task(
          session=session, db_task=db_task, task_in=task_in, current_user=current_user
      )
      return TaskService.get_task_with_names(session=session, db_task=updated_task)
  ```

  Also remove the now-unused import of `UserRole` at the top of `tasks.py` (keep other imports):
  ```python
  from app.models.enums import TaskPriority, TaskStatus
  ```
  (Remove `UserRole` from that line.)

- [ ] **Step 4: Remove the now-invalid test from `test_tasks_api.py`**

  The test `test_non_director_cannot_create_task` asserts that ADMINISTRATOR gets 403 when creating a task. After the change, ADMINISTRATOR CAN create tasks, so this test is wrong. Delete the entire function from `backend/tests/test_tasks_api.py`.

- [ ] **Step 5: Run the new tests**

  ```bash
  cd backend && uv run pytest tests/test_tasks_rbac.py -v
  ```

  Expected: All PASSED

### 3b — categories.py

- [ ] **Step 6: Write failing tests for categories RBAC**

  Add to `backend/tests/test_categories.py` (find the existing file and append):

  ```python
  def test_director_can_create_category(client: TestClient, session: Session, normal_user, admin_user):
      """DIRECTOR can create categories."""
      response = client.post(
          "/api/v1/auth/login",
          data={"username": "user1", "password": "test_user_password"},
      )
      token = response.json()["access_token"]
      resp = client.post(
          "/api/v1/categories/",
          headers={"Authorization": f"Bearer {token}"},
          json={"name": "Dir Category", "color": "#ff0000"},
      )
      assert resp.status_code == 201


  def test_director_can_update_category(client: TestClient, session: Session, normal_user, admin_user):
      """DIRECTOR can update categories."""
      # admin creates first
      resp = client.post(
          "/api/v1/auth/login",
          data={"username": "admin", "password": "test_admin_password"},
      )
      admin_token = resp.json()["access_token"]
      cat_resp = client.post(
          "/api/v1/categories/",
          headers={"Authorization": f"Bearer {admin_token}"},
          json={"name": "To Update", "color": "#ff0000"},
      )
      cat_id = cat_resp.json()["id"]

      resp = client.post(
          "/api/v1/auth/login",
          data={"username": "user1", "password": "test_user_password"},
      )
      dir_token = resp.json()["access_token"]
      resp = client.patch(
          f"/api/v1/categories/{cat_id}",
          headers={"Authorization": f"Bearer {dir_token}"},
          json={"name": "Updated"},
      )
      assert resp.status_code == 200


  def test_manager_cannot_create_category(client: TestClient, session: Session, admin_user):
      """MANAGER gets 403 when trying to create a category."""
      import uuid
      from app.core.security import get_password_hash
      from app.models.enums import UserRole
      from app.models.user import User
      manager = User(
          id=uuid.uuid4(),
          username="mgr_cat",
          email="mgr_cat@test.com",
          full_name="Manager Cat",
          hashed_password=get_password_hash("pass"),
          role=UserRole.MANAGER,
      )
      session.add(manager)
      session.commit()

      resp = client.post(
          "/api/v1/auth/login",
          data={"username": "mgr_cat", "password": "pass"},
      )
      token = resp.json()["access_token"]
      resp = client.post(
          "/api/v1/categories/",
          headers={"Authorization": f"Bearer {token}"},
          json={"name": "Manager Category", "color": "#ff0000"},
      )
      assert resp.status_code == 403


  def test_manager_cannot_update_category(client: TestClient, session: Session, admin_user):
      """MANAGER gets 403 when trying to update a category."""
      import uuid
      from app.core.security import get_password_hash
      from app.models.enums import UserRole
      from app.models.user import User
      manager = User(
          id=uuid.uuid4(),
          username="mgr_cat2",
          email="mgr_cat2@test.com",
          full_name="Manager Cat2",
          hashed_password=get_password_hash("pass"),
          role=UserRole.MANAGER,
      )
      session.add(manager)
      session.commit()

      # admin creates a category
      resp = client.post(
          "/api/v1/auth/login",
          data={"username": "admin", "password": "test_admin_password"},
      )
      admin_token = resp.json()["access_token"]
      cat_resp = client.post(
          "/api/v1/categories/",
          headers={"Authorization": f"Bearer {admin_token}"},
          json={"name": "Protected", "color": "#ff0000"},
      )
      cat_id = cat_resp.json()["id"]

      resp = client.post(
          "/api/v1/auth/login",
          data={"username": "mgr_cat2", "password": "pass"},
      )
      token = resp.json()["access_token"]
      resp = client.patch(
          f"/api/v1/categories/{cat_id}",
          headers={"Authorization": f"Bearer {token}"},
          json={"name": "Hacked"},
      )
      assert resp.status_code == 403
  ```

- [ ] **Step 7: Run to confirm they fail**

  ```bash
  cd backend && uv run pytest tests/test_categories.py::test_manager_cannot_create_category -v
  ```

  Expected: `AssertionError: 201 != 403`

- [ ] **Step 8: Update `categories.py`**

  Add a role check to `create_category`, `update_category`, and `delete_category`. Import `UserRole` and `HTTPException` (already imported). The updated endpoints:

  ```python
  """Category management API endpoints."""

  from typing import Annotated
  from uuid import UUID

  from app.api import deps as api_deps
  from app.db import get_session
  from app.models.category import Category
  from app.models.enums import UserRole
  from app.models.user import User
  from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
  from app.services.category_service import CategoryService
  from fastapi import APIRouter, Depends, HTTPException, status
  from sqlmodel import Session

  router = APIRouter()

  _CATEGORY_WRITE_ROLES = {UserRole.ADMINISTRATOR, UserRole.DIRECTOR}


  def _require_category_write_permission(current_user: User) -> None:
      """Raise 403 if the user does not have permission to write categories."""
      if current_user.role not in _CATEGORY_WRITE_ROLES:
          raise HTTPException(
              status_code=status.HTTP_403_FORBIDDEN,
              detail="Only ADMINISTRATOR and DIRECTOR can manage categories",
          )


  @router.get("/", response_model=list[CategoryRead])
  def list_categories(
      session: Annotated[Session, Depends(get_session)],
      current_user: Annotated[User, Depends(api_deps.get_current_user)],
  ) -> list[CategoryRead]:
      """List all active categories. All authenticated users can see categories."""
      return CategoryService.get_categories(session=session)


  @router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
  def create_category(
      category_in: CategoryCreate,
      session: Annotated[Session, Depends(get_session)],
      current_user: Annotated[User, Depends(api_deps.get_current_user)],
  ) -> CategoryRead:
      """Create a new category. ADMINISTRATOR and DIRECTOR only."""
      _require_category_write_permission(current_user)
      return CategoryService.create_category(session=session, category_in=category_in)


  @router.patch("/{category_id}", response_model=CategoryRead)
  def update_category(
      category_id: UUID,
      category_in: CategoryUpdate,
      session: Annotated[Session, Depends(get_session)],
      current_user: Annotated[User, Depends(api_deps.get_current_user)],
  ) -> CategoryRead:
      """Update a category. ADMINISTRATOR and DIRECTOR only."""
      _require_category_write_permission(current_user)
      db_category = session.get(Category, category_id)
      if not db_category:
          raise HTTPException(status_code=404, detail="Category not found")
      return CategoryService.update_category(
          session=session, db_category=db_category, category_in=category_in
      )


  @router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
  def delete_category(
      category_id: UUID,
      session: Annotated[Session, Depends(get_session)],
      current_user: Annotated[User, Depends(api_deps.get_current_user)],
  ) -> None:
      """Deactivate a category. ADMINISTRATOR and DIRECTOR only."""
      _require_category_write_permission(current_user)
      db_category = session.get(Category, category_id)
      if not db_category:
          raise HTTPException(status_code=404, detail="Category not found")
      CategoryService.delete_category(session=session, db_category=db_category)
  ```

- [ ] **Step 9: Run all RBAC and category tests**

  ```bash
  cd backend && uv run pytest tests/test_tasks_rbac.py tests/test_categories.py -v
  ```

  Expected: All PASSED

- [ ] **Step 10: Run full suite**

  ```bash
  cd backend && uv run pytest -x -q
  ```

- [ ] **Step 11: Commit**

  ```bash
  git add backend/app/api/v1/endpoints/tasks.py backend/app/api/v1/endpoints/categories.py backend/tests/test_tasks_rbac.py backend/tests/test_tasks_api.py backend/tests/test_categories.py
  git commit -m "feat(backend): open task creation to all users; add MANAGER edit restriction; restrict categories to DIRECTOR+"
  ```

---

## Task 4: Enrich task history — resolve `assigned_to_id` to name + role

**Files:**
- Modify: `backend/app/schemas/task.py`
- Modify: `backend/app/services/task_service.py`

- [ ] **Step 1: Write the failing test**

  Add to `backend/tests/test_task_comments.py` (or create a new `test_task_history.py`). Add the test to `test_task_comments.py`:

  ```python
  def test_history_resolves_assigned_to_id(
      client: TestClient, session: Session, normal_user, admin_user, default_category
  ):
      """GET /tasks/{id}/history enriches assigned_to_id entries with resolved name+role."""
      from tests.conftest import get_token  # or define inline
      # Use the helper from conftest or inline it:
      def get_token_local(username, password):
          resp = client.post(
              "/api/v1/auth/login",
              data={"username": username, "password": password},
          )
          return resp.json()["access_token"]

      dir_token = get_token_local("user1", "test_user_password")
      admin_token = get_token_local("admin", "test_admin_password")

      # Create a task
      resp = client.post(
          "/api/v1/tasks/",
          headers={"Authorization": f"Bearer {dir_token}"},
          json={"title": "History Test Task", "category_id": str(default_category.id)},
      )
      assert resp.status_code == 200
      task_id = resp.json()["id"]

      # Assign it to normal_user (director) — this creates a history entry with assigned_to_id
      resp = client.patch(
          f"/api/v1/tasks/{task_id}",
          headers={"Authorization": f"Bearer {admin_token}"},
          json={"assigned_to_id": str(normal_user.id)},
      )
      assert resp.status_code == 200

      # Get history
      resp = client.get(
          f"/api/v1/tasks/{task_id}/history",
          headers={"Authorization": f"Bearer {admin_token}"},
      )
      assert resp.status_code == 200
      history = resp.json()

      assigned_entries = [e for e in history if e["field_name"] == "assigned_to_id"]
      assert len(assigned_entries) > 0
      entry = assigned_entries[0]
      # new_value is the UUID string (unchanged)
      assert entry["new_value"] == str(normal_user.id)
      # resolved_new_value has name and role
      assert entry["resolved_new_value"] is not None
      assert entry["resolved_new_value"]["name"] == normal_user.full_name
      assert entry["resolved_new_value"]["role"] == "DIRECTOR"
      # old_value was None (unassigned)
      assert entry["resolved_old_value"] is None
  ```

  Note: `get_token` is defined in `test_tasks_rbac.py` but not exported from conftest. Define it inline in the test as shown above.

- [ ] **Step 2: Run to confirm it fails**

  ```bash
  cd backend && uv run pytest tests/test_task_comments.py::test_history_resolves_assigned_to_id -v
  ```

  Expected: `KeyError: 'resolved_new_value'` (field not in response)

- [ ] **Step 3: Update `TaskHistoryRead` schema**

  Add two optional fields to the end of `TaskHistoryRead` in `backend/app/schemas/task.py`:

  ```python
  class TaskHistoryRead(BaseModel):
      """Schema for reading task audit history."""

      id: UUID
      task_id: UUID
      changed_by_id: UUID
      user_name: str
      field_name: str
      old_value: str | None = None
      new_value: str | None = None
      timestamp: datetime
      resolved_old_value: dict | None = None
      resolved_new_value: dict | None = None

      model_config = ConfigDict(from_attributes=True)
  ```

- [ ] **Step 4: Update `get_history()` in `task_service.py`**

  Replace the current `get_history` static method body. The full updated method:

  ```python
  @staticmethod
  def get_history(session: Session, task_id: UUID) -> list[dict[str, Any]]:
      """Retrieve the audit history for a task.

      For entries where field_name == 'assigned_to_id', the old_value and
      new_value (UUID strings) are resolved to {name, role} dicts in
      resolved_old_value and resolved_new_value respectively.
      """
      from app.models.user import User

      statement = (
          select(TaskHistory, User)
          .join(User, TaskHistory.changed_by_id == User.id)
          .where(TaskHistory.task_id == task_id)
          .order_by(TaskHistory.timestamp.desc())
      )
      results = session.exec(statement).all()
      history_list = []
      for history, user in results:
          item = history.model_dump()
          item["user_name"] = user.full_name or user.username
          if history.field_name == "assigned_to_id":
              item["resolved_old_value"] = TaskService._resolve_user(
                  session, history.old_value
              )
              item["resolved_new_value"] = TaskService._resolve_user(
                  session, history.new_value
              )
          history_list.append(item)
      return history_list

  @staticmethod
  def _resolve_user(session: Session, user_id_str: str | None) -> dict | None:
      """Look up a user by UUID string and return {name, role}, or None."""
      if user_id_str is None or user_id_str == "null":
          return None
      from app.models.user import User
      import uuid as _uuid
      try:
          uid = _uuid.UUID(user_id_str)
      except ValueError:
          return None
      u = session.get(User, uid)
      if u is None:
          return None
      return {"name": u.full_name or u.username, "role": str(u.role)}
  ```

- [ ] **Step 5: Run the new test**

  ```bash
  cd backend && uv run pytest tests/test_task_comments.py::test_history_resolves_assigned_to_id -v
  ```

  Expected: `PASSED`

- [ ] **Step 6: Run full suite**

  ```bash
  cd backend && uv run pytest -x -q
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add backend/app/schemas/task.py backend/app/services/task_service.py backend/tests/test_task_comments.py
  git commit -m "feat(backend): enrich task history with resolved user name+role for assigned_to_id"
  ```

---

## Task 5: Update seed.py to add a MANAGER user

**Files:**
- Modify: `backend/app/seed.py`

No test needed — seed is a dev utility.

- [ ] **Step 1: Add a manager user to `seed.py`**

  After the `diretores` block (around line 86), add a manager user:

  ```python
  manager = User(
      id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
      username="gerente1",
      email="gerente1@sigecon.com",
      hashed_password=get_password_hash("test_user_password"),
      full_name="Gerente Operacional",
      role=UserRole.MANAGER,
      is_active=True,
  )
  session.add(manager)
  session.commit()
  print(f"✅ {1 + len(diretores) + 1} usuários criados.")
  ```

  Also update the print statement to reflect the new count (replace the old one):
  ```python
  print(f"✅ {1 + len(diretores) + 1} usuários criados.")  # admin + 2 directors + 1 manager
  ```

- [ ] **Step 2: Run the seed against the local DB**

  ```bash
  cd backend && uv run python -m app.seed
  ```

  Expected:
  ```
  🌱 Iniciando seed de desenvolvimento...
  ✅ 5 categorias criadas.
  ✅ 4 usuários criados.
  ✅ 9 tarefas criadas.
  🚀 Seed concluído com sucesso!
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add backend/app/seed.py
  git commit -m "feat(backend): add MANAGER user (gerente1) to dev seed"
  ```

---

## Task 6: Run the full backend test suite + coverage check

- [ ] **Step 1: Run all tests**

  ```bash
  cd backend && uv run pytest -v --tb=short
  ```

  Expected: All tests pass.

- [ ] **Step 2: Check coverage**

  ```bash
  cd backend && uv run pytest --cov=app --cov-report=term-missing -q
  ```

  Review the output. The new code paths in `deps.py`, `tasks.py`, `categories.py`, and `task_service.py` should be covered by the tests added above.

- [ ] **Step 3: Fix any gaps**

  If any new lines are uncovered, add minimal tests targeting them specifically in the appropriate test file.

- [ ] **Step 4: Final commit**

  ```bash
  git add -A
  git commit -m "test(backend): ensure full coverage for roles/permissions changes"
  ```
