import { afterEach, describe, expect, it, vi } from "vitest";
import { api, setLearningChild, setHouseholdContext } from "../src/api";

afterEach(() => {
  setLearningChild(null);
  setHouseholdContext(undefined);
  vi.unstubAllGlobals();
});
describe("learning request identity context", () => {
  it("freezes the displayed household version into each parent request while identity refresh can discover a switch", async () => {
    const fetch = vi.fn(async () => Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetch);
    setHouseholdContext({
      username: "parent",
      householdId: "family-a",
      contextVersion: 4,
      role: "owner",
      isAdmin: false,
      mustChangePassword: false,
    });
    await api("/children", { nickname: "昵称", grade: 1 });
    let options = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(options[1].headers).get("X-EQ-Household-ID")).toBe(
      "family-a",
    );
    expect(new Headers(options[1].headers).get("X-EQ-Household-Version")).toBe(
      "4",
    );
    await api("/me");
    options = fetch.mock.calls[1] as unknown as [string, RequestInit];
    expect(new Headers(options[1].headers).has("X-EQ-Household-ID")).toBe(
      false,
    );
  });
  it("can bind an empty household context without pretending the account is a family owner", async () => {
    const fetch = vi.fn(async () => Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetch);
    setHouseholdContext({
      username: "parent",
      householdId: "",
      contextVersion: 0,
      role: null,
      isAdmin: false,
      mustChangePassword: false,
    });
    await api("/households/invitations/preview", { token: "a".repeat(64) });
    const options = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(options[1].headers).get("X-EQ-Household-ID")).toBe("");
    expect(new Headers(options[1].headers).get("X-EQ-Household-Version")).toBe(
      "0",
    );
  });
  it("binds learning requests to the child currently shown in the page", async () => {
    const fetch = vi.fn(async () => Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetch);
    setLearningChild("child-shown-in-page");
    await api("/sessions", { clientRequestId: "example" });
    const options = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(options[1].headers).get("X-EQ-Player-Version")).toBe(
      "5",
    );
    expect(new Headers(options[1].headers).get("X-EQ-Child-ID")).toBe(
      "child-shown-in-page",
    );
  });
  it("clears the old identity header when the account is signed out", async () => {
    const fetch = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetch);
    setLearningChild("old-child");
    setLearningChild(null);
    await api("/me");
    const options = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(options[1].headers).has("X-EQ-Child-ID")).toBe(false);
  });
});
