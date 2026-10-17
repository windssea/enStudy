import { readFile, writeFile } from "node:fs/promises";
// Leave identical generated files untouched, avoiding unnecessary live-server
// reloads and Windows file-handle contention during repeated local builds.
export async function writeContent(path, text) {
  const current = await readFile(path, "utf8").catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
  if (current !== text) await writeFile(path, text);
}
