import {
  Box3,
  BufferGeometry,
  Float32BufferAttribute,
  SphereGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  Shape,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { roundedPanel } from "./foxModel";
import { createClayGrain } from "./claySurface";
import type { WordObjectKind } from "../wordObjects";
type P = [number, number, number];

/** A tapered, capped curved sweep. Both ends are closed, not open tube mouths. */
function bananaGeometry() {
  const points: number[] = [],
    indices: number[] = [],
    rings = 24,
    sides = 16;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings,
      theta = (t - 0.5) * 1.65,
      radius = 0.045 + 0.115 * Math.sin(Math.PI * t) ** 0.65;
    const cx = 0.8 * Math.sin(theta),
      cy = 0.8 * (1 - Math.cos(theta));
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      points.push(
        cx - Math.sin(theta) * Math.cos(a) * radius,
        cy + Math.cos(theta) * Math.cos(a) * radius,
        Math.sin(a) * radius,
      );
    }
  }
  for (let r = 0; r < rings; r++)
    for (let s = 0; s < sides; s++) {
      const a = r * sides + s,
        b = r * sides + ((s + 1) % sides),
        c = a + sides,
        d = b + sides;
      indices.push(a, b, c, b, d, c);
    }
  for (const end of [0, 1]) {
    const theta = (end - 0.5) * 1.65,
      center = points.length / 3;
    points.push(0.8 * Math.sin(theta), 0.8 * (1 - Math.cos(theta)), 0);
    for (let s = 0; s < sides; s++) {
      const a = end * rings * sides + s,
        b = end * rings * sides + ((s + 1) % sides);
      indices.push(...(end ? [center, a, b] : [center, b, a]));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
export function createWordObject(kind: WordObjectKind) {
  const root = new Group();
  root.name = `word-object-${kind}`;
  const sphere = new SphereGeometry(1, 32, 20),
    grain = createClayGrain();
  const mats = new Map<string, MeshStandardMaterial>();
  const mat = (color: string) => {
    if (!mats.has(color))
      mats.set(
        color,
        new MeshStandardMaterial({
          color,
          roughness: 0.88,
          metalness: 0,
          bumpMap: grain,
          bumpScale: 0.003,
          envMapIntensity: 0.55,
        }),
      );
    return mats.get(color)!;
  };
  const add = (
    name: string,
    geometry: BufferGeometry,
    color: string,
    position: P,
    scale: P = [1, 1, 1],
  ) => {
    const mesh = new Mesh(geometry, mat(color));
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const ball = (name: string, color: string, position: P, scale: P) =>
    add(name, sphere, color, position, scale);
  if (kind === "apple") {
    ball("left-apple-lobe", "#ee6d58", [-0.14, 0.5, 0], [0.34, 0.4, 0.35]);
    ball("right-apple-lobe", "#ee6d58", [0.14, 0.5, 0], [0.34, 0.4, 0.35]);
    add(
      "apple-stem",
      new CapsuleGeometry(0.045, 0.22, 6, 12),
      "#986344",
      [0, 0.91, 0],
    ).rotation.z = -0.25;
    ball(
      "apple-leaf",
      "#69be85",
      [0.17, 0.97, 0.015],
      [0.23, 0.075, 0.09],
    ).rotation.z = 0.4;
  } else if (kind === "banana") {
    add("curved-banana", bananaGeometry(), "#ffd05a", [0, 0.25, 0]);
    for (const side of [-1, 1])
      add(
        `banana-tip-${side}`,
        new CapsuleGeometry(0.046, 0.075, 6, 12),
        "#a67849",
        [side * 0.604, 0.52, 0],
      ).rotation.z = side * -0.8;
  } else if (kind === "book") {
    add(
      "book-pages",
      roundedPanel(0.85, 1.04, 0.2, 0.045),
      "#fff2d1",
      [0, 0.62, 0],
    );
    for (const z of [-0.115, 0.115])
      add(`book-cover-${z}`, roundedPanel(0.95, 1.14, 0.065, 0.07), "#6c9fdb", [
        0,
        0.62,
        z,
      ]);
    add(
      "book-spine",
      new CapsuleGeometry(0.065, 1.02, 6, 16),
      "#4d7ebe",
      [-0.44, 0.62, 0],
    );
    ball("book-cover-sun", "#ffd05a", [0, 0.72, 0.14], [0.18, 0.18, 0.025]);
  } else if (kind === "pencil") {
    add(
      "pencil-shaft",
      new CylinderGeometry(0.12, 0.12, 1.02, 6),
      "#ffc954",
      [0, 0.7, 0],
    );
    add(
      "wood-tip",
      new ConeGeometry(0.12, 0.26, 24),
      "#dcb38b",
      [0, 0.06, 0],
    ).rotation.z = Math.PI;
    add(
      "graphite-tip",
      new ConeGeometry(0.041, 0.09, 24),
      "#35445a",
      [0, -0.04, 0],
    ).rotation.z = Math.PI;
    add(
      "pencil-band",
      new CylinderGeometry(0.125, 0.125, 0.13, 24),
      "#b0b9cb",
      [0, 1.275, 0],
    );
    add(
      "rounded-eraser",
      new CapsuleGeometry(0.12, 0.04, 6, 16),
      "#ed9e9e",
      [0, 1.37, 0],
    );
    root.rotation.z = -0.28;
    root.position.y = 0.12;
  } else if (kind === "fish") {
    ball("fish-body", "#f5ad50", [0, 0.58, 0], [0.57, 0.35, 0.23]);
    const tail = new Shape();
    tail.moveTo(-0.4, 0);
    tail.quadraticCurveTo(-0.68, 0.24, -0.84, 0.28);
    tail.quadraticCurveTo(-0.94, 0, -0.84, -0.28);
    tail.quadraticCurveTo(-0.68, -0.24, -0.4, 0);
    const fin = new ExtrudeGeometry(tail, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 3,
      curveSegments: 8,
    });
    fin.translate(0, 0, -0.04);
    add("fish-tail", fin, "#ed8561", [0, 0.58, 0]);
    ball("fish-top-fin", "#ed8561", [-0.13, 0.88, 0], [0.25, 0.12, 0.095]);
    for (const side of [-1, 1]) {
      const eye = ball(
        `fish-eye-${side}`,
        "#27334b",
        [0.31, 0.67, side * 0.195],
        [0.047, 0.065, 0.024],
      );
      eye.geometry = eye.geometry.clone();
      const points = eye.geometry.getAttribute("position");
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i) * eye.scale.x + eye.position.x,
          y = points.getY(i) * eye.scale.y + eye.position.y;
        const surface =
          side *
          0.23 *
          Math.sqrt(
            Math.max(0, 1 - (x / 0.57) ** 2 - ((y - 0.58) / 0.35) ** 2),
          );
        const depth = points.getZ(i) * side;
        const z = surface + side * depth * (depth >= 0 ? 0.012 : 0.006);
        points.setZ(i, (z - eye.position.z) / eye.scale.z);
      }
      eye.geometry.computeVertexNormals();
    }
    ball(
      "fish-side-fin",
      "#ed8561",
      [-0.05, 0.49, 0.22],
      [0.19, 0.095, 0.035],
    ).rotation.z = -0.4;
  } else {
    add(
      "orange-colour-chip",
      roundedPanel(1.02, 0.88, 0.25, 0.22),
      "#f28a3d",
      [0, 0.56, 0],
    );
    ball(
      "colour-chip-highlight",
      "#ffc083",
      [-0.22, 0.8, 0.124],
      [0.18, 0.035, 0.012],
    ).rotation.z = 0.25;
  }
  root.updateMatrixWorld(true);
  root.position.y -= new Box3().setFromObject(root).min.y;
  return {
    root,
    dispose: () => {
      const geometries = new Set<BufferGeometry>([sphere]);
      root.traverse((node) => {
        if (node instanceof Mesh) geometries.add(node.geometry);
      });
      geometries.forEach((geometry) => geometry.dispose());
      mats.forEach((material) => material.dispose());
      grain.dispose();
    },
  };
}
