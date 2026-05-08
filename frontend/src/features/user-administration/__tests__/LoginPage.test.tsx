import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import { AuthProvider } from "../context/AuthContext";
import apiClient from "../../../api/client";

vi.mock("../../../api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });
  });

  it("renders login form", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Usuário/i)).toBeDefined();
    expect(screen.getByLabelText(/Senha/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Entrar/i })).toBeDefined();
  });

  it("shows error message on failed login", async () => {
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        data: { detail: "Incorrect username or password" },
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Usuário/i), {
      target: { value: "wronguser" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Incorrect username or password/i)).toBeDefined();
    });
  });

  it("shows specific message for inactive user", async () => {
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        data: { detail: "Inactive user" },
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Usuário/i), {
      target: { value: "inactive" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Sua conta está aguardando aprovação de um administrador/i,
        ),
      ).toBeDefined();
    });
  });

  it("renders dev users and handles dev login", async () => {
    const mockDevUsers = [
      { id: "1", username: "devadmin", is_active: true, role: "ADMINISTRATOR" },
    ];
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockDevUsers,
    });
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { access_token: "dev-token" },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Quick Login \(Dev Mode\)/i)).toBeDefined();
    });

    const devButton = screen.getByRole("button", { name: "devadmin" });
    fireEvent.click(devButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/dev-login",
        null,
        expect.objectContaining({
          params: { username: "devadmin", remember_me: false },
        }),
      );
    });
  });
});
