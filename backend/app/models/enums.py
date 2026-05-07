from enum import StrEnum


class TaskStatus(StrEnum):
    """Enumeration for task status."""

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"


class TaskPriority(StrEnum):
    """Enumeration for task priority."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class UserRole(StrEnum):
    """Enumeration for user roles."""

    ADMINISTRADOR = "ADMINISTRADOR"
    DIRETOR = "DIRETOR"
