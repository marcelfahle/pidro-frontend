import { describe, expect, it } from "bun:test";
import type { PersistStorage } from "../src/platform/types";
import { createPendingInviteStore } from "../src/stores/pendingInvite";

function memoryStorage(): PersistStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("pending invite store", () => {
  it("completes hydration with synchronous storage", () => {
    const store = createPendingInviteStore({ storage: memoryStorage() });

    expect(store.getState().hydrated).toBe(true);
    expect(store.persist.hasHydrated()).toBe(true);
  });

  it("round-trips the latest normalized invite through persistence", async () => {
    const storage = memoryStorage();
    const first = createPendingInviteStore({
      storage,
      storageKey: "pending-test",
    });
    first.getState().setPendingInvite("7kq4-m2xb", "im");

    const second = createPendingInviteStore({
      storage,
      storageKey: "pending-test",
    });
    await second.persist.rehydrate();

    expect(second.getState().pendingInvite).toMatchObject({
      code: "7KQ4M2XB",
      source: "im",
    });
    expect(second.getState().hydrated).toBe(true);
  });

  it("replaces an earlier invite and clears explicitly", () => {
    const store = createPendingInviteStore({ storage: memoryStorage() });
    store.getState().setPendingInvite("7KQ4M2XB", "sms");
    store.getState().setPendingInvite("N4RT8VW2", "copy");
    expect(store.getState().pendingInvite?.code).toBe("N4RT8VW2");

    store.getState().clearPendingInvite();
    expect(store.getState().pendingInvite).toBeNull();
  });

  it("does not persist an invalid code", () => {
    const store = createPendingInviteStore({ storage: memoryStorage() });
    store.getState().setPendingInvite("invalid");
    expect(store.getState().pendingInvite).toBeNull();
  });

  it("sanitizes persisted invite data before routing from it", async () => {
    const storage = memoryStorage();
    storage.setItem(
      "pending-test",
      JSON.stringify({
        state: {
          pendingInvite: {
            code: "7kq4-m2xb",
            source: "copy&fixture=open",
            receivedAt: "not-a-timestamp",
          },
        },
        version: 0,
      }),
    );

    const store = createPendingInviteStore({
      storage,
      storageKey: "pending-test",
    });
    await store.persist.rehydrate();

    expect(store.getState().pendingInvite?.code).toBe("7KQ4M2XB");
    expect(store.getState().pendingInvite?.source).toBeUndefined();
    expect(Number.isFinite(store.getState().pendingInvite?.receivedAt)).toBe(
      true,
    );
  });

  it("drops a malformed persisted invite", async () => {
    const storage = memoryStorage();
    storage.setItem(
      "pending-test",
      JSON.stringify({
        state: {
          pendingInvite: { code: "../lobby", source: "copy", receivedAt: 1 },
        },
        version: 0,
      }),
    );

    const store = createPendingInviteStore({
      storage,
      storageKey: "pending-test",
    });
    await store.persist.rehydrate();

    expect(store.getState().pendingInvite).toBeNull();
  });
});
