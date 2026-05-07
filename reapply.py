import os

def apply_patch(filepath, search, replace):
    with open(filepath, 'r') as f:
        content = f.read()
    if search in content:
        content = content.replace(search, replace)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"Search text not found in {filepath}")


# deps.py
apply_patch('backend/app/api/deps.py', '''    if payload is None:
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
        ) from err''', '''    credentials_exception = HTTPException(
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
        raise credentials_exception from err''')

# api.py
apply_patch('backend/app/api/v1/api.py', '''from app.api.v1.endpoints import auth, tasks, users
from fastapi import APIRouter''', '''"""API v1 router."""

from app.api.v1.endpoints import auth, tasks, users
from fastapi import APIRouter''')

# auth.py
apply_patch('backend/app/api/v1/endpoints/auth.py', '''def signup(
    session: Annotated[Session, Depends(get_session)],
    user_in: UserCreate,
) -> Any:''', '''def signup(
    session: Annotated[Session, Depends(get_session)],
    user_in: UserCreate,
) -> User:''')
apply_patch('backend/app/api/v1/endpoints/auth.py', '''        is_active=False,  # Wait for approval
    )
    session.add(db_obj)''', '''        # Wait for approval
        is_active=False,
    )
    session.add(db_obj)''')
apply_patch('backend/app/api/v1/endpoints/auth.py', '''def read_user_me(
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> Any:''', '''def read_user_me(
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> User:''')
apply_patch('backend/app/api/v1/endpoints/auth.py', '''def login_access_token(
    request: Request,  # noqa: ARG001
    session: Annotated[Session, Depends(get_session)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    remember_me: bool = False,
) -> Any:''', '''def login_access_token(
    request: Request,  # noqa: ARG001
    session: Annotated[Session, Depends(get_session)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    remember_me: bool = False,
) -> dict[str, str]:''')

# tasks.py
apply_patch('backend/app/api/v1/endpoints/tasks.py', '''def create_task(
    task_in: TaskCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
):''', '''def create_task(
    task_in: TaskCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> Task:''')
apply_patch('backend/app/api/v1/endpoints/tasks.py', '''def list_tasks(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
    status: Annotated[TaskStatus | None, Query()] = None,
    priority: Annotated[TaskPriority | None, Query()] = None,
    assigned_to_id: Annotated[UUID | None, Query()] = None,
):''', '''def list_tasks(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
    status: Annotated[TaskStatus | None, Query()] = None,
    priority: Annotated[TaskPriority | None, Query()] = None,
    assigned_to_id: Annotated[UUID | None, Query()] = None,
) -> list[Task]:''')
apply_patch('backend/app/api/v1/endpoints/tasks.py', '''def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
):''', '''def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> Task:''')
apply_patch('backend/app/api/v1/endpoints/tasks.py', '''@router.get("/{task_id}/history", response_model=list[TaskHistoryRead])
def get_task_history(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
):''', '''from app.models.task import TaskHistory

@router.get("/{task_id}/history", response_model=list[TaskHistoryRead])
def get_task_history(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_user)],
) -> list[TaskHistory]:''')
apply_patch('backend/app/api/v1/endpoints/tasks.py', '''def delete_task(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_active_admin)],
):''', '''def delete_task(
    task_id: UUID,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_active_admin)],
) -> None:''')

# users.py
apply_patch('backend/app/api/v1/endpoints/users.py', '''def read_users(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[  # noqa: ARG001
        User, Depends(api_deps.get_current_active_admin)
    ],
    is_active: bool | None = None,
) -> Any:''', '''def read_users(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[  # noqa: ARG001
        User, Depends(api_deps.get_current_active_admin)
    ],
    is_active: bool | None = None,
) -> list[User]:''')
apply_patch('backend/app/api/v1/endpoints/users.py', '''def update_user(
    *,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_active_admin)],
    user_id: UUID,
    user_in: UserUpdate,
) -> Any:''', '''def update_user(
    *,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(api_deps.get_current_active_admin)],
    user_id: UUID,
    user_in: UserUpdate,
) -> User:''')

# config.py
apply_patch('backend/app/core/config.py', '''from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):''', '''"""Application configuration module."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):''')

# exception_handlers.py
apply_patch('backend/app/core/exception_handlers.py', '''from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import DomainError, ForbiddenError, TaskNotFoundError


async def domain_exception_handler(request: Request, exc: DomainError):  # noqa: ARG001
    """
    Global handler for domain-specific exceptions.
    Converts DomainError subclasses to appropriate HTTP responses.

    Args:
        request: The incoming FastAPI request.
        exc: The raised DomainError.

    Returns:
        JSONResponse: A response with appropriate status code and error message.
    """''', '''"""Global exception handlers."""

from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import DomainError, ForbiddenError, TaskNotFoundError


async def domain_exception_handler(_: Request, exc: DomainError) -> JSONResponse:
    """
    Global handler for domain-specific exceptions.
    Converts DomainError subclasses to appropriate HTTP responses.

    Args:
        _: The incoming FastAPI request (unused).
        exc: The raised DomainError.

    Returns:
        JSONResponse: A response with appropriate status code and error message.
    """''')

