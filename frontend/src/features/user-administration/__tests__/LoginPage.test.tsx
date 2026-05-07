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
    (apiClient.post as any).mockRejectedValue({
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
    (apiClient.post as any).mockRejectedValue({
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
});
