import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TaskBoard from "../TaskBoard";
import { TaskStatus, TaskPriority } from "../../types";

const mockTasks = [
  {
    id: "1",
    title: "Task 1",
    description: "Description 1",
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    created_by_id: "user-1",
    assigned_to_id: "user-2",
    is_deleted: false,
    category_id: "cat-1",
    category_name: "General",
    category_color: "#808080",
  },
  {
    id: "2",
    title: "Task 2",
    description: "Description 2",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    created_by_id: "user-1",
    assigned_to_id: "user-3",
    is_deleted: false,
    category_id: "cat-1",
    category_name: "General",
    category_color: "#808080",
  },
];

describe("TaskBoard", () => {
  it("renders tasks in their respective columns", () => {
    render(
      <TaskBoard
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{}}
      />
    );

    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
    
    // Check if they are in the correct columns
    const pendingColumn = screen.getByRole("heading", { name: "Pendente" }).closest('.flex-1');
    const inProgressColumn = screen.getByRole("heading", { name: "Em andamento" }).closest('.flex-1');
    
    expect(pendingColumn).toHaveTextContent("Task 1");
    expect(inProgressColumn).toHaveTextContent("Task 2");
  });

  it("filters tasks by assigned_to_id", () => {
    render(
      <TaskBoard
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{ assigned_to_id: "user-2" }}
      />
    );

    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
  });

  it("filters tasks by status", () => {
    render(
      <TaskBoard
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{ status: TaskStatus.PENDING }}
      />
    );

    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
  });

  it("filters tasks by priority", () => {
    render(
      <TaskBoard
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{ priority: TaskPriority.HIGH }}
      />
    );

    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
  });

  it("calls onTaskClick when a task is clicked", () => {
    const onTaskClick = vi.fn();
    render(
      <TaskBoard
        tasks={mockTasks}
        isLoading={false}
        isError={false}
        error={null}
        filters={{}}
        onTaskClick={onTaskClick}
      />
    );

    fireEvent.click(screen.getByText("Task 1"));
    expect(onTaskClick).toHaveBeenCalledWith("1");
  });

  it("renders loading state", () => {
    render(
      <TaskBoard
        tasks={[]}
        isLoading={true}
        isError={false}
        error={null}
        filters={{}}
      />
    );

    expect(screen.getByText("Carregando tarefas...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <TaskBoard
        tasks={[]}
        isLoading={false}
        isError={true}
        error={new Error("Test Error")}
        filters={{}}
      />
    );

    expect(screen.getByText("Erro ao carregar tarefas: Test Error")).toBeInTheDocument();
  });
});
