import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { run } from "./runtime.mjs";
import { transform } from "esbuild";

export async function buildPagesWorker({ install = false } = {}) {
  const output = ".wrangler/pages-worker-minified";
  await mkdir(output, { recursive: true });
  run(["pages", "functions", "build", "--outdir", output, "--minify"]);
  const worker = resolve(output, "index.js");
  // Wrangler emits ASCII escapes for the large Chinese teaching corpus. Emit
  // equivalent UTF-8 JavaScript instead of paying six bytes per escaped glyph.
  const source = await readFile(worker, "utf8");
  const compiled = await transform(source, {
    loader: "js",
    charset: "utf8",
    minify: true,
    keepNames: true,
    target: "es2022",
    legalComments: "none",
  });
  const bytes = Buffer.from(compiled.code);
  await writeFile(worker, bytes);
  // Leave 1 MiB below Cloudflare's 25 MiB uncompressed deployment ceiling.
  if (!bytes.length || bytes.length > 24 * 1024 * 1024)
    throw new Error(
      `Compiled Pages worker exceeds the 24 MiB release budget (${bytes.length} bytes).`,
    );
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  console.log(`Minified Pages worker: ${bytes.length} bytes; SHA256 ${sha256}`);
  if (install) {
    await copyFile(worker, "dist/_worker.js");
    // Retain the existing explicit API-only routes in advanced mode.
    await copyFile("public/_routes.json", "dist/_routes.json");
  }
  return { bytes: bytes.length, sha256 };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildPagesWorker({ install: process.argv.includes("--install") });
