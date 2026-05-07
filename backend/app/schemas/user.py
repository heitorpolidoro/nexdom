"""User schemas for Pydantic validation."""

import re
from uuid import UUID

from app.models.enums import UserRole
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user schema with common fields."""

    username: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.DIRETOR


class UserCreate(UserBase):
    """Schema for creating a new user with password validation."""

    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        """Validate password complexity requirements.

        Args:
            v: The password string to validate.

        Returns:
            str: The validated password.

        Raises:
            ValueError: If password doesn't meet complexity rules.
        """
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one symbol")
        return v


class UserRead(UserBase):
    """Schema for reading user data, includes ID and status."""

    id: UUID
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Schema for updating user data."""

    role: UserRole | None = None
    is_active: bool | None = None
