# Manager Task Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `manager_visible` boolean flag to tasks that controls MANAGER access: MANAGERs only see tasks where the flag is `True`; tasks created by MANAGERs auto-set it to `True`; ADMIN/DIRECTOR can toggle it via PATCH.

**Architecture:** Column on the `task` table (`manager_visible BOOLEAN DEFAULT FALSE`). Alembic migration adds it. Backend enforces visibility at the endpoint level — list filter + 404 guard in all task-specific endpoints. Frontend shows a toggle only to ADMIN/DIRECTOR when editing.

**Tech Stack:** Python/FastAPI, SQLModel, Alembic, React 19, Vitest, react-i18next

---

## File Map

| File | Change |
|---|---|
| `backend/app/models/task.py` | Add `manager_visible` field |
| `backend/alembic/versions/0005_add_manager_visible_to_task.py` | New migration |
| `backend/app/schemas/task.py` | Add field to `TaskUpdate` + `TaskRead` |
| `backend/app/services/task_service.py` | `create_task` accepts flag; `update_task` strips for MANAGER |
| `backend/app/api/deps.py` | Add `assert_manager_can_see_task` helper |
| `backend/app/api/v1/endpoints/tasks.py` | Pass flag on create; filter list; guard all task-specific endpoints |
| `backend/tests/test_tasks_rbac.py` | New tests for visibility rules |
| `frontend/src/features/task-management/types/index.ts` | Add `manager_visible` to `TaskRead` + `TaskUpdate` |
| `frontend/src/i18n/locales/pt.json` | Add `tasks.managerVisible` key |
| `frontend/src/i18n/locales/en.json` | Add `tasks.managerVisible` key |
| `frontend/src/features/task-management/components/TaskForm.tsx` | Checkbox toggle (ADMIN/DIRECTOR only, edit mode only) |
| `frontend/src/features/task-management/components/__tests__/TaskForm.test.tsx` | Tests for toggle visibility |

---

## Task 1: Backend — Model + Schema + Migration

**Files:**
- Modify: `backend/app/models/task.py`
- Modify: `backend/app/schemas/task.py`
- Create: `backend/alembic/versions/0005_add_manager_visible_to_task.py`

- [ ] **Step 1: Write failing test**

Add to `backend/tests/test_tasks_rbac.py` inside the existing `test_data` fixture scope:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
uv run pytest tests/test_tasks_rbac.py::test_manager_visible_field_exists_on_task tests/test_tasks_rbac.py::test_task_read_schema_includes_manager_visible tests/test_tasks_rbac.py::test_task_update_schema_includes_manager_visible -v
```

Expected: 3 FAILED

- [ ] **Step 3: Add field to Task model**

In `backend/app/models/task.py`, add after the `is_deleted` line:

```python
    is_deleted: bool = Field(default=False, index=True)
    manager_visible: bool = Field(default=False, index=True)
```

- [ ] **Step 4: Add fields to schemas**

In `backend/app/schemas/task.py`, update `TaskUpdate` and `TaskRead`:

```python
class TaskUpdate(BaseModel):
    """Schema for updating an existing task. All fields are optional."""

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None
    assigned_to_id: UUID | None = None
    category_id: UUID | None = None
    manager_visible: bool | None = None


