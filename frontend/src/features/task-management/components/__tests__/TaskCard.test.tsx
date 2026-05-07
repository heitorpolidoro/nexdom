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
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    // Use a regex to match the date string to be resilient to locale differences in test environment
    expect(screen.getByText(/Due:/)).toBeInTheDocument();
  });

  it("renders 'No description' when description is missing", () => {
    const taskWithoutDesc = { ...mockTask, description: "" };
    render(<TaskCard task={taskWithoutDesc} />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("does not render due date when it is missing", () => {
    const taskWithoutDate = { ...mockTask, due_date: undefined };
    render(<TaskCard task={taskWithoutDate} />);
    expect(screen.queryByText(/Due:/)).not.toBeInTheDocument();
  });

  it("calls onClick when Enter or Space is pressed", () => {
    const onClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={onClick} />);

    const card = screen.getByRole("button");

    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card, { key: "Tab" }); // Should NOT call onClick
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("applies correct CSS classes for different statuses", () => {
    const statuses = [
      { status: TaskStatus.PENDING, expectedClass: "pending" },
      { status: TaskStatus.IN_PROGRESS, expectedClass: "inProgress" },
      { status: TaskStatus.COMPLETED, expectedClass: "completed" },
      { status: TaskStatus.CANCELED, expectedClass: "canceled" },
      { status: "UNKNOWN" as any, expectedClass: "defaultStatus" },
    ];

    statuses.forEach(({ status, expectedClass }) => {
      render(<TaskCard task={{ ...mockTask, status }} />);
      const statusElement = screen.getByText(
        status === "UNKNOWN" ? "UNKNOWN" : status,
      );
      expect(statusElement.className).toContain(expectedClass);
      // Clean up for next iteration if necessary, though rerender handles it
    });
  });

  it("applies correct CSS classes for different priorities", () => {
    const priorities = [
      { priority: TaskPriority.LOW, expectedClass: "lowPriority" },
      { priority: TaskPriority.MEDIUM, expectedClass: "mediumPriority" },
      { priority: TaskPriority.HIGH, expectedClass: "highPriority" },
      { priority: TaskPriority.URGENT, expectedClass: "urgentPriority" },
      { priority: "UNKNOWN" as any, expectedClass: "defaultPriority" },
    ];

    priorities.forEach(({ priority, expectedClass }) => {
      render(<TaskCard task={{ ...mockTask, priority }} />);
      const priorityElement = screen.getByText(
        priority === "UNKNOWN" ? "UNKNOWN" : priority,
      );
      expect(priorityElement.className).toContain(expectedClass);
    });
  });
});
