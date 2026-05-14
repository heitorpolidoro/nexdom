import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useTranslation } from "react-i18next";
import TaskList from "../TaskList";
import { TaskStatus, TaskPriority } from "../../types";

const mockTasks = [
  {
    id: "1",
    title: "Task 1",
    description: "Desc 1",
    status: TaskStatus.PENDING,
    priority: TaskPriority.LOW,
    assigned_to_id: "user-1",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    created_by_id: "admin-1",
    is_deleted: false,
    category_id: "cat-1",
    category_name: "General",
    category_color: "#808080",
  },
  {
    id: "2",
    title: "Task 2",
    description: "Desc 2",
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    assigned_to_id: "user-2",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    created_by_id: "admin-1",
    is_deleted: false,
    category_id: "cat-1",
    category_name: "General",
    category_color: "#808080",
  },
];

const defaultFilters = {
  status: null,
  priority: null,
  assigned_to_id: null,
};

describe("TaskList", () => {
  it("renders loading state correctly", () => {
    render(
      <TaskList
        tasks={[]}
        isLoading={true}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText("Carregando tarefas...")).toBeInTheDocument();
  });

  it("renders error state correctly", () => {
    const errorMessage = "Failed to fetch";
    render(
      <TaskList
        tasks={[]}
        isLoading={false}
        isError={true}
        error={new Error(errorMessage)}
        filters={defaultFilters}
      />,
    );
    expect(
      screen.getByText(`Erro ao carregar tarefas: ${errorMessage}`),
    ).toBeInTheDocument();
  });

  it("renders 'Nenhuma tarefa encontrada' when list is empty", () => {
    render(
      <TaskList
        tasks={[]}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText("Nenhuma tarefa encontrada.")).toBeInTheDocument();
  });

  it("renders filtered tasks correctly", () => {
    render(
      <TaskList
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
  });

  it("filters tasks by status", () => {
    render(
      <TaskList
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{ ...defaultFilters, status: TaskStatus.PENDING }}
      />,
    );
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
  });

  it("filters tasks by priority", () => {
    render(
      <TaskList
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{ ...defaultFilters, priority: TaskPriority.HIGH }}
      />,
    );
    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
  });

  it("filters tasks by assigned_to_id", () => {
    render(
      <TaskList
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{ ...defaultFilters, assigned_to_id: "user-1" }}
      />,
    );
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
  });

  it("renders 'no match' message when filters exclude all tasks", () => {
    render(
      <TaskList
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{ ...defaultFilters, status: TaskStatus.CANCELED }}
      />,
    );
    expect(
      screen.getByText("Nenhuma tarefa corresponde aos filtros selecionados."),
    ).toBeInTheDocument();
  });

  it("calls onTaskClick when a task card is clicked", () => {
    const onTaskClick = vi.fn();
    render(
      <TaskList
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
        onTaskClick={onTaskClick}
      />,
    );

    fireEvent.click(screen.getByText("Task 1"));
    expect(onTaskClick).toHaveBeenCalledWith("1");
  });

  it("shows no-category placeholder for tasks without category", () => {
    const tasksNoCategory = [
      { ...mockTasks[0], category_id: null, category_name: undefined, category_color: undefined },
    ];
    render(
      <TaskList
        tasks={tasksNoCategory as any}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText("Sem categoria")).toBeInTheDocument();
  });

  it("shows assignee name when task has an assigned user", () => {
    const tasksWithAssignee = [{ ...mockTasks[0], assigned_to_name: "João Silva" }];
    render(
      <TaskList
        tasks={tasksWithAssignee}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("shows formatted due date when task has a due_date", () => {
    const tasksWithDate = [{ ...mockTasks[0], due_date: "2024-06-15T00:00:00Z" }];
    render(
      <TaskList
        tasks={tasksWithDate}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("shows category name with fallback color when category_color is missing", () => {
    const tasksNoColor = [{ ...mockTasks[0], category_name: "Design", category_color: undefined }];
    render(
      <TaskList
        tasks={tasksNoColor as any}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("uses en-US date format when language is not pt", () => {
    vi.mocked(useTranslation).mockReturnValueOnce({
      t: (key: string) => key,
      i18n: { language: "en", changeLanguage: vi.fn() },
    } as any);
    const tasksWithDate = [{ ...mockTasks[0], due_date: "2024-01-20T12:00:00Z" }];
    render(
      <TaskList
        tasks={tasksWithDate}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("renders without crashing when task has no description", () => {
    const tasksNoDesc = [{ ...mockTasks[0], description: undefined }];
    render(
      <TaskList
        tasks={tasksNoDesc as any}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(screen.getByText("Task 1")).toBeInTheDocument();
  });

  it("does not throw when row is clicked without onTaskClick callback", () => {
    render(
      <TaskList
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={defaultFilters}
      />,
    );
    expect(() => fireEvent.click(screen.getByText("Task 1"))).not.toThrow();
  });
});
