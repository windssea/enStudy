import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Box3,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  Raycaster,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { prepareClayPartner } from "../src/scene/loadClayFox";
import { applyCompanionPose } from "../src/scene/companionPose";
import { createFoxModel } from "../src/scene/foxModel";
import { createPikachuModel } from "../src/scene/pikachuModel";
import CompanionSticker from "../src/CompanionSticker";
async function load(kind: "fox" | "pikachu") {
  const bytes = readFileSync(
    new URL(
      `../src/assets/models/clay-${kind}-${kind === "fox" ? "v1" : "v2"}.glb`,
      import.meta.url,
    ),
  );
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
}
const base = {
  time: 2,
  age: 10,
  paused: false,
  idle: false,
  reaction: "thinking",
};
describe("surface-conforming closed eyes", () => {
  it("binds the independent Blender inspection to the actual source and the two shipped models", () => {
    const qa = JSON.parse(
      readFileSync(
        new URL(
          "../design-assets/companion-closed-eyes.qa.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(qa.objects).toHaveLength(4);
    expect(qa.observations).toHaveLength(8);
    for (const [file, hash] of Object.entries(qa.hashes)) {
      const bytes = readFileSync(new URL(`../${file}`, import.meta.url));
      expect(
        createHash("sha256")
          .update(
            file.endsWith(".ts")
              ? bytes.toString("utf8").replaceAll("\r\n", "\n")
              : bytes,
          )
          .digest("hex"),
        file,
      ).toBe(hash);
    }
    for (const row of qa.objects) {
      expect(
        row.boundary_edges +
          row.non_manifold_edges +
          row.inconsistent_edges +
          row.degenerate_faces +
          row.invalid_coordinates,
      ).toBe(0);
      expect(row.volume).toBeGreaterThan(0);
      expect(row.triangles).toBe(272);
    }
    for (const row of qa.observations) {
      expect(row.eyeScale).toEqual([1, 1, 1]);
      expect(row.eyesVisible).toBe(row.label === "open");
      expect(row.lidsVisible).toBe(row.label !== "open");
    }
  });
  it("blinks both actual GLBs by swapping visible solids, never by scaling fitted eye beads", async () => {
    for (const kind of ["fox", "pikachu"] as const) {
      const source = await load(kind),
        model = prepareClayPartner(source.scene, kind);
      try {
        for (const time of [0, 0.014, 0.015, 0.08, 0.145, 0.146, 4.68, -4.52]) {
          applyCompanionPose(model, kind, { ...base, time, idle: true });
          const phase = ((time % 4.6) + 4.6) % 4.6;
          const closed = phase >= 0.015 && phase <= 0.145;
          expect(model.eyes.scale.toArray()).toEqual([1, 1, 1]);
          expect(model.eyes.visible).toBe(!closed);
          expect(model.closedEyes.visible).toBe(closed);
        }
      } finally {
        model.dispose();
      }
    }
  });
  it("keeps every new lid vertex outside the actual curved face at a tightly bounded distance", async () => {
    for (const kind of ["fox", "pikachu"] as const) {
      const source = await load(kind),
        model = prepareClayPartner(source.scene, kind);
      try {
        model.root.updateMatrixWorld(true);
        const inverse = new Matrix4().copy(model.head.matrixWorld).invert();
        const direction = new Vector3(0, 0, -1).transformDirection(
          model.head.matrixWorld,
        );
        const ray = new Raycaster();
        expect(model.closedEyes.userData.surfaceProbes).toBe(310);
        for (const side of [-1, 1]) {
          const mesh = model.closedEyes.getObjectByName(
            `companion-closed-eye-${side}`,
          ) as Mesh;
          const face = model.root.getObjectByName(
            kind === "fox" ? `cream-face-${side}` : "pikachu-round-head",
          ) as Mesh;
          const p = mesh.geometry.getAttribute("position");
          expect(mesh.geometry.getAttribute("normal").count).toBe(p.count);
          for (let i = 0; i < p.count; i++) {
            const origin = new Vector3(p.getX(i), p.getY(i), 3).applyMatrix4(
              model.head.matrixWorld,
            );
            ray.set(origin, direction);
            const hit = ray.intersectObject(face, false)[0];
            expect(hit).toBeDefined();
            const depth = new Vector3().copy(hit.point).applyMatrix4(inverse).z;
            const gap = p.getZ(i) - depth;
            expect(gap, `${kind}/${side}/${i}`).toBeGreaterThan(0.00045);
            expect(gap).toBeLessThan(0.01255);
          }
        }
      } finally {
        model.dispose();
      }
    }
  });
  it("makes two watertight consistently wound capped tubes per face, without degenerate triangles", async () => {
    for (const kind of ["fox", "pikachu"] as const) {
      const source = await load(kind),
        model = prepareClayPartner(source.scene, kind);
      try {
        for (const node of model.closedEyes.children) {
          const mesh = node as Mesh,
            p = mesh.geometry.getAttribute("position"),
            index = mesh.geometry.index!;
          const welded = new Map<string, number>(),
            ids: number[] = [];
          for (let i = 0; i < p.count; i++) {
            const key = [p.getX(i), p.getY(i), p.getZ(i)]
              .map((v) => Math.round(v * 1e7))
              .join("/");
            if (!welded.has(key)) welded.set(key, welded.size);
            ids.push(welded.get(key)!);
          }
          const edges = new Map<string, { count: number; balance: number }>();
          let volume = 0;
          for (let i = 0; i < index.count; i += 3) {
            const raw = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
            const [a, b, c] = raw.map((j) =>
              new Vector3().fromBufferAttribute(p, j),
            );
            expect(
              new Vector3()
                .subVectors(b, a)
                .cross(new Vector3().subVectors(c, a))
                .lengthSq(),
            ).toBeGreaterThan(1e-16);
            volume += a.dot(new Vector3().crossVectors(b, c)) / 6;
            for (let e = 0; e < 3; e++) {
              const x = ids[raw[e]],
                y = ids[raw[(e + 1) % 3]],
                key = `${Math.min(x, y)}/${Math.max(x, y)}`;
              const old = edges.get(key) ?? { count: 0, balance: 0 };
              old.count++;
              old.balance += x < y ? 1 : -1;
              edges.set(key, old);
            }
          }
          expect(volume).toBeGreaterThan(0);
          for (const edge of edges.values())
            expect(edge).toEqual({ count: 2, balance: 0 });
        }
      } finally {
        model.dispose();
      }
    }
  });
  it("supports a short explicit blink and stable quiet pose, then restores ordinary play with no stale closed eyes", async () => {
    const source = await load("pikachu"),
      model = prepareClayPartner(source.scene, "pikachu");
    try {
      for (const [age, closed] of [
        [0, false],
        [0.12, true],
        [0.2, true],
        [0.34, true],
        [0.35, false],
        [20, false],
      ] as const) {
        applyCompanionPose(model, "pikachu", {
          ...base,
          age,
          gesture: "blink",
        });
        expect(model.closedEyes.visible).toBe(closed);
        expect(model.eyes.visible).toBe(!closed);
        expect(model.eyes.scale.y).toBe(1);
      }
      for (const time of [0, 1, 20]) {
        applyCompanionPose(model, "pikachu", {
          ...base,
          time,
          paused: true,
          gesture: "blink",
        });
        expect(model.closedEyes.visible).toBe(true);
      }
      applyCompanionPose(model, "pikachu", {
        ...base,
        age: 0.85,
        gesture: "stretch",
      });
      expect(model.closedEyes.visible).toBe(false);
      expect(model.eyes.visible).toBe(true);
      applyCompanionPose(model, "pikachu", {
        ...base,
        time: 0.08,
        paused: true,
        idle: true,
      });
      expect(model.closedEyes.visible).toBe(false);
      expect(model.eyes.scale.y).toBe(1);
    } finally {
      model.dispose();
    }
  });
  it("owns only new lid geometry per instance and never changes or disposes the loader's face", async () => {
    const source = await load("fox");
    const face = source.scene.getObjectByName("cream-face--1") as Mesh;
    const bytes = () =>
      Buffer.from(face.geometry.getAttribute("position").array.buffer);
    const hash = createHash("sha256").update(bytes()).digest("hex");
    let sharedDisposed = 0;
    face.geometry.addEventListener("dispose", () => sharedDisposed++);
    const a = prepareClayPartner(source.scene, "fox"),
      b = prepareClayPartner(source.scene, "fox");
    let disposed = 0;
    const one = a.closedEyes.children[0] as Mesh,
      two = b.closedEyes.children[0] as Mesh;
    expect(one.geometry).not.toBe(two.geometry);
    one.geometry.addEventListener("dispose", () => disposed++);
    a.dispose();
    expect(disposed).toBe(1);
    expect(sharedDisposed).toBe(0);
    expect(createHash("sha256").update(bytes()).digest("hex")).toBe(hash);
    expect(
      source.scene.getObjectByName("companion-closed-eyes"),
    ).toBeUndefined();
    b.dispose();
  });
  it("removes only local baked eye shadows while closed and exactly restores the instance's open colours", async () => {
    for (const kind of ["fox", "pikachu"] as const) {
      const source = await load(kind),
        model = prepareClayPartner(source.scene, kind);
      const name = kind === "fox" ? "cream-face--1" : "pikachu-round-head";
      const cached = (source.scene.getObjectByName(name) as Mesh).geometry;
      const face = model.root.getObjectByName(name) as Mesh;
      expect(face.geometry).not.toBe(cached);
      const colour = face.geometry.getAttribute("color");
      if (!(colour instanceof Float32BufferAttribute))
        throw Error("Expected instance-owned float face colours.");
      const original = Array.from(colour.array),
        cachedOriginal = Array.from(cached.getAttribute("color").array);
      const version = colour.version;
      applyCompanionPose(model, kind, { ...base, age: 0.2, gesture: "blink" });
      model.root.updateMatrixWorld(true);
      const toHead = new Matrix4()
        .copy(model.head.matrixWorld)
        .invert()
        .multiply(face.matrixWorld);
      const positions = face.geometry.getAttribute("position");
      const points = Array.from({ length: positions.count }, (_, i) =>
        new Vector3().fromBufferAttribute(positions, i).applyMatrix4(toHead),
      );
      const box = new Box3().setFromPoints(points),
        middle = (box.min.z + box.max.z) / 2;
      for (const [i, p] of points.entries())
        if (p.z < middle) {
          for (let channel = 0; channel < 3; channel++)
            expect(colour.array[i * colour.itemSize + channel]).toBe(
              original[i * colour.itemSize + channel],
            );
        }
      expect(Array.from(colour.array)).not.toEqual(original);
      expect(Array.from(cached.getAttribute("color").array)).toEqual(
        cachedOriginal,
      );
      expect(colour.version).toBe(version + 1);
      applyCompanionPose(model, kind, { ...base, age: 0.25, gesture: "blink" });
      expect(colour.version).toBe(version + 1);
      applyCompanionPose(model, kind, { ...base, age: 0.6, gesture: "blink" });
      expect(Array.from(colour.array)).toEqual(original);
      expect(colour.version).toBe(version + 2);
      let disposed = 0;
      face.geometry.addEventListener("dispose", () => disposed++);
      model.dispose();
      expect(disposed).toBe(1);
    }
  });
  it("also supplies proper closed eyes in procedural loading models and static 2D alternatives", () => {
    const models = [createFoxModel(), createPikachuModel({ adventure: true })];
    try {
      for (const [i, model] of models.entries()) {
        applyCompanionPose(model, i === 0 ? "fox" : "pikachu", {
          ...base,
          age: 0.2,
          gesture: "blink",
        });
        expect(model.closedEyes?.visible).toBe(true);
        expect(model.eyes.visible).toBe(false);
        expect(model.eyes.scale.y).toBe(1);
      }
    } finally {
      models.forEach((model) => model.dispose());
    }
    for (const kind of ["fox", "pikachu"] as const) {
      const open = renderToStaticMarkup(
        <svg>
          <CompanionSticker kind={kind} />
        </svg>,
      );
      const closed = renderToStaticMarkup(
        <svg>
          <CompanionSticker kind={kind} gesture="blink" />
        </svg>,
      );
      expect(open).toContain('ry="9"');
      expect(closed).not.toContain('ry="9"');
      expect(closed).not.toContain("<canvas");
    }
  });
});
