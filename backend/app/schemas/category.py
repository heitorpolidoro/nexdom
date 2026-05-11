"""Category schemas for Pydantic validation."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    """Base category schema with common fields."""

    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#808080", pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryCreate(CategoryBase):
    """Schema for creating a new category."""


class CategoryUpdate(BaseModel):
    """Schema for updating an existing category. All fields are optional."""

    name: str | None = Field(None, min_length=1, max_length=50)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    is_active: bool | None = None


class CategoryRead(CategoryBase):
    """Schema for reading category data."""

    id: UUID
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
