import { describe, expect, it } from "bun:test";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { createApiClient } from "../src/api/client";

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config,
    data: {},
  });
}

describe("API session invalidation", () => {
  it("does not clear a replacement session for a stale 401", async () => {
    let token: string | null = "old-token";
    let cleared = 0;
    const api = createApiClient({
      config: {
        baseURL: "https://example.test",
        wsURL: "wss://example.test",
        timeout: 1000,
      },
      getToken: () => token,
      clearSession: () => cleared++,
    });
    api.defaults.adapter = async (config) => {
      token = "new-token";
      throw unauthorized(config);
    };
    await expect(api.get("/me")).rejects.toBeInstanceOf(AxiosError);
    expect(cleared).toBe(0);
  });

  it("preserves a guest for credential requests but clears its current protected request", async () => {
    let cleared = 0;
    const api = createApiClient({
      config: {
        baseURL: "https://example.test",
        wsURL: "wss://example.test",
        timeout: 1000,
      },
      getToken: () => "guest-token",
      clearSession: () => cleared++,
    });
    api.defaults.adapter = async (config) => {
      throw unauthorized(config);
    };
    await expect(
      api.post("/login", {}, { preserveSessionOnUnauthorized: true }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(cleared).toBe(0);
    await expect(api.get("/me")).rejects.toBeInstanceOf(AxiosError);
    expect(cleared).toBe(1);
  });
});
