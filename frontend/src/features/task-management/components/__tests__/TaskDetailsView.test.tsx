import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TaskDetailsView from "../TaskDetailsView";
import { TaskPriority, TaskStatus } from "../../types";
import { useUpdateTask, useTaskHistory } from "../../hooks/useTasks";
import { useUsers } from "../../../../hooks/useUsers";
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
}));

vi.mock("../../../user-administration/context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../user-administration/context/AuthContext")>();
  return {
    ...actual,
    useAuth: vi.fn(() => ({ user: { id: "admin-1", role: actual.UserRole.ADMINISTRATOR } })),
  };
});

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
    assigned_to_name: "user1",
    created_by_id: "admin",
    created_by_name: "admin",
    due_date: "2023-12-31T23:59:59Z",
    created_at: "2023-01-01T10:00:00Z",
    updated_at: "2023-01-01T10:00:00Z",
    category_id: "cat-1",
    category_name: "General",
    category_color: "#808080",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any);

    vi.mocked(useTaskHistory).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useUsers).mockReturnValue({
      data: [
        { id: "user1", full_name: "user1", username: "user1" },
        { id: "admin", full_name: "admin", username: "admin" },
      ],
      isLoading: false,
    } as any);
  });

  it("renders all task metadata correctly", () => {
    render(
      <TaskDetailsView
        task={mockTask as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getAllByText("Pendente").length).toBeGreaterThan(0);
    expect(screen.getByText("Média")).toBeInTheDocument();
    expect(screen.getByText("user1")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    // Check if dates are formatted (checking for year 2023)
    const dateElements = screen.getAllByText(/2023/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it("triggers onEdit callback when Edit button is clicked", () => {
    render(
      <TaskDetailsView
        task={mockTask as any}
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
        task={mockTask as any}
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
        task={mockTask as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    const statusSelect = screen.getByRole("combobox");
    fireEvent.change(statusSelect, { target: { value: TaskStatus.IN_PROGRESS } });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        data: { status: TaskStatus.IN_PROGRESS },
      }),
    );
  });

  it("renders 'Não atribuído' and 'Não definido' when metadata is missing", () => {
    const incompleteTask = {
      ...mockTask,
      assigned_to_id: null,
      assigned_to_name: null,
      due_date: null,
    };

    render(
      <TaskDetailsView
        task={incompleteTask as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Não atribuído")).toBeInTheDocument();
    expect(screen.getAllByText("Não definido").length).toBeGreaterThan(0);
  });

  it("applies correct status and priority classes", () => {
    const statuses = Object.values(TaskStatus);

    statuses.forEach((status) => {
      const { rerender } = render(
        <TaskDetailsView
          task={{ ...mockTask, status } as any}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />,
      );
      // Mapping translation for status badge
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
      rerender(<></>); // force cleanup for next loop
    });
  });

  it("renders 'Nenhuma descrição fornecida.' when description is empty or null", () => {
    const { rerender } = render(
      <TaskDetailsView
        task={{ ...mockTask, description: "" } as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(
      screen.getByText("Nenhuma descrição fornecida."),
    ).toBeInTheDocument();

    rerender(
      <TaskDetailsView
        task={{ ...mockTask, description: null } as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(
      screen.getByText("Nenhuma descrição fornecida."),
    ).toBeInTheDocument();
  });

  it("disables status select when updateTaskMutation.isPending is true", () => {
    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: true,
    } as any);

    render(
      <TaskDetailsView
        task={mockTask as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    const statusSelect = screen.getByRole("combobox");
    expect(statusSelect).toBeDisabled();
  });

  it("formatDate handles all falsy values", () => {
    const { rerender } = render(
      <TaskDetailsView
        task={{ ...mockTask, due_date: null } as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getAllByText("Não definido").length).toBeGreaterThan(0);

    rerender(
      <TaskDetailsView
        task={{ ...mockTask, due_date: undefined } as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getAllByText("Não definido").length).toBeGreaterThan(0);

    rerender(
      <TaskDetailsView
        task={{ ...mockTask, due_date: "" } as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getAllByText("Não definido").length).toBeGreaterThan(0);
  });

  it("handles unknown status and priority with default variants", () => {
    const strangeTask = {
      ...mockTask,
      status: "UNKNOWN_STATUS",
      priority: "UNKNOWN_PRIORITY",
    };

    render(
      <TaskDetailsView
        task={strangeTask as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    // Should render with the raw string because of translation fallback or direct map
    expect(screen.getByText("UNKNOWN_STATUS")).toBeInTheDocument();
    expect(screen.getByText("UNKNOWN_PRIORITY")).toBeInTheDocument();
  });

  it("formats dates in English locale when language is not pt", () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (s: string) => s,
      i18n: { language: "en" },
    } as any);

    render(
      <TaskDetailsView
        task={mockTask as any}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />,
    );

    // In en-US locale, "2023-12-31T23:59:59Z" renders with a 4-digit year
    const dateEls = screen.getAllByText(/2023/);
    expect(dateEls.length).toBeGreaterThan(0);
  });
});
