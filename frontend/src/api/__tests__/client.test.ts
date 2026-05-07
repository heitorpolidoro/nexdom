import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "../client";

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("adds Authorization header if token exists in localStorage", async () => {
    const token = "test-token";
    localStorage.setItem("accessToken", token);

    // O axios-mock-adapter seria o ideal aqui, mas podemos testar o interceptor diretamente
    // acessando a lista de interceptores do axios ou simulando uma requisição.

    // @ts-ignore - acessando interceptores internos para teste
    const requestInterceptor = (apiClient.interceptors.request as any)
      .handlers[0];

    const config = { headers: {} };
    const updatedConfig = await requestInterceptor.fulfilled(config);

    expect(updatedConfig.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("does not add Authorization header if token is missing", async () => {
    // @ts-ignore
    const requestInterceptor = (apiClient.interceptors.request as any)
      .handlers[0];

    const config = { headers: {} };
    const updatedConfig = await requestInterceptor.fulfilled(config);

    expect(updatedConfig.headers.Authorization).toBeUndefined();
  });

  it("rejects the promise if request interceptor fails", async () => {
    // @ts-ignore
    const requestInterceptor = (apiClient.interceptors.request as any)
      .handlers[0];
    const error = new Error("Request failed");

    await expect(requestInterceptor.rejected(error)).rejects.toThrow(
      "Request failed",
    );
  });
});
