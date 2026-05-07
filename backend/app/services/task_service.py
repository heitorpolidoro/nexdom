"""Task service layer for business logic."""

from typing import TYPE_CHECKING
from uuid import UUID

from app.core.exceptions import ForbiddenError
from app.models.enums import UserRole
from app.models.task import Task, TaskHistory, get_utc_now
from app.schemas.task import TaskCreate, TaskUpdate
from sqlmodel import Session, select

if TYPE_CHECKING:
    from app.models.user import User


class TaskService:
    """Service class for task-related operations."""

    @staticmethod
    def create_task(session: Session, task_in: TaskCreate, created_by_id: UUID) -> Task:
        """Create a new task in the database.

        Args:
            session: Database session.
            task_in: Task data to create.
            created_by_id: UUID of the user creating the task.

        Returns:
            Task: The created task.
        """
        db_task = Task.model_validate(task_in, update={"created_by_id": created_by_id})
        session.add(db_task)
        session.commit()
        session.refresh(db_task)
        return db_task

    @staticmethod
    def update_task(
        session: Session, db_task: Task, task_in: TaskUpdate, current_user: "User"
    ) -> Task:
        """Update a task with RBAC and audit logging.

        Args:
            session: Database session.
            db_task: The existing task object from the database.
            task_in: Task data to update.
            current_user: The user performing the update.

        Returns:
            Task: The updated task.

        Raises:
            ForbiddenError: If DIRECTOR tries to update non-status fields or a task
                not assigned to them. ADMINISTRATOR can update any field of any task.
        """
        update_data = task_in.model_dump(exclude_unset=True)

        if current_user.role == UserRole.DIRECTOR:
            if db_task.assigned_to_id != current_user.id:
                raise ForbiddenError()
            non_status_fields = {k for k in update_data if k != "status"}
            if non_status_fields:
                raise ForbiddenError()

        for key, value in update_data.items():
            old_value = getattr(db_task, key)
            if old_value != value:
                # Log the change
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

    @staticmethod
    def get_history(session: Session, task_id: UUID) -> list[dict]:
        """Retrieve the audit history for a task.

        Args:
            session: Database session.
            task_id: UUID of the task.

        Returns:
            list[dict]: List of history records with user names.
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
            history_list.append(item)
        return history_list

    @staticmethod
    def delete_task(session: Session, db_task: Task, changed_by_id: UUID) -> None:
        """Perform soft delete on a task and log it in history.

        Args:
            session: Database session.
            db_task: The task object to delete.
            changed_by_id: UUID of the user performing the deletion.
        """
        db_task.is_deleted = True
        db_task.updated_at = get_utc_now()

        # Log deletion in history
        history = TaskHistory(
            task_id=db_task.id,
            changed_by_id=changed_by_id,
            field_name="is_deleted",
            old_value="False",
            new_value="True",
            timestamp=get_utc_now(),
        )
        session.add(history)
        session.add(db_task)
        session.commit()
