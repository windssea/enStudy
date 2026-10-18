import {
  BufferGeometry,
  Float32BufferAttribute,
  CapsuleGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { applyFoxPose, type FoxPoseNodes } from "./foxModel";
import { addClosedEyes } from "./closedEyes";

export const pikachuPalette = {
  yellow: "#ffda50",
  ink: "#27313c",
  ear: "#393744",
  cheek: "#ef6b5e",
  brown: "#a67446",
  white: "#fffaf0",
  scarf: "#4ba99a",
} as const;
/** Close both arc ends in the runtime geometry, not only the authoring preview. */
function closedSmileArc() {
  const radial = 8,
    tubular = 18,
    radius = 0.055;
  const geometry = new TorusGeometry(radius, 0.01, radial, tubular, Math.PI);
  const position = Array.from(geometry.getAttribute("position").array),
    indices = Array.from(geometry.index!.array);
  for (const end of [0, 1]) {
    const center = position.length / 3;
    position.push(end ? -radius : radius, 0, 0);
    for (let j = 0; j < radial; j++) {
      const a = j * (tubular + 1) + end * tubular,
        b = (j + 1) * (tubular + 1) + end * tubular;
      indices.push(...(end ? [center, b, a] : [center, a, b]));
    }
  }
  geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
  geometry.setIndex(indices);
  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("normal");
  geometry.computeVertexNormals();
  return geometry;
}
const tailGeometry = () => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.15, 0.12);
  shape.lineTo(0.04, 0.29);
  shape.lineTo(0.34, 0.48);
  shape.lineTo(0.22, 0.62);
  shape.lineTo(0.68, 0.91);
  shape.lineTo(0.85, 0.68);
  shape.lineTo(0.49, 0.46);
  shape.lineTo(0.6, 0.3);
  shape.lineTo(0.29, 0.13);
  shape.lineTo(0.37, -0.04);
  shape.lineTo(0.1, -0.14);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.1,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.018,
    bevelSegments: 4,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -0.05);
  return geometry;
};

