"""Authentication API endpoints."""

from datetime import timedelta
from typing import Annotated, Any

from app.api import deps as api_deps
from app.core import security
from app.core.config import settings
from app.core.limiter import limiter
from app.db import get_session
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserRead
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

router = APIRouter()


@router.post("/signup", response_model=UserRead)
def signup(
    session: Annotated[Session, Depends(get_session)],
    user_in: UserCreate,
) -> Any:
    """Create new user.

    New users are created as inactive and with DIRETOR role.
    """
    # Check if username exists
    statement = select(User).where(User.username == user_in.username)
    if session.exec(statement).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists",
        )

    # Check if email exists
    statement = select(User).where(User.email == user_in.email)
    if session.exec(statement).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    db_obj = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=security.get_password_hash(user_in.password),
        role=UserRole.DIRETOR,  # Force role
        is_active=False,  # Wait for approval
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.get("/me", response_model=UserRead)
def read_user_me(
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> Any:
    """Get current user."""
    return current_user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login_access_token(
    request: Request,  # noqa: ARG001
    session: Annotated[Session, Depends(get_session)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    remember_me: bool = False,
) -> Any:
    """OAuth2 compatible token login, get an access token for future requests.

    Args:
        request: The incoming request object.
        session: Database session.
        form_data: OAuth2 password request form containing username and password.
        remember_me: If True, set expiration to 7 days.

    Returns:
        Any: A dictionary containing the access token and token type.

    Raises:
        HTTPException: If credentials are incorrect or user is inactive.
    """
    statement = select(User).where(User.username == form_data.username)
    user = session.exec(statement).first()

    if not user or not security.verify_password(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )

    if remember_me:
        access_token_expires = timedelta(days=7)
    else:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
