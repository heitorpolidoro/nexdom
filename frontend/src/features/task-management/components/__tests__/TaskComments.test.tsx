import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TaskComments from "../TaskComments";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
} from "../../hooks/useTasks";
import { useAuth } from "../../../user-administration/context/AuthContext";

vi.mock("../../hooks/useTasks", () => ({
  useComments: vi.fn(),
  useCreateComment: vi.fn(),
  useUpdateComment: vi.fn(),
}));

vi.mock("../../../user-administration/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockComment = {
  id: "comment-1",
  task_id: "task-1",
  created_by_id: "user-1",
  created_by_name: "Alice",
  content: "This is a comment",
  created_at: "2023-01-01T10:00:00Z",
  updated_at: "2023-01-01T10:00:00Z",
};

describe("TaskComments", () => {
  const mockCreateMutate = vi.fn();
  const mockUpdateMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({ user: { id: "user-1" } } as any);

    vi.mocked(useComments).mockReturnValue({
      data: [mockComment],
      isLoading: false,
    } as any);

    vi.mocked(useCreateComment).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: false,
    } as any);

    vi.mocked(useUpdateComment).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any);
  });

  it("renders the comments section title", () => {
    render(<TaskComments taskId="task-1" />);
    expect(screen.getByText(/Comentários/i)).toBeInTheDocument();
  });

  it("renders existing comments", () => {
    render(<TaskComments taskId="task-1" />);
    expect(screen.getByText("This is a comment")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useComments).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<TaskComments taskId="task-1" />);
    expect(screen.getByText(/Carregando comentários/i)).toBeInTheDocument();
  });

  it("shows empty state when no comments", () => {
    vi.mocked(useComments).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<TaskComments taskId="task-1" />);
    expect(screen.getByText(/Nenhum comentário ainda/i)).toBeInTheDocument();
  });

  it("submits a new comment", () => {
    render(<TaskComments taskId="task-1" />);

    const textarea = screen.getByPlaceholderText(/Escreva um comentário/i);
    fireEvent.change(textarea, { target: { value: "New comment" } });

    const sendButton = screen.getByRole("button", { name: /Comentar/i });
    fireEvent.click(sendButton);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      "New comment",
      expect.any(Object),
    );
  });

  it("does not submit empty comment — send button disabled when empty", () => {
    render(<TaskComments taskId="task-1" />);

    const sendButton = screen.getByRole("button", { name: /Comentar/i });
    expect(sendButton).toBeDisabled();
  });

  it("shows sending state while creating", () => {
    vi.mocked(useCreateComment).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: true,
    } as any);

    render(<TaskComments taskId="task-1" />);
    expect(
      screen.getByRole("button", { name: /Enviando/i }),
    ).toBeInTheDocument();
  });

  it("shows edit button only for comment owner", () => {
    render(<TaskComments taskId="task-1" />);
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  it("does not show edit button for other users' comments", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "other-user" },
    } as any);

    render(<TaskComments taskId="task-1" />);
    expect(
      screen.queryByRole("button", { name: /editar/i }),
    ).not.toBeInTheDocument();
  });

  it("enters edit mode when edit button is clicked", () => {
    render(<TaskComments taskId="task-1" />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    expect(screen.getByRole("button", { name: /Salvar/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cancelar/i }),
    ).toBeInTheDocument();
  });

  it("saves edited comment", () => {
    render(<TaskComments taskId="task-1" />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const editTextareas = screen.getAllByRole("textbox");
    // First textarea is the edit field (second is the new comment)
    fireEvent.change(editTextareas[0], {
      target: { value: "Updated comment" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        commentId: "comment-1",
        content: "Updated comment",
      }),
      expect.any(Object),
    );
  });

  it("cancels edit and restores original content", () => {
    render(<TaskComments taskId="task-1" />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const editTextareas = screen.getAllByRole("textbox");
    fireEvent.change(editTextareas[0], { target: { value: "Changed text" } });

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(screen.getByText("This is a comment")).toBeInTheDocument();
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it("does not call mutate when saving unchanged content", () => {
    render(<TaskComments taskId="task-1" />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    // Content unchanged — clicking save should not mutate
    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it("shows (editado) marker when updated_at differs from created_at", () => {
    vi.mocked(useComments).mockReturnValue({
      data: [
        {
          ...mockComment,
          updated_at: "2023-01-02T12:00:00Z",
        },
      ],
      isLoading: false,
    } as any);

    render(<TaskComments taskId="task-1" />);
    expect(screen.getByText(/editado/i)).toBeInTheDocument();
  });

  it("disables save/cancel buttons when update is pending", () => {
    vi.mocked(useUpdateComment).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: true,
    } as any);

    render(<TaskComments taskId="task-1" />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    expect(screen.getByRole("button", { name: /Salvar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeDisabled();
  });

  it("clears textarea after successful comment submission", async () => {
    vi.mocked(useCreateComment).mockReturnValue({
      mutate: (_content: string, { onSuccess }: { onSuccess: () => void }) => {
        onSuccess();
      },
      isPending: false,
    } as any);

    render(<TaskComments taskId="task-1" />);

    const textarea = screen.getByPlaceholderText(/Escreva um comentário/i);
    fireEvent.change(textarea, { target: { value: "My comment" } });
    fireEvent.submit(textarea.closest("form")!);

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });
});