export function createPikachuModel({
  authoring = false,
  adventure = false,
}: { authoring?: boolean; adventure?: boolean } = {}) {
  const root = new Group();
  root.name = "clay-pikachu-partner";
  const body = new Group();
  body.name = "pikachu-pose";
  root.add(body);
  const sphere = new SphereGeometry(1, 24, 16),
    limb = new CapsuleGeometry(0.115, 0.22, 8, 16),
    smile = closedSmileArc();
  const earBase = new LatheGeometry(
    [
      [0, 0],
      [0.085, 0],
      [0.105, 0.15],
      [0.095, 0.4],
      [0.075, 0.52],
      [0, 0.52],
    ].map((p) => new Vector2(...(p as [number, number]))),
    32,
  );
  const earTip = new LatheGeometry(
    [
      [0, 0.5],
      [0.077, 0.5],
      [0.072, 0.56],
      [0.04, 0.72],
      [0, 0.78],
    ].map((p) => new Vector2(...(p as [number, number]))),
    32,
  );
  for (const geometry of [earBase, earTip]) {
    const p = geometry.getAttribute("position"),
      kept: number[] = [],
      a = new Vector3(),
      b = new Vector3(),
      c = new Vector3();
    const indices = geometry.index!;
    for (let i = 0; i < indices.count; i += 3) {
      const ia = indices.getX(i),
        ib = indices.getX(i + 1),
        ic = indices.getX(i + 2);
      a.fromBufferAttribute(p, ia);
      b.fromBufferAttribute(p, ib);
      c.fromBufferAttribute(p, ic);
      if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-16) kept.push(ia, ib, ic);
    }
    geometry.setIndex(kept);
    geometry.computeVertexNormals();
  }
  const materials = Object.fromEntries(
    Object.entries(pikachuPalette).map(([key, color]) => [
      key,
      new MeshStandardMaterial({
        color,
        roughness: key === "ink" ? 0.32 : 0.88,
        metalness: 0,
        envMapIntensity: 0.55,
      }),
    ]),
  ) as Record<keyof typeof pikachuPalette, MeshStandardMaterial>;
  const add = (
    name: string,
    geometry: BufferGeometry,
    color: keyof typeof materials,
    position: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
    parent = body,
  ) => {
    const mesh = new Mesh(geometry, materials[color]);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  };
  const ball = (
    name: string,
    color: keyof typeof materials,
    position: [number, number, number],
    scale: [number, number, number],
    parent = body,
  ) => add(name, sphere, color, position, scale, parent);
  ball("pikachu-yellow-body", "yellow", [0, 0.62, 0], [0.43, 0.5, 0.32]);
  for (const side of [-1, 1])
    ball(
      `pikachu-foot-${side}`,
      "yellow",
      [side * 0.23, 0.12, 0.13],
      [0.25, 0.12, 0.3],
    );
  const head = new Group();
  head.name = "pikachu-head";
  head.position.set(0, 1.25, 0.015);
  body.add(head);
  ball("pikachu-round-head", "yellow", [0, 0, 0], [0.53, 0.43, 0.37], head);
  for (const side of [-1, 1]) {
    const ear = new Group();
    ear.name = `pikachu-ear-${side}`;
    ear.position.set(side * 0.32, 0.28, -0.015);
    ear.rotation.z = side * -0.32;
    head.add(ear);
    const bend = (geometry: BufferGeometry, tip = false) => {
      if (!adventure) return geometry;
      const bent = geometry.clone();
      const p = bent.getAttribute("position");
      for (let i = 0; i < p.count; i++) {
        const t = side === 1 ? Math.max(0, (p.getY(i) - 0.38) / 0.4) : 0;
        p.setXYZ(
          i,
          p.getX(i) * (tip ? 1.08 : 1) + 0.15 * t * t,
          p.getY(i) - 0.1 * t * t,
          p.getZ(i) * (tip ? 1.08 : 1) + 0.12 * t * t,
        );
      }
      bent.computeVertexNormals();
      return bent;
    };
    add(
      `yellow-ear-${side}`,
      bend(earBase),
      "yellow",
      [0, 0, 0],
      [1, 1, 1],
      ear,
    );
    add(
      `black-ear-tip-${side}`,
      bend(earTip, true),
      "ear",
      [0, 0, 0],
      [1, 1, 1],
      ear,
    );
  }
  const eyes = new Group();
  eyes.name = "pikachu-eyes";
  eyes.position.y = 0.075;
  head.add(eyes);
  const face = (x: number, y: number) =>
    0.37 * Math.sqrt(Math.max(0, 1 - (x / 0.53) ** 2 - (y / 0.43) ** 2));
  const fit = (
    mesh: Mesh,
    frame: Group,
    surface: (x: number, y: number) => number,
    front: number,
    back: number,
    side = 1,
  ) => {
    if (authoring) return;
    root.updateMatrixWorld(true);
    const matrix = new Matrix4()
        .copy(frame.matrixWorld)
        .invert()
        .multiply(mesh.matrixWorld),
      inverse = matrix.clone().invert();
    mesh.geometry = mesh.geometry.clone();
    const attribute = mesh.geometry.getAttribute("position");
    let min = Infinity,
      max = -Infinity;
    for (let i = 0; i < attribute.count; i++) {
      min = Math.min(min, attribute.getZ(i));
      max = Math.max(max, attribute.getZ(i));
    }
    const middle = (max + min) / 2,
      span = Math.max((max - min) / 2, 0.000001),
      p = new Vector3();
    for (let i = 0; i < attribute.count; i++) {
      const depth = ((attribute.getZ(i) - middle) / span) * side;
      p.fromBufferAttribute(attribute, i).applyMatrix4(matrix);
      p.z =
        surface(p.x, p.y) +
        side * (depth * (depth >= 0 ? front : back) + 0.00015);
      p.applyMatrix4(inverse);
      attribute.setXYZ(i, p.x, p.y, p.z);
    }
    mesh.geometry.computeVertexNormals();
  };
  for (const side of [-1, 1]) {
    const eye = ball(
      `pikachu-eye-${side}`,
      "ink",
      [side * 0.205, 0, 0.37],
      [0.065, 0.095, 0.035],
      eyes,
    );
    fit(eye, head, face, 0.022, 0.006);
    const eyeSurface = (x: number, y: number) =>
      face(x, y) +
      0.022 *
        Math.sqrt(
          Math.max(
            0,
            1 - ((x - side * 0.205) / 0.065) ** 2 - ((y - 0.075) / 0.095) ** 2,
          ),
        );
    const glint = ball(
      `pikachu-eye-glint-${side}`,
      "white",
      [side * 0.205 - 0.017, 0.027, 0.403],
      [0.019, 0.024, 0.009],
      eyes,
    );
    fit(glint, head, eyeSurface, 0.002, 0.001);
    const cheek = ball(
      `pikachu-red-cheek-${side}`,
      "cheek",
      [side * 0.365, -0.045, 0.3],
      [0.112, 0.09, 0.04],
      head,
    );
    fit(cheek, head, face, 0.012, 0.005);
    const arc = add(
      `pikachu-smile-${side}`,
      smile,
      "ink",
      [side * 0.055, -0.105, 0.37],
      [1, 0.65, 1],
      head,
    );
    arc.rotation.z = Math.PI;
    fit(arc, head, face, 0.008, 0.004);
  }
  const nose = ball(
    "pikachu-tiny-nose",
    "ink",
    [0, -0.04, 0.38],
    [0.032, 0.023, 0.02],
    head,
  );
  fit(nose, head, face, 0.012, 0.005);
  const arm = new Group();
  arm.name = "pikachu-waving-paw";
  arm.position.set(0.38, 0.85, 0.015);
  body.add(arm);
  add("pikachu-right-arm", limb, "yellow", [0, -0.18, 0.015], [1, 1, 1], arm);
  ball(
    "pikachu-right-paw",
    "yellow",
    [0, -0.37, 0.025],
    [0.116, 0.135, 0.118],
    arm,
  );
  const left = new Group();
  left.position.set(-0.38, 0.82, 0.015);
  left.rotation.z = -0.35;
  body.add(left);
  add("pikachu-left-arm", limb, "yellow", [0, -0.18, 0.015], [1, 1, 1], left);
  ball(
    "pikachu-left-paw",
    "yellow",
    [0, -0.37, 0.025],
    [0.116, 0.135, 0.118],
    left,
  );
  for (const [i, y] of [0.59, 0.81].entries()) {
    const stripe = ball(
      `pikachu-back-stripe-${i}`,
      "brown",
      [0, y, -0.3],
      [0.31, 0.055, 0.035],
    );
    fit(
      stripe,
      body,
      (x, y) =>
        -0.32 *
        Math.sqrt(Math.max(0, 1 - (x / 0.43) ** 2 - ((y - 0.62) / 0.5) ** 2)),
      0.013,
      0.005,
      -1,
    );
  }
  const tail = new Group();
  tail.name = "pikachu-tail";
  tail.position.set(0.28, 0.4, -0.22);
  body.add(tail);
  ball(
    "pikachu-brown-tail-root",
    "brown",
    [0.04, -0.015, 0],
    [0.12, 0.18, 0.09],
    tail,
  );
  add(
    "pikachu-lightning-tail",
    tailGeometry(),
    "yellow",
    [0, 0, -0.02],
    [1, 1, 1],
    tail,
  );
  if (adventure) {
    // A closed, soft collar with a separate thick bib. Kept on the body so
    // head nods never pull the neck cloth through the face.
    const collar = new TorusGeometry(0.36, 0.042, 10, 48);
    const neck = add(
      "pikachu-scarf-collar",
      collar,
      "scarf",
      [0, 0.98, 0.015],
      [1.16, 0.83, 1],
    );
    neck.rotation.x = Math.PI / 2;
    const shape = new Shape();
    shape.moveTo(-0.22, 0.025);
    shape.quadraticCurveTo(0, -0.02, 0.22, 0.025);
    shape.quadraticCurveTo(0.17, -0.12, 0.035, -0.22);
    shape.quadraticCurveTo(0, -0.245, -0.035, -0.22);
    shape.quadraticCurveTo(-0.17, -0.12, -0.22, 0.025);
    const bib = new ExtrudeGeometry(shape, {
      depth: 0.028,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3,
      curveSegments: 10,
    });
    add("pikachu-scarf-bib", bib, "scarf", [0, 0.98, 0.305]);
    ball(
      "pikachu-scarf-knot",
      "scarf",
      [0.29, 0.97, -0.15],
      [0.075, 0.065, 0.075],
    );
    const end = ball(
      "pikachu-scarf-fold",
      "scarf",
      [0.35, 0.865, -0.18],
      [0.07, 0.16, 0.035],
    );
    end.rotation.z = -0.25;
    ball(
      "pikachu-scarf-button",
      "white",
      [0, 0.9, 0.361],
      [0.031, 0.031, 0.012],
    );
  }
  const lids = authoring
    ? undefined
    : addClosedEyes(root, head, "pikachu", materials.ink);
  const pose: FoxPoseNodes = {
    body,
    head,
    arm,
    tail,
    eyes,
    closedEyes: lids?.group,
  };
  applyFoxPose(pose, {
    time: 0,
    age: 10,
    paused: true,
    idle: false,
    reaction: "thinking",
  });
  tail.rotation.z = 0.015;
  return {
    root,
    ...pose,
    dispose: () => {
      lids?.release();
      const geometries = new Set<BufferGeometry>([
        sphere,
        limb,
        smile,
        earBase,
        earTip,
      ]);
      root.traverse((node) => {
        if (node instanceof Mesh) geometries.add(node.geometry);
      });
      geometries.forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
