# Inline Field Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline `<select>` controls for `priority`, `assigned_to`, and `category` in `TaskDetailsView` so users can change these fields without entering the full edit modal.

**Architecture:** Follow the existing pattern established by the status `<select>` in `TaskDetailsView`. Each field becomes a `<select>` element that calls `useUpdateTask` on change, using `aria-label` to differentiate the four comboboxes. The metadata grid's current `.map()` over a static array is replaced by individual cells so editable fields can use interactive elements.

**Tech Stack:** React 19, TypeScript, TanStack Query, Vitest + Testing Library, Tailwind CSS

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `frontend/src/features/task-management/components/TaskDetailsView.tsx` | Modify | Add imports for `useAssignableUsers` + `useCategories`; add `aria-label="status"` to existing select; replace priority Badge with `<select>`; break metadata grid `.map()` into individual cells with `<select>` for `assigned_to` and `category` |
| `frontend/src/features/task-management/components/__tests__/TaskDetailsView.test.tsx` | Modify | Add `useAssignableUsers` + `useCategories` mocks; update queries that use `getByRole("combobox")` (now multiple comboboxes exist) to use `{ name: "..." }` lookups; remove broken category-badge test; add three new mutation tests |

---

### Task 1: Update the test file to the desired final state

Write all test changes **before** the implementation. Running tests after this task should produce failures — that's expected and is the TDD red step.

**Files:**
- Modify: `frontend/src/features/task-management/components/__tests__/TaskDetailsView.test.tsx`

- [ ] **Step 1: Replace the entire test file with the updated version**

The key changes vs. the current file:
- `assigned_to_name` in `mockTask` changed to `"Alice Smith"` (distinct from `created_by_name: "admin"`) to avoid `getByText` ambiguity
- Add `useAssignableUsers` to the `useUsers` module mock
- Add new `vi.mock("../../hooks/useCategories", ...)` 
- In `beforeEach`: add `useAssignableUsers` and `useCategories` return values
- All `getByRole("combobox")` calls updated to `getByRole("combobox", { name: "status" })`
- `"disables status select"` test renamed to `"disables all selects"` and checks all four comboboxes
- `"handles unknown status and priority"` test simplified to only check status
- `"renders category badge..."` test replaced with `"renders color dot for current category"` and `"renders only active categories"`
- `"renders 'Não atribuído'"` test updated to check combobox value instead of text
- Three new tests: priority change, assigned_to change, category change, and assigned_to cleared → null

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TaskDetailsView from "../TaskDetailsView";
import { TaskPriority, TaskStatus } from "../../types";
import { useUpdateTask, useTaskHistory } from "../../hooks/useTasks";
import { useAssignableUsers } from "../../../../hooks/useUsers";
import { useCategories } from "../../hooks/useCategories";
import { useTranslation } from "react-i18next";

