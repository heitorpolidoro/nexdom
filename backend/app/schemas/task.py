"""Task schemas for Pydantic validation."""

from datetime import datetime
from uuid import UUID

from app.models.enums import TaskPriority, TaskStatus
from pydantic import BaseModel, ConfigDict, Field


class TaskBase(BaseModel):
    """Base task schema with common fields."""

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: datetime | None = None
    assigned_to_id: UUID | None = None


class TaskCreate(TaskBase):
    """Schema for creating a new task."""


class TaskUpdate(BaseModel):
    """Schema for updating an existing task. All fields are optional."""

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None
    assigned_to_id: UUID | None = None


class TaskRead(TaskBase):
    """Schema for reading task data, includes audit fields."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by_id: UUID

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)
