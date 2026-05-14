import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";
import { useBackendHealth } from "../hooks/useBackendHealth";

vi.mock("../hooks/useBackendHealth", () => ({
  useBackendHealth: vi.fn().mockReturnValue(false),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("App Component", () => {
  beforeEach(() => {
    vi.mocked(useBackendHealth).mockReturnValue(false);
  });

  it("renders without crashing", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
    expect(document.body).toBeDefined();
  });

  it("shows offline banner when backend is unreachable", () => {
    vi.mocked(useBackendHealth).mockReturnValue(true);
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText("Não foi possível conectar ao servidor"),
    ).toBeInTheDocument();
  });
});
