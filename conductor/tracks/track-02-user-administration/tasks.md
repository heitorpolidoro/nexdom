# Task List: Track 02 - User Administration

Este documento decompõe o plano de implementação do Track 02 em tarefas granulares.

## 1. Backend (FastAPI, SQLModel)

### [x] Task 1.1: Extended User Schemas & Signup Endpoint

- **Description:** Implement `UserUpdate` schema and `POST /api/v1/auth/signup` endpoint.
- **Definition of Done:**
  - `UserUpdate` schema includes `role` and `is_active`.
  - `POST /api/v1/auth/signup` creates users as inactive and with the `DIRETOR` role.
  - Unit test for signup validation and default values.

### [x] Task 1.2: User Management Endpoints (Admin Only)

- **Description:** Create `GET /api/v1/users/` and `PATCH /api/v1/users/{id}` endpoints.
- **Definition of Done:**
  - `GET /api/v1/users/` returns all users, protected by `get_current_active_admin`.
  - `PATCH /api/v1/users/{id}` allows updating `role` and `is_active`, protected by `get_current_active_admin`.
  - Safety check to prevent an administrator from deactivating themselves.
  - Integration tests for RBAC on these endpoints.

### [x] Task 1.3: User Profile Endpoint

- **Description:** Implement `GET /api/v1/auth/me`.
- **Definition of Done:**
  - Endpoint returns the current authenticated user's data.
  - Used by frontend to populate global state.

## 2. Frontend (React, React Router, Context API)

### [x] Task 2.1: Navigation & Auth Context Setup

- **Description:** Install `react-router-dom` and implement `AuthContext` for global user state.
- **Definition of Done:**
  - App uses `BrowserRouter` for routing.
  - `AuthContext` provides `user`, `login`, `logout`, and `isAuthenticated` states.
  - Token is stored/retrieved from `localStorage`.

### [x] Task 2.2: Login & Signup Pages

- **Description:** Implement the UI and logic for `/login` and `/signup`.
- **Definition of Done:**
  - Login page handles "Inactive user" error with a clear message.
  - Signup page collects user info and redirects to login on success.
  - Basic validation for passwords (match, length).

### [x] Task 2.3: Admin Dashboard (User Management UI)

- **Description:** Create the `/admin/users` page for Directors.
- **Definition of Done:**
  - Table showing users with status and role.
  - Actions to activate/deactivate and change roles.
  - Page is protected by a `ProtectedRoute` (only ADMINISTRADOR can enter).

### [x] Task 2.4: Integration & UX Polish

- **Description:** Add logout button, admin links in navigation, and handle token expiration.
- **Definition of Done:**
  - "Admin" link only visible to Directors.
  - Automatic redirect to login if token is invalid or expired.

## 3. Quality Assurance

### [x] Task 3.1: Security & RBAC Validation

- **Description:** Comprehensive tests for user isolation and admin privileges.
- **Definition of Done:**
  - Test: Director cannot list users.
  - Test: Director cannot update their own role via API.
  - Test: Inactive user cannot access task dashboard.