class TaskRead(TaskBase):
    """Schema for reading task data, includes audit fields."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by_id: UUID
    created_by_name: str | None = None
    assigned_to_name: str | None = None
    category_name: str | None = None
    category_color: str | None = None
    manager_visible: bool = False

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 5: Create Alembic migration**

Create `backend/alembic/versions/0005_add_manager_visible_to_task.py`:

```python
"""Add manager_visible column to task table.

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "task",
        sa.Column(
            "manager_visible",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.create_index("ix_task_manager_visible", "task", ["manager_visible"])


def downgrade() -> None:
    op.drop_index("ix_task_manager_visible", table_name="task")
    op.drop_column("task", "manager_visible")
```

- [ ] **Step 6: Run migration**

```bash
cd backend
uv run alembic upgrade head
```

Expected: `Running upgrade 0004 -> 0005, Add manager_visible column to task table.`

- [ ] **Step 7: Run tests to verify they pass**

```bash
uv run pytest tests/test_tasks_rbac.py::test_manager_visible_field_exists_on_task tests/test_tasks_rbac.py::test_task_read_schema_includes_manager_visible tests/test_tasks_rbac.py::test_task_update_schema_includes_manager_visible -v
```

Expected: 3 PASSED

- [ ] **Step 8: Run full test suite to check nothing broke**

```bash
uv run pytest tests/ -x --tb=short -q
```

Expected: all existing tests pass

- [ ] **Step 9: Commit**

```bash
git add backend/app/models/task.py backend/app/schemas/task.py backend/alembic/versions/0005_add_manager_visible_to_task.py backend/tests/test_tasks_rbac.py
git commit -m "feat: add manager_visible field to Task model, schemas, and migration"
```

---

## Task 2: Backend — create_task sets manager_visible

**Files:**
- Modify: `backend/app/services/task_service.py`
- Modify: `backend/app/api/v1/endpoints/tasks.py`
- Modify: `backend/tests/test_tasks_rbac.py`

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_tasks_rbac.py`:

```python
def test_manager_create_task_sets_manager_visible_true(
    client: TestClient, test_data, manager_user
):
    """Tasks created by MANAGER must have manager_visible=True."""
    token = get_token(client, "manager_rbac", "pass")
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Manager Visible Task", "category_id": str(test_data["category"].id)},
    )
    assert response.status_code == 200
    assert response.json()["manager_visible"] is True


def test_admin_create_task_sets_manager_visible_false(client: TestClient, test_data):
    """Tasks created by ADMIN must have manager_visible=False by default."""
    token = get_token(client, "admin_rbac", "pass")
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Admin Hidden Task", "category_id": str(test_data["category"].id)},
    )
    assert response.status_code == 200
    assert response.json()["manager_visible"] is False


def test_director_create_task_sets_manager_visible_false(client: TestClient, test_data):
    """Tasks created by DIRECTOR must have manager_visible=False by default."""
    token = get_token(client, "director_rbac", "pass")
    response = client.post(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Director Hidden Task", "category_id": str(test_data["category"].id)},
    )
    assert response.status_code == 200
    assert response.json()["manager_visible"] is False
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
uv run pytest tests/test_tasks_rbac.py::test_manager_create_task_sets_manager_visible_true tests/test_tasks_rbac.py::test_admin_create_task_sets_manager_visible_false tests/test_tasks_rbac.py::test_director_create_task_sets_manager_visible_false -v
```

Expected: 3 FAILED (manager_visible will be False for MANAGER too)

- [ ] **Step 3: Update TaskService.create_task signature**

In `backend/app/services/task_service.py`, update `create_task`:

```python
    @staticmethod
    def create_task(
        session: Session,
        task_in: TaskCreate,
        created_by_id: UUID,
        manager_visible: bool = False,
    ) -> Task:
        """Create a new task in the database."""
        db_task = Task.model_validate(
            task_in,
            update={"created_by_id": created_by_id, "manager_visible": manager_visible},
        )
        session.add(db_task)
        session.commit()
        session.refresh(db_task)
        return db_task
```

- [ ] **Step 4: Update create_task endpoint**

In `backend/app/api/v1/endpoints/tasks.py`, update the imports and `create_task` function:

```python
from app.models.enums import TaskPriority, TaskStatus, UserRole

@router.post("/", response_model=TaskRead)
def create_task(
    task_in: TaskCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> TaskRead:
    """Create a new task. Any authenticated user can create tasks."""
    db_task = TaskService.create_task(
        session=session,
        task_in=task_in,
        created_by_id=current_user.id,
        manager_visible=(current_user.role == UserRole.MANAGER),
    )
    return TaskService.get_task_with_names(session=session, db_task=db_task)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
uv run pytest tests/test_tasks_rbac.py::test_manager_create_task_sets_manager_visible_true tests/test_tasks_rbac.py::test_admin_create_task_sets_manager_visible_false tests/test_tasks_rbac.py::test_director_create_task_sets_manager_visible_false -v
```

Expected: 3 PASSED

- [ ] **Step 6: Run full test suite**

```bash
uv run pytest tests/ -x --tb=short -q
```

Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/task_service.py backend/app/api/v1/endpoints/tasks.py backend/tests/test_tasks_rbac.py
git commit -m "feat: set manager_visible=True when MANAGER creates a task"
```

---

## Task 3: Backend — list filter + visibility guard helper

**Files:**
- Modify: `backend/app/api/deps.py`
- Modify: `backend/app/api/v1/endpoints/tasks.py`
- Modify: `backend/tests/test_tasks_rbac.py`

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_tasks_rbac.py`:

```python
def test_manager_list_only_sees_visible_tasks(
    client: TestClient, session: Session, test_data, manager_user
):
    """MANAGER only sees tasks with manager_visible=True in the list."""
    import uuid as _uuid
    from app.models.task import Task

    # Hidden task (manager_visible=False)
    hidden = Task(
        title="Hidden from Manager",
        category_id=test_data["category"].id,
        created_by_id=test_data["admin"].id,
        manager_visible=False,
    )
    # Visible task (manager_visible=True)
    visible = Task(
        title="Visible to Manager",
        category_id=test_data["category"].id,
        created_by_id=test_data["admin"].id,
        manager_visible=True,
    )
    session.add(hidden)
    session.add(visible)
    session.commit()

    token = get_token(client, "manager_rbac", "pass")
    response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    titles = [t["title"] for t in response.json()]
    assert "Visible to Manager" in titles
    assert "Hidden from Manager" not in titles


def test_admin_list_sees_all_tasks(
    client: TestClient, session: Session, test_data, manager_user
):
    """ADMIN sees all tasks regardless of manager_visible."""
    from app.models.task import Task

    hidden = Task(
        title="Admin Sees Hidden",
        category_id=test_data["category"].id,
        created_by_id=test_data["admin"].id,
        manager_visible=False,
    )
    session.add(hidden)
    session.commit()

    token = get_token(client, "admin_rbac", "pass")
    response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    titles = [t["title"] for t in response.json()]
    assert "Admin Sees Hidden" in titles


def test_manager_gets_404_for_invisible_task_history(
    client: TestClient, session: Session, test_data, manager_user
):
    """MANAGER gets 404 when accessing history of a task with manager_visible=False."""
    from app.models.task import Task

    hidden = Task(
        title="Hidden History Task",
        category_id=test_data["category"].id,
        created_by_id=test_data["admin"].id,
        manager_visible=False,
    )
    session.add(hidden)
    session.commit()

    token = get_token(client, "manager_rbac", "pass")
    response = client.get(
        f"/api/v1/tasks/{hidden.id}/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_manager_gets_404_for_invisible_task_comments(
    client: TestClient, session: Session, test_data, manager_user
):
    """MANAGER gets 404 when listing comments of a task with manager_visible=False."""
    from app.models.task import Task

    hidden = Task(
        title="Hidden Comments Task",
        category_id=test_data["category"].id,
        created_by_id=test_data["admin"].id,
        manager_visible=False,
    )
    session.add(hidden)
    session.commit()

    token = get_token(client, "manager_rbac", "pass")
    response = client.get(
        f"/api/v1/tasks/{hidden.id}/comments",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
uv run pytest tests/test_tasks_rbac.py::test_manager_list_only_sees_visible_tasks tests/test_tasks_rbac.py::test_admin_list_sees_all_tasks tests/test_tasks_rbac.py::test_manager_gets_404_for_invisible_task_history tests/test_tasks_rbac.py::test_manager_gets_404_for_invisible_task_comments -v
```

Expected: 4 FAILED

- [ ] **Step 3: Add assert_manager_can_see_task to deps.py**

In `backend/app/api/deps.py`, add after the `assert_can_edit_task` function:

```python
def assert_manager_can_see_task(current_user: User, task: "Task") -> None:
    """Raise 404 if MANAGER tries to access a task with manager_visible=False."""
    if current_user.role == UserRole.MANAGER and not task.manager_visible:
        from app.core.exceptions import TaskNotFoundError
        raise TaskNotFoundError(task.id)
```

Also add the import for `Task` at the top of deps.py (check if already imported, add if not):

```python
from app.models.task import Task
```

- [ ] **Step 4: Update list_tasks endpoint**

In `backend/app/api/v1/endpoints/tasks.py`, add filter to `list_tasks` after the existing filters:

```python
    if assigned_to_id:
        statement = statement.where(Task.assigned_to_id == assigned_to_id)
    if status:
        statement = statement.where(Task.status == status)
    if priority:
        statement = statement.where(Task.priority == priority)
    if category_id:
        statement = statement.where(Task.category_id == category_id)
    if current_user.role == UserRole.MANAGER:
        statement = statement.where(Task.manager_visible.is_(True))
```

- [ ] **Step 5: Add visibility guard to task-specific endpoints**

In `backend/app/api/v1/endpoints/tasks.py`, add `assert_manager_can_see_task` calls after each `TaskNotFoundError` check in: `update_task`, `get_task_history`, `list_comments`, `create_comment`, `update_comment`.

Full updated endpoints:

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
    api_deps.assert_manager_can_see_task(current_user, db_task)
    api_deps.assert_can_edit_task(current_user, db_task)
    updated_task = TaskService.update_task(
        session=session, db_task=db_task, task_in=task_in, current_user=current_user
    )
    return TaskService.get_task_with_names(session=session, db_task=updated_task)


@router.get("/{task_id}/history", response_model=list[TaskHistoryRead])
def get_task_history(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> list[TaskHistory]:
    """Get the audit history for a specific task."""
    db_task = session.get(Task, task_id)
    if not db_task or db_task.is_deleted:
        raise TaskNotFoundError(task_id)
    api_deps.assert_manager_can_see_task(current_user, db_task)
    return TaskService.get_history(session=session, task_id=task_id)


@router.get("/{task_id}/comments", response_model=list[TaskCommentRead])
def list_comments(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> list[TaskCommentRead]:
    """List all comments for a task."""
    db_task = session.get(Task, task_id)
    if not db_task or db_task.is_deleted:
        raise TaskNotFoundError(task_id)
    api_deps.assert_manager_can_see_task(current_user, db_task)
    return TaskService.get_comments(session=session, task_id=task_id)


@router.post(
    "/{task_id}/comments",
    response_model=TaskCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    task_id: UUID,
    comment_in: TaskCommentCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> TaskCommentRead:
    """Add a comment to a task. Any authenticated user can comment."""
    db_task = session.get(Task, task_id)
    if not db_task or db_task.is_deleted:
        raise TaskNotFoundError(task_id)
    api_deps.assert_manager_can_see_task(current_user, db_task)
    return TaskService.create_comment(
        session=session,
        task_id=task_id,
        content=comment_in.content,
        created_by_id=current_user.id,
    )


@router.patch("/{task_id}/comments/{comment_id}", response_model=TaskCommentRead)
def update_comment(
    task_id: UUID,
    comment_id: UUID,
    comment_in: TaskCommentUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> TaskCommentRead:
    """Edit a comment. Only the comment author can edit it."""
    db_task = session.get(Task, task_id)
    if not db_task or db_task.is_deleted:
        raise TaskNotFoundError(task_id)
    api_deps.assert_manager_can_see_task(current_user, db_task)
    comment = session.get(TaskComment, comment_id)
    if not comment or comment.task_id != task_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )
    if comment.created_by_id != current_user.id:
        raise ForbiddenError("Only the comment author can edit it")
    return TaskService.update_comment(
        session=session, comment=comment, content=comment_in.content
    )
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend
uv run pytest tests/test_tasks_rbac.py::test_manager_list_only_sees_visible_tasks tests/test_tasks_rbac.py::test_admin_list_sees_all_tasks tests/test_tasks_rbac.py::test_manager_gets_404_for_invisible_task_history tests/test_tasks_rbac.py::test_manager_gets_404_for_invisible_task_comments -v
```

Expected: 4 PASSED

- [ ] **Step 7: Run full test suite**

```bash
uv run pytest tests/ -x --tb=short -q
```

Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/deps.py backend/app/api/v1/endpoints/tasks.py backend/tests/test_tasks_rbac.py
git commit -m "feat: filter tasks by manager_visible for MANAGER role; add visibility guard to all task endpoints"
```

---

## Task 4: Backend — update_task strips manager_visible for MANAGER; ADMIN can set it

**Files:**
- Modify: `backend/app/services/task_service.py`
- Modify: `backend/tests/test_tasks_rbac.py`

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_tasks_rbac.py`:

```python
def test_admin_can_set_manager_visible_true(
    client: TestClient, session: Session, test_data, manager_user
):
    """ADMIN can set manager_visible=True on a task, making it visible to MANAGER."""
    from app.models.task import Task

    hidden = Task(
        title="Will Become Visible",
        category_id=test_data["category"].id,
        created_by_id=test_data["admin"].id,
        manager_visible=False,
    )
    session.add(hidden)
    session.commit()

    admin_token = get_token(client, "admin_rbac", "pass")
    response = client.patch(
        f"/api/v1/tasks/{hidden.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"manager_visible": True},
    )
    assert response.status_code == 200
    assert response.json()["manager_visible"] is True

    # MANAGER can now see it in the list
    mgr_token = get_token(client, "manager_rbac", "pass")
    list_response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {mgr_token}"},
    )
    titles = [t["title"] for t in list_response.json()]
    assert "Will Become Visible" in titles


def test_manager_cannot_change_manager_visible(
    client: TestClient, session: Session, test_data, manager_user
):
    """MANAGER cannot change manager_visible even on their own task."""
    from app.models.task import Task

    # Task that is visible to manager (created by manager)
    visible = Task(
        title="Manager Own Task",
        category_id=test_data["category"].id,
        created_by_id=manager_user.id,
        manager_visible=True,
    )
    session.add(visible)
    session.commit()

    mgr_token = get_token(client, "manager_rbac", "pass")
    response = client.patch(
        f"/api/v1/tasks/{visible.id}",
        headers={"Authorization": f"Bearer {mgr_token}"},
        json={"manager_visible": False},
    )
    # Request succeeds (other fields could be updated) but manager_visible is ignored
    assert response.status_code == 200
    assert response.json()["manager_visible"] is True  # unchanged
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
uv run pytest tests/test_tasks_rbac.py::test_admin_can_set_manager_visible_true tests/test_tasks_rbac.py::test_manager_cannot_change_manager_visible -v
```

Expected: 2 FAILED

- [ ] **Step 3: Strip manager_visible in TaskService.update_task for MANAGER**

In `backend/app/services/task_service.py`, update `update_task`:

```python
    @staticmethod
    def update_task(
        session: Session, db_task: Task, task_in: TaskUpdate, current_user: "User"
    ) -> Task:
        """Update a task with audit logging."""
        from app.models.enums import UserRole
        update_data = task_in.model_dump(exclude_unset=True)

        # MANAGER cannot change visibility flag — strip it silently
        if current_user.role == UserRole.MANAGER:
            update_data.pop("manager_visible", None)

        for key, value in update_data.items():
            old_value = getattr(db_task, key)
            if old_value != value:
                history = TaskHistory(
                    task_id=db_task.id,
                    changed_by_id=current_user.id,
                    field_name=key,
                    old_value=str(old_value) if old_value is not None else None,
                    new_value=str(value) if value is not None else None,
                    timestamp=get_utc_now(),
                )
                session.add(history)
                setattr(db_task, key, value)

        db_task.updated_at = get_utc_now()
        session.add(db_task)
        session.commit()
        session.refresh(db_task)
        return db_task
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
uv run pytest tests/test_tasks_rbac.py::test_admin_can_set_manager_visible_true tests/test_tasks_rbac.py::test_manager_cannot_change_manager_visible -v
```

Expected: 2 PASSED

- [ ] **Step 5: Run full backend test suite with coverage**

```bash
uv run pytest tests/ --tb=short -q
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/task_service.py backend/tests/test_tasks_rbac.py
git commit -m "feat: MANAGER cannot change manager_visible; ADMIN/DIRECTOR can toggle it"
```

---

## Task 5: Frontend — Types + i18n + TaskForm toggle

**Files:**
- Modify: `frontend/src/features/task-management/types/index.ts`
- Modify: `frontend/src/i18n/locales/pt.json`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/features/task-management/components/TaskForm.tsx`
- Modify: `frontend/src/features/task-management/components/__tests__/TaskForm.test.tsx`

- [ ] **Step 1: Write failing tests**

Find the TaskForm test file:

```bash
find frontend/src -name "TaskForm.test.*"
```

Open `frontend/src/features/task-management/components/__tests__/TaskForm.test.tsx` and add:

```tsx
describe("manager_visible toggle", () => {
  it("shows manager_visible toggle for ADMINISTRATOR in edit mode", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "ADMINISTRATOR", id: "admin-1", username: "admin" },
      isAuthenticated: true,
    } as unknown as ReturnType<typeof useAuth>);

    const existingTask: TaskRead = {
      id: "task-1",
      title: "Test Task",
      description: null,
      status: "PENDING" as TaskStatus,
      priority: "MEDIUM" as TaskPriority,
      assigned_to_id: null,
      category_id: "cat-1",
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by_id: "admin-1",
      manager_visible: false,
    };

    render(<TaskForm task={existingTask} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(
      screen.getByRole("checkbox", { name: /visível para gerentes/i }),
    ).toBeInTheDocument();
  });

  it("shows manager_visible toggle for DIRECTOR in edit mode", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "DIRECTOR", id: "dir-1", username: "director" },
      isAuthenticated: true,
    } as unknown as ReturnType<typeof useAuth>);

    const existingTask: TaskRead = {
      id: "task-1",
      title: "Test Task",
      description: null,
      status: "PENDING" as TaskStatus,
      priority: "MEDIUM" as TaskPriority,
      assigned_to_id: null,
      category_id: "cat-1",
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by_id: "dir-1",
      manager_visible: false,
    };

    render(<TaskForm task={existingTask} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(
      screen.getByRole("checkbox", { name: /visível para gerentes/i }),
    ).toBeInTheDocument();
  });

  it("does NOT show manager_visible toggle for MANAGER", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "MANAGER", id: "mgr-1", username: "manager" },
      isAuthenticated: true,
    } as unknown as ReturnType<typeof useAuth>);

    const existingTask: TaskRead = {
      id: "task-1",
      title: "My Task",
      description: null,
      status: "PENDING" as TaskStatus,
      priority: "MEDIUM" as TaskPriority,
      assigned_to_id: "mgr-1",
      category_id: "cat-1",
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by_id: "mgr-1",
      manager_visible: true,
    };

    render(<TaskForm task={existingTask} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(
      screen.queryByRole("checkbox", { name: /visível para gerentes/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT show manager_visible toggle in create mode even for ADMIN", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "ADMINISTRATOR", id: "admin-1", username: "admin" },
      isAuthenticated: true,
    } as unknown as ReturnType<typeof useAuth>);

    render(<TaskForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(
      screen.queryByRole("checkbox", { name: /visível para gerentes/i }),
    ).not.toBeInTheDocument();
  });
});
```

> Note: check at the top of the test file how `useAuth` is mocked (it's likely already mocked in the file or in the test setup). Add `import { useAuth } from "../../../../features/user-administration/context/AuthContext";` if not already imported, and add `vi.mock("../../../../features/user-administration/context/AuthContext", ...)` if not already mocked.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend
npm run test -- TaskForm --run 2>&1 | tail -20
```

Expected: new tests FAIL

- [ ] **Step 3: Add manager_visible to TypeScript types**

In `frontend/src/features/task-management/types/index.ts`, update `TaskUpdate` and `TaskRead`:

```typescript
/**
 * Interface for task update data.
 */
export interface TaskUpdate extends Partial<TaskBase> {
  status?: TaskStatus;
  priority?: TaskPriority;
  manager_visible?: boolean;
}

/**
 * Interface for reading task data from the API.
 */
export interface TaskRead extends TaskBase {
  /** Unique identifier for the task. */
  id: string;
  /** When the task was created. */
  created_at: Date | string;
  /** When the task was last updated. */
  updated_at: Date | string;
  /** The UUID of the user who created the task. */
  created_by_id: string;
  /** The name of the user who created the task. */
  created_by_name?: string | null;
  /** The name of the user assigned to the task. */
  assigned_to_name?: string | null;
  /** The display name of the category. */
  category_name?: string | null;
  /** The hex color of the category. */
  category_color?: string | null;
  /** Whether this task is visible to users with the MANAGER role. */
  manager_visible: boolean;
}
```

- [ ] **Step 4: Add i18n keys**

In `frontend/src/i18n/locales/pt.json`, add inside the `"tasks"` object:

```json
"managerVisible": "Visível para gerentes"
```

In `frontend/src/i18n/locales/en.json`, add inside the `"tasks"` object:

```json
"managerVisible": "Visible to managers"
```

- [ ] **Step 5: Update TaskForm.tsx**

Add `useAuth` import at the top of `frontend/src/features/task-management/components/TaskForm.tsx`:

```tsx
import { useAuth } from "../../user-administration/context/AuthContext";
import { UserRole } from "../../user-administration/context/AuthContext";
```

Inside the component, add after the existing hooks:

```tsx
const { user } = useAuth();
```

Add `manager_visible` to `defaultValues` and `transforms`:

```tsx
const defaultValues = {
  title: "",
  description: "",
  priority: TaskPriority.MEDIUM,
  assigned_to_id: "",
  due_date: "",
  status: TaskStatus.PENDING,
  category_id: "",
  manager_visible: false,
};

const transforms: Record<string, (value: unknown) => unknown> = {
  title: (v) => v,
  description: (v) => v || "",
  priority: (v) => v,
  assigned_to_id: (v) => v || "",
  due_date: (v) =>
    v ? new Date(v as string).toISOString().split("T")[0] : "",
  status: (v) => v,
  category_id: (v) => v || "",
  manager_visible: (v) => Boolean(v),
};
```

In `handleSubmit`, update the `updatePayload` to include `manager_visible`:

```tsx
    if (isEditing && task) {
      const updatePayload: TaskUpdate = {
        ...commonData,
        status: formData.status as TaskStatus,
        manager_visible: formData.manager_visible as boolean,
      };
      updateTaskMutation.mutate(
        { id: task.id, data: updatePayload },
        { onSuccess },
      );
    } else {
      createTaskMutation.mutate(commonData, { onSuccess });
    }
```

Add the toggle in the form JSX, just before the buttons row (`<div className="flex justify-end gap-3 pt-2 border-t">`):

```tsx
        {isEditing && user?.role !== UserRole.MANAGER && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="manager_visible"
              checked={Boolean(formData.manager_visible)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  manager_visible: e.target.checked,
                }))
              }
              disabled={isLoading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="manager_visible">
              {t("tasks.managerVisible")}
            </Label>
          </div>
        )}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd frontend
npm run test -- TaskForm --run 2>&1 | tail -20
```

Expected: all TaskForm tests PASS

- [ ] **Step 7: Run full frontend test suite with coverage**

```bash
npm run test:coverage 2>&1 | tail -15
```

Expected: all 273+ tests pass, coverage maintained

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/task-management/types/index.ts \
        frontend/src/i18n/locales/pt.json \
        frontend/src/i18n/locales/en.json \
        frontend/src/features/task-management/components/TaskForm.tsx \
        frontend/src/features/task-management/components/__tests__/TaskForm.test.tsx
git commit -m "feat: frontend manager_visible toggle in TaskForm for ADMIN/DIRECTOR"
```

---

## Final verification

- [ ] **Run full backend test suite**

```bash
cd backend && uv run pytest tests/ -q
```

Expected: all tests pass

- [ ] **Run full frontend test suite**

```bash
cd frontend && npm run test:coverage 2>&1 | tail -10
```

Expected: all tests pass, 100% statement/line coverage
