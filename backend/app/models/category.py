"""Database model for Category."""

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .task import Task


class Category(SQLModel, table=True):
    """
    SQLModel for the Category entity.

    Attributes:
        id: Unique identifier for the category.
        name: Unique name.
        color: Hex code for the category.
        is_active: Whether the category is active.
    """

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True, unique=True)
    color: str = Field(default="#808080")
    is_active: bool = Field(default=True)

    # Relationships
    tasks: list["Task"] = Relationship(back_populates="category")
