import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { prepareClayFox } from "../src/scene/loadClayFox";
import { applyFoxPose } from "../src/scene/foxModel";
import { createClayGrain } from "../src/scene/claySurface";

const bytes = readFileSync(
  new URL("../src/assets/models/clay-fox-v1.glb", import.meta.url),
);
const array = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength,
);
describe("Blender-authored clay fox asset", () => {
  it("binds the closed-solid and attached-detail inspection to this exact exported asset", () => {
    const qa = JSON.parse(
      readFileSync(
        new URL("../design-assets/clay-fox-v1.qa.json", import.meta.url),
        "utf8",
      ),
    );
    expect(qa.glb_sha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    expect(qa.objects).toHaveLength(39);
    for (const solid of qa.objects) {
      expect(
        solid.boundary_edges +
          solid.non_manifold_edges +
          solid.degenerate_faces +
          solid.invalid_coordinates,
      ).toBe(0);
      expect(solid.volume).toBeGreaterThan(0);
    }
    expect(qa.surface_attachments.length).toBeGreaterThanOrEqual(9);
    expect(
      qa.surface_attachments.every(
        (entry: { misses: number; vertices: number }) =>
          entry.misses === 0 && entry.vertices > 0,
      ),
    ).toBe(true);
  });
  it("is a self-contained bounded GLB carrying real vertex occlusion and matte PBR surfaces", async () => {
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.length).toBeLessThan(1_700_000);
    const gltf = await new GLTFLoader().parseAsync(array, "");
    let triangles = 0,
      coloured = 0,
      matte = 0;
    gltf.scene.traverse((node) => {
      if (node instanceof Mesh) {
        triangles +=
          (node.geometry.index?.count ??
            node.geometry.attributes.position.count) / 3;
        if (node.geometry.attributes.color) coloured++;
        const materials = Array.isArray(node.material)
          ? node.material
          : [node.material];
        for (const material of materials)
          if (
            material instanceof MeshStandardMaterial &&
            material.roughness >= 0.85
          )
            matte++;
      }
    });
    expect(triangles).toBeGreaterThan(25_000);
    expect(triangles).toBeLessThan(55_000);
    expect(coloured).toBe(39);
    expect(matte).toBeGreaterThan(30);
    const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(1.8);
    expect(size.y).toBeLessThan(2.5);
    expect(size.x).toBeLessThan(2.4);
    for (const item of [
      "fox-pose",
      "fox-head",
      "waving-paw",
      "fox-tail",
      "blinking-eyes",
    ])
      expect(gltf.scene.getObjectByName(item)).toBeDefined();
  });
  it("poses independent clones without changing loader-owned geometry or another scene", async () => {
    const gltf = await new GLTFLoader().parseAsync(array, "");
    const a = prepareClayFox(gltf.scene),
      b = prepareClayFox(gltf.scene);
    try {
      applyFoxPose(a, {
        time: 0.08,
        age: 0.45,
        paused: false,
        idle: true,
        reaction: "correct",
      });
      expect(a.arm.rotation.z).toBeGreaterThan(b.arm.rotation.z);
      expect(a.eyes.scale.y).toBeLessThan(1);
      expect(b.eyes.scale.y).toBe(1);
      let first: Mesh | undefined;
      gltf.scene.traverse((node) => {
        if (!first && node instanceof Mesh) first = node;
      });
      const clone = a.root.getObjectByName(first!.name) as Mesh;
      expect(clone.geometry).toBe(first!.geometry);
      expect(clone.material).not.toBe(first!.material);
      let disposed = 0;
      first!.geometry.addEventListener("dispose", () => disposed++);
      a.dispose();
      expect(disposed).toBe(0);
      applyFoxPose(b, {
        time: 1,
        age: 4,
        paused: true,
        idle: true,
        reaction: "thinking",
      });
      expect(b.arm.rotation.z).toBe(0.35);
    } finally {
      b.dispose();
    }
  });
  it("makes deterministic tiny clay grain without using browser image APIs", () => {
    const a = createClayGrain(),
      b = createClayGrain();
    try {
      expect(a.image.width).toBe(64);
      expect(a.image.height).toBe(64);
      expect(a.image.data).toEqual(b.image.data);
      expect(a.image.data!.length).toBe(64 * 64 * 4);
    } finally {
      a.dispose();
      b.dispose();
    }
  });
});
