# Roles, Permissões e Audit — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MANAGER to the role type, make the audit timeline collapsible, display resolved user names in history, replace the binary role toggle with a 3-option select, remove the stale DIRECTOR field restriction from TaskForm, and hide category write actions from MANAGER users.

**Architecture:** All changes are isolated to the frontend. No new hooks or API calls needed — the backend already returns `resolved_old_value` / `resolved_new_value` after the backend plan is complete. The frontend plan is independent for tasks 1–5 and requires the backend to be done for task 4 (resolved history display).

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, react-i18next

**Spec:** `docs/superpowers/specs/2026-05-26-roles-permissions-audit-design.md`

**Dependency note:** Task 4 (resolved history display) requires the backend plan Task 4 to be deployed first so that `resolved_old_value` / `resolved_new_value` appear in API responses. Tasks 1–3, 5, 6 are fully independent of the backend plan.

---

## File Map

| File | Change |
|---|---|
| `frontend/src/types/auth.ts` | Add `MANAGER` to `UserRole` |
| `frontend/src/i18n/locales/pt.json` | Add `roles` section |
| `frontend/src/i18n/locales/en.json` | Add `roles` section |
| `frontend/src/features/user-administration/pages/AdminUserDashboard.tsx` | Replace binary role toggle button with `<select>` |
| `frontend/src/features/task-management/components/AuditTimeline.tsx` | Make collapsible + render resolved name+role for `assigned_to_id` |
| `frontend/src/features/task-management/types/index.ts` | Add `resolved_old_value`, `resolved_new_value` to `TaskHistoryRead` |
| `frontend/src/features/task-management/components/TaskForm.tsx` | Remove `directorEditing` field restriction |
| `frontend/src/features/task-management/components/CategoriesPage.tsx` | Hide write actions for MANAGER |
| `frontend/src/features/task-management/components/__tests__/AuditTimeline.test.tsx` | Add collapse/expand + resolved name tests |
| `frontend/src/features/user-administration/components/__tests__/AdminUserDashboard.test.tsx` | Add role select tests |

---

## Task 1: Add MANAGER to UserRole + i18n roles keys

