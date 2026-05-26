"""
Authentication and authorization dependencies for the API.
"""

import uuid
from typing import Annotated

from app.core.config import settings
from app.core.exceptions import ForbiddenError
from app.db import get_session
from app.models.enums import UserRole
from app.models.task import Task
from app.models.user import User
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlmodel import Session

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    session: Annotated[Session, Depends(get_session)],
    token: Annotated[str, Depends(reusable_oauth2)],
) -> User:
    """
    Retrieve the current authenticated user from the JWT token.

    Args:
        session: Database session.
        token: JWT access token.

    Returns:
        User: The authenticated user object.

    Raises:
        HTTPException: If token is invalid, expired, or user not found.
    """
    all_keys = [settings.SECRET_KEY, *settings.SECRET_KEYS]
    payload = None

    for key in all_keys:
        try:
            payload = jwt.decode(token, key, algorithms=[settings.ALGORITHM])
            break
        except (JWTError, ValidationError):
            continue

    credentials_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
    )

    if payload is None:
        raise credentials_exception

    try:
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = uuid.UUID(user_id)
    except ValueError as err:
        raise credentials_exception from err
    user = session.get(User, token_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return user


def get_current_active_director(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Deprecated: kept temporarily so tasks.py imports don't break before Task 3."""
    if current_user.role != UserRole.DIRECTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


def get_current_active_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Verify the current user has the ADMINISTRATOR role.

    Args:
        current_user: The authenticated user.

    Returns:
        User: The user if they have the administrator role.

    Raises:
        HTTPException: If the user role is not ADMINISTRATOR.
    """
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


def assert_can_edit_task(current_user: User, task: Task) -> None:
    """Raise ForbiddenError if MANAGER tries to edit a task not assigned to them.

    ADMINISTRATOR and DIRECTOR may edit any task.
    MANAGER may only edit tasks that are unassigned or assigned to themselves.

    Args:
        current_user: The authenticated user making the request.
        task: The task being edited.

    Raises:
        ForbiddenError: If a MANAGER attempts to edit a task assigned to another user.
    """
    if current_user.role == UserRole.MANAGER:
        if task.assigned_to_id is not None and task.assigned_to_id != current_user.id:
            raise ForbiddenError(
                "Managers can only edit unassigned or self-assigned tasks"
            )
