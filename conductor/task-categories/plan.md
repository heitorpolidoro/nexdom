# Implementation Plan: Task Categorization

## Objective
Implement a robust categorization system for tasks, including a managed `Category` entity and integration into the task lifecycle and dashboard UI.

## Key Files & Context
- **Backend**:
  - `backend/app/models/category.py` (New)
  - `backend/app/models/task.py` (Updated relationship)
  - `backend/app/schemas/category.py` (New)
  - `backend/app/api/v1/endpoints/categories.py` (New)
  - `backend/app/services/category_service.py` (New)
- **Frontend**:
  - `frontend/src/features/task-management/types/index.ts` (Updated types)
  - `frontend/src/features/task-management/hooks/useCategories.ts` (New)
  - `frontend/src/features/task-management/components/TaskForm.tsx` (Update)
  - `frontend/src/features/task-management/components/TaskCard.tsx` (Update)
  - `frontend/src/features/task-management/components/TaskDashboard.tsx` (Update)

## Implementation Steps

### Phase 1: Backend (Data Layer & API)
1. **Model**: Define `Category` table (id, name, color, is_active).
2. **Schema**: Create Pydantic schemas for Category CRUD.
3. **Migration**: 
   - Add `Category` table.
   - Add `category_id` to `Task` table (Foreign Key, indexed).
   - Create a default "Geral" category.
   - Assign existing tasks to the "Geral" category.
4. **Service**: Implement `CategoryService` for CRUD logic.
5. **Endpoints**:
   - `GET /categories`: List active categories (All users).
   - `POST/PATCH/DELETE /categories`: Category management (Admin only).
   - `GET /tasks`: Update filtering logic to support `category_id`.

### Phase 2: Frontend (UI/UX)
1. **API Client**: Add category endpoints to the frontend API client.
2. **Hook**: Create `useCategories` hook for data fetching.
3. **Components**:
   - **TaskForm**: Add a seletor (`Select` component) for categories.
   - **TaskCard**: Add a `Badge` component with the category color.
   - **TaskDashboard**: Add a category filter in the header (above the board/list).
4. **Logic**: Update `useTaskFiltering` hook to include the category filter.

## Verification & Testing
- **Backend**:
  - Unit tests for `CategoryService`.
  - API tests for category CRUD and RBAC.
  - Integration tests for task filtering by category.
- **Frontend**:
  - Unit tests for `useCategories` and updated `useTaskFiltering`.
  - Component tests for `TaskCard` showing the badge.
  - E2E flow: Create category (Admin) -> Create task with category -> Filter dashboard.
