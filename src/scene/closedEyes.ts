import {
  CatmullRomCurve3,
  Box3,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  Raycaster,
  TubeGeometry,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import type { CompanionId } from "../../packages/domain/companions";

type FaceColour = {
  mesh: Mesh;
  original: Mesh["geometry"];
  owned: Mesh["geometry"];
  attribute: Float32BufferAttribute;
  open: Float32Array;
  closed: Float32Array;
};
const faceStates = new WeakMap<
  Object3D,
  { closed: boolean; colours: FaceColour[] }
>();

export function setCompanionEyes(
  model: { eyes: Object3D; closedEyes?: Object3D },
  closed: boolean,
) {
  // Fitted eye geometry stays at its authored dimensions in every state.
  model.eyes.scale.y = 1;
  model.eyes.visible = !closed || !model.closedEyes;
  if (model.closedEyes) {
    model.closedEyes.visible = closed;
    const state = faceStates.get(model.closedEyes);
    if (state && state.closed !== closed) {
      for (const colour of state.colours) {
        colour.attribute.array.set(closed ? colour.closed : colour.open);
        colour.attribute.needsUpdate = true;
      }
      state.closed = closed;
    }
  }
}

/** Two closed solids projected onto the actual face, rather than squashed beads. */
export function addClosedEyes(
  root: Object3D,
  head: Object3D,
  kind: CompanionId,
  material: Material,
) {
  const group = new Group();
  group.name = "companion-closed-eyes";
  group.visible = false;
  const geometries: TubeGeometry[] = [];
  const colours: FaceColour[] = [];
  const inverse = new Matrix4();
  const ray = new Raycaster();
  const point = new Vector3();
  let probes = 0;
  root.updateMatrixWorld(true);
  inverse.copy(head.matrixWorld).invert();
  // Baked AO includes the original raised eye beads. Keep original colours for
  // open eyes and locally remove those ghost shadows only for a closed face.
  // All edited attributes belong to this instance; loader geometry stays read-only.
  for (const name of kind === "fox"
    ? ["cream-face--1", "cream-face-1"]
    : ["pikachu-round-head"]) {
    const mesh = root.getObjectByName(name) as Mesh;
    const source = mesh?.geometry.getAttribute("color");
    if (!source) continue; // Procedural loading models have no baked eye shadow.
    const original = mesh.geometry,
      owned = original.clone();
    const open = new Float32Array(source.count * source.itemSize);
    for (let i = 0; i < source.count; i++) {
      const values = [
        source.getX(i),
        source.getY(i),
        source.getZ(i),
        source.itemSize === 4 ? source.getW(i) : 1,
      ];
      open.set(values.slice(0, source.itemSize), i * source.itemSize);
    }
    const closed = open.slice();
    const toHead = new Matrix4().copy(inverse).multiply(mesh.matrixWorld);
    const p = owned.getAttribute("position");
    const bounds = new Box3();
    for (let i = 0; i < p.count; i++)
      bounds.expandByPoint(
        point.fromBufferAttribute(p, i).applyMatrix4(toHead),
      );
    const middleZ = (bounds.min.z + bounds.max.z) / 2;
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(toHead);
      if (point.z < middleZ) continue;
      const center = kind === "fox" ? 0.225 : 0.205;
      const y = kind === "fox" ? 0.09 : 0.075;
      const distance = Math.min(
        ...[-1, 1].map((side) =>
          Math.hypot((point.x - side * center) / 0.12, (point.y - y) / 0.15),
        ),
      );
      const t = Math.max(0, Math.min(1, (distance - 0.45) / 0.55));
      const weight = 1 - t * t * (3 - 2 * t);
      for (let c = 0; c < 3; c++) {
        const at = i * source.itemSize + c;
        closed[at] = open[at] + (1 - open[at]) * weight;
      }
    }
    const attribute = new Float32BufferAttribute(open.slice(), source.itemSize);
    attribute.setUsage(DynamicDrawUsage);
    owned.setAttribute("color", attribute);
    mesh.geometry = owned;
    colours.push({ mesh, original, owned, attribute, open, closed });
  }
  const direction = new Vector3(0, 0, -1).transformDirection(head.matrixWorld);
  for (const side of [-1, 1]) {
    const target = root.getObjectByName(
      kind === "fox" ? `cream-face-${side}` : "pikachu-round-head",
    );
    if (!(target instanceof Mesh))
      throw Error("Closed-eye support is missing.");
    const centerX = side * (kind === "fox" ? 0.225 : 0.205);
    const centerY = kind === "fox" ? 0.09 : 0.075;
    const curve = new CatmullRomCurve3(
      Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        return new Vector3(
          centerX + (t - 0.5) * 0.112,
          centerY - Math.sin(Math.PI * t) * 0.014,
          0,
        );
      }),
    );
    const segments = 16,
      radial = 8;
    const geometry = new TubeGeometry(curve, segments, 0.006, radial, false);
    const positions = Array.from(geometry.getAttribute("position").array);
    const indices = Array.from(geometry.index!.array);
    // TubeGeometry leaves both ends open. Close them before conformation.
    for (const end of [0, 1]) {
      const center = positions.length / 3;
      positions.push(...curve.getPointAt(end).toArray());
      const first = end * segments * (radial + 1);
      for (let r = 0; r < radial; r++) {
        const a = first + r,
          b = a + 1;
        indices.push(...(end ? [center, b, a] : [center, a, b]));
      }
    }
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.deleteAttribute("uv");
    const attribute = geometry.getAttribute("position");
    const colour = new Float32Array(attribute.count * 3).fill(1);
    geometry.setAttribute("color", new Float32BufferAttribute(colour, 3));
    for (let i = 0; i < attribute.count; i++) {
      const x = attribute.getX(i),
        y = attribute.getY(i),
        depth = attribute.getZ(i);
      const origin = new Vector3(x, y, 3).applyMatrix4(head.matrixWorld);
      ray.set(origin, direction);
      const hit = ray.intersectObject(target, false)[0];
      if (!hit) {
        geometry.dispose();
        geometries.forEach((owned) => owned.dispose());
        colours.forEach((colour) => {
          colour.mesh.geometry = colour.original;
          colour.owned.dispose();
        });
        throw Error(`Closed eye misses its face: ${kind}/${side}`);
      }
      point.copy(hit.point).applyMatrix4(inverse);
      // The rear of the 0.006-radius tube stays 0.0005 in front of the face.
      attribute.setXYZ(i, x, y, point.z + 0.0065 + depth);
      probes++;
    }
    geometry.deleteAttribute("normal");
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material);
    mesh.name = `companion-closed-eye-${side}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
    geometries.push(geometry);
  }
  head.add(group);
  faceStates.set(group, { closed: false, colours });
  group.userData.surfaceProbes = probes;
  return {
    group,
    probes,
    release: () => faceStates.delete(group),
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      colours.forEach((colour) => {
        colour.mesh.geometry = colour.original;
        colour.owned.dispose();
      });
      faceStates.delete(group);
    },
  };
}
