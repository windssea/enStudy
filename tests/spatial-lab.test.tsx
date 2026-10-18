import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import qa from "../design-assets/clay-position-classroom.qa.json";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Mesh, MeshStandardMaterial } from "three";
import { conceptLab, conceptView } from "../packages/domain/concepts";
import {
  spatialHome,
  spatialTarget,
  spatialPath,
  spatialPosition,
  type SpatialPoint,
} from "../packages/domain/spatial";
import { createSpatialModel } from "../src/scene/spatialModel";
import { ConceptFlat } from "../src/ConceptScene";
import index from "../content/concept-exposure-map.json";
import { answerExposureKeys } from "../packages/domain/exposure";
import { neighbourhoodTermRelease } from "../packages/server/exercises";
describe("clay position teaching", () => {
  it("ties the four Blender topology inspections to the actual model and motion sources", () => {
    for (const [path, hash] of Object.entries(qa.source_hashes))
      expect(
        createHash("sha256")
          .update(readFileSync(new URL(`../${path}`, import.meta.url)))
          .digest("hex"),
        path,
      ).toBe(hash);
    expect(Object.keys(qa.poses).sort()).toEqual(["home", "in", "on", "under"]);
    for (const pose of Object.values(qa.poses)) {
      expect(pose.meshes).toBe(13);
      expect(pose.triangles).toBe(8504);
      for (const object of pose.objects) {
        expect(
          object.boundary_edges +
            object.nonmanifold_edges +
            object.degenerate_faces +
            object.invalid_vertices,
        ).toBe(0);
        expect(object.volume).toBeGreaterThan(0);
      }
    }
  });
  it("shows an unplaced ball first and a matching scene before its full example sentence", () => {
    const lab = conceptLab("grammar.prepositions")!;
    expect(lab.kind).toBe("spatial");
    expect(lab.cases).toHaveLength(3);
    for (const example of lab.cases) {
      for (let step = 0; step < 3; step++) {
        const data = conceptView(lab, example, step);
        if (data.kind !== "spatial") throw Error("Wrong kind");
        expect(data.placed).toBe(step > 0);
        const html = renderToStaticMarkup(createElement(ConceptFlat, { data }));
        expect(html).toContain("桌子 table");
        expect(html).toContain("盒子 box");
        expect(html).not.toMatch(/undefined|NaN|Infinity/);
      }
    }
    expect(spatialTarget("in")).toEqual([1.2, 0.29, 0]);
    expect(spatialTarget("on")[1] - 0.19).toBeCloseTo(0.97);
    expect(spatialTarget("under")[1] + 0.19).toBeLessThan(0.83);
  });
  it("routes every placement transition around all closed furniture solids instead of through them", () => {
    const solids: { centre: SpatialPoint; size: SpatialPoint }[] = [
      { centre: [-0.75, 0.9, 0], size: [1.55, 0.14, 1] },
      ...[-1.34, -0.16].flatMap((x) =>
        [-0.35, 0.35].map((z) => ({
          centre: [x, 0.415, z] as SpatialPoint,
          size: [0.14, 0.83, 0.14] as SpatialPoint,
        })),
      ),
      { centre: [1.2, 0.05, 0], size: [1, 0.1, 0.85] },
      ...[0.75, 1.65].map((x) => ({
        centre: [x, 0.3, 0] as SpatialPoint,
        size: [0.1, 0.5, 0.85] as SpatialPoint,
      })),
      { centre: [1.2, 0.3, -0.375], size: [0.8, 0.5, 0.1] },
      { centre: [1.2, 0.17, 0.375], size: [0.8, 0.14, 0.1] },
    ];
    const destinations = [
      spatialHome,
      ...(["in", "on", "under"] as const).map(spatialTarget),
    ];
    for (const from of destinations)
      for (const to of destinations) {
        const path = spatialPath(from, to);
        expect(spatialPosition(path, 0)).toEqual(from);
        expect(spatialPosition(path, 1)).toEqual(to);
        for (let i = 0; i <= 250; i++) {
          const point = spatialPosition(path, i / 250);
          expect(point.every(Number.isFinite)).toBe(true);
          expect(point[1]).toBeGreaterThanOrEqual(0.19 - 1e-6);
          for (const { centre, size } of solids) {
            const distance = Math.hypot(
              ...point.map((v, a) =>
                Math.max(0, Math.abs(v - centre[a]) - size[a] / 2),
              ),
            );
            expect(
              distance,
              `${from} -> ${to} at ${i} against ${centre}`,
            ).toBeGreaterThanOrEqual(0.19 - 1e-6);
          }
        }
      }
    // Rapid interruption can begin partway along an earlier path.
    for (const from of destinations)
      for (const to of destinations)
        for (const p of [0.15, 0.45, 0.8]) {
          const interrupted = spatialPosition(spatialPath(from, to), p);
          expect(spatialPosition(spatialPath(interrupted, to), 1)).toEqual(to);
        }
    expect(
      spatialPosition(spatialPath(destinations[0], destinations[1]), NaN),
    ).toEqual(destinations[1]);
  });
  it("uses finite rounded closed-solid geometry, matte materials and independently owned disposable models", () => {
    const a = createSpatialModel({ textured: false }),
      b = createSpatialModel({ textured: false });
    expect(a.ball).not.toBe(b.ball);
    expect(a.root.getObjectByName("box-front-lip")).toBeTruthy();
    let triangles = 0,
      meshes = 0;
    a.root.traverse((node) => {
      if (node instanceof Mesh) {
        meshes++;
        const p = node.geometry.getAttribute("position");
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        triangles += (node.geometry.index?.count ?? p.count) / 3;
        expect(
          (node.material as MeshStandardMaterial).roughness,
        ).toBeGreaterThanOrEqual(0.85);
      }
    });
    expect(meshes).toBe(13);
    expect(triangles).toBeLessThan(18000);
    a.ball.position.set(9, 9, 9);
    expect(b.ball.position.toArray()).toEqual(spatialHome);
    a.dispose();
    b.dispose();
  });
  it("protects a disclosed assessment sentence without treating an unrelated position sentence as shown", () => {
    const keys = (index.entries as Record<string, string[]>)[
      "grammar.prepositions/in-box"
    ];
    const shown = neighbourhoodTermRelease.items.find(
      (i) => i.id === "P1B-U03-L1.p8.input",
    )!;
    const fresh = neighbourhoodTermRelease.items.find(
      (i) => i.id === "P1B-U03-L2.p8.input",
    )!;
    expect(answerExposureKeys(shown).some((k) => keys.includes(k))).toBe(true);
    expect(answerExposureKeys(fresh).some((k) => keys.includes(k))).toBe(false);
  });
});
