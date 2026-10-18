// Wrangler can close an idle HTTP connection while fixture SQL runs in the CLI.
// Retry one read only; never replay writes or hide HTTP/application failures.
export async function fetchLocalRead(url, init = {}, send = fetch) {
  try {
    return await send(url, init);
  } catch (error) {
    const target = new URL(url);
    if (
      (init.method ?? "GET").toUpperCase() !== "GET" ||
      target.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
      error?.cause?.code !== "UND_ERR_SOCKET"
    )
      throw error;
    const headers = new Headers(init.headers);
    headers.set("Connection", "close");
    return await send(url, { ...init, headers });
  }
}
