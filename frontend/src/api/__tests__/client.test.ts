import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "../client";

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("adds Authorization header if token exists in localStorage", async () => {
    const token = "test-token";
    localStorage.setItem("accessToken", token);

    // O axios-mock-adapter seria o ideal aqui, mas podemos testar o interceptor diretamente
    // acessando a lista de interceptores do axios ou simulando uma requisição.

    const requestInterceptor = (
      apiClient.interceptors.request as unknown as {
        handlers: {
          fulfilled: (...args: unknown[]) => unknown;
          rejected: (...args: unknown[]) => unknown;
        }[];
      }
    ).handlers[0];

    const config = { headers: {} };
    const updatedConfig = (await requestInterceptor.fulfilled(config)) as any;

    expect(updatedConfig.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("adds Authorization header if token exists in sessionStorage", async () => {
    const token = "session-test-token";
    sessionStorage.setItem("accessToken", token);

    const requestInterceptor = (
      apiClient.interceptors.request as unknown as {
        handlers: {
          fulfilled: (...args: unknown[]) => unknown;
          rejected: (...args: unknown[]) => unknown;
        }[];
      }
    ).handlers[0];

    const config = { headers: {} };
    const updatedConfig = (await requestInterceptor.fulfilled(config)) as any;

    expect(updatedConfig.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("does not add Authorization header if token is missing", async () => {
    const requestInterceptor = (
      apiClient.interceptors.request as unknown as {
        handlers: {
          fulfilled: (...args: unknown[]) => unknown;
          rejected: (...args: unknown[]) => unknown;
        }[];
      }
    ).handlers[0];

    const config = { headers: {} };
    const updatedConfig = (await requestInterceptor.fulfilled(config)) as any;

    expect(updatedConfig.headers.Authorization).toBeUndefined();
  });

  it("rejects the promise if request interceptor fails", async () => {
    const requestInterceptor = (
      apiClient.interceptors.request as unknown as {
        handlers: {
          fulfilled: (...args: unknown[]) => unknown;
          rejected: (...args: unknown[]) => unknown;
        }[];
      }
    ).handlers[0];
    const error = new Error("Request failed");

    await expect(requestInterceptor.rejected(error)).rejects.toThrow(
      "Request failed",
    );
  });
});
