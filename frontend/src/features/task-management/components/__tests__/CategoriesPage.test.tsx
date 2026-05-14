import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CategoriesPage from "../CategoriesPage";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../../hooks/useCategories";

vi.mock("../../hooks/useCategories", () => ({
  useCategories: vi.fn(),
  useCreateCategory: vi.fn(),
  useUpdateCategory: vi.fn(),
  useDeleteCategory: vi.fn(),
}));

const mockCategories = [
  { id: "cat-1", name: "General", color: "#808080", is_active: true },
  { id: "cat-2", name: "Jurídico", color: "#6366f1", is_active: true },
];

const makeHooks = (overrides: {
  create?: Partial<{ mutate: ReturnType<typeof vi.fn>; isPending: boolean }>;
  update?: Partial<{ mutate: ReturnType<typeof vi.fn>; isPending: boolean }>;
  delete?: Partial<{ mutate: ReturnType<typeof vi.fn>; isPending: boolean }>;
} = {}) => {
  vi.mocked(useCreateCategory).mockReturnValue({
    mutate: overrides.create?.mutate ?? vi.fn(),
    isPending: overrides.create?.isPending ?? false,
  } as any);
  vi.mocked(useUpdateCategory).mockReturnValue({
    mutate: overrides.update?.mutate ?? vi.fn(),
    isPending: overrides.update?.isPending ?? false,
  } as any);
  vi.mocked(useDeleteCategory).mockReturnValue({
    mutate: overrides.delete?.mutate ?? vi.fn(),
    isPending: overrides.delete?.isPending ?? false,
  } as any);
};

describe("CategoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    vi.mocked(useCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
    } as any);
    makeHooks();
  });

  it("renders title and new category button", () => {
    render(<CategoriesPage />);
    expect(screen.getByText("Categorias")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nova Categoria/i })).toBeInTheDocument();
  });

  it("renders loading state", () => {
    vi.mocked(useCategories).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<CategoriesPage />);
    expect(screen.getByText("Carregando categorias...")).toBeInTheDocument();
  });

  it("renders empty state when no categories", () => {
    vi.mocked(useCategories).mockReturnValue({ data: [], isLoading: false } as any);
    render(<CategoriesPage />);
    expect(screen.getByText("Nenhuma categoria cadastrada.")).toBeInTheDocument();
  });

  it("renders category list with names", () => {
    render(<CategoriesPage />);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Jurídico")).toBeInTheDocument();
  });

  it("shows create form when new category button is clicked", () => {
    render(<CategoriesPage />);
    fireEvent.click(screen.getByRole("button", { name: /Nova Categoria/i }));
    expect(screen.getByPlaceholderText("Nome da categoria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar/i })).toBeInTheDocument();
  });

  it("hides form when cancel is clicked", () => {
    render(<CategoriesPage />);
    fireEvent.click(screen.getByRole("button", { name: /Nova Categoria/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(screen.queryByPlaceholderText("Nome da categoria")).not.toBeInTheDocument();
  });

  it("calls createMutation when form is submitted", () => {
    const mutate = vi.fn((_data, options) => options?.onSuccess?.());
    makeHooks({ create: { mutate } });
    render(<CategoriesPage />);

    fireEvent.click(screen.getByRole("button", { name: /Nova Categoria/i }));
    fireEvent.change(screen.getByPlaceholderText("Nome da categoria"), {
      target: { value: "Finance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Finance" }),
      expect.any(Object),
    );
  });

  it("does not submit when name is empty", () => {
    const mutate = vi.fn();
    makeHooks({ create: { mutate } });
    render(<CategoriesPage />);

    fireEvent.click(screen.getByRole("button", { name: /Nova Categoria/i }));
    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows edit form when pencil button is clicked", () => {
    render(<CategoriesPage />);
    const editButtons = screen.getAllByRole("button", { name: "" });
    // First edit button corresponds to "General"
    const pencilButtons = document.querySelectorAll('button[class*="px-2"]');
    fireEvent.click(pencilButtons[0]);
    expect(screen.getByDisplayValue("General")).toBeInTheDocument();
  });

  it("calls updateMutation when edit form is submitted", () => {
    const mutate = vi.fn((_data, options) => options?.onSuccess?.());
    makeHooks({ update: { mutate } });
    render(<CategoriesPage />);

    // Click first edit (pencil) button
    const pencilButtons = document.querySelectorAll('svg.lucide-pencil');
    fireEvent.click(pencilButtons[0].closest("button")!);

    const input = screen.getByDisplayValue("General");
    fireEvent.change(input, { target: { value: "General Updated" } });

    const checkButton = document.querySelector('svg.lucide-check')?.closest("button");
    fireEvent.click(checkButton!);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cat-1", data: expect.objectContaining({ name: "General Updated" }) }),
      expect.any(Object),
    );
  });

  it("cancels edit when X button is clicked", () => {
    render(<CategoriesPage />);
    const pencilButtons = document.querySelectorAll('svg.lucide-pencil');
    fireEvent.click(pencilButtons[0].closest("button")!);

    expect(screen.getByDisplayValue("General")).toBeInTheDocument();

    const xButton = document.querySelector('svg.lucide-x')?.closest("button");
    fireEvent.click(xButton!);

    expect(screen.queryByDisplayValue("General")).not.toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("calls deleteMutation when delete is confirmed", () => {
    const mutate = vi.fn();
    makeHooks({ delete: { mutate } });
    render(<CategoriesPage />);

    const trashButtons = document.querySelectorAll('svg.lucide-trash-2');
    fireEvent.click(trashButtons[0].closest("button")!);

    expect(window.confirm).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith("cat-1", expect.any(Object));
  });

  it("does not call deleteMutation when confirm is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const mutate = vi.fn();
    makeHooks({ delete: { mutate } });
    render(<CategoriesPage />);

    const trashButtons = document.querySelectorAll('svg.lucide-trash-2');
    fireEvent.click(trashButtons[0].closest("button")!);

    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows error alert on create failure", async () => {
    const mutate = vi.fn((_data, options) =>
      options?.onError?.({ response: { data: { detail: "Duplicate name" } } }),
    );
    makeHooks({ create: { mutate } });
    render(<CategoriesPage />);

    fireEvent.click(screen.getByRole("button", { name: /Nova Categoria/i }));
    fireEvent.change(screen.getByPlaceholderText("Nome da categoria"), {
      target: { value: "Finance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(screen.getByText("Duplicate name")).toBeInTheDocument();
    });
  });
});
