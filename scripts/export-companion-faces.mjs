import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { Mesh, MeshPhysicalMaterial } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
const modulePath = resolve("artifacts/companion-faces-tools.mjs");
await build({
  stdin: {
    contents:
      'export {prepareClayPartner} from "./src/scene/loadClayFox.ts"; export {applyCompanionPose} from "./src/scene/companionPose.ts";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: modulePath,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  logLevel: "silent",
});
const { prepareClayPartner, applyCompanionPose } = await import(
  pathToFileURL(modulePath).href
);
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};
const sources = [
  "src/scene/closedEyes.ts",
  "src/scene/foxModel.ts",
  "src/scene/pikachuModel.ts",
  "src/scene/loadClayFox.ts",
  "src/scene/companionPose.ts",
  "src/assets/models/clay-fox-v1.glb",
  "src/assets/models/clay-pikachu-v2.glb",
];
const hashes = {};
for (const file of sources) {
  const bytes = await readFile(file);
  hashes[file] = createHash("sha256")
    .update(
      file.endsWith(".ts")
        ? bytes.toString("utf8").replaceAll("\r\n", "\n")
        : bytes,
    )
    .digest("hex");
}
const observations = [];
for (const kind of ["fox", "pikachu"]) {
  const bytes = await readFile(
    `src/assets/models/clay-${kind}-${kind === "fox" ? "v1" : "v2"}.glb`,
  );
  const source = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  for (const [label, time, age, paused, idle, gesture] of [
    ["open", 2, 0.55, false, false, "blink"],
    ["closed", 2, 0.2, false, false, "blink"],
    ["quiet", 2, 0.2, true, false, "blink"],
    ["idle", 0.08, 10, false, true, undefined],
  ]) {
    const model = prepareClayPartner(source.scene, kind);
    try {
      applyCompanionPose(model, kind, {
        time,
        age,
        paused,
        idle,
        reaction: "thinking",
        gesture,
      });
      observations.push({
        kind,
        label,
        eyesVisible: model.eyes.visible,
        lidsVisible: model.closedEyes.visible,
        eyeScale: model.eyes.scale.toArray(),
        probes: model.closedEyes.userData.surfaceProbes,
      });
      model.root.traverse((node) => {
        if (node instanceof Mesh)
          for (const material of Array.isArray(node.material)
            ? node.material
            : [node.material]) {
            material.bumpMap = null;
            if (
              material instanceof MeshPhysicalMaterial &&
              material.sheen > 0
            ) {
              material.sheenColor.multiplyScalar(material.sheen);
              material.sheen = 1;
            }
          }
      });
      model.root.updateMatrixWorld(true);
      const glb = await new GLTFExporter().parseAsync(model.root, {
        binary: true,
        trs: true,
      });
      await writeFile(`artifacts/face-${kind}-${label}.glb`, Buffer.from(glb));
    } finally {
      model.dispose();
    }
  }
}
await writeFile(
  "artifacts/companion-faces-export.json",
  JSON.stringify({ hashes, observations }, null, 2) + "\n",
);
console.log(
  "Exported eight open/closed/quiet/idle face poses from real shipped models.",
);
