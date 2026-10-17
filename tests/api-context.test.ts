import { afterEach, describe, expect, it, vi } from "vitest";
import { api, setLearningChild } from "../src/api";

afterEach(() => {
  setLearningChild(null);
  vi.unstubAllGlobals();
});
describe("learning request identity context", () => {
  it("binds learning requests to the child currently shown in the page", async () => {
    const fetch = vi.fn(async () => Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetch);
    setLearningChild("child-shown-in-page");
    await api("/sessions", { clientRequestId: "example" });
    const options = fetch.mock.calls[0] as unknown as [string, RequestInit];
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
