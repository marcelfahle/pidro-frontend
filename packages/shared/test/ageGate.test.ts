import { describe, expect, it } from "bun:test";
import { createAgeGateStore } from "../src/stores/ageGate";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
    values,
  };
}

describe("age gate store", () => {
  it("persists an eligible answer and accepted terms version", async () => {
    const { storage } = memoryStorage();
    const first = createAgeGateStore({ storage, storageKey: "eligible-age" });

    expect(first.getState().hydrated).toBe(true);

    first.getState().setAnswer("13_17", "1");

    const restored = createAgeGateStore({
      storage,
      storageKey: "eligible-age",
    });
    await restored.persist.rehydrate();

    expect(restored.getState()).toMatchObject({
      ageBand: "13_17",
      termsVersion: "1",
      hydrated: true,
    });
  });

  it("persists the terminal under-13 answer independently of auth state", async () => {
    const { storage, values } = memoryStorage();
    const store = createAgeGateStore({ storage, storageKey: "under-13-age" });
    store.getState().setAnswer("under_13", "1");

    expect(values.get("under-13-age")).toContain("under_13");
    expect(store.getState()).toMatchObject({
      ageBand: "under_13",
      termsVersion: "1",
    });
  });
});
