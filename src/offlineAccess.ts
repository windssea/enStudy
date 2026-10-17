import type { Identity } from "../packages/contracts/index";
export const OFFLINE_ACCESS_KEY = "eq-offline-access-v1";
const key = OFFLINE_ACCESS_KEY;
let locked = false;
export type OfflineScope = { childId: string; householdId: string };
export function offlineScope(): OfflineScope | null {
  if (locked) return null;
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return value &&
      typeof value.childId === "string" &&
      typeof value.householdId === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function setOfflineIdentity(identity: Identity) {
  locked = true;
  try {
    if (identity.authenticated && identity.child) {
      localStorage.setItem(
        key,
        JSON.stringify({
          childId: identity.child.id,
          householdId: identity.child.householdId,
        }),
      );
      locked = false;
    } else localStorage.removeItem(key);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* The memory lock remains closed. */
    }
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("eq-offline-access"));
}
export function lockOffline() {
  locked = true;
  try {
    localStorage.removeItem(key);
  } catch {}
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("eq-offline-access"));
}
export function sameOfflineScope(
  a: OfflineScope | null,
  b: OfflineScope | null,
) {
  return (
    !!a && !!b && a.childId === b.childId && a.householdId === b.householdId
  );
}
