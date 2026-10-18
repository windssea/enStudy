import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Box3, Mesh, MeshPhysicalMaterial } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
const path = resolve("artifacts/companion-gestures-tools.mjs");
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
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};
const report = [];
for (const kind of ["fox", "pikachu"]) {
  const bytes = await readFile(
    `src/assets/models/clay-${kind}-${kind === "fox" ? "v1" : "v2"}.glb`,
  );
  const source = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  for (const [gesture, age, paused] of [
    ["nod", 0.8125, false],
    ["stretch", 0.85, false],
    ["tail", 0.5625, false],
    ["stretch", 0.85, true],
  ]) {
    const model = prepareClayPartner(source.scene, kind),
      name = `${kind}-${gesture}${paused ? "-quiet" : ""}`;
    try {
      applyCompanionPose(model, kind, {
        time: 2,
        age,
        paused,
        idle: false,
        reaction: "thinking",
        gesture,
      });
      model.root.traverse((node) => {
        if (node instanceof Mesh)
          for (const mat of Array.isArray(node.material)
            ? node.material
            : [node.material]) {
            mat.bumpMap = null;
            // GLTFExporter writes sheenColorFactor but omits Three's separate
            // sheen intensity. Bake their product into the glTF colour so this
            // inspection keeps the runtime material instead of a white coat.
            if (mat instanceof MeshPhysicalMaterial && mat.sheen > 0) {
              mat.sheenColor.multiplyScalar(mat.sheen);
              mat.sheen = 1;
            }
          }
      });
      model.root.updateMatrixWorld(true);
      await writeFile(
        `artifacts/gesture-${name}.glb`,
        Buffer.from(
          await new GLTFExporter().parseAsync(model.root, {
            binary: true,
            trs: true,
          }),
        ),
      );
      const box = new Box3().setFromObject(model.root);
      report.push({ name, min: box.min.toArray(), max: box.max.toArray() });
    } finally {
      model.dispose();
    }
  }
}
await writeFile(
  "artifacts/companion-gestures-bounds.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log("Exported eight real runtime poses from checked-in GLBs.");
