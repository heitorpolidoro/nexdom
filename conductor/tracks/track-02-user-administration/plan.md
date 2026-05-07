# Implementation Plan: User Administration (Track 02)

This plan outlines the steps to implement user registration, authentication UI, and an administrative dashboard for user management, following the specifications in `track-02-user-administration/spec.md`.

## 1. API Changes (Backend)

### User Schemas (`backend/app/schemas/user.py`)

- **UserUpdate:** Add a new schema to allow updating `role` and `is_active`.
  ```python
  class UserUpdate(BaseModel):
      role: UserRole | None = None
      is_active: bool | None = None
  ```

### Authentication Endpoints (`backend/app/api/v1/endpoints/auth.py`)

- **POST `/auth/signup`**:
  - Input: `UserCreate` (username, email, password, full_name).
  - Logic:
    - Validate if username/email already exists.
    - Create user with `role=UserRole.FUNCIONARIO` (force override to prevent privilege escalation via signup).
    - Set `is_active=False` by default.
    - Hash password and save to DB.
  - Response: `UserRead`.
- **GET `/auth/me`**:
  - Returns the current authenticated user's details.
  - Dependency: `get_current_user`.
  - Response: `UserRead`.

### User Management Endpoints (`backend/app/api/v1/endpoints/users.py`)

Create this new file and register it in `api.py`.

- **GET `/users/`**:
  - Restricted to `DIRETOR` via `get_current_active_director`.
  - Query parameters: `is_active: bool | None` (to filter pending approvals).
  - Response: `list[UserRead]`.
- **PATCH `/users/{user_id}`**:
  - Restricted to `DIRETOR`.
  - Input: `UserUpdate`.
  - Logic:
    - Update user fields.
    - Prevent a `DIRETOR` from deactivating themselves or removing their own `DIRETOR` role (safety check).
  - Response: `UserRead`.

---

## 2. Frontend Implementation

### Routing & Dependencies

- Install `react-router-dom`.
- Define the following routes in `App.tsx`:
  - `/login`: Public.
  - `/signup`: Public.
  - `/admin/users`: Restricted to `DIRETOR`.
  - `/dashboard`: Restricted to authenticated users (existing TaskDashboard).
  - `/`: Redirect to `/dashboard` or `/login`.

### Pages & Components

- **LoginPage**:
  - Form for `username` and `password`.
  - Handle 400 errors: specific message for "Inactive user" (Aguardando aprovação).
- **SignupPage**:
  - Form for `username`, `email`, `full_name`, `password`, `confirm_password`.
  - On success, redirect to `/login` with a "Registration successful, await approval" message.
- **AdminUserDashboard**:
  - Table displaying all users.
  - Filters for status (Active/Inactive/All).
  - Actions: "Approve" (set active), "Deactivate", "Make Director", "Make Employee".
- **Navbar/Sidebar**:
  - Add "Admin" link visible only to users with `DIRETOR` role.
  - Add "Logout" button.

---

## 3. Security & Consistency

### Inactive User Handling

- The backend already enforces `if not user.is_active: raise HTTPException` in `login_access_token` and `get_current_user`.
- The frontend must catch these errors and prevent the user from entering the app, displaying an informative message instead of a generic "Invalid credentials".

### RBAC Implementation

- **Frontend Guard:** Create a `ProtectedRoute` component that checks for a valid JWT and optionally a specific `role`.
- **Backend Guard:** Use the existing `get_current_active_director` dependency for all sensitive administrative operations.

---

## 4. Data Flow & State Management

### Authentication Flow

1. **Login:** User submits credentials -> Backend returns JWT.
2. **Persistence:** Store JWT in `localStorage` or `cookie`.
3. **User Identity:** Frontend decodes JWT or calls `GET /auth/me` (to be implemented if needed, or extract from token payload if roles are included) to store user info in a global `AuthContext`.
4. **Redirection:**
   - Successful login -> `/dashboard`.
   - Inactive user -> Stay on `/login` with message.
   - 401/403 response on any API call -> Clear token and redirect to `/login`.

### Admin Operations Flow

1. **List Users:** Admin enters `/admin/users` -> `GET /users/` called.
2. **Update User:** Admin clicks "Approve" -> `PATCH /users/{user_id} { "is_active": true }` called -> List refreshed.

---

## 5. Implementation Roadmap

1.  **Phase 1: Backend Foundations**
    - [ ] Create `UserUpdate` schema.
    - [ ] Implement `POST /auth/signup`.
    - [ ] Create `users` router with List and Update endpoints.
2.  **Phase 2: Frontend Auth UI**
    - [ ] Setup `react-router-dom`.
    - [ ] Implement `LoginPage` and `SignupPage`.
    - [ ] Create `AuthContext` and `ProtectedRoute`.
3.  **Phase 3: Administrative UI**
    - [ ] Create `AdminUserDashboard` page.
    - [ ] Add navigation links for Directors.
    - [ ] Connect Table actions to backend endpoints.
4.  **Phase 4: Validation & Tests**
    - [ ] Test RBAC: `FUNCIONARIO` cannot access `/users` API or Admin page.
    - [ ] Test Signup: New users are created as inactive.
    - [ ] Test Login: Inactive users cannot log in.