// Mock the hooks
vi.mock("../../hooks/useTasks", () => ({
  useUpdateTask: vi.fn(),
  useTaskHistory: vi.fn(),
  useComments: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateComment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateComment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("../../../../hooks/useUsers", () => ({
  useUsers: vi.fn(),
  useAssignableUsers: vi.fn(),
}));

vi.mock("../../hooks/useCategories", () => ({
  useCategories: vi.fn(),
  useCreateCategory: vi.fn(),
  useUpdateCategory: vi.fn(),
  useDeleteCategory: vi.fn(),
}));

vi.mock(
  "../../../user-administration/context/AuthContext",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../../user-administration/context/AuthContext")
      >();
    return {
      ...actual,
      useAuth: vi.fn(() => ({
        user: { id: "admin-1", role: actual.UserRole.ADMINISTRATOR },
      })),
    };
  },
);

describe("TaskDetailsView", () => {
  const mockOnEdit = vi.fn();
  const mockOnClose = vi.fn();
  const mockUpdateMutate = vi.fn();

  const mockTask = {
    id: "1",
    title: "Test Task",
    description: "Test Description",
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    assigned_to_id: "user1",
    assigned_to_name: "Alice Smith",
    created_by_id: "admin",
    created_by_name: "admin",
    due_date: "2023-12-31T23:59:59Z",
    created_at: "2023-01-01T10:00:00Z",
    updated_at: "2023-01-01T10:00:00Z",
    category_id: "cat-1",
    category_name: "General",
    category_color: "#808080",
    manager_visible: false,
  };

  const mockAssignableUsers = [
    {
      id: "user1",
      full_name: "Alice Smith",
      username: "alice",
      role: "DIRECTOR",
      is_active: true,
      type: { id: "t1", name: "Analista" },
    },
    {
      id: "user2",
      full_name: "Bob Jones",
      username: "bob",
      role: "DIRECTOR",
      is_active: true,
      type: { id: "t1", name: "Analista" },
    },
  ];

  const mockCategories = [
    { id: "cat-1", name: "General", color: "#808080", is_active: true },
    { id: "cat-2", name: "Feature", color: "#ff0000", is_active: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any); // skipcq: JS-0323

    vi.mocked(useTaskHistory).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any); // skipcq: JS-0323

    vi.mocked(useAssignableUsers).mockReturnValue({
      data: mockAssignableUsers,
      isLoading: false,
    } as any); // skipcq: JS-0323

    vi.mocked(useCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
    } as any); // skipcq: JS-0323
  });

  it("renders all task metadata correctly", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getAllByText("Pendente").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "priority" })).toHaveValue(
      TaskPriority.MEDIUM,
    );
    expect(screen.getByRole("combobox", { name: "assigned_to" })).toHaveValue(
      "user1",
    );
    expect(screen.getByText("admin")).toBeInTheDocument();
    const dateElements = screen.getAllByText(/2023/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it("triggers onEdit callback when Edit button is clicked", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));

    expect(mockOnEdit).toHaveBeenCalled();
  });

  it("triggers onClose callback when Close button is clicked", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Fechar/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("triggers updateTask mutation when status select is changed", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    const statusSelect = screen.getByRole("combobox", { name: "status" });
    fireEvent.change(statusSelect, {
      target: { value: TaskStatus.IN_PROGRESS },
    });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        data: { status: TaskStatus.IN_PROGRESS },
      }),
    );
  });

  it("triggers updateTask mutation when priority select is changed", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    const prioritySelect = screen.getByRole("combobox", { name: "priority" });
    fireEvent.change(prioritySelect, { target: { value: TaskPriority.HIGH } });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        data: { priority: TaskPriority.HIGH },
      }),
    );
  });

  it("triggers updateTask mutation when assigned_to select is changed", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    const assignedToSelect = screen.getByRole("combobox", {
      name: "assigned_to",
    });
    fireEvent.change(assignedToSelect, { target: { value: "user2" } });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        data: { assigned_to_id: "user2" },
      }),
    );
  });

  it("triggers updateTask with null when assigned_to is cleared", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    const assignedToSelect = screen.getByRole("combobox", {
      name: "assigned_to",
    });
    fireEvent.change(assignedToSelect, { target: { value: "" } });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        data: { assigned_to_id: null },
      }),
    );
  });

  it("triggers updateTask mutation when category select is changed", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    const categorySelect = screen.getByRole("combobox", { name: "category" });
    fireEvent.change(categorySelect, { target: { value: "cat-2" } });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        data: { category_id: "cat-2" },
      }),
    );
  });

  it("renders 'Não atribuído' option when assigned_to_id is null", () => {
    const incompleteTask = {
      ...mockTask,
      assigned_to_id: null,
      assigned_to_name: null,
      due_date: null,
    };

    render(
      <TaskDetailsView
        task={incompleteTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "assigned_to" }),
    ).toHaveValue("");
    expect(screen.getAllByText("Não definido").length).toBeGreaterThan(0);
  });

  it("applies correct status classes", () => {
    const statuses = Object.values(TaskStatus);

    statuses.forEach((status) => {
      const { rerender } = render(
        <TaskDetailsView
          task={{ ...mockTask, status } as any} // skipcq: JS-0323
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />,
      );
      const expectedText =
        status === TaskStatus.PENDING
          ? "Pendente"
          : status === TaskStatus.IN_PROGRESS
            ? "Em andamento"
            : status === TaskStatus.BLOCKED
              ? "Bloqueada"
              : status === TaskStatus.COMPLETED
                ? "Concluída"
                : "Cancelada";

      const badge = screen.getAllByText(expectedText)[0];
      expect(badge).toBeInTheDocument();
      rerender(<></>);
    });
  });

  it("renders 'Nenhuma descrição fornecida.' when description is empty or null", () => {
    const { rerender } = render(
      <TaskDetailsView
        task={{ ...mockTask, description: "" } as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(
      screen.getByText("Nenhuma descrição fornecida."),
    ).toBeInTheDocument();

    rerender(
      <TaskDetailsView
        task={{ ...mockTask, description: null } as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(
      screen.getByText("Nenhuma descrição fornecida."),
    ).toBeInTheDocument();
  });

  it("disables all selects when updateTaskMutation.isPending is true", () => {
    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: true,
    } as any); // skipcq: JS-0323

    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByRole("combobox", { name: "status" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "priority" })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "assigned_to" }),
    ).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "category" })).toBeDisabled();
  });

  it("formatDate handles all falsy values", () => {
    const { rerender } = render(
      <TaskDetailsView
        task={{ ...mockTask, due_date: null } as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getAllByText("Não definido").length).toBeGreaterThan(0);

    rerender(
      <TaskDetailsView
        task={{ ...mockTask, due_date: undefined } as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getAllByText("Não definido").length).toBeGreaterThan(0);

    rerender(
      <TaskDetailsView
        task={{ ...mockTask, due_date: "" } as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getAllByText("Não definido").length).toBeGreaterThan(0);
  });

  it("handles unknown status and renders it in the status select", () => {
    const strangeTask = {
      ...mockTask,
      status: "UNKNOWN_STATUS",
    };

    render(
      <TaskDetailsView
        task={strangeTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    // Unknown statuses are appended to the status select options
    expect(screen.getByText("UNKNOWN_STATUS")).toBeInTheDocument();
  });

  it("formats dates in English locale when language is not pt", () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (s: string) => s,
      i18n: { language: "en" },
    } as any); // skipcq: JS-0323

    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    const dateEls = screen.getAllByText(/2023/);
    expect(dateEls.length).toBeGreaterThan(0);
  });

  it("renders color dot using task.category_color and selects current category", () => {
    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByRole("combobox", { name: "category" })).toHaveValue(
      "cat-1",
    );
    // Color dot is rendered with the task's current category color
    const colorDot = document.querySelector("[style*='#808080']");
    expect(colorDot).toBeInTheDocument();
  });

  it("renders only active categories in the category select", () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: "cat-1", name: "General", color: "#808080", is_active: true },
        { id: "cat-archived", name: "Archived", color: "#ccc", is_active: false },
      ],
      isLoading: false,
    } as any); // skipcq: JS-0323

    render(
      <TaskDetailsView
        task={mockTask as any} // skipcq: JS-0323
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /Users/heitor/workspace/sigecon/frontend
npx vitest run src/features/task-management/components/__tests__/TaskDetailsView.test.tsx
```

Expected: multiple failures because `TaskDetailsView` still uses the old structure (single combobox, no `useAssignableUsers`/`useCategories` imports). The failures confirm the tests are correctly checking for functionality that doesn't exist yet.

- [ ] **Step 3: Commit the test changes**

```bash
git add frontend/src/features/task-management/components/__tests__/TaskDetailsView.test.tsx
git commit -m "test: update TaskDetailsView tests for inline field editing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Implement inline selects in TaskDetailsView

**Files:**
- Modify: `frontend/src/features/task-management/components/TaskDetailsView.tsx`

- [ ] **Step 1: Replace TaskDetailsView.tsx with the new implementation**

Complete replacement — too many changes throughout the file to do piecemeal:

```tsx
import React from "react";
import { useTranslation } from "react-i18next";
import type { TaskPriority, TaskRead, TaskStatus } from "../types";
import { useUpdateTask } from "../hooks/useTasks";
import { useCategories } from "../hooks/useCategories";
import { useAssignableUsers } from "../../../hooks/useUsers";
import AuditTimeline from "./AuditTimeline";
import TaskComments from "./TaskComments";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { getStatusLabel, getPriorityLabel } from "../utils/taskUtils";

interface TaskDetailsViewProps {
  task: TaskRead;
  onEdit: () => void;
  onClose: () => void;
}

const TaskDetailsView: React.FC<TaskDetailsViewProps> = ({
  task,
  onEdit,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const updateTaskMutation = useUpdateTask();
  const { data: assignableUsers } = useAssignableUsers();
  const { data: categories } = useCategories();

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTaskMutation.mutate({ id: task.id, data: { status: newStatus } });
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    updateTaskMutation.mutate({ id: task.id, data: { priority: newPriority } });
  };

  const handleAssignedToChange = (userId: string) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { assigned_to_id: userId || null },
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { category_id: categoryId },
    });
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return t("tasks.details.notSet");
    return new Date(date).toLocaleString(
      i18n.language === "pt" ? "pt-BR" : "en-US",
    );
  };

  const statuses = [
    "PENDING",
    "IN_PROGRESS",
    "BLOCKED",
    "COMPLETED",
    "CANCELED",
  ];
  const displayStatuses = statuses.includes(task.status)
    ? statuses
    : [task.status, ...statuses];

  const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  const inlineSelectClassName = cn(
    "appearance-none px-2 py-0.5 rounded text-xs font-medium",
    "border border-border/40 bg-background text-foreground",
    "cursor-pointer focus:ring-2 focus:ring-ring outline-none",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b mb-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground leading-snug">
            {task.title}
          </h2>
          <div className="relative group shrink-0">
            <select
              aria-label="status"
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              disabled={updateTaskMutation.isPending}
              className={cn(
                "appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-bold uppercase tracking-wide border-none cursor-pointer focus:ring-2 focus:ring-ring outline-none",
                task.status === "PENDING" &&
                  "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]",
                task.status === "IN_PROGRESS" &&
                  "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-fg)]",
                task.status === "BLOCKED" &&
                  "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-fg)]",
                task.status === "COMPLETED" &&
                  "bg-[var(--status-completed-bg)] text-[var(--status-completed-fg)]",
                task.status === "CANCELED" &&
                  "bg-[var(--status-canceled-bg)] text-[var(--status-canceled-fg)]",
              )}
            >
              {displayStatuses.map((status) => (
                <option
                  key={status}
                  value={status}
                  className="bg-background text-foreground"
                >
                  {getStatusLabel(status, t)}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
              <svg className="size-3 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Priority select — inline, in the header pill area */}
        <div className="flex gap-2 flex-wrap items-center">
          <select
            aria-label="priority"
            value={task.priority}
            onChange={(e) =>
              handlePriorityChange(e.target.value as TaskPriority)
            }
            disabled={updateTaskMutation.isPending}
            className={inlineSelectClassName}
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {getPriorityLabel(p, t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <section className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          {t("tasks.details.description")}
        </p>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {task.description || t("tasks.details.noDescription")}
        </p>
      </section>

      {/* Metadata grid */}
      <section className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Assigned To — editable */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-0.5">
              {t("tasks.details.assignedTo")}
            </span>
            <select
              aria-label="assigned_to"
              value={task.assigned_to_id ?? ""}
              onChange={(e) => handleAssignedToChange(e.target.value)}
              disabled={updateTaskMutation.isPending}
              className={inlineSelectClassName}
            >
              <option value="">{t("tasks.details.unassigned")}</option>
              {assignableUsers?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.username}
                </option>
              ))}
            </select>
          </div>

          {/* Created By — static */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-0.5">
              {t("tasks.details.createdBy")}
            </span>
            <span className="text-sm font-medium text-foreground">
              {task.created_by_name || task.created_by_id}
            </span>
          </div>

          {/* Category — editable, with color dot */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-0.5">
              {t("tasks.details.category")}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: task.category_color ?? undefined }}
              />
              <select
                aria-label="category"
                value={task.category_id}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={updateTaskMutation.isPending}
                className={inlineSelectClassName}
              >
                {categories
                  ?.filter((c) => c.is_active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Due Date — static */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-0.5">
              {t("tasks.details.dueDate")}
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatDate(task.due_date)}
            </span>
          </div>

          {/* Created At — static */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-0.5">
              {t("tasks.details.createdAt")}
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatDate(task.created_at)}
            </span>
          </div>

          {/* Updated At — static */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-0.5">
              {t("tasks.details.updatedAt")}
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatDate(task.updated_at)}
            </span>
          </div>
        </div>
      </section>

      {/* Comments */}
      <TaskComments taskId={task.id} />

      {/* Audit timeline */}
      <AuditTimeline taskId={task.id} />

      {/* Footer actions */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          {t("tasks.details.close")}
        </Button>
        <Button variant="success" onClick={onEdit}>
          {t("tasks.details.edit")}
        </Button>
      </div>
    </div>
  );
};

export default TaskDetailsView;
```

> **Note on imports:** The path to `useUsers` from the component is `../../../hooks/useUsers` (one level up from `components/` to `task-management/`, one up to `features/`, one up to `src/`, then `hooks/`). This is one level shallower than the test file's `../../../../hooks/useUsers` because the test lives one extra directory deeper (`__tests__/`).

- [ ] **Step 2: Run all task-management tests**

```bash
cd /Users/heitor/workspace/sigecon/frontend
npx vitest run src/features/task-management/
```

Expected: all tests pass. If `TaskDetailsView.test.tsx` still has failures, check that:
- The import path `../../../hooks/useUsers` in the component resolves to the same file as `../../../../hooks/useUsers` in the test
- The `useCategories` mock in the test covers all exports from the module (`useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`)

- [ ] **Step 3: Run the full frontend test suite**

```bash
cd /Users/heitor/workspace/sigecon/frontend
npx vitest run
```

Expected: all tests pass with 0 failures.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/heitor/workspace/sigecon/frontend
npx tsc --noEmit
```

Expected: no errors. If you see `TS2322` on `category_id` in `TaskUpdate` (because `TaskUpdate extends Partial<TaskBase>` and `category_id` is optional there), confirm `category_id?: string` is acceptable in `TaskUpdate` — it already is via `Partial<TaskBase>`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/task-management/components/TaskDetailsView.tsx
git commit -m "feat: add inline selects for priority, assigned_to, and category in task details

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
