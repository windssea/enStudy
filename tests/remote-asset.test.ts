import { describe, expect, it } from "vitest";
import { releasedAsset, releasedJson } from "../scripts/remote-asset.mjs";
const expected = new TextEncoder().encode("export const ready=true;");
const js = (body = expected) =>
  new Response(body, { headers: { "Content-Type": "application/javascript" } });
describe("bounded Pages static propagation checks", () => {
  it("waits for a JSON manifest after an HTML SPA fallback without consuming its body", async () => {
    let calls = 0;
    const expected = { version: 3, items: ["home"] };
    const r = await releasedJson(
      async () => {
        calls++;
        return calls === 1
          ? new Response("<!doctype html>", {
              headers: { "Content-Type": "text/html" },
            })
          : Response.json(expected);
      },
      expected,
      { attempts: 3, pauseMs: 0 },
    );
    expect(calls).toBe(2);
    expect(await r.json()).toEqual(expected);
  });
  it("compares manifest data independently of platform line endings", async () => {
    const expected = { version: 3, items: ["home"] };
    const r = await releasedJson(
      async () =>
        new Response(
          JSON.stringify(expected, null, 2).replaceAll("\n", "\r\n"),
          { headers: { "Content-Type": "application/json; charset=utf-8" } },
        ),
      expected,
    );
    expect(await r.json()).toEqual(expected);
  });
  it("fails a persistently different JSON release after the fixed attempt limit", async () => {
    let calls = 0;
    await expect(
      releasedJson(
        async () => {
          calls++;
          return Response.json({ version: 2 });
        },
        { version: 3 },
        { attempts: 2, pauseMs: 0 },
      ),
    ).rejects.toThrow("expected release");
    expect(calls).toBe(2);
  });
  it("rejects malformed JSON and a false JSON MIME instead of accepting an HTML fallback", async () => {
    let calls = 0;
    await expect(
      releasedJson(
        async () => {
          calls++;
          return new Response("<!doctype html>", {
            headers: { "Content-Type": "application/json" },
          });
        },
        {},
        { attempts: 2, pauseMs: 0 },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(2);
  });
  it("accepts matching JavaScript immediately without consuming the returned body", async () => {
    let calls = 0;
    const r = await releasedAsset(async () => {
      calls++;
      return js();
    }, expected);
    expect(calls).toBe(1);
    expect(await r.text()).toBe("export const ready=true;");
  });
  it("waits for transient missing and HTML fallback responses before exact bytes appear", async () => {
    let calls = 0;
    const r = await releasedAsset(
      async () => {
        calls++;
        return calls === 1
          ? new Response("missing", { status: 404 })
          : calls === 2
            ? new Response("fallback", {
                headers: { "Content-Type": "text/html" },
              })
            : js();
      },
      expected,
      { attempts: 4, pauseMs: 0 },
    );
    expect(calls).toBe(3);
    expect(await r.text()).toBe("export const ready=true;");
  });
  it("never treats persistently wrong JavaScript as the expected release", async () => {
    let calls = 0;
    const wrong = new TextEncoder().encode("export const ready=false;");
    const r = await releasedAsset(
      async () => {
        calls++;
        return js(wrong);
      },
      expected,
      { attempts: 3, pauseMs: 0 },
    );
    expect(calls).toBe(3);
    expect(await r.text()).not.toBe("export const ready=true;");
  });
  it("leaves a persistent non-200 response to fail the caller's unchanged assertion", async () => {
    let calls = 0;
    const r = await releasedAsset(
      async () => {
        calls++;
        return new Response("busy", { status: 503 });
      },
      expected,
      { attempts: 2, pauseMs: 0 },
    );
    expect(calls).toBe(2);
    expect(r.status).toBe(503);
  });
});
