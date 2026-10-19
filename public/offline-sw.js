const prefix = "eq-shell-v1-";
let preparing = Promise.resolve();
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
function allowed(path) {
  return (
    path === "/index.html" ||
    /^\/assets\/[a-zA-Z0-9_.-]+\.(js|css|glb)$/.test(path) ||
    /^\/audio\/guides\/[a-f0-9]{24}\.mp3$/.test(path)
  );
}
self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE" || !event.ports[0]) return;
  const work = preparing.then(async () => {
    try {
      if (
        !event.source?.url ||
        new URL(event.source.url).origin !== self.location.origin
      )
        throw Error();
      const response = await fetch("/offline-shell.json", {
        cache: "no-store",
        credentials: "omit",
      });
      if (!response.ok) throw Error();
      const manifest = await response.json();
      if (
        manifest.schema !== 1 ||
        !/^eq-shell-v1-[a-f0-9]{16}$/.test(manifest.cacheKey) ||
        !Array.isArray(manifest.assets) ||
        manifest.assets.length > 100 ||
        !manifest.assets.includes("/index.html") ||
        !manifest.assets.every(allowed)
      )
        throw Error();
      const cache = await caches.open(manifest.cacheKey);
      let bytes = 0;
      for (const path of manifest.assets) {
        const r = await fetch(path, {
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
        });
        if (!r.ok) throw Error();
        const mime = r.headers.get("Content-Type") ?? "";
        if (
          path.endsWith(".js")
            ? !/(java|ecma)script/.test(mime)
            : path.endsWith(".css")
              ? !mime.includes("text/css")
              : path.endsWith(".glb")
                ? !/(model\/gltf-binary|application\/octet-stream)/.test(mime)
                : path.endsWith(".mp3")
                  ? !/audio\/(mpeg|mp3)/.test(mime)
                  : !mime.includes("text/html")
        )
          throw Error();
        const blob = await r.clone().blob();
        if (path.endsWith(".mp3") && (blob.size < 100 || blob.size > 200000))
          throw Error();
        if (path.endsWith(".glb")) {
          if (blob.size < 20 || blob.size > 1_700_000) throw Error();
          const header = new DataView(await blob.slice(0, 12).arrayBuffer());
          if (
            header.getUint32(0, true) !== 0x46546c67 ||
            header.getUint32(4, true) !== 2 ||
            header.getUint32(8, true) !== blob.size
          )
            throw Error();
        }
        bytes += blob.size;
        if (bytes > 8 * 1024 * 1024) throw Error();
        await cache.put(path, r);
      }
      await cache.put("/offline-ready", new Response("1"));
      for (const name of await caches.keys())
        if (name.startsWith(prefix) && name !== manifest.cacheKey)
          await caches.delete(name);
      event.ports[0].postMessage({
        prepared: true,
        count: manifest.assets.length,
      });
    } catch {
      event.ports[0].postMessage({ prepared: false });
    }
  });
  preparing = work.catch(() => {});
  event.waitUntil(work);
});
async function cached(path) {
  for (const name of (await caches.keys())
    .filter((name) => name.startsWith(prefix))
    .reverse()) {
    const cache = await caches.open(name);
    if (await cache.match("/offline-ready")) {
      const hit = await cache.match(path);
      if (hit) return hit;
    }
  }
}
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (
    event.request.mode === "navigate" &&
    (url.pathname === "/" || url.pathname === "/index.html")
  ) {
    event.respondWith(
      (async () => {
        const abort = new AbortController(),
          timer = setTimeout(() => abort.abort(), 3000);
        try {
          const response = await fetch(event.request, { signal: abort.signal });
          if (!response.ok) throw Error();
          return response;
        } catch {
          return (
            (await cached("/index.html")) ??
            new Response("请先联网准备离线练习。", {
              status: 503,
              headers: { "Content-Type": "text/plain;charset=utf-8" },
            })
          );
        } finally {
          clearTimeout(timer);
        }
      })(),
    );
    return;
  }
  if (allowed(url.pathname) && url.pathname !== "/index.html")
    event.respondWith(
      (async () => (await cached(url.pathname)) ?? fetch(event.request))(),
    );
});
