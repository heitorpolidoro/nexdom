import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
});
