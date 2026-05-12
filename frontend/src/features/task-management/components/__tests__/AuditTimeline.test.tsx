import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AuditTimeline from "../AuditTimeline";
import { useTaskHistory } from "../../hooks/useTasks";
import { useTranslation } from "react-i18next";
import ptData from "../../../../i18n/locales/pt.json";

// Mock hooks
vi.mock("../../hooks/useTasks", () => ({
  useTaskHistory: vi.fn(),
}));

describe("AuditTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock from setup.ts if it was overridden
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, options?: any) => {
        const keys = key.split(".");
        let value: any = ptData;
        for (const k of keys) {
          value = value?.[k];
        }
        if (typeof value === "string" && options) {
          Object.keys(options).forEach((k) => {
            value = value.replace(`{{${k}}}`, options[k]);
          });
        }
        return value || key;
      },
      i18n: { language: "pt", changeLanguage: vi.fn() },
    } as any);
  });

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

  it("renders in English when language is not pt", () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (s: string) => s,
      i18n: { language: "en" },
    } as any);

    const mockHistory = [
      {
        id: 1,
        task_id: "test-id",
        user_id: "user-1",
        user_name: "John Doe",
        field_name: "task_title",
        old_value: "Old",
        new_value: "New",
        timestamp: "2023-10-27T10:00:00Z",
      },
    ];

    vi.mocked(useTaskHistory).mockReturnValue({
      data: mockHistory,
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);

    // Check English date format (Oct 27, 2023)
    expect(screen.getByText(/Oct 27, 2023/)).toBeInTheDocument();
    // Check field name formatting (task title)
    expect(screen.getByText("task title")).toBeInTheDocument();
  });

  it('formats "null" string as "Nenhum"', () => {
    const mockHistory = [
      {
        id: 1,
        task_id: "test-id",
        user_id: "user-1",
        user_name: "John Doe",
        field_name: "description",
        old_value: "null",
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
  });

  it("formatFieldName handles empty string field_name gracefully", () => {
    vi.mocked(useTaskHistory).mockReturnValue({
      data: [
        {
          id: 1,
          task_id: "test-id",
          user_id: "user-1",
          user_name: "John Doe",
          field_name: "",
          old_value: "old",
          new_value: "new",
          timestamp: "2023-10-27T10:00:00Z",
        },
      ],
      isLoading: false,
    } as any);

    render(<AuditTimeline taskId="test-id" />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
