import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const reuse = process.argv.includes("--existing");
let output = "";
const owned = reuse
  ? null
  : spawn(process.execPath, ["scripts/dev.mjs"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
if (owned)
  for (const stream of [owned.stdout, owned.stderr])
    stream.on("data", (chunk) => {
      output = (output + chunk.toString()).slice(-16000);
    });
const run = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`scripts/${script}`], {
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${script} failed (${code})`)),
    );
  });
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (owned && owned.exitCode !== null)
      throw new Error("Development runtime exited before becoming ready.");
    try {
      const results = await Promise.all(
        ["http://127.0.0.1:5173/", "http://127.0.0.1:8788/api/v1/health"].map(
          (url) => fetch(url, { signal: AbortSignal.timeout(1000) }),
        ),
      );
      if (results.every((r) => r.ok)) {
        ready = true;
        break;
      }
    } catch {
      /* wait for local build and workerd */
    }
    await delay(500);
  }
  if (!ready) throw new Error("Local runtime readiness timed out.");
  await run("smoke-local.mjs");
  await run("smoke-account.mjs");
  await run("smoke-managed-accounts.mjs");
  await run("smoke-households.mjs");
  await run("smoke-session-ownership.mjs");
  await run("smoke-companions.mjs");
  await run("smoke-writing.mjs");
  await run("smoke-data-export.mjs");
  await run("smoke-course.mjs");
  await run("smoke-course-expansion.mjs");
  await run("smoke-topics.mjs");
  await run("smoke-training.mjs");
  await run("smoke-patterns.mjs");
  await run("smoke-vocabulary.mjs");
  await run("smoke-word-study.mjs");
  await run("smoke-phonics.mjs");
  await run("smoke-workshops.mjs");
  await run("smoke-listening-reading.mjs");
  await run("smoke-action-courses.mjs");
  await run("smoke-discovery-courses.mjs");
  await run("smoke-journey-courses.mjs");
  await run("smoke-next-term-courses.mjs");
  await run("smoke-explorer-term-courses.mjs");
  await run("smoke-neighbourhood-term-courses.mjs");
  await run("smoke-cooperation-term-courses.mjs");
  await run("smoke-practical-term-courses.mjs");
  await run("smoke-portfolio-term-courses.mjs");
  await run("smoke-concepts.mjs");
  await run("smoke-reports.mjs");
  await run("smoke-offline.mjs");
  await run("smoke-ai.mjs");
  await run("smoke-voice.mjs");
  await run("smoke-writing-ai.mjs");
  await run("smoke-mistakes.mjs");
  await run("smoke-reserved-training.mjs");
  await run("smoke-picture-words.mjs");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (owned && owned.exitCode === null) {
    owned.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => owned.once("exit", resolve)),
      delay(5000),
    ]);
    if (owned.exitCode === null) owned.kill("SIGKILL");
  }
}
