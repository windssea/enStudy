import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
export const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
export function run(args, { capture = false, ...options } = {}) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "true" },
    ...options,
  });
  if (result.status !== 0)
    throw new Error(
      `Wrangler ${args.slice(0, 3).join(" ")} failed (${result.status}). ${capture ? (result.stderr ?? "").slice(0, 2000) : ""}`,
    );
  return result.stdout ?? "";
}
