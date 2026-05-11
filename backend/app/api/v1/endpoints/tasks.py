"""Task management API endpoints."""

from typing import Annotated
from uuid import UUID

from app.api import deps as api_deps
from app.core.exceptions import ForbiddenError, TaskNotFoundError
from app.db import get_session
from app.models.enums import TaskPriority, TaskStatus, UserRole
from app.models.task import Task, TaskHistory
from app.models.user import User
from app.schemas.task import TaskCreate, TaskHistoryRead, TaskRead, TaskUpdate
from app.services.task_service import TaskService
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session, select

router = APIRouter()


@router.post("/", response_model=TaskRead)
def create_task(
    task_in: TaskCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> TaskRead:
    """Create a new task. Both ADMINISTRATOR and DIRECTOR can create tasks.

    Args:
        task_in: Task data to create.
        session: Database session.
        current_user: The current authenticated user.

    Returns:
        TaskRead: The created task.
    """
    db_task = TaskService.create_task(
        session=session, task_in=task_in, created_by_id=current_user.id
    )
    return TaskService.get_task_with_names(session=session, db_task=db_task)


@router.get("/", response_model=list[TaskRead])
def list_tasks(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
    status: Annotated[TaskStatus | None, Query()] = None,
    priority: Annotated[TaskPriority | None, Query()] = None,
    assigned_to_id: Annotated[UUID | None, Query()] = None,
    category_id: Annotated[UUID | None, Query()] = None,
) -> list[TaskRead]:
    """List tasks with optional filters.

    ADMINISTRATOR sees all tasks. DIRECTOR sees only tasks assigned to them.

    Args:
        session: Database session.
        current_user: The current authenticated user.
        status: Filter by task status.
        priority: Filter by task priority.
        assigned_to_id: Filter by the user assigned to the task.
        category_id: Filter by the category of the task.

    Returns:
        list[TaskRead]: List of tasks matching the criteria.
    """
    from sqlalchemy.orm import aliased
    from app.models.category import Category

    creator_alias = aliased(User)
    assignee_alias = aliased(User)

    statement = (
        select(Task, creator_alias.full_name, assignee_alias.full_name, Category.name, Category.color)
        .where(Task.is_deleted.is_(False))
        .join(creator_alias, Task.created_by_id == creator_alias.id, isouter=True)
        .join(assignee_alias, Task.assigned_to_id == assignee_alias.id, isouter=True)
        .join(Category, Task.category_id == Category.id, isouter=True)
    )

    if current_user.role == UserRole.DIRECTOR:
        statement = statement.where(Task.assigned_to_id == current_user.id)
    elif assigned_to_id:
        statement = statement.where(Task.assigned_to_id == assigned_to_id)

    if status:
        statement = statement.where(Task.status == status)

    if priority:
        statement = statement.where(Task.priority == priority)
    
    if category_id:
        statement = statement.where(Task.category_id == category_id)

    results = session.exec(statement).all()
    tasks = []
    for db_task, creator_name, assignee_name, category_name, category_color in results:
        task_data = db_task.model_dump()
        task_data["created_by_name"] = creator_name
        task_data["assigned_to_name"] = assignee_name
        task_data["category_name"] = category_name
        task_data["category_color"] = category_color
        tasks.append(TaskRead.model_validate(task_data))
    return tasks


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> TaskRead:
    """Update an existing task.

    ADMINISTRATOR can update any field of any task.
    DIRECTOR can only update the status field, and only on tasks assigned to them.

    Args:
        task_id: UUID of the task to update.
        task_in: Task data to update.
        session: Database session.
        current_user: The current authenticated user.

    Returns:
        TaskRead: The updated task.

    Raises:
        TaskNotFoundError: If the task does not exist or is deleted.
        ForbiddenError: If DIRECTOR attempts to update non-status fields or a task
            not assigned to them.
    """
    db_task = session.get(Task, task_id)
    if not db_task or db_task.is_deleted:
        raise TaskNotFoundError(task_id)

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
    """Get the audit history for a specific task.

    ADMINISTRATOR can see history of any task. DIRECTOR can only see history of
    tasks assigned to them.

    Args:
        task_id: UUID of the task.
        session: Database session.
        current_user: The current authenticated user.

    Returns:
        list[TaskHistoryRead]: List of history entries.

    Raises:
        TaskNotFoundError: If the task does not exist or is deleted.
        ForbiddenError: If DIRECTOR tries to view history of a task not assigned
            to them.
    """
    db_task = session.get(Task, task_id)
    if not db_task or db_task.is_deleted:
        raise TaskNotFoundError(task_id)

    if (
        current_user.role == UserRole.DIRECTOR
        and db_task.assigned_to_id != current_user.id
    ):
        raise ForbiddenError

    return TaskService.get_history(session=session, task_id=task_id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_active_admin)],
) -> None:
    """Delete a task (Soft Delete). Only ADMINISTRATOR can delete tasks.

    Args:
        task_id: UUID of the task to delete.
        session: Database session.
        current_user: The current authenticated administrator.

    Raises:
        TaskNotFoundError: If the task does not exist or is deleted.
    """
    db_task = session.get(Task, task_id)
    if not db_task or db_task.is_deleted:
        raise TaskNotFoundError(task_id)

    TaskService.delete_task(
        session=session, db_task=db_task, changed_by_id=current_user.id
    )