# exceptions.py
apply_patch('backend/app/core/exceptions.py', '''from uuid import UUID


class DomainError(Exception):
    """Base class for domain exceptions."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class TaskNotFoundError(DomainError):
    """Raised when a task is not found."""

    def __init__(self, task_id: UUID):
        super().__init__(f"Task with ID {task_id} not found")


class ForbiddenError(DomainError):
    """Raised when a user does not have permission for an action."""

    def __init__(self, message: str = "Not enough privileges"):
        super().__init__(message)''', '''"""Domain exceptions."""

from uuid import UUID


class DomainError(Exception):
    """Base class for domain exceptions."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(self.message)


class TaskNotFoundError(DomainError):
    """Raised when a task is not found."""

    def __init__(self, task_id: UUID) -> None:
        super().__init__(f"Task with ID {task_id} not found")


class ForbiddenError(DomainError):
    """Raised when a user does not have permission for an action."""

    def __init__(self, message: str = "Not enough privileges") -> None:
        super().__init__(message)''')

# limiter.py
apply_patch('backend/app/core/limiter.py', '''from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)''', '''"""Rate limiting configuration."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)''')

# security.py
apply_patch('backend/app/core/security.py', '''from datetime import UTC, datetime, timedelta
from typing import Any''', '''"""Security utilities for password hashing and JWT tokens."""

from datetime import UTC, datetime, timedelta
from typing import Any''')

# main.py
apply_patch('backend/app/main.py', '''from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exception_handlers import domain_exception_handler''', '''"""FastAPI application entry point."""

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exception_handlers import domain_exception_handler''')
apply_patch('backend/app/main.py', '''def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:  # noqa: ARG001
    return JSONResponse(''', '''def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:  # noqa: ARG001
    """Handle rate limit exceeded errors."""
    return JSONResponse(''')
apply_patch('backend/app/main.py', '''@app.get("/")
def read_root():
    return {"message": "Welcome to SIGECON API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}''', '''@app.get("/")
def read_root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "Welcome to SIGECON API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}''')

# __init__.py
apply_patch('backend/app/models/__init__.py', '''from .enums import TaskPriority, TaskStatus, UserRole
from .task import Task, TaskHistory
from .user import User''', '''"""Database models package."""

from .enums import TaskPriority, TaskStatus, UserRole
from .task import Task, TaskHistory
from .user import User''')

# enums.py
apply_patch('backend/app/models/enums.py', '''from enum import StrEnum''', '''"""Enumerations for the domain models."""

from enum import StrEnum''')

# task.py
apply_patch('backend/app/models/task.py', '''from datetime import UTC, datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4''', '''"""Database models for Task and TaskHistory."""

from datetime import UTC, datetime
from typing import TYPE_CHECKING, ClassVar, Optional
from uuid import UUID, uuid4''')
apply_patch('backend/app/models/task.py', '''def get_utc_now():''', '''def get_utc_now() -> datetime:''')
apply_patch('backend/app/models/task.py', '''    updated_at: datetime = Field(default_factory=get_utc_now)
    is_deleted: bool = Field(default=False, index=True)

    # Foreign Keys
    created_by_id: UUID = Field(foreign_key="user.id", index=True)
    assigned_to_id: UUID | None = Field(default=None, foreign_key="user.id", index=True)''', '''    updated_at: datetime = Field(default_factory=get_utc_now)
    is_deleted: bool = Field(default=False, index=True)

    USER_ID_FK: ClassVar[str] = "user.id"

    # Foreign Keys
    created_by_id: UUID = Field(foreign_key=USER_ID_FK, index=True)
    assigned_to_id: UUID | None = Field(default=None, foreign_key=USER_ID_FK, index=True)''')
apply_patch('backend/app/models/task.py', '''    task_id: UUID = Field(
        sa_column=Column(
            "task_id", ForeignKey("task.id", ondelete="CASCADE"), nullable=False
        )
    )
    changed_by_id: UUID = Field(foreign_key="user.id")''', '''    task_id: UUID = Field(
        sa_column=Column(
            "task_id", ForeignKey("task.id", ondelete="CASCADE"), nullable=False
        )
    )
    changed_by_id: UUID = Field(foreign_key=Task.USER_ID_FK)''')

# user.py
apply_patch('backend/app/models/user.py', '''from typing import TYPE_CHECKING
from uuid import UUID, uuid4''', '''"""Database model for User."""

from typing import TYPE_CHECKING
from uuid import UUID, uuid4''')

# task_service.py
apply_patch('backend/app/services/task_service.py', '''    @staticmethod
    def get_history(session: Session, task_id: UUID) -> list[dict]:''', '''    from typing import Any

    @staticmethod
    def get_history(session: Session, task_id: UUID) -> list[dict[str, Any]]:''')