**Files:**
- Modify: `frontend/src/types/auth.ts`
- Modify: `frontend/src/i18n/locales/pt.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Write the failing test**

  Create `frontend/src/types/__tests__/auth.test.ts`:

  ```typescript
  import { describe, it, expect } from "vitest";
  import { UserRole } from "../auth";

  describe("UserRole", () => {
    it("includes MANAGER", () => {
      expect(UserRole.MANAGER).toBe("MANAGER");
    });

    it("has exactly three roles", () => {
      expect(Object.keys(UserRole)).toHaveLength(3);
    });
  });
  ```

- [ ] **Step 2: Run to confirm it fails**

  ```bash
  cd frontend && npx vitest run src/types/__tests__/auth.test.ts
  ```

  Expected: `TypeError: Cannot read properties of undefined (reading 'MANAGER')`

- [ ] **Step 3: Add MANAGER to `types/auth.ts`**

  ```typescript
  export const UserRole = {
    ADMINISTRATOR: "ADMINISTRATOR",
    DIRECTOR: "DIRECTOR",
    MANAGER: "MANAGER",
  } as const;

  export type UserRole = (typeof UserRole)[keyof typeof UserRole];

  export interface UserType {
    id: string;
    name: string;
  }

  export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    type?: UserType | null;
    type_id?: string | null;
  }
  ```

- [ ] **Step 4: Add `roles` section to `pt.json`**

  In `frontend/src/i18n/locales/pt.json`, add a top-level `"roles"` key at the end of the JSON object (before the closing `}`):

  ```json
  "roles": {
    "ADMINISTRATOR": "Administrador",
    "DIRECTOR": "Diretor",
    "MANAGER": "Gerente"
  }
  ```

- [ ] **Step 5: Add `roles` section to `en.json`**

  In `frontend/src/i18n/locales/en.json`, add the same key:

  ```json
  "roles": {
    "ADMINISTRATOR": "Administrator",
    "DIRECTOR": "Director",
    "MANAGER": "Manager"
  }
  ```

- [ ] **Step 6: Run the test**

  ```bash
  cd frontend && npx vitest run src/types/__tests__/auth.test.ts
  ```

  Expected: `PASSED`

- [ ] **Step 7: Run all frontend tests**

  ```bash
  cd frontend && npx vitest run
  ```

  Expected: No regressions.

- [ ] **Step 8: Commit**

  ```bash
  git add frontend/src/types/auth.ts frontend/src/i18n/locales/pt.json frontend/src/i18n/locales/en.json frontend/src/types/__tests__/auth.test.ts
  git commit -m "feat(frontend): add MANAGER role to UserRole type and i18n"
  ```

---

## Task 2: AdminUserDashboard — replace role toggle with `<select>`

**Files:**
- Modify: `frontend/src/features/user-administration/pages/AdminUserDashboard.tsx`
- Modify (or create): `frontend/src/features/user-administration/pages/__tests__/AdminUserDashboard.test.tsx`

- [ ] **Step 1: Write the failing tests**

  Find the existing `AdminUserDashboard.test.tsx`. Add these tests (or create the file if it doesn't exist at that path):

  ```typescript
  // In the AdminUserDashboard describe block, add:
  it("renders a role select with 3 options for each user", async () => {
    // Mock a director user in the list
    const mockUsers = [
      {
        id: "user-1",
        username: "director1",
        email: "dir@test.com",
        full_name: "Director One",
        role: "DIRECTOR",
        is_active: true,
        type: null,
      },
    ];
    // (Set up mocks to return mockUsers from the useQuery for "users")
    // Then check the select is present with 3 options
    const selects = screen.getAllByRole("combobox", { name: /role/i });
    expect(selects.length).toBeGreaterThan(0);
    const options = within(selects[0]).getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(["Administrator", "Director", "Manager"])
    );
  });
  ```

  > Note: Match the exact mock setup pattern already used in that test file. The above is the assertion logic — wrap it inside the existing test infrastructure.

- [ ] **Step 2: Run to confirm it fails**

  ```bash
  cd frontend && npx vitest run --reporter=verbose src/features/user-administration
  ```

  Expected: The new test fails because the current UI has a button, not a select with 3 options.

- [ ] **Step 3: Update `AdminUserDashboard.tsx`**

  Replace the `handleRoleChange` function and the role toggle button. The new approach uses a `<select>` that calls the update mutation directly.

  **Remove** the `handleRoleChange` function (lines 115–125 in the current file).

  **Add** `handleRoleSelect` in its place:

  ```typescript
  const handleRoleSelect = (user: User, newRole: UserRole) => {
    if (user.id === currentUser?.id) {
      setActionError(t("admin.cannotChangeOwnRole"));
      return;
    }
    updateUserMutation.mutate({ userId: user.id, data: { role: newRole } });
  };
  ```

  **Replace** the role toggle button in the table row actions:

  Old (lines 335–343):
  ```tsx
  <Button
    size="sm"
    variant="outline"
    onClick={() => handleRoleChange(user)}
  >
    {user.role === UserRole.ADMINISTRATOR
      ? t("admin.makeDirector")
      : t("admin.makeAdministrator")}
  </Button>
  ```

  New:
  ```tsx
  <Select
    aria-label={t("admin.colRole")}
    value={user.role}
    onChange={(e) => handleRoleSelect(user, e.target.value as UserRole)}
    className="h-8 text-sm w-36"
    disabled={user.id === currentUser?.id || updateUserMutation.isPending}
  >
    <option value={UserRole.ADMINISTRATOR}>{t("roles.ADMINISTRATOR")}</option>
    <option value={UserRole.DIRECTOR}>{t("roles.DIRECTOR")}</option>
    <option value={UserRole.MANAGER}>{t("roles.MANAGER")}</option>
  </Select>
  ```

  Also **remove** the now-unused i18n keys from the admin section if desired (optional, can leave them — they're just unused strings).

- [ ] **Step 4: Run the tests**

  ```bash
  cd frontend && npx vitest run src/features/user-administration
  ```

  Expected: All pass.

- [ ] **Step 5: Run all tests**

  ```bash
  cd frontend && npx vitest run
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/features/user-administration/pages/AdminUserDashboard.tsx
  git commit -m "feat(frontend): replace binary role toggle with 3-option select in AdminUserDashboard"
  ```

---

## Task 3: AuditTimeline — make collapsible

**Files:**
- Modify: `frontend/src/features/task-management/components/AuditTimeline.tsx`
- Modify: `frontend/src/features/task-management/components/__tests__/AuditTimeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

  Add to `frontend/src/features/task-management/components/__tests__/AuditTimeline.test.tsx`:

  ```typescript
  it("is collapsed by default", () => {
    vi.mocked(useTaskHistory).mockReturnValue({
      data: [
        {
          id: "1",
          task_id: "test-id",
          user_name: "John Doe",
          field_name: "status",
          old_value: "PENDING",
          new_value: "IN_PROGRESS",
          timestamp: "2023-10-27T10:00:00Z",
          changed_by_id: "user-1",
        },
      ],
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);

    // Timeline entries should NOT be visible when collapsed
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    // The toggle button should show the count
    expect(screen.getByRole("button", { name: /histórico de alterações/i })).toBeInTheDocument();
    expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
  });

  it("expands when the header button is clicked", async () => {
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    vi.mocked(useTaskHistory).mockReturnValue({
      data: [
        {
          id: "1",
          task_id: "test-id",
          user_name: "Jane Smith",
          field_name: "status",
          old_value: "PENDING",
          new_value: "IN_PROGRESS",
          timestamp: "2023-10-27T10:00:00Z",
          changed_by_id: "user-1",
        },
      ],
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);

    const toggleBtn = screen.getByRole("button", { name: /histórico de alterações/i });
    await user.click(toggleBtn);

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("collapses again when the header is clicked twice", async () => {
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    vi.mocked(useTaskHistory).mockReturnValue({
      data: [
        {
          id: "1",
          task_id: "test-id",
          user_name: "Bob",
          field_name: "status",
          old_value: "PENDING",
          new_value: "IN_PROGRESS",
          timestamp: "2023-10-27T10:00:00Z",
          changed_by_id: "user-1",
        },
      ],
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);

    const toggleBtn = screen.getByRole("button", { name: /histórico de alterações/i });
    await user.click(toggleBtn);
    expect(screen.getByText("Bob")).toBeInTheDocument();

    await user.click(toggleBtn);
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });
  ```

