import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TaskDashboard from "../TaskDashboard";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useTaskHistory,
} from "../../hooks/useTasks";
import { TaskStatus, TaskPriority } from "../../types";

// Mock dos hooks
vi.mock("../../hooks/useTasks", () => ({
  useTasks: vi.fn(),
  useCreateTask: vi.fn(),
  useUpdateTask: vi.fn(),
  useTaskHistory: vi.fn(),
}));

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
  },
];

describe("TaskDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useTasks as any).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      isError: false,
      error: null,
    });
    (useCreateTask as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (useUpdateTask as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (useTaskHistory as any).mockReturnValue({ data: [], isLoading: false });
  });

  it("renders the dashboard header and filters", () => {
    render(<TaskDashboard />);
    expect(screen.getByText("Task Dashboard")).toBeInTheDocument();
    expect(screen.getByText("+ New Task")).toBeInTheDocument();
    expect(screen.getByDisplayValue("All Statuses")).toBeInTheDocument();
    expect(screen.getByDisplayValue("All Priorities")).toBeInTheDocument();
  });

  it("updates filters when selection changes", () => {
    render(<TaskDashboard />);

    const statusSelect = screen.getByDisplayValue("All Statuses");
    fireEvent.change(statusSelect, { target: { value: TaskStatus.COMPLETED } });

    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: TaskStatus.COMPLETED }),
    );

    const prioritySelect = screen.getByDisplayValue("All Priorities");
    fireEvent.change(prioritySelect, { target: { value: TaskPriority.HIGH } });

    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.HIGH,
      }),
    );
  });

  it("clears filters when clear button is clicked", () => {
    render(<TaskDashboard />);

    const statusSelect = screen.getByDisplayValue("All Statuses");
    fireEvent.change(statusSelect, { target: { value: TaskStatus.COMPLETED } });

    const clearButton = screen.getByText("Clear Filters");
    fireEvent.click(clearButton);

    expect(useTasks).toHaveBeenLastCalledWith({ status: null, priority: null });
  });

  it("opens and closes the creation modal", () => {
    render(<TaskDashboard />);

    const createButton = screen.getByText("+ New Task");
    fireEvent.click(createButton);

    expect(screen.getByText("Create New Task")).toBeInTheDocument();

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Create New Task")).not.toBeInTheDocument();
  });

  it("opens task details when a task is clicked", () => {
    render(<TaskDashboard />);

    const taskCard = screen.getByText("Task 1");
    fireEvent.click(taskCard);

    // Na TaskDetailsView o título aparece em um H2
    expect(screen.getAllByText("Task 1").length).toBeGreaterThan(1);
    expect(screen.getByText("Edit Task")).toBeInTheDocument();

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    // Verifica se fechou (só deve sobrar o texto no card na lista)
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });

  it("enters edit mode from details view", () => {
    render(<TaskDashboard />);

    fireEvent.click(screen.getByText("Task 1"));
    fireEvent.click(screen.getByText("Edit Task"));

    expect(screen.getByText("Edit Task")).toBeInTheDocument();
    // No formulário de edição o botão de submit muda para "Update Task"
    expect(screen.getByText("Update Task")).toBeInTheDocument();

    // Clicar em cancelar na edição deve voltar para a view de detalhes
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("handles successful task creation/update and closes overlay", () => {
    const mockMutate = vi.fn((_data, options) => {
      if (options?.onSuccess) options.onSuccess();
    });
    (useCreateTask as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<TaskDashboard />);

    // Test creation success
    fireEvent.click(screen.getByText("+ New Task"));

    const titleInput = screen.getByPlaceholderText(/Enter task title/i);
    fireEvent.change(titleInput, { target: { value: "Success Task" } });

    const createBtn = screen.getByRole("button", { name: "Create Task" });
    fireEvent.click(createBtn);

    expect(screen.queryByText("Create New Task")).not.toBeInTheDocument();
  });

  it("closes overlay when clicking on background", () => {
    render(<TaskDashboard />);

    fireEvent.click(screen.getByText("+ New Task"));

    const modalContent = screen.getByText("Create New Task").closest("div");
    const overlay = modalContent?.parentElement?.parentElement;

    if (overlay) {
      fireEvent.click(overlay);
      expect(screen.queryByText("Create New Task")).not.toBeInTheDocument();
    }
  });

  it("closes overlay when Enter or Space is pressed on overlay", () => {
    render(<TaskDashboard />);

    fireEvent.click(screen.getByText("+ New Task"));

    const overlay = screen.getByLabelText("Close modal");

    fireEvent.keyDown(overlay, { key: "Enter" });
    expect(screen.queryByText("Create New Task")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("+ New Task"));
    const overlay2 = screen.getByLabelText("Close modal");
    fireEvent.keyDown(overlay2, { key: " " });
    expect(screen.queryByText("Create New Task")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("+ New Task"));
    const overlay3 = screen.getByLabelText("Close modal");
    fireEvent.keyDown(overlay3, { key: "Escape" }); // Should NOT close with this handler (though it might be good practice)
    expect(screen.getByText("Create New Task")).toBeInTheDocument();
  });

  it("stops propagation on modal content for onClick and onKeyDown in all modal types", () => {
    render(<TaskDashboard />);

    // 1. Create Modal
    fireEvent.click(screen.getByText("+ New Task"));
    const createModalContent = screen.getByRole("document");
    fireEvent.click(createModalContent);
    fireEvent.keyDown(createModalContent, { key: "Enter" });
    expect(screen.getByText("Create New Task")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));

    // 2. Details Modal
    fireEvent.click(screen.getByText("Task 1"));
    const detailsModalContent = screen.getByRole("document");
    fireEvent.click(detailsModalContent);
    fireEvent.keyDown(detailsModalContent, { key: "Enter" });
    expect(screen.getByText("Close")).toBeInTheDocument();

    // 3. Edit Modal
    fireEvent.click(screen.getByText("Edit Task"));
    const editModalContent = screen.getByRole("document");
    fireEvent.click(editModalContent);
    fireEvent.keyDown(editModalContent, { key: "Enter" });
    expect(screen.getByText("Update Task")).toBeInTheDocument();
  });

  it("resets other modes when handleCreateNewTask is called", () => {
    render(<TaskDashboard />);

    // Select a task first
    fireEvent.click(screen.getByText("Task 1"));
    expect(screen.getByText("Close")).toBeInTheDocument(); // Details view

    // Now click New Task
    fireEvent.click(screen.getByText("+ New Task"));
    expect(screen.getByText("Create New Task")).toBeInTheDocument();
    expect(screen.queryByText("Close")).not.toBeInTheDocument(); // Details view should be gone
  });

  it("resets other modes when handleTaskClick is called", () => {
    render(<TaskDashboard />);

    // Open create modal
    fireEvent.click(screen.getByText("+ New Task"));
    expect(screen.getByText("Create New Task")).toBeInTheDocument();

    // Click on a task in the list
    fireEvent.click(screen.getByText("Task 1"));
    expect(screen.getByText("Close")).toBeInTheDocument(); // Details view
    expect(screen.queryByText("Create New Task")).not.toBeInTheDocument(); // Create form should be gone
  });

  it("handles empty or undefined tasks from useTasks", () => {
    (useTasks as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<TaskDashboard />);
    // When tasks is undefined, TaskList shouldn't render
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    // The component should still render header and filters
    expect(screen.getByText("Task Dashboard")).toBeInTheDocument();
  });

  it("allows setting individual filters to null (All)", () => {
    render(<TaskDashboard />);

    const statusSelect = screen.getByDisplayValue("All Statuses");
    fireEvent.change(statusSelect, { target: { value: TaskStatus.COMPLETED } });
    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: TaskStatus.COMPLETED }),
    );

    // Change back to All
    fireEvent.change(statusSelect, { target: { value: "" } });
    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: null }),
    );

    const prioritySelect = screen.getByDisplayValue("All Priorities");
    fireEvent.change(prioritySelect, { target: { value: TaskPriority.HIGH } });
    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ priority: TaskPriority.HIGH }),
    );

    // Change back to All
    fireEvent.change(prioritySelect, { target: { value: "" } });
    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ priority: null }),
    );
  });

  it("closes overlay after successful update in edit mode", () => {
    const mockUpdateMutate = vi.fn((_data, options) => {
      if (options?.onSuccess) options.onSuccess();
    });
    (useUpdateTask as any).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    });

    render(<TaskDashboard />);

    fireEvent.click(screen.getByText("Task 1"));
    fireEvent.click(screen.getByText("Edit Task"));

    const updateBtn = screen.getByRole("button", { name: "Update Task" });
    fireEvent.click(updateBtn);

    expect(screen.queryByText("Update Task")).not.toBeInTheDocument();
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });

  it("renders TaskList when tasks data is present", () => {
    (useTasks as any).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      isError: false,
      error: null,
    });
    render(<TaskDashboard />);
    expect(screen.getByText("Task 1")).toBeInTheDocument();
  });

  it("handles loading and error states from useTasks", () => {
    (useTasks as any).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    });
    render(<TaskDashboard />);
    expect(screen.getByText(/Loading tasks.../i)).toBeInTheDocument();

    (useTasks as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error("Fetch error"),
    });
    render(<TaskDashboard />);
    expect(
      screen.getByText(/Error loading tasks: Fetch error/i),
    ).toBeInTheDocument();
  });
});
