import {
  CapsuleGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Object3D,
} from "three";
import { addClosedEyes, setCompanionEyes } from "./closedEyes";

type Point = readonly [number, number, number];
export const foxPalette = {
  coat: "#f5823f",
  cream: "#fff0d3",
  ink: "#27334b",
  cheek: "#ed928a",
  scarf: "#188f9b",
  boots: "#285da1",
  pack: "#75c9b3",
  sun: "#ffd05a",
  white: "#ffffff",
} as const;

/** Bevelled toy panel centred on all three axes; no textures or external assets. */
export function roundedPanel(
  width: number,
  height: number,
  depth: number,
  radius: number,
) {
  const x = -width / 2,
    y = -height / 2,
    r = Math.min(radius, width / 2, height / 2);
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const bevel = Math.min(0.035, depth / 5, r / 3);
  const geometry = new ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return geometry;
}

function earGeometry() {
  const shape = new Shape();
  shape.moveTo(-0.2, -0.09);
  shape.quadraticCurveTo(-0.28, -0.06, -0.2, 0.1);
  shape.lineTo(-0.04, 0.41);
  shape.quadraticCurveTo(0, 0.48, 0.06, 0.39);
  shape.lineTo(0.22, 0.08);
  shape.quadraticCurveTo(0.28, -0.08, 0.16, -0.1);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.025,
    bevelSegments: 3,
    curveSegments: 7,
  });
  geometry.translate(0, 0, -0.045);
  return geometry;
}