# card.tsx
apply_patch('frontend/src/components/ui/card.tsx', '''const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));''', '''const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  >
    {children}
  </h3>
));''')

# label.tsx
apply_patch('frontend/src/components/ui/label.tsx', '''const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);''', '''const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  ),
);''')

# TaskCard.tsx
apply_patch('frontend/src/features/task-management/components/TaskCard.tsx', '''  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-card text-card-foreground shadow-sm p-5 transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      <h3 className="font-semibold text-base mb-1 text-foreground leading-snug">''', '''  return (
    <button
      className={cn(
        "w-full text-left rounded-xl border border-border/40 bg-card text-card-foreground shadow-sm p-5 transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <h3 className="font-semibold text-base mb-1 text-foreground leading-snug">''')
apply_patch('frontend/src/features/task-management/components/TaskCard.tsx', '''          </span>
        )}
      </div>
    </div>
  );
};''', '''          </span>
        )}
      </div>
    </button>
  );
};''')

# TaskDashboard.tsx
apply_patch('frontend/src/features/task-management/components/TaskDashboard.tsx', '''      {/* Modal overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleCloseOverlay}
          onKeyDown={handleOverlayKeyDown}
          tabIndex={0}
          role="button"
          aria-label={t("tasks.dashboard.closeModal")}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
            tabIndex={-1}
          >''', '''      {/* Modal overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onClick={handleCloseOverlay}
            onKeyDown={handleOverlayKeyDown}
            aria-label={t("tasks.dashboard.closeModal")}
          />
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card shadow-2xl z-10"
            role="dialog"
            aria-modal="true"
          >''')

# TaskDetailsView.tsx
apply_patch('frontend/src/features/task-management/components/TaskDetailsView.tsx', '''import { useUpdateTask } from "../hooks/useTasks";
import { useUsers } from "../../../hooks/useUsers";
import AuditTimeline from "./AuditTimeline";
import { Badge, type BadgeProps } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Select } from "../../../components/ui/select";

interface TaskDetailsViewProps {''', '''import { useUpdateTask } from "../hooks/useTasks";
import AuditTimeline from "./AuditTimeline";
import { Badge, type BadgeProps } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

interface TaskDetailsViewProps {''')

# TaskForm.tsx
apply_patch('frontend/src/features/task-management/components/TaskForm.tsx', '''  const submitText = isLoading
    ? t("tasks.form.submitSaving")
    : isEditing
      ? t("tasks.form.submitEdit")
      : t("tasks.form.submitCreate");''', '''  let submitText = t("tasks.form.submitCreate");
  if (isLoading) {
    submitText = t("tasks.form.submitSaving");
  } else if (isEditing) {
    submitText = t("tasks.form.submitEdit");
  }''')

# AuthContext.tsx
apply_patch('frontend/src/features/user-administration/context/AuthContext.tsx', '''import { type User, UserRole } from "../../../types/auth";
export { UserRole };

interface AuthContextType {''', '''import { type User } from "../../../types/auth";
export { UserRole } from "../../../types/auth";

interface AuthContextType {''')
apply_patch('frontend/src/features/user-administration/context/AuthContext.tsx', '''  const login = async (token: string) => {
    localStorage.setItem("accessToken", token);
    setIsLoading(true);
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: Boolean(user), isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};''', '''  const login = useCallback(async (token: string) => {
    localStorage.setItem("accessToken", token);
    setIsLoading(true);
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, logout }),
    [user, isLoading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};''')

# AdminUserDashboard.css
apply_patch('frontend/src/features/user-administration/pages/AdminUserDashboard.css', '''.user-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
}''', '''.user-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
}''')
apply_patch('frontend/src/features/user-administration/pages/AdminUserDashboard.css', '''.action-btn.approve {
  border-color: #28a745;
  color: #28a745;
}

.action-btn.approve:hover {''', '''.action-btn.approve {
  border-color: #1e7e34;
  color: #1e7e34;
}

.action-btn.approve:hover {''')
apply_patch('frontend/src/features/user-administration/pages/AdminUserDashboard.css', '''.action-btn.deactivate {
  border-color: #dc3545;
  color: #dc3545;
}

.action-btn.deactivate:hover {''', '''.action-btn.deactivate {
  border-color: #bd2130;
  color: #bd2130;
}

.action-btn.deactivate:hover {''')

# LoginPage.css
apply_patch('frontend/src/features/user-administration/pages/LoginPage.css', '''.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
}''', '''.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #495057;
}''')
apply_patch('frontend/src/features/user-administration/pages/LoginPage.css', '''.auth-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}''', '''.auth-button:disabled {
  background-color: #6c757d;
  color: #ffffff;
  cursor: not-allowed;
}''')

# setup.ts
apply_patch('frontend/src/test/setup.ts', '''Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});''', '''Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});''')
