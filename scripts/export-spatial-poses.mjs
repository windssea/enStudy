import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
await mkdir("artifacts", { recursive: true });
for (const [entry, name] of [
  ["src/scene/spatialModel.ts", "spatial-model"],
  ["packages/domain/spatial.ts", "spatial-domain"],
])
  await build({
    entryPoints: [entry],
    outfile: resolve(`artifacts/${name}.mjs`),
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "silent",
  });
const { createSpatialModel } = await import(
  pathToFileURL(resolve("artifacts/spatial-model.mjs")).href
);
const { spatialTarget } = await import(
  pathToFileURL(resolve("artifacts/spatial-domain.mjs")).href
);
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};
for (const pose of ["home", "in", "on", "under"]) {
  const model = createSpatialModel({ textured: false });
  if (pose !== "home") model.ball.position.set(...spatialTarget(pose));
  model.root.updateMatrixWorld(true);
  const bytes = await new GLTFExporter().parseAsync(model.root, {
    binary: true,
    trs: true,
  });
  await writeFile(`artifacts/spatial-${pose}.glb`, Buffer.from(bytes));
  model.dispose();
}
console.log(
  "Exported all four spatial placements from the same runtime model and position functions.",
);
