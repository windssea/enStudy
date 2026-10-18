import {
  CapsuleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from "three";
import { roundedPanel } from "./foxModel";
import { createClayGrain } from "./claySurface";
export type IslandKind = "home" | "library" | "garden";

export function createIslandModel(kind: IslandKind, grass: string) {
  const root = new Group();
  root.name = `storybook-${kind}-island`;
  const sphere = new SphereGeometry(1, 18, 12),
    soil = new CylinderGeometry(1.4, 0.96, 0.63, 32, 1),
    trim = new CylinderGeometry(1.47, 1.42, 0.16, 32, 1),
    twig = new CapsuleGeometry(0.065, 0.34, 4, 10),
    house = roundedPanel(0.7, 0.65, 0.62, 0.12),
    door = roundedPanel(0.2, 0.31, 0.04, 0.065),
    book = roundedPanel(0.24, 0.76, 0.5, 0.055);
  const palette = {
    grass,
    soil: "#d8b28e",
    trim: "#f0cfa8",
    cream: "#fff1d6",
    roof: "#f09a82",
    blue: "#68a9cf",
    ink: "#27334b",
    leaf: "#70c7a0",
    leafLight: "#a7dbb1",
    wood: "#bb8d62",
    white: "#fffaf0",
    pink: "#ed9e9e",
    yellow: "#ffd064",
  };
  const grain = createClayGrain();
  const mats = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => [
      key,
      new MeshStandardMaterial({
        color,
        roughness: 0.9,
        bumpMap: grain,
        bumpScale: 0.004,
        envMapIntensity: 0.55,
      }),
    ]),
  ) as Record<keyof typeof palette, MeshStandardMaterial>;
  const mesh = (
    name: string,
    geometry: BufferGeometry,
    color: keyof typeof palette,
    position: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
    parent = root,
  ) => {
    const node = new Mesh(geometry, mats[color]);
    node.name = name;
    node.position.set(...position);
    node.scale.set(...scale);
    parent.add(node);
    return node;
  };
  const ball = (
    name: string,
    color: keyof typeof palette,
    p: [number, number, number],
    s: [number, number, number],
    parent = root,
  ) => mesh(name, sphere, color, p, s, parent);
  mesh("rounded-soil", soil, "soil", [0, -0.17, 0]);
  mesh("warm-layer", trim, "trim", [0, 0.16, 0]);
  ball("soft-grass", "grass", [0, 0.26, 0], [1.5, 0.14, 1.43]);
  for (const [x, z] of [
    [-0.95, 0.42],
    [0.74, 0.94],
    [-0.15, -1.1],
  ])
    ball("island-pebble", "cream", [x, 0.32, z], [0.16, 0.065, 0.12]);

  const tree = (x: number, z: number) => {
    mesh("tree-trunk", twig, "wood", [x, 0.6, z]);
    ball("rounded-tree", "leaf", [x, 1.04, z], [0.4, 0.4, 0.33]);
    ball(
      "tree-crown",
      "leafLight",
      [x - 0.13, 1.23, z + 0.03],
      [0.3, 0.27, 0.27],
    );
    ball("fruit", "yellow", [x + 0.18, 1.04, z + 0.28], [0.07, 0.08, 0.065]);
  };
  if (kind === "home") {
    const cabin = new Group();
    cabin.position.set(-0.5, 0.73, -0.42);
    root.add(cabin);
    mesh("cream-cabin", house, "cream", [0, 0, 0], [1, 1, 1], cabin);
    const roofShape = new Shape();
    roofShape.moveTo(-0.44, 0);
    roofShape.quadraticCurveTo(-0.5, 0.04, -0.42, 0.12);
    roofShape.lineTo(-0.07, 0.39);
    roofShape.quadraticCurveTo(0, 0.45, 0.07, 0.39);
    roofShape.lineTo(0.42, 0.12);
    roofShape.quadraticCurveTo(0.5, 0.04, 0.44, 0);
    roofShape.closePath();
    const roof = new ExtrudeGeometry(roofShape, {
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 3,
      curveSegments: 6,
    });
    roof.translate(0, 0, -0.35);
    mesh("rounded-coral-roof", roof, "roof", [0, 0.27, 0], [1, 1, 1], cabin);
    mesh("cabin-door", door, "blue", [-0.13, -0.17, 0.335], [1, 1, 1], cabin);
    ball(
      "door-knob",
      "yellow",
      [-0.085, -0.16, 0.37],
      [0.018, 0.018, 0.018],
      cabin,
    );
    ball(
      "window-frame",
      "white",
      [0.17, 0.06, 0.33],
      [0.12, 0.12, 0.035],
      cabin,
    );
    ball(
      "blue-window",
      "blue",
      [0.17, 0.06, 0.361],
      [0.087, 0.087, 0.015],
      cabin,
    );
    tree(0.75, -0.48);
  } else if (kind === "library") {
    for (const [index, x] of [-0.65, -0.36, -0.08].entries()) {
      const node = mesh("storybook-spine", book, index % 2 ? "roof" : "blue", [
        x,
        0.74,
        -0.61,
      ]);
      node.rotation.z = index === 0 ? -0.12 : 0.05;
      ball("spine-dot", "cream", [x, 0.79, -0.34], [0.055, 0.055, 0.02]);
    }
    tree(0.91, -0.65);
  } else {
    tree(-0.82, -0.51);
    const bunny = new Group();
    bunny.name = "little-bunny-friend";
    bunny.position.set(0.6, 0.4, -0.38);
    root.add(bunny);
    ball("bunny-body", "white", [0, 0.2, 0], [0.22, 0.26, 0.18], bunny);
    ball("bunny-head", "white", [0, 0.52, 0.02], [0.27, 0.24, 0.22], bunny);
    for (const side of [-1, 1]) {
      const outer = ball(
        "bunny-ear",
        "white",
        [side * 0.12, 0.82, 0],
        [0.085, 0.28, 0.08],
        bunny,
      );
      outer.rotation.z = side * -0.12;
      const inner = ball(
        "pink-bunny-ear",
        "pink",
        [side * 0.12, 0.84, 0.065],
        [0.037, 0.18, 0.018],
        bunny,
      );
      inner.rotation.z = side * -0.12;
      ball(
        "bunny-eye",
        "ink",
        [side * 0.085, 0.55, 0.218],
        [0.027, 0.04, 0.019],
        bunny,
      );
      ball(
        "bunny-cheek",
        "pink",
        [side * 0.15, 0.47, 0.194],
        [0.042, 0.021, 0.014],
        bunny,
      );
      ball(
        "bunny-foot",
        "white",
        [side * 0.12, 0.035, 0.11],
        [0.12, 0.065, 0.14],
        bunny,
      );
    }
    ball("bunny-nose", "pink", [0, 0.49, 0.244], [0.025, 0.02, 0.014], bunny);
    ball("bunny-tail", "white", [0.22, 0.12, -0.08], [0.09, 0.09, 0.09], bunny);
  }
  for (const [index, x] of [-0.87, 0.91].entries()) {
    mesh("flower-stem", twig, "leaf", [x, 0.42, 0.58], [0.35, 0.65, 0.35]);
    const flower = new Group();
    flower.position.set(x, 0.61, 0.61);
    root.add(flower);
    for (let petal = 0; petal < 5; petal++) {
      const angle = (petal * Math.PI * 2) / 5;
      ball(
        "round-flower-petal",
        index ? "yellow" : "pink",
        [Math.cos(angle) * 0.067, Math.sin(angle) * 0.067, 0],
        [0.06, 0.06, 0.035],
        flower,
      );
    }
    ball("flower-centre", "cream", [0, 0, 0.03], [0.042, 0.042, 0.022], flower);
  }
  const dispose = () => {
    const geometries = new Set<BufferGeometry>([
      sphere,
      soil,
      trim,
      twig,
      house,
      door,
      book,
    ]);
    const materials = new Set<Material>(Object.values(mats));
    root.traverse((node) => {
      if (node instanceof Mesh) {
        geometries.add(node.geometry);
        for (const material of Array.isArray(node.material)
          ? node.material
          : [node.material])
          materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    grain.dispose();
  };
  return { root, dispose };
}
