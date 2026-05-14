"""Category management API endpoints."""

from typing import Annotated
from uuid import UUID

from app.api import deps as api_deps
from app.db import get_session
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.category_service import CategoryService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

router = APIRouter()


@router.get("/", response_model=list[CategoryRead])
def list_categories(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> list[CategoryRead]:
    """List all active categories. All authenticated users can see categories."""
    return CategoryService.get_categories(session=session)


@router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> CategoryRead:
    """Create a new category. All authenticated users can create categories."""
    return CategoryService.create_category(session=session, category_in=category_in)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: UUID,
    category_in: CategoryUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> CategoryRead:
    """Update a category. All authenticated users can update categories."""
    db_category = session.get(Category, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    return CategoryService.update_category(
        session=session, db_category=db_category, category_in=category_in
    )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> None:
    """Deactivate a category. All authenticated users can delete/deactivate categories."""
    db_category = session.get(Category, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    CategoryService.delete_category(session=session, db_category=db_category)
