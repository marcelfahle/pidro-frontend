import { describe, expect, it } from "bun:test";
import type { ApiClient } from "../src/api/client";
import { createAuthApi } from "../src/api/auth";

describe("auth API", () => {
  it("deletes the account with no request body", async () => {
    const calls: unknown[][] = [];
    const api = {
      delete: async (...args: unknown[]) => {
        calls.push(args);
        return { status: 204, data: "" };
      },
    } as unknown as ApiClient;

    await expect(createAuthApi(api).deleteAccount()).resolves.toBeUndefined();

    expect(calls).toEqual([["/api/v1/auth/me"]]);
  });
});
