import { describe, expect, it } from "vitest";
import { Box3, Mesh, Vector3 } from "three";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createFoxModel,
  applyFoxPose,
  roundedPanel,
  foxPalette,
} from "../src/scene/foxModel";
import { createIslandModel, type IslandKind } from "../src/scene/islandModel";
import FoxSticker from "../src/FoxSticker";
import FlatMap from "../src/FlatMap";

describe("original cartoon scene geometry and activity", () => {
  it("fits the actual fox model inside the existing stage and bounds geometry cost", () => {
    const model = createFoxModel();
    try {
      const size = new Box3().setFromObject(model.root).getSize(new Vector3());
      expect(size.y).toBeGreaterThan(1.8);
      expect(size.y).toBeLessThan(2.5);
      expect(size.x).toBeLessThan(2.4);
      expect(size.z).toBeLessThan(1.4);
      let meshes = 0,
        triangles = 0;
      const geometries = new Set();
      model.root.traverse((node) => {
        if (node instanceof Mesh) {
          meshes++;
          geometries.add(node.geometry);
          triangles +=
            (node.geometry.index?.count ??
              node.geometry.attributes.position.count) / 3;
        }
      });
      expect(meshes).toBeLessThanOrEqual(45);
      expect(triangles).toBeLessThan(24000);
      expect(geometries.size).toBeLessThan(12);
    } finally {
      model.dispose();
    }
  });
  it("keeps gesture motion bounded, ends the gesture and pauses with open eyes", () => {
    const model = createFoxModel();
    try {
      for (let i = 0; i <= 120; i++) {
        applyFoxPose(model, {
          time: 2,
          age: i / 100,
          paused: false,
          idle: false,
          reaction: "correct",
        });
        expect(model.body.position.y).toBeGreaterThanOrEqual(-0.001);
        expect(model.body.position.y).toBeLessThanOrEqual(0.111);
        expect(Math.abs(model.body.rotation.z)).toBeLessThan(0.05);
      }
      applyFoxPose(model, {
        time: 0.08,
        age: 0.45,
        paused: true,
        idle: true,
        reaction: "correct",
      });
      expect(model.body.position.y).toBe(0);
      expect(model.eyes.scale.y).toBe(1);
      expect(model.arm.rotation.z).toBe(0.35);
      applyFoxPose(model, {
        time: 4,
        age: 2,
        paused: false,
        idle: false,
        reaction: "correct",
      });
      expect(model.body.position.y).toBe(0);
      expect(model.arm.rotation.z).toBe(0.35);
    } finally {
      model.dispose();
    }
  });
  it("blinks briefly during idle without moving the head or closing eyes when quiet", () => {
    const model = createFoxModel();
    try {
      applyFoxPose(model, {
        time: 0.08,
        age: 10,
        paused: false,
        idle: true,
        reaction: "thinking",
      });
      expect(model.eyes.scale.y).toBeCloseTo(0.08);
      applyFoxPose(model, {
        time: 0.4,
        age: 10,
        paused: false,
        idle: true,
        reaction: "thinking",
      });
      expect(model.eyes.scale.y).toBe(1);
      applyFoxPose(model, {
        time: 0.08,
        age: 0.3,
        paused: true,
        idle: true,
        reaction: "thinking",
      });
      expect(model.eyes.scale.y).toBe(1);
      expect(model.head.rotation.z).toBe(0);
    } finally {
      model.dispose();
    }
  });
  it("releases each owned geometry and material once on disposal", () => {
    const model = createFoxModel(),
      disposed = new Map<object, number>();
    model.root.traverse((node) => {
      if (node instanceof Mesh) {
        for (const resource of [
          node.geometry,
          ...(Array.isArray(node.material) ? node.material : [node.material]),
        ])
          if (!disposed.has(resource)) {
            disposed.set(resource, 0);
            resource.addEventListener("dispose", () =>
              disposed.set(resource, disposed.get(resource)! + 1),
            );
          }
      }
    });
    model.dispose();
    expect([...disposed.values()].every((count) => count === 1)).toBe(true);
  });
  it("gives every island a distinct real mesh layout while staying within a fixed budget", () => {
    const signatures = [];
    for (const kind of ["home", "library", "garden"] as IslandKind[]) {
      const model = createIslandModel(kind, "#95d9b3");
      try {
        let meshes = 0,
          triangles = 0;
        const names: string[] = [];
        model.root.traverse((node) => {
          if (node instanceof Mesh) {
            meshes++;
            names.push(node.name);
            triangles +=
              (node.geometry.index?.count ??
                node.geometry.attributes.position.count) / 3;
          }
        });
        expect(meshes).toBeLessThan(65);
        expect(triangles).toBeLessThan(26000);
        expect(names).toContain("soft-grass");
        signatures.push(names.join(","));
      } finally {
        model.dispose();
      }
    }
    expect(new Set(signatures).size).toBe(3);
  });
  it("builds a bevelled letter panel with a full front face and bounded depth", () => {
    const geometry = roundedPanel(1.06, 0.83, 0.23, 0.1);
    try {
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new Vector3());
      expect(size.z).toBeCloseTo(0.23);
      expect(size.x).toBeGreaterThanOrEqual(1.06);
      expect(size.x).toBeLessThan(1.15);
    } finally {
      geometry.dispose();
    }
  });
  it("preserves the same original fox in the flat fallback without external image dependencies", () => {
    const svg = renderToStaticMarkup(
      createElement("svg", null, createElement(FoxSticker)),
    );
    const map = renderToStaticMarkup(createElement(FlatMap));
    for (const colour of [
      foxPalette.coat,
      foxPalette.cream,
      foxPalette.scarf,
      foxPalette.boots,
    ]) {
      expect(svg).toContain(colour);
      expect(map).toContain(colour);
    }
    expect(svg + map).not.toContain("<image");
    expect(svg + map).not.toContain("<canvas");
  });
});
