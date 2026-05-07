import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TaskCard from "../TaskCard";
import { TaskStatus, TaskPriority } from "../../types";

const mockTask = {
  id: "1",
  title: "Test Task",
  description: "Test Description",
  status: TaskStatus.PENDING,
  priority: TaskPriority.MEDIUM,
  created_at: "2023-01-01T10:00:00Z",
  updated_at: "2023-01-01T10:00:00Z",
  created_by_id: "user-1",
  assigned_to_id: "user-2",
  due_date: "2023-12-31T23:59:59Z",
  is_deleted: false,
};

describe("TaskCard", () => {
  it("renders task basic details correctly", () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    // Date is rendered without "Due:" prefix
    const dateEl = screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(dateEl).toBeInTheDocument();
  });

  it("renders 'Sem descrição' when description is missing", () => {
    const taskWithoutDesc = { ...mockTask, description: "" };
    render(<TaskCard task={taskWithoutDesc} />);
    expect(screen.getByText("Sem descrição")).toBeInTheDocument();
  });

  it("does not render due date when it is missing", () => {
    const taskWithoutDate = { ...mockTask, due_date: undefined };
    render(<TaskCard task={taskWithoutDate} />);
    expect(
      screen.queryByText(/\d{1,2}\/\d{1,2}\/\d{4}/),
    ).not.toBeInTheDocument();
  });

  it("calls onClick when Enter or Space is pressed", () => {
    const onClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={onClick} />);

    const card = screen.getByRole("button");

    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card, { key: "Tab" });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("renders status badges for all statuses", () => {
    const statuses = [
      { status: TaskStatus.PENDING, expected: "Pendente" },
      { status: TaskStatus.IN_PROGRESS, expected: "Em andamento" },
      { status: TaskStatus.COMPLETED, expected: "Concluída" },
      { status: TaskStatus.CANCELED, expected: "Cancelada" },
    ];

    statuses.forEach(({ status, expected }) => {
      const { unmount } = render(<TaskCard task={{ ...mockTask, status }} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });

  it("renders priority badges for all priorities", () => {
    const priorities = [
      TaskPriority.LOW,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.URGENT,
    ];

    priorities.forEach((priority) => {
      const { unmount } = render(<TaskCard task={{ ...mockTask, priority }} />);
      expect(screen.getByText(priority)).toBeInTheDocument();
      unmount();
    });
  });
});
