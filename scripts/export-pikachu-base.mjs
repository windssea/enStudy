import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
await mkdir("artifacts", { recursive: true });
const path = resolve("artifacts/pikachu-model.mjs");
await build({
  entryPoints: ["src/scene/pikachuModel.ts"],
  outfile: path,
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  logLevel: "silent",
});
const { createPikachuModel } = await import(pathToFileURL(path).href);
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};
const model = createPikachuModel({ authoring: true });
try {
  model.root.updateMatrixWorld(true);
  const bytes = await new GLTFExporter().parseAsync(model.root, {
    binary: true,
    trs: true,
  });
  await writeFile("artifacts/pikachu-base.glb", Buffer.from(bytes));
} finally {
  model.dispose();
}
console.log(
  "Exported hand-modelled Pikachu base for local Blender refinement.",
);
