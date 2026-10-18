import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { prepareClayPartner } from "../src/scene/loadClayFox";
import { applyCompanionPose } from "../src/scene/companionPose";
import {
  companionGestures,
  gestureEnvelope,
} from "../src/scene/companionGestures";
import { createPikachuModel } from "../src/scene/pikachuModel";
import CompanionActions from "../src/CompanionActions";
import CompanionSticker from "../src/CompanionSticker";

async function load(file: string) {
  const bytes = readFileSync(
    new URL(`../src/assets/models/${file}.glb`, import.meta.url),
  );
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
}

describe("clay partner expressive play", () => {
  it("removes the full-strength white sheen from runtime clay without altering the cached source", async () => {
    for (const kind of ["fox", "pikachu"] as const) {
      const source = await load(
        kind === "fox" ? "clay-fox-v1" : "clay-pikachu-v2",
      );
      const name = kind === "fox" ? "round-fox-head" : "pikachu-round-head";
      const original = (source.scene.getObjectByName(name) as Mesh)
        .material as MeshPhysicalMaterial;
      const before = original.sheen;
      const model = prepareClayPartner(source.scene, kind);
      try {
        const material = (model.root.getObjectByName(name) as Mesh)
          .material as MeshPhysicalMaterial;
        expect(material.sheen).toBeLessThanOrEqual(0.08);
        expect(material.roughness).toBeGreaterThanOrEqual(0.85);
        expect(material.specularIntensity).toBeLessThanOrEqual(0.35);
        expect(original.sheen).toBe(before);
        expect(material).not.toBe(original);
      } finally {
        model.dispose();
      }
    }
  });
  it("binds the shipped adventure model to thirty closed solids and thirteen conformed details", async () => {
    const bytes = readFileSync(
      new URL("../src/assets/models/clay-pikachu-v2.glb", import.meta.url),
    );
    const qa = JSON.parse(
      readFileSync(
        new URL("../design-assets/clay-pikachu-v2.qa.json", import.meta.url),
        "utf8",
      ),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      qa.glb_sha256,
    );
    expect(bytes.length).toBeLessThan(1_700_000);
    expect(qa.objects).toHaveLength(30);
    expect(qa.surface_attachments).toHaveLength(13);
    for (const row of qa.objects) {
      expect(
        row.boundary_edges +
          row.non_manifold_edges +
          row.degenerate_faces +
          row.invalid_coordinates,
        row.name,
      ).toBe(0);
      expect(row.volume).toBeGreaterThan(0);
    }
    expect(
      qa.surface_attachments.every(
        (row: { misses: number }) => row.misses === 0,
      ),
    ).toBe(true);
    const source = await load("clay-pikachu-v2");
    let meshes = 0,
      triangles = 0;
    source.scene.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      meshes++;
      triangles +=
        (node.geometry.index?.count ??
          node.geometry.getAttribute("position").count) / 3;
      expect(node.geometry.getAttribute("color")).toBeDefined();
      expect(
        Array.from(node.geometry.getAttribute("position").array).every(
          Number.isFinite,
        ),
      ).toBe(true);
    });
    expect(meshes).toBe(qa.meshes);
    expect(triangles).toBe(qa.triangles);
    const bib = source.scene.getObjectByName("pikachu-scarf-bib") as Mesh;
    expect(
      (bib.material as MeshStandardMaterial).roughness,
    ).toBeGreaterThanOrEqual(0.85);
    expect(source.scene.getObjectByName("pikachu-scarf-button")).toBeDefined();
  });
  it("keeps each real GLB inside a bounded footprint with feet above the stage across every action", async () => {
    for (const kind of ["fox", "pikachu"] as const) {
      const source = await load(
        kind === "fox" ? "clay-fox-v1" : "clay-pikachu-v2",
      );
      const model = prepareClayPartner(source.scene, kind);
      try {
        for (const action of companionGestures)
          for (let age = 0; age <= 2.1; age += 0.05) {
            applyCompanionPose(model, kind, {
              time: 2,
              age,
              idle: false,
              paused: false,
              reaction: "thinking",
              gesture: action.id,
            });
            const box = new Box3().setFromObject(model.root),
              size = box.getSize(new Vector3());
            expect(
              box.min.y,
              `${kind}/${action.id}/${age}`,
            ).toBeGreaterThanOrEqual(-0.00001);
            expect(size.y).toBeLessThan(2.75);
            expect(size.x).toBeLessThan(2.8);
          }
      } finally {
        model.dispose();
      }
    }
  });
  it("resets an interrupted stretch before a nod, tail play and ordinary learning feedback without changing another clone", async () => {
    const source = await load("clay-pikachu-v2"),
      a = prepareClayPartner(source.scene, "pikachu"),
      b = prepareClayPartner(source.scene, "pikachu");
    const base = { time: 2, idle: false, paused: false, reaction: "thinking" };
    try {
      applyCompanionPose(a, "pikachu", {
        ...base,
        age: 0.85,
        gesture: "stretch",
      });
      expect(a.body.scale.y).toBeGreaterThan(1);
      expect(a.eyes.scale.y).toBe(1);
      expect(b.body.scale.y).toBe(1);
      applyCompanionPose(a, "pikachu", {
        ...base,
        age: 0.8125,
        gesture: "nod",
      });
      expect(a.body.scale.y).toBe(1);
      expect(a.head.rotation.x).toBeGreaterThan(0.1);
      expect(a.arm.rotation.z).toBe(0.35);
      applyCompanionPose(a, "pikachu", {
        ...base,
        age: 0.5625,
        gesture: "tail",
      });
      expect(a.head.rotation.x).toBe(0);
      expect(Math.abs(a.tail.rotation.y)).toBeGreaterThan(0.2);
      applyCompanionPose(a, "pikachu", { ...base, age: 10 });
      expect(a.tail.rotation.y).toBe(0);
      expect(a.body.scale.toArray()).toEqual([1, 1, 1]);
      expect(a.head.rotation.x).toBe(0);
      expect(b.tail.rotation.y).toBe(0);
      expect(b.arm.rotation.z).toBeCloseTo(0.35, 6);
    } finally {
      a.dispose();
      b.dispose();
    }
  });
  it("gives quiet mode a time-independent static illustration and leaves the model neutral when an active one-shot ends", async () => {
    const source = await load("clay-pikachu-v2"),
      model = prepareClayPartner(source.scene, "pikachu");
    try {
      for (const gesture of ["nod", "stretch", "tail"] as const) {
        applyCompanionPose(model, "pikachu", {
          time: 1,
          age: 0.4,
          idle: false,
          paused: true,
          reaction: "thinking",
          gesture,
        });
        const snapshot = JSON.stringify(model.root.toJSON());
        applyCompanionPose(model, "pikachu", {
          time: 90,
          age: 80,
          idle: false,
          paused: true,
          reaction: "thinking",
          gesture,
        });
        expect(JSON.stringify(model.root.toJSON())).toBe(snapshot);
        applyCompanionPose(model, "pikachu", {
          time: 90,
          age: 80,
          idle: false,
          paused: false,
          reaction: "thinking",
          gesture,
        });
        expect(model.body.scale.toArray()).toEqual([1, 1, 1]);
        expect(model.head.rotation.x).toBeCloseTo(0, 12);
        expect(model.tail.rotation.y).toBeCloseTo(0, 12);
      }
    } finally {
      model.dispose();
    }
    for (const age of [-2, 0, 2, Infinity, NaN])
      expect(gestureEnvelope(age, 1.7)).toBe(0);
    expect(gestureEnvelope(0.85, 1.7)).toBe(1);
  });
  it("matches the procedural loading silhouette and gives static fallback the same scarf", () => {
    const model = createPikachuModel({ adventure: true });
    try {
      expect(model.root.getObjectByName("pikachu-scarf-bib")).toBeDefined();
      const box = new Box3().setFromObject(model.root);
      expect(box.getSize(new Vector3()).y).toBeLessThan(2.7);
      expect(box.min.y).toBeGreaterThanOrEqual(-0.00001);
    } finally {
      model.dispose();
    }
    const html = renderToStaticMarkup(
      <svg>
        <CompanionSticker kind="pikachu" gesture="stretch" />
      </svg>,
    );
    expect(html).toContain("#4ba99a");
    expect(html).toContain('data-gesture="stretch"');
    expect(html).not.toContain("<canvas");
  });
  it("offers named native play buttons separate from greeting and turning, without a score or assessment response", () => {
    const html = renderToStaticMarkup(<CompanionActions onPlay={() => {}} />);
    expect(html.match(/<button/g)).toHaveLength(4);
    for (const label of ["眨眨眼", "点点头", "伸个懒腰", "摇摇尾巴"])
      expect(html).toContain(label);
    expect(html).toContain('aria-label="伙伴小动作"');
    expect(html).not.toContain("得分");
    expect(html).not.toContain("aria-pressed");
  });
});
