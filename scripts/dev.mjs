import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { wrangler } from "./runtime.mjs";
if (!existsSync(".dev.vars")) {
  console.error("Run npm run setup:local first.");
  process.exit(1);
}
const vite = resolve("node_modules/vite/bin/vite.js");
if (!existsSync("dist/index.html")) {
  const content = spawnSync(process.execPath, ["scripts/build-content.mjs"], {
    stdio: "inherit",
  });
  if (content.status) process.exit(content.status);
  const build = spawnSync(process.execPath, [vite, "build"], {
    stdio: "inherit",
  });
  if (build.status) process.exit(build.status);
}
const children = [
  spawn(
    process.execPath,
    [wrangler, "pages", "dev", "dist", "--ip", "127.0.0.1", "--port", "8788"],
    {
      stdio: "inherit",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  ),
  spawn(
    process.execPath,
    [vite, "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    { stdio: "inherit" },
  ),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code ?? 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
