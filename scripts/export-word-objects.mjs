import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Group, Mesh } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
await mkdir("artifacts", { recursive: true });
const path = resolve("artifacts/word-object-models.mjs");
await build({
  entryPoints: ["src/scene/wordObjectModel.ts"],
  outfile: path,
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  logLevel: "silent",
});
const { createWordObject } = await import(pathToFileURL(path).href);
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};
const scene = new Group(),
  models = [];
try {
  for (const [i, kind] of [
    "apple",
    "banana",
    "book",
    "pencil",
    "fish",
    "orange-swatch",
  ].entries()) {
    const model = createWordObject(kind);
    models.push(model);
    model.root.traverse((node) => {
      if (node instanceof Mesh) node.material.bumpMap = null;
    });
    const stage = new Group();
    stage.position.set(((i % 3) - 1) * 1.8, 0, Math.floor(i / 3) * 2.3);
    stage.add(model.root);
    scene.add(stage);
  }
  scene.updateMatrixWorld(true);
  const bytes = await new GLTFExporter().parseAsync(scene, {
    binary: true,
    trs: true,
  });
  await writeFile("artifacts/word-objects-base.glb", Buffer.from(bytes));
} finally {
  models.forEach((model) => model.dispose());
}
console.log(
  "Exported six actual runtime word geometries for Blender topology and render inspection.",
);
