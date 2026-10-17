import { randomBytes } from "node:crypto";
import { readFile, appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export async function prepareLocalAi() {
  const path = new URL("../.dev.vars", import.meta.url);
  const source = await readFile(path, "utf8");
  const ring = /^\s*AI_KEYRING\s*=/m.test(source);
  const active = /^\s*AI_ACTIVE_KEY_ID\s*=/m.test(source);
  if (ring !== active)
    throw new Error(
      "Local AI key configuration is incomplete. Restore both existing entries; no key was overwritten.",
    );
  if (ring) {
    console.log(
      "Local AI encryption configuration already exists; preserved without displaying keys.",
    );
    return;
  }
  const value = JSON.stringify({
    "local-v1": randomBytes(32).toString("base64"),
  });
  await appendFile(
    path,
    `\n# Local AI encryption key. Back up privately; never commit or rotate by deleting.\nAI_KEYRING='${value}'\nAI_ACTIVE_KEY_ID=local-v1\n`,
    { mode: 0o600 },
  );
  console.log(
    "Created local AI encryption configuration in ignored .dev.vars. No provider key was added or displayed.",
  );
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  await prepareLocalAi();
