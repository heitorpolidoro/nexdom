# Task List: Track 01 - Task Management (Gestão de Tarefas)

Este documento decompõe o plano de implementação do Track 01 em tarefas granulares, seguindo as diretrizes de arquitetura e requisitos definidos.

## 1. Backend (FastAPI, SQLModel, Migrations)

### [x] Task 1.1: Database Schema & SQLModel Definitions

- **Description:** Define the `Task` and `TaskHistory` models using SQLModel, including enums for status and priority.
- **Traceability:** Plan Section 2.1, Spec Success Criteria (History, Status).
- **Definition of Done:**
  - Models `Task` and `TaskHistory` defined in `models/task.py`.
  - Enums `TaskStatus` and `TaskPriority` implemented.
  - Relationship between `Task` and `TaskHistory` established.
  - Initial migration generated and applied using Alembic.
- **Estimated Effort:** 1 day.

### [x] Task 1.2: Base CRUD Endpoints for Tasks

- **Description:** Implement `GET /api/v1/tasks` (List) and `POST /api/v1/tasks` (Create) endpoints.
- **Traceability:** Plan Section 3, Spec User Stories 1 & 2.
- **Definition of Done:**
  - `POST /api/v1/tasks` creates a task with validation via Pydantic.
  - `GET /api/v1/tasks` returns a list of tasks with basic filtering (status).
  - Basic unit tests for schemas and endpoint validation passing.
- **Estimated Effort:** 1-2 days.

### [x] Task 1.3: Task Update Logic with History Logging

- **Description:** Implement `PATCH /api/v1/tasks/{id}` and the service logic to automatically log changes in `TaskHistory`.
- **Traceability:** Plan Section 3 & 7, Spec Success Criteria (History).
- **Definition of Done:**
  - `PATCH` endpoint updates task fields.
  - Every change in a task field creates a new record in the `task_history` table (Service Layer logic).
  - Integration test confirming history entry creation upon task update.
- **Estimated Effort:** 2 days.

### [x] Task 1.4: RBAC & Security Implementation

- **Description:** Secure endpoints with JWT and implement Role-Based Access Control (RBAC) for Task operations.
- **Traceability:** Plan Section 5, Spec Audience.
- **Definition of Done:**
  - Only authenticated users can access task endpoints.
  - Only `ADMINISTRADOR` role can create/delete tasks.
  - `DIRETOR` can only update tasks assigned to them (restricted to status/progress).
  - Integration tests for unauthorized/forbidden access.
- **Estimated Effort:** 1-2 days.

## 2. Frontend (React Components, State Management)

### [x] Task 2.1: Task Dashboard & List Components

- **Description:** Create the `TaskDashboard`, `TaskList`, `TaskCard`, and `TaskFilters` components.
- **Traceability:** Plan Section 4, Spec Success Criteria (Filtros).
- **Definition of Done:**
  - Dashboard displays a list of task cards with status indicators.
  - Filters by status are functional.
  - Responsive layout (mobile-first) implemented.
- **Estimated Effort:** 2 days.

### [x] Task 2.2: Task Form & Detail View

- **Description:** Implement `TaskForm` (Modal/Page) for creation/edition and `TaskDetailsView`.
- **Traceability:** Plan Section 4, Spec User Story 1.
- **Definition of Done:**
  - Form validates required fields (Title, Priority, Assigned To).
  - `TaskDetailsView` displays all task information and metadata.
  - Form handles both Create and Edit modes seamlessly.
- **Estimated Effort:** 2 days.

### [x] Task 2.3: Audit Timeline Component

- **Description:** Create the `AuditTimeline` component to visualize the `task_history` data.
- **Traceability:** Plan Section 4, Spec Success Criteria (Histórico).
- **Definition of Done:**
  - Timeline renders list of changes with timestamp, field name, old value, and new value.
  - Component integrated into the `TaskDetailsView` (tab or section).
- **Estimated Effort:** 1 day.

### [x] Task 2.4: Frontend API Integration & State Management

- **Description:** Integrate components with backend endpoints and manage global/local state.
- **Traceability:** Plan Section 1 & 4.
- **Definition of Done:**
  - Data fetching and caching implemented (e.g., using React Query).
  - Loading, error, and empty states are handled in the UI.
  - Successful updates trigger list refresh and toast notifications.
- **Estimated Effort:** 2 days.

## 3. Integration & Final Validation

### [x] Task 3.1: Comprehensive Backend Test Suite

- **Description:** Ensure high coverage for task logic, status transitions, and history logging.
- **Traceability:** Plan Section 8.1.
- **Definition of Done:**
  - Pytest suite covers all CRUD operations, RBAC rules, and history triggers.
  - Coverage report above 90% for the `tasks` module.
- **Estimated Effort:** 1 day.

### [x] Task 3.2: Frontend Unit & Component Tests

- **Description:** Test key frontend components and form validation logic.
- **Traceability:** Plan Section 8.2.
- **Definition of Done:**
  - Vitest/React Testing Library tests for `TaskCard` rendering and `TaskForm` validation.
- **Estimated Effort:** 1 day.

### [ ] Task 3.3: E2E Critical Flow Validation

- **Description:** Implement Playwright tests for the main user stories.
- **Traceability:** Plan Section 8.3, Spec User Stories 1-3.
- **Definition of Done:**
  - E2E test script covers: Director creates task -> Employee updates status -> Director verifies history.
  - All tests passing consistently.
- **Estimated Effort:** 2 days.
