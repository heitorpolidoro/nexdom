import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../context/AuthContext";
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

const TestComponent = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? "Authenticated" : "Not Authenticated"}
      </div>
      {user && <div data-testid="username">{user.username}</div>}
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("initially shows as not authenticated if no token exists", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.queryByText("Loading...")).toBeNull());
    expect(screen.getByTestId("auth-status").textContent).toBe(
      "Not Authenticated",
    );
  });

  it("fetches user if token exists in localStorage", async () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      role: "FUNCIONARIO",
      is_active: true,
    };
    localStorage.setItem("accessToken", "fake-token");
    (apiClient.get as any).mockResolvedValue({ data: mockUser });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "Authenticated",
      ),
    );
    expect(screen.getByTestId("username").textContent).toBe("testuser");
    expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
  });

  it("logs out and clears localStorage", async () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      role: "FUNCIONARIO",
      is_active: true,
    };
    localStorage.setItem("accessToken", "fake-token");
    (apiClient.get as any).mockResolvedValue({ data: mockUser });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "Authenticated",
      ),
    );

    fireEvent.click(screen.getByText("Logout"));

    await waitFor(() =>
      expect(screen.getByTestId("auth-status").textContent).toBe(
        "Not Authenticated",
      ),
    );
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
});
