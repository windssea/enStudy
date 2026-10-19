import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// Pages can acknowledge a deployment before every edge serves a new hashed
// module. Retry only an immutable GET; callers still assert the final bytes.
export async function releasedAsset(
  read,
  expected,
  { attempts = 6, pauseMs = 2500 } = {},
) {
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const expectedHash = hash(expected);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await read();
    const actual = new Uint8Array(await response.clone().arrayBuffer());
    const matches =
      response.status === 200 &&
      /javascript/i.test(response.headers.get("content-type") ?? "") &&
      hash(actual) === expectedHash;
    if (matches || attempt === attempts - 1) return response;
    await delay(pauseMs);
  }
  throw Error("No released asset attempts requested.");
}

export async function releasedJson(
  read,
  expected,
  { attempts = 12, pauseMs = 2500 } = {},
) {
  const expectedJson = JSON.stringify(expected);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await read();
    if (
      response.status === 200 &&
      /application\/json/i.test(response.headers.get("content-type") ?? "")
    ) {
      try {
        if (JSON.stringify(await response.clone().json()) === expectedJson)
          return response;
      } catch {
        /* A transient HTML fallback can carry the old JSON MIME. */
      }
    }
    if (attempt < attempts - 1) await delay(pauseMs);
  }
  throw Error(
    "Static JSON did not match the expected release after bounded GET checks.",
  );
}
