import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminUserDashboard from "../pages/AdminUserDashboard";
import * as AuthHook from "../context/AuthContext";
import { UserRole } from "../context/AuthContext";
import apiClient from "../../../api/client";

vi.mock("../../../api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

const mockCurrentUser = {
  id: "admin-1",
  username: "admin",
  email: "admin@example.com",
  full_name: "Admin User",
  role: UserRole.ADMINISTRADOR,
  is_active: true,
};

const mockUsers = [
  {
    id: "user-1",
    username: "user1",
    email: "user1@example.com",
    full_name: "User One",
    role: UserRole.DIRETOR,
    is_active: true,
  },
  {
    id: "user-2",
    username: "user2",
    email: "user2@example.com",
    full_name: "User Two",
    role: UserRole.ADMINISTRADOR,
    is_active: false,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("AdminUserDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthHook, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockCurrentUser,
      login: vi.fn() as any,
      logout: vi.fn(),
    });
  });

  it("renders loading state initially", () => {
    (apiClient.get as any).mockImplementation(() => new Promise(() => {}));

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("Carregando usuários...")).toBeDefined();
  });

  it("renders error state when fetch fails", async () => {
    (apiClient.get as any).mockRejectedValue(new Error("Network error"));

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar usuários.")).toBeDefined();
    });
  });

  it("renders user table with users", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeDefined();
      expect(screen.getByText("User Two")).toBeDefined();
    });

    expect(screen.getByText("user1")).toBeDefined();
    expect(screen.getByText("user1@example.com")).toBeDefined();
    expect(screen.getByText("Gerenciamento de Usuários")).toBeDefined();
  });

  it("filters by active status", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeDefined();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "active" } });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/users/", {
        params: { is_active: true },
      });
    });
  });

  it("filters by inactive status", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeDefined();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "inactive" } });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/users/", {
        params: { is_active: false },
      });
    });
  });

  it("toggles user active status", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });
    (apiClient.patch as any).mockResolvedValue({
      data: { ...mockUsers[0], is_active: false },
    });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeDefined();
    });

    const desativarButtons = screen.getAllByText("Desativar");
    fireEvent.click(desativarButtons[0]);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/users/user-1", {
        is_active: false,
      });
    });
  });

  it("approves an inactive user", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });
    (apiClient.patch as any).mockResolvedValue({
      data: { ...mockUsers[1], is_active: true },
    });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User Two")).toBeDefined();
    });

    const aprovarButton = screen.getByText("Aprovar");
    fireEvent.click(aprovarButton);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/users/user-2", {
        is_active: true,
      });
    });
  });

  it("changes user role", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });
    (apiClient.patch as any).mockResolvedValue({
      data: { ...mockUsers[0], role: UserRole.ADMINISTRADOR },
    });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeDefined();
    });

    const administradorButton = screen.getByText("Mudar p/ Administrador");
    fireEvent.click(administradorButton);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/users/user-1", {
        role: UserRole.ADMINISTRADOR,
      });
    });
  });

  it("changes ADMINISTRADOR user role to DIRETOR", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });
    (apiClient.patch as any).mockResolvedValue({
      data: { ...mockUsers[1], role: UserRole.DIRETOR },
    });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User Two")).toBeDefined();
    });

    const diretorButton = screen.getByText("Mudar p/ Diretor");
    fireEvent.click(diretorButton);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/users/user-2", {
        role: UserRole.DIRETOR,
      });
    });
  });

  it("prevents current user from deactivating their own account", async () => {
    const usersWithCurrentUser = [{ ...mockCurrentUser }, ...mockUsers];
    (apiClient.get as any).mockResolvedValue({ data: usersWithCurrentUser });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeDefined();
    });

    const desativarButtons = screen.getAllByText("Desativar");
    fireEvent.click(desativarButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Você não pode desativar sua própria conta."),
      ).toBeDefined();
    });
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("prevents current user from changing their own role", async () => {
    const usersWithCurrentUser = [{ ...mockCurrentUser }, ...mockUsers];
    (apiClient.get as any).mockResolvedValue({ data: usersWithCurrentUser });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeDefined();
    });

    const mudarButtons = screen.getAllByText(/Mudar p\//i);
    fireEvent.click(mudarButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Você não pode alterar seu próprio cargo."),
      ).toBeDefined();
    });
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("shows alert on mutation error", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });
    (apiClient.patch as any).mockRejectedValue({
      response: { data: { detail: "Permission denied" } },
    });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeDefined();
    });

    const desativarButtons = screen.getAllByText("Desativar");
    fireEvent.click(desativarButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Permission denied")).toBeDefined();
    });
  });

  it("shows generic alert when mutation error has no detail", async () => {
    (apiClient.get as any).mockResolvedValue({ data: mockUsers });
    (apiClient.patch as any).mockRejectedValue(new Error("Network error"));

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeDefined();
    });

    const desativarButtons = screen.getAllByText("Desativar");
    fireEvent.click(desativarButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Erro ao atualizar usuário")).toBeDefined();
    });
  });

  it("calls logout when Sair button is clicked", async () => {
    const mockLogout = vi.fn();
    vi.spyOn(AuthHook, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockCurrentUser,
      login: vi.fn() as any,
      logout: mockLogout,
    });

    (apiClient.get as any).mockResolvedValue({ data: mockUsers });

    render(<AdminUserDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Sair"));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
