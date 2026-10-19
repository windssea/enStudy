import { describe, expect, it } from "vitest";
import { Box3, Mesh, OrthographicCamera, Vector3 } from "three";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Catalog } from "../packages/contracts/index";
import { courseCatalog } from "../packages/server/exercises";
import { courseMapStations } from "../src/courseMapModel";
import {
  mapStops,
  mapKinds,
  mapColors,
  mapRoutePoint,
  mapTravel,
  mapTravelMs,
} from "../src/scene/mapRoute";
import { createIslandModel } from "../src/scene/islandModel";
import FlatMap from "../src/FlatMap";
const catalog: Catalog = JSON.parse(
  readFileSync(
    new URL("../public/content/catalog.json", import.meta.url),
    "utf8",
  ),
);

describe("real-unit clay island map", () => {
  it("maps all 72 units in their own grade and term without losing an entry or mixing progress", () => {
    for (let grade = 1; grade <= 6; grade++)
      for (const term of ["A", "B"]) {
        const units = catalog.units.filter(
          (u) => u.grade === String(grade) && u.term === term,
        );
        const lessons = courseCatalog.lessons.filter(
          (l) => l.grade === grade && l.term === term,
        );
        const first = lessons.find((l) => l.unitId === units[0].unit_id)!;
        const stations = courseMapStations(
          [...units].reverse(),
          [...lessons].reverse(),
          [
            { lessonId: first.id },
            { lessonId: first.id },
            { lessonId: "P6B-U99-L1" },
          ],
        );
        expect(stations.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(stations.map((s) => s.id)).toEqual(units.map((u) => u.unit_id));
        expect(stations[0].practised).toBe(1);
        expect(stations.slice(1).every((s) => s.practised === 0)).toBe(true);
        for (const s of stations) {
          expect(s.total).toBe(4);
          expect(s.next?.unitId).toBe(s.id);
          expect(s.next?.id).not.toBe(first.id);
          expect(s.task).toBeTruthy();
        }
      }
  });
  it("uses the first lesson for an entirely practised unit and leaves unavailable units without a false lesson", () => {
    const units = catalog.units.slice(0, 6);
    const lessons = courseCatalog.lessons.filter(
      (l) => l.unitId === units[0].unit_id,
    );
    const done = lessons.map((l) => ({ lessonId: l.id }));
    const snapshot = JSON.stringify(done);
    const stations = courseMapStations(units, lessons, done);
    expect(stations[0].practised).toBe(4);
    expect(stations[0].next?.id).toBe(lessons[0].id);
    expect(stations.slice(1).every((s) => s.total === 0 && !s.next)).toBe(true);
    expect(JSON.stringify(done)).toBe(snapshot);
  });
  it("keeps every forward and reverse trip on the connected front path with a finite exact arrival", () => {
    for (let from = 0; from < 6; from++)
      for (let to = 0; to < 6; to++) {
        let previous = from;
        for (let step = 0; step <= 100; step++) {
          const sample = mapTravel(from, to, (step / 100) * mapTravelMs);
          expect(sample.value).toBeGreaterThanOrEqual(Math.min(from, to));
          expect(sample.value).toBeLessThanOrEqual(Math.max(from, to));
          expect(
            (sample.value - previous) * Math.sign(to - from),
          ).toBeGreaterThanOrEqual(-1e-10);
          const grounded = mapRoutePoint(sample.value);
          expect(sample.position[0]).toBe(grounded[0]);
          expect(sample.position[2]).toBe(grounded[2]);
          expect(sample.position[1]).toBeGreaterThanOrEqual(0.37);
          expect(sample.position[1]).toBeLessThanOrEqual(0.491);
          previous = sample.value;
        }
        expect(mapTravel(from, to, mapTravelMs)).toEqual({
          value: to,
          position: mapRoutePoint(to),
          moving: false,
        });
        expect(mapTravel(from, to, 12, true)).toEqual({
          value: to,
          position: mapRoutePoint(to),
          moving: false,
        });
      }
  });
  it("retargets from the actual intermediate point and can freeze without replaying the old trip", () => {
    const interrupted = mapTravel(0, 5, 900);
    const replacement = mapTravel(
      interrupted.value,
      1,
      0,
      false,
      interrupted.position[1] - 0.37,
    );
    expect(replacement.position).toEqual(interrupted.position);
    expect(mapTravel(interrupted.value, 1, mapTravelMs).position).toEqual(
      mapRoutePoint(1),
    );
    expect(mapTravel(4, 0, -200).value).toBe(4);
    expect(mapTravel(4, 0, mapTravelMs + 1000).value).toBe(0);
  });
  it("keeps the travelling body clear of actual above-ground props, including the fourth-station desk", () => {
    const obstacles: { name: string; box: Box3 }[] = [];
    for (let i = 0; i < 6; i++) {
      const model = createIslandModel(mapKinds[i], mapColors[i]);
      model.root.scale.setScalar(0.77);
      model.root.position.set(...mapStops[i]);
      model.root.updateMatrixWorld(true);
      model.root.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        const box = new Box3().setFromObject(node);
        if (box.max.y <= 0.37 || box.min.y >= 1.9) return;
        box.expandByVector(new Vector3(0.22, 0, 0.22));
        obstacles.push({ name: node.name, box });
      });
      model.dispose();
    }
    for (let step = 0; step <= 1000; step++) {
      const p = mapRoutePoint(step / 200);
      for (const { name, box } of obstacles) {
        const overlaps =
          p[0] >= box.min.x &&
          p[0] <= box.max.x &&
          p[2] >= box.min.z &&
          p[2] <= box.max.z;
        expect(overlaps, `path ${step / 200} intersects ${name}`).toBe(false);
      }
    }
  });
  it("renders six distinct bounded clay sets with valid normals and releases owned resources once", () => {
    const signatures = new Set<string>();
    for (const [i, kind] of mapKinds.entries()) {
      const model = createIslandModel(kind, mapColors[i]);
      const resources = new Map<object, number>();
      let triangles = 0,
        meshes = 0;
      const names: string[] = [];
      model.root.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        meshes++;
        names.push(node.name);
        triangles +=
          (node.geometry.index?.count ??
            node.geometry.attributes.position.count) / 3;
        expect(
          Array.from(node.geometry.attributes.normal.array).every(
            Number.isFinite,
          ),
        ).toBe(true);
        for (const r of [
          node.geometry,
          ...(Array.isArray(node.material) ? node.material : [node.material]),
        ]) {
          if (resources.has(r)) continue;
          resources.set(r, 0);
          r.addEventListener("dispose", () =>
            resources.set(r, resources.get(r)! + 1),
          );
        }
      });
      expect(meshes).toBeLessThan(65);
      expect(triangles).toBeLessThan(26000);
      signatures.add(names.join(","));
      model.dispose();
      expect([...resources.values()].every((n) => n === 1)).toBe(true);
    }
    expect(signatures.size).toBe(6);
  });
  it("frames all six real island bounds and every partner arrival at narrow and desktop widths", () => {
    for (const [width, height] of [
      [300, 300],
      [540, 380],
      [900, 470],
    ]) {
      const camera = new OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        0.1,
        100,
      );
      camera.position.set(0, 10, 14);
      camera.zoom = Math.min(width / 10.8, height / 6.1);
      camera.lookAt(0, 0.35, 0.35);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      for (let i = 0; i < 6; i++) {
        const model = createIslandModel(mapKinds[i], mapColors[i]);
        model.root.scale.setScalar(0.77);
        model.root.position.set(...mapStops[i]);
        const box = new Box3().setFromObject(model.root);
        const points: Vector3[] = [];
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z])
              points.push(new Vector3(x, y, z));
        const at = mapRoutePoint(i);
        points.push(new Vector3(at[0], at[1] + 1.5, at[2]));
        for (const p of points) {
          p.project(camera);
          expect(Math.abs(p.x)).toBeLessThan(0.96);
          expect(Math.abs(p.y)).toBeLessThan(0.96);
        }
        model.dispose();
      }
      for (let step = 0; step <= 200; step++) {
        const at = mapRoutePoint(step / 40);
        for (const x of [-0.4, 0.4])
          for (const y of [0, 1.5])
            for (const z of [-0.2, 0.2]) {
              const p = new Vector3(
                at[0] + x,
                at[1] + y + 0.12,
                at[2] + z,
              ).project(camera);
              expect(Math.abs(p.x), `route ${step / 40} x`).toBeLessThan(0.96);
              expect(Math.abs(p.y), `route ${step / 40} y`).toBeLessThan(0.96);
            }
      }
    }
  });
  it("keeps the six station numbers and selected partner in a network-free 2D alternative", () => {
    const stations = courseMapStations(
      catalog.units.slice(0, 6),
      courseCatalog.lessons,
      [],
    );
    const first = renderToStaticMarkup(
      createElement(FlatMap, { stations, selected: 0 }),
    );
    const last = renderToStaticMarkup(
      createElement(FlatMap, { stations, selected: 5 }),
    );
    for (let i = 1; i <= 6; i++) expect(last).toContain(`>${i}</text>`);
    expect(first).not.toEqual(last);
    expect(last).not.toContain("<image");
    expect(last).not.toContain("<canvas");
  });
});
