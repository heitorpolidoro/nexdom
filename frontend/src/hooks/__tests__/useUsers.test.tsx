import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUsers, useAssignableUsers } from "../useUsers";
import apiClient from "../../api/client";
import React from "react";

vi.mock("../../api/client");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useUsers", () => {
  it("fetches users successfully", async () => {
    const mockUsers = [
      { id: "1", username: "user1", role: "DIRECTOR", is_active: true },
      { id: "2", username: "user2", role: "ADMINISTRATOR", is_active: true },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUsers });

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUsers);
    expect(apiClient.get).toHaveBeenCalledWith("/users/");
  });
});

describe("useAssignableUsers", () => {
  it("filters out ADMINISTRATOR users", async () => {
    const mockUsers = [
      { id: "1", username: "user1", role: "DIRECTOR", is_active: true },
      { id: "2", username: "admin", role: "ADMINISTRATOR", is_active: true },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUsers });

    const { result } = renderHook(() => useAssignableUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: "1", username: "user1", role: "DIRECTOR", is_active: true },
    ]);
  });
});
