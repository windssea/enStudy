import { describe, expect, it, vi } from "vitest";
import { fetchLocalRead } from "../scripts/local-read.mjs";
const closed = () =>
  new TypeError("fetch failed", { cause: { code: "UND_ERR_SOCKET" } });
describe("local verifier idle socket recovery", () => {
  it("recovers a local GET once and preserves its headers and abort signal", async () => {
    const send = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(closed())
      .mockResolvedValueOnce(new Response("ok"));
    const controller = new AbortController();
    const response = await fetchLocalRead(
      "http://127.0.0.1:8788/api/v1/learning/summary",
      { headers: { Cookie: "fixture" }, signal: controller.signal },
      send,
    );
    expect(await response.text()).toBe("ok");
    expect(send).toHaveBeenCalledTimes(2);
    const options = send.mock.calls[1][1]!;
    expect(options.signal).toBe(controller.signal);
    expect(new Headers(options.headers).get("Cookie")).toBe("fixture");
    expect(new Headers(options.headers).get("Connection")).toBe("close");
  });
  it("propagates a repeated socket failure after one retry", async () => {
    const error = closed(),
      send = vi.fn<typeof fetch>().mockRejectedValue(error);
    await expect(
      fetchLocalRead("http://localhost:8788/", {}, send),
    ).rejects.toBe(error);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("never retries POST, remote reads, aborted reads or other transport errors", async () => {
    for (const [url, init, error] of [
      ["http://127.0.0.1:8788/api/v1/attempts", { method: "POST" }, closed()],
      [
        "https://development.english-quest-dev.pages.dev/api/v1/health",
        {},
        closed(),
      ],
      ["http://localhost:8788/", {}, new DOMException("aborted", "AbortError")],
      [
        "http://localhost:8788/",
        {},
        new TypeError("connection refused", {
          cause: { code: "ECONNREFUSED" },
        }),
      ],
    ] as const) {
      const send = vi.fn<typeof fetch>().mockRejectedValue(error);
      await expect(fetchLocalRead(url, init, send)).rejects.toBe(error);
      expect(send).toHaveBeenCalledTimes(1);
    }
  });
  it("leaves non-success HTTP responses to the verifier without retrying them", async () => {
    const failure = new Response("failed", { status: 500 }),
      send = vi.fn<typeof fetch>().mockResolvedValue(failure);
    expect(await fetchLocalRead("http://localhost:8788/", {}, send)).toBe(
      failure,
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});
