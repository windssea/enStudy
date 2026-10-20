import { describe, it, expect } from "vitest";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(
  new URL("../public/offline-sw.js", import.meta.url),
  "utf8",
);
function runtime(
  model = false,
  invalidModel = false,
  guide = false,
  pictures = false,
  invalidPicture = false,
  webp = false,
  invalidWebp = false,
) {
  const stores = new Map<string, Map<string, Response>>(),
    handlers = new Map<string, (event: any) => void>(),
    requests: { url: string; options: any }[] = [];
  let offline = false,
    badAsset = false,
    malicious = false;
  const caches = {
    async keys() {
      return [...stores.keys()];
    },
    async delete(key: string) {
      return stores.delete(key);
    },
    async open(key: string) {
      if (!stores.has(key)) stores.set(key, new Map());
      const store = stores.get(key)!;
      return {
        async put(path: string, response: Response) {
          store.set(path, response.clone());
        },
        async match(path: string) {
          return store.get(path)?.clone();
        },
      };
    },
  };
  const fetch = async (path: string | Request, options?: any) => {
    const url = typeof path === "string" ? path : path.url;
    requests.push({ url, options });
    if (offline) throw Error("offline");
    if (url === "/offline-shell.json")
      return Response.json({
        schema: 1,
        cacheKey: "eq-shell-v1-1234567890abcdef",
        assets: malicious
          ? ["/index.html", "/api/v1/me"]
          : [
              "/index.html",
              "/assets/main-1.js",
              "/assets/main-1.css",
              ...(webp
                ? [
                    "/art/concepts/sports-v1/telescope.webp",
                    "/art/concepts/sports-v1/apple-whole.webp",
                    "/art/concepts/sports-v1/apple-progress.webp",
                    "/art/concepts/sports-v1/apple-finished.webp",
                    "/art/courses/sports-v1/students-v2.webp",
                    "/art/courses/sports-v1/bag.webp",
                    "/art/courses/sports-v1/classroom-v2.webp",
                    "/art/courses/sports-v1/library-v2.webp",
                  ]
                : []),
              ...(model ? ["/assets/fox-1.glb"] : []),
              ...(guide ? ["/audio/guides/1234567890abcdef12345678.mp3"] : []),
              ...(pictures
                ? [
                    "/audio/words/1234567890abcdef12345678.mp3",
                    "/pictures/words/1234567890abcdef12345678.png",
                    "/art/clay-v1/1234567890abcdef12345678.png",
                  ]
                : []),
            ],
      });
    if (badAsset && url.endsWith(".css"))
      return new Response("broken", { status: 503 });
    if (url.endsWith(".webp")) {
      const bytes = new Uint8Array(200),
        header = new DataView(bytes.buffer);
      header.setUint32(0, invalidWebp ? 0 : 0x46464952, true);
      header.setUint32(4, bytes.length - 8, true);
      header.setUint32(8, 0x50424557, true);
      return new Response(bytes, { headers: { "Content-Type": "image/webp" } });
    }
    if (url.endsWith(".png")) {
      const bytes = new Uint8Array(200);
      bytes.set(
        invalidPicture
          ? [0, 0, 0, 0, 0, 0, 0, 0]
          : [137, 80, 78, 71, 13, 10, 26, 10],
      );
      return new Response(bytes, { headers: { "Content-Type": "image/png" } });
    }
    if (url.endsWith(".mp3"))
      return new Response(new Uint8Array(200), {
        headers: { "Content-Type": "audio/mpeg" },
      });
    if (url.endsWith(".glb")) {
      const data = new Uint8Array(20),
        view = new DataView(data.buffer);
      view.setUint32(0, invalidModel ? 0 : 0x46546c67, true);
      view.setUint32(4, 2, true);
      view.setUint32(8, data.length, true);
      return new Response(data, {
        headers: { "Content-Type": "model/gltf-binary" },
      });
    }
    return new Response(
      url.endsWith(".js")
        ? "console.log(1)"
        : url.endsWith(".css")
          ? "body{}"
          : "<html>offline shell</html>",
      {
        headers: {
          "Content-Type": url.endsWith(".js")
            ? "application/javascript"
            : url.endsWith(".css")
              ? "text/css"
              : "text/html",
        },
      },
    );
  };
  runInNewContext(source, {
    self: {
      location: { origin: "https://study.example" },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (name: string, callback: any) =>
        handlers.set(name, callback),
    },
    caches,
    fetch,
    URL,
    Response,
    Promise,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  async function prepare(origin = "https://study.example") {
    let work: Promise<unknown> | undefined, message: any;
    handlers.get("message")!({
      data: { type: "PREPARE_OFFLINE" },
      source: { url: `${origin}/#offline` },
      ports: [{ postMessage: (value: any) => (message = value) }],
      waitUntil: (promise: Promise<unknown>) => (work = promise),
    });
    await work;
    return message;
  }
  async function request(path: string, mode = "same-origin", method = "GET") {
    let response: Promise<Response> | undefined;
    handlers.get("fetch")!({
      request: { url: `https://study.example${path}`, mode, method },
      respondWith: (value: Promise<Response>) => (response = value),
    });
    return response ? await response : undefined;
  }
  return {
    stores,
    requests,
    prepare,
    request,
    offline: () => (offline = true),
    bad: () => (badAsset = true),
    malicious: () => (malicious = true),
  };
}
describe("offline public shell policy", () => {
  it("keeps registered teaching art available offline and rejects a false WebP container", async () => {
    const good = runtime(false, false, false, false, false, true);
    expect((await good.prepare()).prepared).toBe(true);
    good.offline();
    expect(
      (
        await good.request("/art/concepts/sports-v1/telescope.webp")
      )?.headers.get("Content-Type"),
    ).toBe("image/webp");
    expect(
      await good.request("/art/concepts/sports-v1/unregistered.webp"),
    ).toBeUndefined();
    for (const file of ["students-v2", "bag", "classroom-v2", "library-v2"]) {
      expect(
        (
          await good.request(`/art/courses/sports-v1/${file}.webp`)
        )?.headers.get("content-type"),
      ).toBe("image/webp");
    }
    expect(
      await good.request("/art/courses/sports-v1/unregistered.webp"),
    ).toBeUndefined();
    for (const file of ["apple-whole", "apple-progress", "apple-finished"])
      expect(
        (
          await good.request(`/art/concepts/sports-v1/${file}.webp`)
        )?.headers.get("content-type"),
      ).toBe("image/webp");
    const bad = runtime(false, false, false, false, false, true, true);
    expect((await bad.prepare()).prepared).toBe(false);
  });
  it("caches only bounded hashed picture/audio assets and rejects a false PNG header", async () => {
    const good = runtime(false, false, false, true);
    expect((await good.prepare()).prepared).toBe(true);
    good.offline();
    expect(
      (
        await good.request("/pictures/words/1234567890abcdef12345678.png")
      )?.headers.get("content-type"),
    ).toBe("image/png");
    expect(
      (
        await good.request("/art/clay-v1/1234567890abcdef12345678.png")
      )?.headers.get("content-type"),
    ).toBe("image/png");
    expect(
      (
        await good.request("/audio/words/1234567890abcdef12345678.mp3")
      )?.headers.get("content-type"),
    ).toBe("audio/mpeg");
    expect(await good.request("/api/v1/me")).toBeUndefined();
    const bad = runtime(false, false, false, true, true);
    expect((await bad.prepare()).prepared).toBe(false);
  });
  it("keeps hashed public navigation audio offline without caching identity APIs", async () => {
    const r = runtime(false, false, true);
    expect((await r.prepare()).prepared).toBe(true);
    r.offline();
    const audio = await r.request("/audio/guides/1234567890abcdef12345678.mp3");
    expect(audio?.headers.get("content-type")).toBe("audio/mpeg");
    expect((await audio!.arrayBuffer()).byteLength).toBe(200);
    expect(await r.request("/api/v1/me")).toBeUndefined();
    expect(await r.request("/audio/guides/private-name.mp3")).toBeUndefined();
  });
  it("prepares a bounded public GLB and serves it offline without credentials", async () => {
    const r = runtime(true);
    expect((await r.prepare()).prepared).toBe(true);
    r.offline();
    expect(
      (await (await r.request("/assets/fox-1.glb"))!.arrayBuffer()).byteLength,
    ).toBe(20);
    expect(r.requests.every((q) => q.options.credentials === "omit")).toBe(
      true,
    );
  });
  it("rejects a mislabeled model instead of marking an incomplete shell ready", async () => {
    const r = runtime(true, true);
    expect((await r.prepare()).prepared).toBe(false);
    expect([...r.stores.values()][0].has("/offline-ready")).toBe(false);
  });
  it("caches only an explicit public shell with credentials omitted", async () => {
    const r = runtime();
    expect((await r.prepare()).prepared).toBe(true);
    const cache = [...r.stores.values()][0];
    expect([...cache.keys()]).toEqual([
      "/index.html",
      "/assets/main-1.js",
      "/assets/main-1.css",
      "/offline-ready",
    ]);
    expect(r.requests.every((q) => q.options.credentials === "omit")).toBe(
      true,
    );
    expect(r.requests.every((q) => !q.url.startsWith("/api"))).toBe(true);
  });
  it("serves a cached document and hashed modules after the network goes away", async () => {
    const r = runtime();
    await r.prepare();
    r.offline();
    expect(await (await r.request("/", "navigate"))!.text()).toContain(
      "offline shell",
    );
    expect(await (await r.request("/assets/main-1.js"))!.text()).toContain(
      "console.log",
    );
  });
  it("never intercepts private APIs or mutation requests", async () => {
    const r = runtime();
    await r.prepare();
    r.offline();
    expect(await r.request("/api/v1/me")).toBeUndefined();
    expect(
      await r.request("/api/v1/attempts", "same-origin", "POST"),
    ).toBeUndefined();
    expect(await r.request("/family/export", "navigate")).toBeUndefined();
  });
  it("does not advertise an incomplete shell or remove the previous ready shell", async () => {
    const r = runtime();
    r.stores.set(
      "eq-shell-v1-old",
      new Map([
        ["/offline-ready", new Response("1")],
        ["/index.html", new Response("old working shell")],
      ]),
    );
    r.bad();
    expect((await r.prepare()).prepared).toBe(false);
    expect(
      r.stores.get("eq-shell-v1-1234567890abcdef")!.has("/offline-ready"),
    ).toBe(false);
    r.offline();
    expect(await (await r.request("/", "navigate"))!.text()).toBe(
      "old working shell",
    );
  });
  it("rejects a manifest attempting to add private identity responses", async () => {
    const r = runtime();
    r.malicious();
    expect((await r.prepare()).prepared).toBe(false);
    expect(r.stores.size).toBe(0);
    expect(r.requests).toHaveLength(1);
  });
  it("rejects preparation messages from another origin", async () => {
    const r = runtime();
    expect((await r.prepare("https://foreign.example")).prepared).toBe(false);
    expect(r.requests).toHaveLength(0);
  });
  it("falls back to a clear offline message when nothing has been prepared", async () => {
    const r = runtime();
    r.offline();
    const response = await r.request("/", "navigate");
    expect(response!.status).toBe(503);
    expect(await response!.text()).toContain("先联网准备");
  });
});
