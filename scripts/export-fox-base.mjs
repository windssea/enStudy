import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const root = fileURLToPath(new URL("../", import.meta.url)),
  directory = resolve(root, "artifacts");
await mkdir(directory, { recursive: true });
const modulePath = resolve(directory, "fox-model.mjs");
await build({
  entryPoints: [resolve(root, "src/scene/foxModel.ts")],
  outfile: modulePath,
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  logLevel: "silent",
});
const { createFoxModel } = await import(pathToFileURL(modulePath).href);
// Binary-only, texture-free export: Node's Blob is available; FileReader is not.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};
const model = createFoxModel();
try {
  model.root.updateMatrixWorld(true);
  const result = await new GLTFExporter().parseAsync(model.root, {
    binary: true,
    trs: true,
  });
  await writeFile(resolve(directory, "fox-base.glb"), Buffer.from(result));
} finally {
  model.dispose();
}
console.log(
  "Exported original source geometry to artifacts/fox-base.glb for Blender.",
);
