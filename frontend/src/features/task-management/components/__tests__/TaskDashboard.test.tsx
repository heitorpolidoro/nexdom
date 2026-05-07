import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TaskDashboard from "../TaskDashboard";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useTaskHistory,
  useDeleteTask,
} from "../../hooks/useTasks";
import { TaskStatus, TaskPriority } from "../../types";
import * as useUsersHook from "../../../../hooks/useUsers";

// Mock dos hooks
vi.mock("../../hooks/useTasks", () => ({
  useTasks: vi.fn(),
  useCreateTask: vi.fn(),
  useUpdateTask: vi.fn(),
  useTaskHistory: vi.fn(),
  useDeleteTask: vi.fn(),
}));

vi.mock("../../../../hooks/useUsers", () => ({
  useUsers: vi.fn(),
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
    vi.mocked(useTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    vi.mocked(useCreateTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(useDeleteTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(useTaskHistory).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(useUsersHook.useUsers).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it("renders the dashboard header and filters", () => {
    render(<TaskDashboard />);
    expect(
      screen.getByRole("heading", { name: /Tarefas/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Nova Tarefa/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Todos os status")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Todas as prioridades"),
    ).toBeInTheDocument();
  });

  it("updates filters when selection changes", () => {
    render(<TaskDashboard />);

    const statusSelect = screen.getByDisplayValue("Todos os status");
    fireEvent.change(statusSelect, { target: { value: TaskStatus.COMPLETED } });

    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: TaskStatus.COMPLETED }),
    );

    const prioritySelect = screen.getByDisplayValue("Todas as prioridades");
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

    const statusSelect = screen.getByDisplayValue("Todos os status");
    fireEvent.change(statusSelect, { target: { value: TaskStatus.COMPLETED } });

    const clearButton = screen.getByText("Limpar filtros");
    fireEvent.click(clearButton);

    expect(useTasks).toHaveBeenLastCalledWith({ status: null, priority: null });
  });

  it("opens and closes the creation modal", () => {
    render(<TaskDashboard />);

    const createButton = screen.getByRole("button", { name: /Nova Tarefa/i });
    fireEvent.click(createButton);

    expect(
      screen.getByRole("heading", { name: "Nova Tarefa" }),
    ).toBeInTheDocument();

    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    expect(
      screen.queryByRole("heading", { name: "Nova Tarefa" }),
    ).not.toBeInTheDocument();
  });

  it("opens task details when a task is clicked", () => {
    render(<TaskDashboard />);

    const taskCard = screen.getByText("Task 1");
    fireEvent.click(taskCard);

    // Na TaskDetailsView o título aparece em um H2
    expect(screen.getAllByText("Task 1").length).toBeGreaterThan(1);
    expect(screen.getByText("Editar")).toBeInTheDocument();

    const closeButton = screen.getByText("Fechar");
    fireEvent.click(closeButton);

    // Verifica se fechou (só deve sobrar o texto no card na lista)
    expect(screen.queryByText("Fechar")).not.toBeInTheDocument();
  });

  it("enters edit mode from details view", () => {
    render(<TaskDashboard />);

    fireEvent.click(screen.getByText("Task 1"));
    fireEvent.click(screen.getByText("Editar"));

    expect(
      screen.getByRole("heading", { name: "Editar Tarefa" }),
    ).toBeInTheDocument();
    // No formulário de edição o botão de submit muda para "Atualizar tarefa"
    expect(screen.getByText("Atualizar tarefa")).toBeInTheDocument();

    // Clicar em cancelar na edição deve voltar para a view de detalhes
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.getByText("Fechar")).toBeInTheDocument();
  });

  it("handles successful task creation/update and closes overlay", () => {
    const mockMutate = vi.fn((_data, options) => {
      if (options?.onSuccess) options.onSuccess();
    });
    vi.mocked(useCreateTask).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);

    render(<TaskDashboard />);

    // Test creation success
    fireEvent.click(screen.getByRole("button", { name: /Nova Tarefa/i }));

    const titleInput = screen.getByPlaceholderText(/Título da tarefa/i);
    fireEvent.change(titleInput, { target: { value: "Success Task" } });

    const createBtn = screen.getByRole("button", { name: "Criar tarefa" });
    fireEvent.click(createBtn);

    expect(
      screen.queryByRole("heading", { name: "Nova Tarefa" }),
    ).not.toBeInTheDocument();
  });

  it("closes overlay when clicking on background", () => {
    render(<TaskDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Nova Tarefa/i }));

    const modalContent = screen
      .getByRole("heading", { name: "Nova Tarefa" })
      .closest("div");
    const overlay = modalContent?.parentElement?.parentElement;

    if (overlay) {
      fireEvent.click(overlay);
      expect(
        screen.queryByRole("heading", { name: "Nova Tarefa" }),
      ).not.toBeInTheDocument();
    }
  });

  it("closes overlay when Enter or Space is pressed on overlay", () => {
    render(<TaskDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Nova Tarefa/i }));

    const overlay = screen.getByLabelText("Fechar modal");

    fireEvent.keyDown(overlay, { key: "Enter" });
    expect(
      screen.queryByRole("heading", { name: "Nova Tarefa" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Nova Tarefa/i }));
    const overlay2 = screen.getByLabelText("Fechar modal");
    fireEvent.keyDown(overlay2, { key: " " });
    expect(
      screen.queryByRole("heading", { name: "Nova Tarefa" }),
    ).not.toBeInTheDocument();
  });

  it("stops propagation on modal content for onClick and onKeyDown in all modal types", () => {
    render(<TaskDashboard />);

    // 1. Create Modal
    fireEvent.click(screen.getByRole("button", { name: /Nova Tarefa/i }));
    const createModalContent = screen.getByRole("document");
    fireEvent.click(createModalContent);
    fireEvent.keyDown(createModalContent, { key: "Enter" });
    expect(
      screen.getByRole("heading", { name: "Nova Tarefa" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancelar"));

    // 2. Details Modal
    fireEvent.click(screen.getByText("Task 1"));
    const detailsModalContent = screen.getByRole("document");
    fireEvent.click(detailsModalContent);
    fireEvent.keyDown(detailsModalContent, { key: "Enter" });
    expect(screen.getByText("Fechar")).toBeInTheDocument();

    // 3. Edit Modal
    fireEvent.click(screen.getByText("Editar"));
    const editModalContent = screen.getByRole("document");
    fireEvent.click(editModalContent);
    fireEvent.keyDown(editModalContent, { key: "Enter" });
    expect(screen.getByText("Atualizar tarefa")).toBeInTheDocument();
  });

  it("resets other modes when handleCreateNewTask is called", () => {
    render(<TaskDashboard />);

    // Select a task first
    fireEvent.click(screen.getByText("Task 1"));
    expect(screen.getByText("Fechar")).toBeInTheDocument(); // Details view

    // Now click New Task
    fireEvent.click(screen.getByRole("button", { name: /Nova Tarefa/i }));
    expect(
      screen.getByRole("heading", { name: "Nova Tarefa" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Fechar")).not.toBeInTheDocument(); // Details view should be gone
  });

  it("resets other modes when handleTaskClick is called", () => {
    render(<TaskDashboard />);

    // Open create modal
    fireEvent.click(screen.getByRole("button", { name: /Nova Tarefa/i }));
    expect(
      screen.getByRole("heading", { name: "Nova Tarefa" }),
    ).toBeInTheDocument();

    // Click on a task in the list
    fireEvent.click(screen.getByText("Task 1"));
    expect(screen.getByText("Fechar")).toBeInTheDocument(); // Details view
    expect(
      screen.queryByRole("heading", { name: "Nova Tarefa" }),
    ).not.toBeInTheDocument(); // Create form should be gone
  });

  it("handles empty or undefined tasks from useTasks", () => {
    vi.mocked(useTasks).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TaskDashboard />);
    // When tasks is undefined, TaskList shouldn't render
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    // The component should still render header and filters
    expect(
      screen.getByRole("heading", { name: /Tarefas/i }),
    ).toBeInTheDocument();
  });

  it("allows setting individual filters to null (All)", () => {
    render(<TaskDashboard />);

    const statusSelect = screen.getByDisplayValue("Todos os status");
    fireEvent.change(statusSelect, { target: { value: TaskStatus.COMPLETED } });
    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: TaskStatus.COMPLETED }),
    );

    // Change back to All
    fireEvent.change(statusSelect, { target: { value: "" } });
    expect(useTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: null }),
    );

    const prioritySelect = screen.getByDisplayValue("Todas as prioridades");
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
    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any);

    render(<TaskDashboard />);

    fireEvent.click(screen.getByText("Task 1"));
    fireEvent.click(screen.getByText("Editar"));

    const updateBtn = screen.getByRole("button", { name: "Atualizar tarefa" });
    fireEvent.click(updateBtn);

    expect(screen.queryByText("Atualizar tarefa")).not.toBeInTheDocument();
    expect(screen.queryByText("Fechar")).not.toBeInTheDocument();
  });

  it("renders TaskList when tasks data is present", () => {
    vi.mocked(useTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    render(<TaskDashboard />);
    expect(screen.getByText("Task 1")).toBeInTheDocument();
  });

  it("handles loading and error states from useTasks", () => {
    vi.mocked(useTasks).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    } as any);
    render(<TaskDashboard />);
    expect(screen.getByText(/Carregando tarefas.../i)).toBeInTheDocument();

    vi.mocked(useTasks).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error("Fetch error"),
    } as any);
    render(<TaskDashboard />);
    expect(
      screen.getByText(/Erro ao carregar tarefas: Fetch error/i),
    ).toBeInTheDocument();
  });
});
