import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TaskForm from "../TaskForm";
import { TaskPriority, TaskStatus } from "../../types";
import { useCreateTask, useUpdateTask } from "../../hooks/useTasks";
import { useUsers } from "../../../../hooks/useUsers";

// Mock the hooks
vi.mock("../../hooks/useTasks", () => ({
  useCreateTask: vi.fn(),
  useUpdateTask: vi.fn(),
}));

vi.mock("../../../../hooks/useUsers", () => ({
  useUsers: vi.fn(),
}));

describe("TaskForm", () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockCreateMutate = vi.fn();
  const mockUpdateMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCreateTask).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: false,
      error: null,
    } as any);

    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
      error: null,
    } as any);

    vi.mocked(useUsers).mockReturnValue({
      data: [
        { id: "user-1", full_name: "User 1", username: "user1" },
        { id: "user-2", full_name: "User 2", username: "user2" },
      ],
      isLoading: false,
    } as any);
  });

  it("renders correctly in creation mode", () => {
    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText(/Nova Tarefa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Título \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Prioridade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data de entrega/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Status/i)).not.toBeInTheDocument();
  });

  it("renders correctly with initial values in edit mode", () => {
    const mockTask = {
      id: "1",
      title: "Existing Task",
      description: "Existing Description",
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assigned_to_id: "user-1",
      due_date: "2023-10-27T10:00:00Z",
      created_by_id: "admin",
      created_at: new Date(),
      updated_at: new Date(),
    };

    render(
      <TaskForm
        task={mockTask as any}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText(/Editar Tarefa/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing Task")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Existing Description"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    // Test initial state date formatting
    expect(screen.getByLabelText(/Data de entrega/i)).toHaveValue("2023-10-27");
    // Test assigned_to_id rendering
    expect(screen.getByLabelText(/Atribuído a/i)).toHaveValue("user-1");
  });

  it("handles fallback logic for missing fields in edit mode", () => {
    const mockTask = {
      id: "1",
      title: "Task with missing fields",
      description: null,
      assigned_to_id: null,
      due_date: null,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
    };

    render(
      <TaskForm
        task={mockTask as any}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByLabelText(/Descrição/i)).toHaveValue("");
    expect(screen.getByLabelText(/Atribuído a/i)).toHaveValue("");
    expect(screen.getByLabelText(/Data de entrega/i)).toHaveValue("");
  });

  it("shows validation error when title is empty", () => {
    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByRole("button", { name: /Criar tarefa/i }));

    expect(screen.getByText(/Título é obrigatório/i)).toBeInTheDocument();
    expect(mockCreateMutate).not.toHaveBeenCalled();

    // Clear error on change
    fireEvent.change(screen.getByLabelText(/Título \*/i), {
      target: { value: "A" },
    });
    expect(screen.queryByText(/Título é obrigatório/i)).not.toBeInTheDocument();
  });

  it("handles null/missing description and assigned_to_id in submission", () => {
    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    fireEvent.change(screen.getByLabelText(/Título \\*/i), {
      target: { value: "Minimal Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Criar tarefa/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
        assigned_to_id: null,
      }),
      expect.any(Object),
    );
  });

  it("submits with due date converted to Date object", () => {
    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Título \\*/i), {
      target: { value: "Task with Date" },
    });
    fireEvent.change(screen.getByLabelText(/Data de entrega/i), {
      target: { value: "2023-12-25" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Criar tarefa/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        due_date: expect.any(Date),
      }),
      expect.any(Object),
    );

    const submittedDate = mockCreateMutate.mock.calls[0][0].due_date;
    expect(submittedDate.toISOString()).toContain("2023-12-25");
  });

  it("handles changes in textarea and select elements", () => {
    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const description = screen.getByLabelText(/Descrição/i);
    const priority = screen.getByLabelText(/Prioridade/i);

    fireEvent.change(description, {
      target: { name: "description", value: "New Desc" },
    });
    fireEvent.change(priority, {
      target: { name: "priority", value: TaskPriority.URGENT },
    });

    expect(description).toHaveValue("New Desc");
    expect(priority).toHaveValue(TaskPriority.URGENT);
  });

  it("calls useCreateTask mutate with correct data on submission", () => {
    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Título \\*/i), {
      target: { value: "New Task" },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: "New Description" },
    });
    fireEvent.change(screen.getByLabelText(/Prioridade/i), {
      target: { value: TaskPriority.HIGH },
    });

    fireEvent.click(screen.getByRole("button", { name: /Criar tarefa/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Task",
        description: "New Description",
        priority: TaskPriority.HIGH,
      }),
      expect.any(Object),
    );
  });

  it("calls useUpdateTask mutate with correct data on submission in edit mode", () => {
    const mockTask = {
      id: "1",
      title: "Old Title",
      priority: TaskPriority.LOW,
      status: TaskStatus.PENDING,
      created_by_id: "admin",
      created_at: new Date(),
      updated_at: new Date(),
    };

    render(
      <TaskForm
        task={mockTask as any}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Título \\*/i), {
      target: { value: "Updated Title" },
    });
    fireEvent.change(screen.getByLabelText(/Status/i), {
      target: { value: TaskStatus.COMPLETED },
    });

    fireEvent.click(screen.getByRole("button", { name: /Atualizar tarefa/i }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        id: "1",
        data: expect.objectContaining({
          title: "Updated Title",
          status: TaskStatus.COMPLETED,
        }),
      },
      expect.any(Object),
    );
  });

  it("shows loading state and disables fields when creating", () => {
    vi.mocked(useCreateTask).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: true,
      error: null,
    } as any);

    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByRole("button", { name: /Salvando.../i })).toBeDisabled();
    expect(screen.getByLabelText(/Título \\*/i)).toBeDisabled();
    expect(screen.getByLabelText(/Descrição/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
  });

  it("shows loading state and disables fields when updating", () => {
    const mockTask = {
      id: "1",
      title: "Old Title",
      priority: TaskPriority.LOW,
      status: TaskStatus.PENDING,
    };
    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: true,
      error: null,
    } as any);

    render(
      <TaskForm
        task={mockTask as any}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByRole("button", { name: /Salvando.../i })).toBeDisabled();
    expect(screen.getByLabelText(/Título \\*/i)).toBeDisabled();
    expect(screen.getByLabelText(/Status/i)).toBeDisabled();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("displays server error detail for create mutation", () => {
    vi.mocked(useCreateTask).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: false,
      error: {
        response: {
          data: { detail: "Create error" },
        },
      } as any,
    } as any);

    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText("Create error")).toBeInTheDocument();
  });

  it("displays server error detail for update mutation", () => {
    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
      error: {
        response: {
          data: { detail: "Update error" },
        },
      } as any,
    } as any);

    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText("Update error")).toBeInTheDocument();
  });

  it("displays default server error when detail is missing", () => {
    vi.mocked(useCreateTask).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: false,
      error: new Error("Generic error"),
    } as any);

    render(<TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(
      screen.getByText("Ocorreu um erro ao salvar a tarefa."),
    ).toBeInTheDocument();
  });
});
