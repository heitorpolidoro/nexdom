import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useBackendHealth } from "../useBackendHealth";
import apiClient from "../../api/client";

vi.mock("../../api/client", () => ({
  default: { get: vi.fn() },
}));

describe("useBackendHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when health check succeeds", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { status: "healthy" } });
    const { result } = renderHook(() => useBackendHealth());
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/health"));
    expect(result.current).toBe(false);
  });

  it("returns true when network error has no response", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useBackendHealth());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays false when server returns error with response object", async () => {
    const serverErr = Object.assign(new Error("Server Error"), { response: { status: 500 } });
    vi.mocked(apiClient.get).mockRejectedValue(serverErr);
    const { result } = renderHook(() => useBackendHealth());
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/health"));
    expect(result.current).toBe(false);
  });
});