export function createFoxModel() {
  const root = new Group();
  root.name = "original-fox-guide";
  const body = new Group();
  body.name = "fox-pose";
  root.add(body);
  const sphere = new SphereGeometry(1, 20, 14),
    limb = new CapsuleGeometry(0.12, 0.22, 6, 12),
    ear = earGeometry(),
    pack = roundedPanel(0.6, 0.67, 0.22, 0.16),
    collar = new TorusGeometry(0.285, 0.06, 8, 24),
    smile = new TorusGeometry(0.093, 0.018, 6, 18, Math.PI);
  const materials = Object.fromEntries(
    Object.entries(foxPalette).map(([key, color]) => [
      key,
      new MeshStandardMaterial({
        color,
        roughness: key === "ink" ? 0.32 : 0.88,
        metalness: 0,
        envMapIntensity: 0.55,
      }),
    ]),
  ) as Record<keyof typeof foxPalette, MeshStandardMaterial>;
  const mesh = (
    name: string,
    geometry: BufferGeometry,
    color: keyof typeof foxPalette,
    position: Point,
    scale: Point = [1, 1, 1],
    parent: Group = body,
  ) => {
    const node = new Mesh(geometry, materials[color]);
    node.name = name;
    node.position.set(...position);
    node.scale.set(...scale);
    parent.add(node);
    return node;
  };
  const ball = (
    name: string,
    color: keyof typeof foxPalette,
    position: Point,
    scale: Point,
    parent = body,
  ) => mesh(name, sphere, color, position, scale, parent);
  const tail = new Group();
  tail.name = "fox-tail";
  tail.position.set(-0.35, 0.35, 0.04);
  body.add(tail);
  ball("tail-root", "coat", [-0.16, 0.15, 0], [0.22, 0.35, 0.22], tail);
  ball(
    "fluffy-tail",
    "coat",
    [-0.35, 0.33, 0],
    [0.28, 0.44, 0.27],
    tail,
  ).rotation.z = 0.65;
  ball(
    "cream-tail-tip",
    "cream",
    [-0.65, 0.56, 0.015],
    [0.2, 0.24, 0.2],
    tail,
  ).rotation.z = 0.65;

  mesh("mint-backpack", pack, "pack", [0.04, 0.65, -0.33]);
  ball("backpack-pocket", "scarf", [0.04, 0.55, -0.49], [0.21, 0.15, 0.06]);
  for (const side of [-1, 1]) {
    ball(
      "boot-" + side,
      "boots",
      [side * 0.22, 0.12, 0.08],
      [0.22, 0.14, 0.29],
    );
    ball(
      "boot-toe-" + side,
      "cream",
      [side * 0.22, 0.135, 0.38],
      [0.15, 0.055, 0.06],
    );
  }
  ball("orange-body", "coat", [0, 0.62, 0], [0.43, 0.53, 0.33]);
  ball("cream-belly", "cream", [0, 0.59, 0.285], [0.28, 0.33, 0.085]);
  const arm = new Group();
  arm.name = "waving-paw";
  arm.position.set(0.38, 0.86, 0.015);
  body.add(arm);
  mesh("right-sleeve", limb, "coat", [0, -0.2, 0], [1, 1, 1], arm);
  ball(
    "right-cream-paw",
    "cream",
    [0, -0.44, 0.025],
    [0.118, 0.14, 0.118],
    arm,
  );
  const leftArm = new Group();
  leftArm.position.set(-0.38, 0.8, 0);
  leftArm.rotation.z = -0.42;
  body.add(leftArm);
  mesh("left-sleeve", limb, "coat", [0, -0.15, 0], [1, 1, 1], leftArm);
  ball(
    "left-cream-paw",
    "cream",
    [0, -0.4, 0.025],
    [0.118, 0.14, 0.118],
    leftArm,
  );
  const neck = mesh("teal-scarf", collar, "scarf", [0, 0.96, 0.015]);
  neck.rotation.x = Math.PI / 2;
  ball("scarf-knot", "scarf", [0.23, 0.9, 0.3], [0.1, 0.11, 0.09]);
  ball(
    "scarf-tail",
    "scarf",
    [0.24, 0.75, 0.31],
    [0.095, 0.22, 0.045],
  ).rotation.z = -0.35;
  ball("sun-badge", "sun", [-0.08, 0.62, 0.382], [0.072, 0.072, 0.025]);
  ball(
    "sun-badge-centre",
    "cream",
    [-0.08, 0.62, 0.407],
    [0.028, 0.028, 0.012],
  );

  const head = new Group();
  head.name = "fox-head";
  head.position.set(0, 1.28, 0.015);
  body.add(head);
  ball("round-fox-head", "coat", [0, 0, 0], [0.55, 0.43, 0.39], head);
  for (const side of [-1, 1]) {
    const outer = mesh(
      "fox-ear-" + side,
      ear,
      "coat",
      [side * 0.34, 0.31, -0.015],
      [1, 1, 1],
      head,
    );
    outer.rotation.z = side * -0.18;
    const inner = mesh(
      "pink-ear-" + side,
      ear,
      "cheek",
      [side * 0.34, 0.34, 0.092],
      [0.56, 0.65, 0.35],
      head,
    );
    inner.rotation.z = side * -0.18;
    ball(
      "cream-face-" + side,
      "cream",
      [side * 0.22, -0.045, 0.25],
      [0.3, 0.27, 0.175],
      head,
    );
    ball(
      "blush-" + side,
      "cheek",
      [side * 0.365, -0.09, 0.373],
      [0.085, 0.038, 0.025],
      head,
    );
  }
  ball("muzzle-base", "cream", [0, -0.16, 0.37], [0.27, 0.19, 0.17], head);
  const eyes = new Group();
  eyes.name = "blinking-eyes";
  eyes.position.set(0, 0.09, 0.426);
  head.add(eyes);
  for (const side of [-1, 1]) {
    ball(
      "eye-" + side,
      "ink",
      [side * 0.225, 0, 0],
      [0.065, 0.096, 0.036],
      eyes,
    );
    ball(
      "eye-glint-" + side,
      "white",
      [side * 0.225 - 0.017, 0.036, 0.031],
      [0.021, 0.026, 0.012],
      eyes,
    );
    ball(
      "eye-small-glint-" + side,
      "white",
      [side * 0.225 + 0.019, -0.025, 0.033],
      [0.01, 0.012, 0.008],
      eyes,
    );
  }
  ball("little-nose", "ink", [0, -0.1, 0.507], [0.075, 0.052, 0.045], head);
  ball(
    "nose-glint",
    "white",
    [-0.017, -0.082, 0.544],
    [0.017, 0.009, 0.006],
    head,
  );
  const mouth = mesh(
    "gentle-smile",
    smile,
    "ink",
    [0, -0.19, 0.503],
    [1, 0.63, 1],
    head,
  );
  mouth.rotation.z = Math.PI;

  const lids = addClosedEyes(root, head, "fox", materials.ink);
  const dispose = () => {
    lids.release();
    const geometries = new Set<BufferGeometry>();
    root.traverse((node) => {
      if (node instanceof Mesh) geometries.add(node.geometry);
    });
    geometries.forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  };
  applyFoxPose(
    { body, head, arm, tail, eyes, closedEyes: lids.group },
    { time: 0, age: 10, paused: true, idle: false, reaction: "thinking" },
  );
  return { root, body, head, arm, tail, eyes, closedEyes: lids.group, dispose };
}
export type FoxModel = ReturnType<typeof createFoxModel>;
export type FoxPoseNodes = Record<
  "body" | "head" | "arm" | "tail" | "eyes",
  Object3D
> & { closedEyes?: Object3D };
export function applyFoxPose(
  model: FoxPoseNodes,
  {
    time,
    age,
    paused,
    idle,
    reaction,
    eyesClosed,
  }: {
    time: number;
    age: number;
    paused: boolean;
    idle: boolean;
    reaction: string;
    eyesClosed?: boolean;
  },
) {
  const gesture =
    paused || age < 0 || age > 0.9 ? 0 : Math.sin((Math.PI * age) / 0.9);
  model.body.position.y = paused
    ? 0
    : (idle ? Math.sin(time * 1.5) * 0.018 : 0) +
      gesture * (reaction === "incorrect" ? 0.025 : 0.11);
  model.body.rotation.z = paused
    ? 0
    : gesture * (reaction === "incorrect" ? 0.025 : -0.045);
  model.head.rotation.z = paused
    ? 0
    : gesture * (reaction === "thinking" ? 0.08 : -0.035);
  model.arm.rotation.z = 0.35 + gesture * (1.8 + Math.sin(age * 19) * 0.16);
  model.tail.rotation.z =
    -0.1 +
    (paused ? 0 : (idle ? Math.sin(time * 1.4) * 0.055 : 0) + gesture * 0.17);
  const phase = ((time % 4.6) + 4.6) % 4.6;
  setCompanionEyes(
    model,
    eyesClosed ?? (!paused && idle && phase >= 0.015 && phase <= 0.145),
  );
}
