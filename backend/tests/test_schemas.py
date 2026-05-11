import pytest
from pydantic import ValidationError

from app.models.enums import TaskPriority, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate


def test_task_create_validation():
    # Título é obrigatório
    with pytest.raises(ValidationError):
        TaskCreate(description="No title")

    # Enums válidos
    import uuid
    task = TaskCreate(title="Valid", priority=TaskPriority.HIGH, category_id=uuid.uuid4())
    assert task.priority == "HIGH"


def test_task_update_partial():
    # Update deve permitir apenas um campo
    update = TaskUpdate(status=TaskStatus.COMPLETED)
    assert update.status == TaskStatus.COMPLETED
    assert update.title is None
