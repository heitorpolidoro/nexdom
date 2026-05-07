from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

from .enums import UserRole

if TYPE_CHECKING:
    from .task import Task


class User(SQLModel, table=True):
    """
    SQLModel for the User entity.

    Attributes:
        id: Unique identifier for the user.
        username: Unique username.
        email: Unique email address.
        hashed_password: The user's hashed password.
        full_name: User's full name.
        role: User role (ADMINISTRADOR, DIRETOR).
        is_active: Whether the user account is active.
    """

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: str
    role: UserRole = Field(default=UserRole.DIRETOR)
    is_active: bool = Field(default=True)

    # Relationships
    created_tasks: list["Task"] = Relationship(
        back_populates="creator",
        sa_relationship_kwargs={"foreign_keys": "Task.created_by_id"},
    )
    assigned_tasks: list["Task"] = Relationship(
        back_populates="assignee",
        sa_relationship_kwargs={"foreign_keys": "Task.assigned_to_id"},
    )
