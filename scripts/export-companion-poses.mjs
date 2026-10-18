import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Box3, Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
const path = resolve("artifacts/companion-pose-tools.mjs");
await build({
  stdin: {
    contents:
      'export {prepareClayPartner} from "./src/scene/loadClayFox.ts"; export {applyCompanionPose} from "./src/scene/companionPose.ts";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: path,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  logLevel: "silent",
});
const { prepareClayPartner, applyCompanionPose } = await import(
  pathToFileURL(path).href
);
const bytes = await readFile("src/assets/models/clay-pikachu-v1.glb"),
  array = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
const source = await new GLTFLoader().parseAsync(array, "");
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};
for (const paused of [false, true]) {
  const model = prepareClayPartner(source.scene, "pikachu");
  try {
    applyCompanionPose(model, "pikachu", {
      time: 2,
      age: 0.45,
      paused,
      idle: true,
      reaction: "correct",
    });
    model.root.traverse((node) => {
      if (node instanceof Mesh) {
        const mats = Array.isArray(node.material)
          ? node.material
          : [node.material];
        for (const mat of mats) mat.bumpMap = null;
      }
    });
    model.root.updateMatrixWorld(true);
    const result = await new GLTFExporter().parseAsync(model.root, {
      binary: true,
      trs: true,
    });
    const name = paused ? "quiet" : "wave";
    await writeFile(
      `artifacts/loaded-pikachu-${name}.glb`,
      Buffer.from(result),
    );
    const box = new Box3().setFromObject(model.root);
    console.log(
      JSON.stringify({ name, min: box.min.toArray(), max: box.max.toArray() }),
    );
  } finally {
    model.dispose();
  }
}
