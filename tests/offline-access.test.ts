import { describe, it, expect, vi, afterEach } from "vitest";
import {
  setOfflineIdentity,
  lockOffline,
  offlineScope,
  OFFLINE_ACCESS_KEY,
} from "../src/offlineAccess";
const me = {
  authenticated: true,
  developmentIdentityAvailable: false,
  child: { id: "child", householdId: "family", nickname: "小星", grade: 3 },
};
afterEach(() => vi.unstubAllGlobals());
function browser() {
  const rows = new Map<string, string>();
  let reject = false;
  const localStorage = {
    getItem: (key: string) => rows.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (reject) throw Error("quota");
      rows.set(key, value);
    },
    removeItem: (key: string) => {
      rows.delete(key);
    },
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", new EventTarget());
  return { rows, rejectWrites: () => (reject = true) };
}
describe("offline device access follows verified identity", () => {
  it("keeps only an identity scope and locks on logout without deleting encrypted learning records", () => {
    const b = browser();
    b.rows.set("unrelated-encrypted-record", "ciphertext");
    setOfflineIdentity(me);
    expect(offlineScope()).toEqual({ childId: "child", householdId: "family" });
    expect(b.rows.get(OFFLINE_ACCESS_KEY)).not.toContain("小星");
    lockOffline();
    expect(offlineScope()).toBeNull();
    expect(b.rows.get("unrelated-encrypted-record")).toBe("ciphertext");
  });
  it("never reuses the previous child scope when persistent identity writes fail", () => {
    const b = browser();
    setOfflineIdentity(me);
    b.rejectWrites();
    setOfflineIdentity({ ...me, child: { ...me.child, id: "sibling" } });
    expect(offlineScope()).toBeNull();
    expect(b.rows.has(OFFLINE_ACCESS_KEY)).toBe(false);
  });
  it("requires a verified child identity to unlock after being signed out", () => {
    browser();
    setOfflineIdentity(me);
    setOfflineIdentity({
      authenticated: false,
      developmentIdentityAvailable: false,
    });
    expect(offlineScope()).toBeNull();
    setOfflineIdentity({ ...me, child: { ...me.child, id: "sibling" } });
    expect(offlineScope()?.childId).toBe("sibling");
  });
});
