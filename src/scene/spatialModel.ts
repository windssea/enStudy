import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { spatialHome } from "../../packages/domain/spatial";
import { createClayGrain } from "./claySurface";

/** One shared authoring/runtime model. All pieces are closed solids. */
export function createSpatialModel({ textured = true } = {}) {
  const root = new Group();
  root.name = "clay-position-classroom";
  const grain = textured ? createClayGrain() : undefined;
  const materials = ["#f0bf6d", "#596c90", "#69c6dc", "#f48974", "#fff6dc"].map(
    (color) =>
      new MeshStandardMaterial({
        color,
        roughness: 0.9,
        ...(grain ? { bumpMap: grain, bumpScale: 0.004 } : {}),
      }),
  );
  const geometries = new Set<
    RoundedBoxGeometry | SphereGeometry | TorusGeometry
  >();
  const solid = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    colour: number,
  ) => {
    const geometry = new RoundedBoxGeometry(
      ...size,
      3,
      Math.min(...size) * 0.18,
    );
    geometries.add(geometry);
    const mesh = new Mesh(geometry, materials[colour]);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  // Top at .97, ball rests at .97 + .19. Leg inner clearance exceeds the ball width.
  solid("rounded-tabletop", [1.55, 0.14, 1.0], [-0.75, 0.9, 0], 0);
  for (const x of [-1.34, -0.16])
    for (const z of [-0.35, 0.35])
      solid(`table-leg:${x}:${z}`, [0.14, 0.83, 0.14], [x, 0.415, z], 1);
  // Open box with a low front lip so its contents remain visible, not a solid cube.
  solid("box-floor", [1.0, 0.1, 0.85], [1.2, 0.05, 0], 2);
  for (const x of [0.75, 1.65])
    solid(`box-side:${x}`, [0.1, 0.5, 0.85], [x, 0.3, 0], 2);
  solid("box-back", [0.8, 0.5, 0.1], [1.2, 0.3, -0.375], 2);
  solid("box-front-lip", [0.8, 0.14, 0.1], [1.2, 0.17, 0.375], 2);
  const ball = new Group();
  ball.name = "moving-clay-ball";
  ball.position.set(...spatialHome);
  const sphere = new SphereGeometry(0.19, 32, 24);
  geometries.add(sphere);
  ball.add(new Mesh(sphere, materials[3]));
  for (const angle of [0, Math.PI / 2]) {
    const seam = new TorusGeometry(0.189, 0.004, 6, 48);
    geometries.add(seam);
    const mesh = new Mesh(seam, materials[4]);
    mesh.rotation.y = angle;
    ball.add(mesh);
  }
  ball.traverse((node) => {
    if (node instanceof Mesh) node.castShadow = node.receiveShadow = true;
  });
  root.add(ball);
  return {
    root,
    ball,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      grain?.dispose();
    },
  };
}