- [ ] **Step 2: Run to confirm they fail**

  ```bash
  cd frontend && npx vitest run src/features/task-management/components/__tests__/AuditTimeline.test.tsx
  ```

  Expected: The new "collapsed by default" test fails (history entries are visible).

- [ ] **Step 3: Update `AuditTimeline.tsx`**

  Replace the entire file:

  ```tsx
  import React, { useState } from "react";
  import { useTranslation } from "react-i18next";
  import { useTaskHistory } from "../hooks/useTasks";
  import type { TaskHistoryRead } from "../types";

  interface AuditTimelineProps {
    taskId: string;
  }

  const AuditTimeline: React.FC<AuditTimelineProps> = ({ taskId }) => {
    const { t, i18n } = useTranslation();
    const { data: history, isLoading, error } = useTaskHistory(taskId);
    const [isOpen, setIsOpen] = useState(false);

    const formatDate = (date: Date | string) =>
      new Date(date).toLocaleString(i18n.language === "pt" ? "pt-BR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    const formatFieldName = (name: string) => name?.replaceAll("_", " ") || "";

    const formatValue = (value: string | null) => {
      if (value === null || value === "null") return t("tasks.audit.none");
      if (value === "") return t("tasks.audit.emptyValue");
      return value;
    };

    const formatAssignedValue = (entry: TaskHistoryRead, which: "old" | "new") => {
      const resolved = which === "old" ? entry.resolved_old_value : entry.resolved_new_value;
      if (resolved) {
        const roleLabel = t(`roles.${resolved.role}`, { defaultValue: resolved.role });
        return `${resolved.name} (${roleLabel})`;
      }
      const rawValue = which === "old" ? entry.old_value : entry.new_value;
      return formatValue(rawValue);
    };

    if (isLoading) {
      return (
        <p className="text-sm text-muted-foreground py-2">
          {t("tasks.audit.loading")}
        </p>
      );
    }

    if (error) {
      return (
        <p className="text-sm text-destructive py-2">{t("tasks.audit.error")}</p>
      );
    }

    const count = history?.length ?? 0;

    return (
      <div className="pt-3 border-t mt-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
          aria-expanded={isOpen}
        >
          <span aria-hidden="true">{isOpen ? "▼" : "▶"}</span>
          <span>{t("tasks.audit.title")}</span>
          {!isOpen && count > 0 && (
            <span className="normal-case font-normal text-muted-foreground/70">
              ({count})
            </span>
          )}
        </button>

        {isOpen && (
          <>
            {!history || count === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                {t("tasks.audit.empty")}
              </p>
            ) : (
              <div className="relative pl-5">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                {(history as TaskHistoryRead[]).map((entry) => (
                  <div key={entry.id} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-5 top-1 size-2.5 rounded-full bg-primary border-2 border-background translate-x-[-50%]" />
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {entry.user_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                    <div className="rounded-md bg-muted/40 border px-3 py-2 text-sm">
                      <span className="font-medium text-foreground capitalize block mb-1">
                        {formatFieldName(entry.field_name)}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground line-through">
                          {entry.field_name === "assigned_to_id"
                            ? formatAssignedValue(entry, "old")
                            : formatValue(entry.old_value)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-emerald-600 font-medium">
                          {entry.field_name === "assigned_to_id"
                            ? formatAssignedValue(entry, "new")
                            : formatValue(entry.new_value)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  export default AuditTimeline;
  ```

