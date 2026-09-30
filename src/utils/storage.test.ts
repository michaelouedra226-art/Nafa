import { describe, expect, it } from "vitest";
import { exportStateAsJson, importStateFromJson, INITIAL_APP_STATE, loadAppState } from "./storage";

describe("importStateFromJson", () => {
  it("imports a valid export and fills backward-compatible defaults", () => {
    const imported = importStateFromJson(exportStateAsJson(INITIAL_APP_STATE));
    expect(imported.categories.length).toBeGreaterThan(0);
    expect(imported.profile.language).toBe("fr");
    expect(imported.expenses).toEqual([]);
  });

  it("rejects malformed expenses before replacing local data", () => {
    const corrupt = {
      ...INITIAL_APP_STATE,
      expenses: [{ id: "x", amount: "not-a-number", categoryId: "cat_nourriture", timestamp: 100 }],
    };
    expect(() => importStateFromJson(JSON.stringify(corrupt))).toThrow(/expenses/);
  });

  it("rejects a malformed transaction direction", () => {
    const corrupt = {
      ...INITIAL_APP_STATE,
      transactions: [{ id: "tx_1", amount: 100, timestamp: 100, direction: "sideways" }],
    };
    expect(() => importStateFromJson(JSON.stringify(corrupt))).toThrow(/transactions/);
  });

  it("allows older backups without newer optional collections", () => {
    const { dailyChallenges: _ignored, ...legacy } = INITIAL_APP_STATE;
    const imported = importStateFromJson(JSON.stringify(legacy));
    expect(imported.dailyChallenges).toEqual([]);
  });

  it("preserves a v5 source while migrating it to v6 and fills missing nested defaults", () => {
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const values = new Map<string, string>();
    const { incomeSources: _ignored, ...legacyProfile } = INITIAL_APP_STATE.profile;
    values.set("nafa_state_v5", JSON.stringify({
      ...INITIAL_APP_STATE,
      profile: legacyProfile,
    }));
    const fakeStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: fakeStorage });
    try {
      const loaded = loadAppState();
      expect(loaded.profile.incomeSources.hasGrant).toBe(false);
      expect(values.has("nafa_state_v5")).toBe(true);
      expect(values.has("nafa_state_v6")).toBe(true);
    } finally {
      if (previousStorage) Object.defineProperty(globalThis, "localStorage", previousStorage);
      else delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
    }
  });
});
