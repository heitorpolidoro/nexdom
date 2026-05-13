"""Database model for UserType."""

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class UserType(SQLModel, table=True):
    __tablename__ = "user_type"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True, unique=True)

    users: list["User"] = Relationship(back_populates="type")