- [ ] **Step 4: Run the tests**

  ```bash
  cd frontend && npx vitest run src/features/task-management/components/__tests__/AuditTimeline.test.tsx
  ```

  Expected: All pass (including existing ones — the existing tests render the component but don't check for visible entries directly since they rendered with no `isOpen` state prior; update any that now fail because entries are hidden).

  > ⚠️ If existing tests like "renders a list of history entries correctly" fail (because they expect entries visible without clicking), update them to click the toggle button first:
  >
  > ```typescript
  > const toggleBtn = screen.getByRole("button", { name: /histórico de alterações/i });
  > await userEvent.click(toggleBtn);
  > // then assert entry visibility
  > ```

- [ ] **Step 5: Update `TaskHistoryRead` type in `types/index.ts`**

  Add the two new optional fields at the end of the `TaskHistoryRead` interface:

  ```typescript
  export interface TaskHistoryRead {
    id: string;
    task_id: string;
    changed_by_id: string;
    user_name: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    timestamp: Date | string;
    /** Resolved user info for assigned_to_id old value. */
    resolved_old_value: { name: string; role: string } | null;
    /** Resolved user info for assigned_to_id new value. */
    resolved_new_value: { name: string; role: string } | null;
  }
  ```

- [ ] **Step 6: Run all frontend tests**

  ```bash
  cd frontend && npx vitest run
  ```

  Expected: All pass.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/features/task-management/components/AuditTimeline.tsx frontend/src/features/task-management/types/index.ts frontend/src/features/task-management/components/__tests__/AuditTimeline.test.tsx
  git commit -m "feat(frontend): make AuditTimeline collapsible; display resolved name+role for assigned_to_id"
  ```

---

## Task 4: TaskForm — remove DIRECTOR field restriction

**Files:**
- Modify: `frontend/src/features/task-management/components/TaskForm.tsx`

- [ ] **Step 1: Identify what to remove**

  The `directorEditing` logic currently:
  - Hides the `title` field (lines 158–174)
  - Hides the `priority` field (lines 190–207)
  - Hides the `due_date` field (lines 273–285)
  - Skips the `title` required validation when `directorEditing` is true (line 94)
  - Sends a restricted update payload when `directorEditing` is true (lines 118–125)

  After the change, all fields are always visible for all roles.

- [ ] **Step 2: Write the failing test**

  Add to `frontend/src/features/task-management/components/__tests__/TaskForm.test.tsx`:

  ```typescript
  it("shows title, priority, and due_date fields for DIRECTOR when editing", () => {
    // Mock useAuth to return a DIRECTOR user
    // (match how the existing test file mocks this)
    // Then render with an existing task (isEditing = true)
    // Assert that title, priority, and due_date inputs are present
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prioridade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de entrega/i)).toBeInTheDocument();
  });
  ```

  > Adapt to match the exact mock patterns in the existing test file (check how `useAuth` is mocked there).

- [ ] **Step 3: Run to confirm the test fails**

  ```bash
  cd frontend && npx vitest run src/features/task-management/components/__tests__/TaskForm.test.tsx
  ```

- [ ] **Step 4: Update `TaskForm.tsx`**

  Make the following changes to `frontend/src/features/task-management/components/TaskForm.tsx`:

  **Remove lines 30–31** (`isDirector` and `directorEditing` variables):
  ```typescript
  // DELETE these two lines:
  const isDirector = user?.role === UserRole.DIRECTOR;
  const directorEditing = isDirector && isEditing;
  ```

  Also remove the unused `user` destructure if nothing else uses it — but keep `useAuth` if it's still needed elsewhere (it won't be, so remove the entire `const { user } = useAuth();` line and the import of `useAuth` and `UserRole`).

  **Update the import** at lines 15–18 — remove the `useAuth` and `UserRole` imports since they're no longer used:
  ```typescript
  // REMOVE this import block entirely:
  import {
    useAuth,
    UserRole,
  } from "../../user-administration/context/AuthContext";
  ```

  **Update line 94** — remove the `directorEditing` guard in `validate()`:
  ```typescript
  // OLD:
  if (!directorEditing && !(formData.title as string).trim())
  // NEW:
  if (!(formData.title as string).trim())
  ```

  **Update lines 117–125** — replace the conditional update payload with the full payload always:
  ```typescript
  if (isEditing && task) {
    const updatePayload: TaskUpdate = {
      ...commonData,
      status: formData.status as TaskStatus,
    };
    updateTaskMutation.mutate(
      { id: task.id, data: updatePayload },
      { onSuccess },
    );
  } else {
    createTaskMutation.mutate(commonData, { onSuccess });
  }
  ```

  **Remove the `{!directorEditing && (...)}` wrappers** around the title field (lines 158–174), priority field (lines 190–207), and due_date field (lines 273–285). Replace each with just the inner content (the `<div className="flex flex-col gap-1.5">...</div>` block directly).

  The final relevant sections of `TaskForm.tsx` after the edit:
  ```tsx
  // No more isDirector / directorEditing / useAuth / UserRole

  const TaskForm: React.FC<TaskFormProps> = ({ task, onSuccess, onCancel }) => {
    const { t } = useTranslation();
    const isEditing = !!task;
    const createTaskMutation = useCreateTask();
    const updateTaskMutation = useUpdateTask();
    const { data: users } = useAssignableUsers();
    const { data: categories } = useCategories();
    // ...

    const validate = () => {
      const newErrors: Record<string, string> = {};
      if (!(formData.title as string).trim())
        newErrors.title = t("tasks.form.titleRequired");
      if (!(formData.category_id as string))
        newErrors.category_id = t("tasks.form.categoryRequired");
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    // ... handleSubmit always sends full payload
  ```

- [ ] **Step 5: Run the tests**

  ```bash
  cd frontend && npx vitest run src/features/task-management/components/__tests__/TaskForm.test.tsx
  ```

  Expected: All pass. Fix any that relied on the `directorEditing` behavior.

- [ ] **Step 6: Run all frontend tests**

  ```bash
  cd frontend && npx vitest run
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/features/task-management/components/TaskForm.tsx
  git commit -m "feat(frontend): remove DIRECTOR field restriction from TaskForm — all roles see all fields"
  ```

---

## Task 5: CategoriesPage — hide write actions for MANAGER

**Files:**
- Modify: `frontend/src/features/task-management/components/CategoriesPage.tsx`
- Modify: `frontend/src/features/task-management/components/__tests__/CategoriesPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

  Add to `frontend/src/features/task-management/components/__tests__/CategoriesPage.test.tsx`:

  ```typescript
  it("hides the New Category button for MANAGER users", () => {
    // Mock useAuth to return a MANAGER user
    // (match the existing mock pattern in the file)
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "mgr-1",
        username: "mgr",
        email: "mgr@test.com",
        full_name: "Manager",
        role: "MANAGER",
        is_active: true,
      },
      logout: vi.fn(),
      login: vi.fn(),
      isAuthenticated: true,
    } as any);

    // mock useCategories to return empty list
    // (match the existing mock pattern)

    render(<CategoriesPage />);
    expect(screen.queryByRole("button", { name: /nova categoria/i })).not.toBeInTheDocument();
  });

  it("shows the New Category button for DIRECTOR users", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "dir-1",
        username: "dir",
        email: "dir@test.com",
        full_name: "Director",
        role: "DIRECTOR",
        is_active: true,
      },
      logout: vi.fn(),
      login: vi.fn(),
      isAuthenticated: true,
    } as any);

    render(<CategoriesPage />);
    expect(screen.getByRole("button", { name: /nova categoria/i })).toBeInTheDocument();
  });

  it("hides edit and delete buttons for MANAGER users", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "mgr-1", role: "MANAGER", full_name: "M", username: "m", email: "m@m.com", is_active: true },
      logout: vi.fn(), login: vi.fn(), isAuthenticated: true,
    } as any);

    // mock useCategories to return one category
    vi.mocked(useCategories).mockReturnValue({
      data: [{ id: "cat-1", name: "Test", color: "#ff0000", is_active: true }],
      isLoading: false,
    } as any);

    render(<CategoriesPage />);
    // Edit (pencil) and delete (trash) buttons should not exist
    expect(screen.queryByLabelText(/edit/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete/i)).not.toBeInTheDocument();
  });
  ```

  > Adapt mock setup to the exact pattern in the existing `CategoriesPage.test.tsx`.

- [ ] **Step 2: Run to confirm they fail**

  ```bash
  cd frontend && npx vitest run src/features/task-management/components/__tests__/CategoriesPage.test.tsx
  ```

- [ ] **Step 3: Update `CategoriesPage.tsx`**

  Add `useAuth` and `UserRole` imports, then guard the write UI:

  ```tsx
  // Add imports at the top:
  import { useAuth, UserRole } from "../../user-administration/context/AuthContext";
  ```

  At the start of `CategoriesPage`:
  ```tsx
  const CategoriesPage: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const canWrite = user?.role === UserRole.ADMINISTRATOR || user?.role === UserRole.DIRECTOR;
    // ... rest of existing state
  ```

  Guard the "New Category" button (lines 248–253):
  ```tsx
  {canWrite && !showForm && (
    <Button onClick={() => { setShowForm(true); setEditState(null); }}>
      <Plus className="size-4" />
      {t("categories.newCategory")}
    </Button>
  )}
  ```

  Guard the showForm block (lines 262–295):
  ```tsx
  {canWrite && showForm && (
    <form ...>
      ...
    </form>
  )}
  ```

  Guard the edit form inside `renderList()` — wrap the `if (editState?.id === cat.id)` block so it only shows if `canWrite`:
  ```tsx
  if (editState?.id === cat.id && canWrite) {
    // ... edit form JSX
  }
  ```

  Guard the action buttons at the end of each list item (the `<div className="flex gap-1">` containing the pencil and trash buttons):
  ```tsx
  {canWrite && (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={() => startEdit(cat)} className="px-2">
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmDeleteId(cat.id)}
        className="px-2 text-destructive hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )}
  ```

  Also guard the confirm-delete row (wrap the `if (confirmDeleteId === cat.id)` block):
  ```tsx
  if (confirmDeleteId === cat.id && canWrite) {
    // ... confirm delete JSX
  }
  ```

- [ ] **Step 4: Run the tests**

  ```bash
  cd frontend && npx vitest run src/features/task-management/components/__tests__/CategoriesPage.test.tsx
  ```

  Expected: All pass.

- [ ] **Step 5: Run all frontend tests**

  ```bash
  cd frontend && npx vitest run
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/features/task-management/components/CategoriesPage.tsx frontend/src/features/task-management/components/__tests__/CategoriesPage.test.tsx
  git commit -m "feat(frontend): hide category write actions for MANAGER role"
  ```

---

## Task 6: Final check — run all tests and verify

- [ ] **Step 1: Run complete frontend test suite**

  ```bash
  cd frontend && npx vitest run --reporter=verbose
  ```

  Expected: All tests pass with no regressions.

- [ ] **Step 2: Check coverage**

  ```bash
  cd frontend && npx vitest run --coverage
  ```

  Review the output for any new uncovered branches introduced in this plan.

- [ ] **Step 3: Fix any coverage gaps**

  If any new branches are uncovered, add targeted tests.

- [ ] **Step 4: Lint**

  ```bash
  cd frontend && npx eslint src --ext .ts,.tsx
  ```

  Expected: No errors.

- [ ] **Step 5: Final commit**

  ```bash
  git add -A
  git commit -m "test(frontend): ensure full coverage for roles/permissions/audit-timeline changes"
  ```
