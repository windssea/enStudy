import { describe, expect, it } from "vitest";
import { releasedAsset } from "../scripts/remote-asset.mjs";
const expected = new TextEncoder().encode("export const ready=true;");
const js = (body = expected) =>
  new Response(body, { headers: { "Content-Type": "application/javascript" } });
describe("bounded Pages static propagation checks", () => {
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
