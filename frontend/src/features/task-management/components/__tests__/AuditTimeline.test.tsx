import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import AuditTimeline from "../AuditTimeline";
import { useTaskHistory } from "../../hooks/useTasks";

// Mock hooks
vi.mock("../../hooks/useTasks", () => ({
  useTaskHistory: vi.fn(),
}));

describe("AuditTimeline", () => {
  it("renders loading state", () => {
    vi.mocked(useTaskHistory).mockReturnValue({
      isLoading: true,
      error: null,
    } as any);

    render(<AuditTimeline taskId="test-id" />);
    expect(screen.getByText(/Carregando histórico.../i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    vi.mocked(useTaskHistory).mockReturnValue({
      isLoading: false,
      error: new Error("Fetch error"),
    } as any);

    render(<AuditTimeline taskId="test-id" />);
    expect(
      screen.getByText(/Erro ao carregar histórico./i),
    ).toBeInTheDocument();
  });

  it("renders empty state when no history is returned", () => {
    vi.mocked(useTaskHistory).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);
    expect(
      screen.getByText(/Nenhuma alteração registrada ainda./i),
    ).toBeInTheDocument();
  });

  it("renders a list of history entries correctly", () => {
    const mockHistory = [
      {
        id: 1,
        task_id: "test-id",
        user_id: "user-1",
        user_name: "John Doe",
        field_name: "status",
        old_value: "PENDING",
        new_value: "IN_PROGRESS",
        timestamp: "2023-10-27T10:00:00Z",
      },
    ];

    vi.mocked(useTaskHistory).mockReturnValue({
      data: mockHistory,
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();
  });

  it('formats null values as "Nenhum"', () => {
    const mockHistory = [
      {
        id: 1,
        task_id: "test-id",
        user_id: "user-1",
        user_name: "John Doe",
        field_name: "description",
        old_value: null,
        new_value: "New description",
        timestamp: "2023-10-27T09:00:00Z",
      },
    ];

    vi.mocked(useTaskHistory).mockReturnValue({
      data: mockHistory,
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);

    expect(screen.getAllByText("Nenhum").length).toBeGreaterThan(0);
    expect(screen.getByText("New description")).toBeInTheDocument();
  });

  it('formats empty string values as "Vazio"', () => {
    const mockHistory = [
      {
        id: 1,
        task_id: "test-id",
        user_id: "user-1",
        user_name: "John Doe",
        field_name: "description",
        old_value: "Old",
        new_value: "",
        timestamp: "2023-10-27T10:00:00Z",
      },
    ];

    vi.mocked(useTaskHistory).mockReturnValue({
      data: mockHistory,
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);

    expect(screen.getByText("Vazio")).toBeInTheDocument();
  });
});
