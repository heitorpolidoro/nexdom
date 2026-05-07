"""
Authentication and authorization dependencies for the API.
"""

import uuid
from typing import Annotated

from app.core.config import settings
from app.db import get_session
from app.models.enums import UserRole
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
    # Try all available secret keys for rotation support
    all_keys = [settings.SECRET_KEY, *settings.SECRET_KEYS]
    payload = None

    for key in all_keys:
        try:
            payload = jwt.decode(token, key, algorithms=[settings.ALGORITHM])
            break
        except (JWTError, ValidationError):
            continue

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    try:
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
            )
        token_data = uuid.UUID(user_id)
    except (ValidationError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        ) from err
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


def get_current_active_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Verify the current user has the ADMINISTRADOR role.

    Args:
        current_user: The authenticated user.

    Returns:
        User: The user if they have the administrator role.

    Raises:
        HTTPException: If the user role is not ADMINISTRADOR.
    """
    if current_user.role != UserRole.ADMINISTRADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user
