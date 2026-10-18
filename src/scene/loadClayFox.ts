import { Group, Mesh, MeshStandardMaterial, type Material } from "three";
import { createClayGrain } from "./claySurface";
import type { FoxPoseNodes } from "./foxModel";

/** Clone pose nodes and materials; leave the loader-owned shared geometry intact. */
export function prepareClayFox(source: Group) {
  const root = source.clone(true);
  const find = (name: string) => {
    const node = root.getObjectByName(name);
    if (!node) throw new Error(`Clay fox pose node missing: ${name}`);
    return node;
  };
  const pose: FoxPoseNodes = {
    body: find("fox-pose"),
    head: find("fox-head"),
    arm: find("waving-paw"),
    tail: find("fox-tail"),
    eyes: find("blinking-eyes"),
  };
  const grain = createClayGrain(),
    materials = new Map<Material, Material>();
  const clone = (source: Material) => {
    let owned = materials.get(source);
    if (owned) return owned;
    owned = source.clone();
    materials.set(source, owned);
    if (owned instanceof MeshStandardMaterial) {
      const bead = Math.max(owned.color.r, owned.color.g, owned.color.b) < 0.12;
      owned.envMapIntensity = 0.55;
      if (!bead) {
        owned.roughness = Math.max(0.85, owned.roughness);
        owned.bumpMap = grain;
        owned.bumpScale = 0.004;
      }
      owned.needsUpdate = true;
    }
    return owned;
  };
  root.traverse((node) => {
    if (node instanceof Mesh) {
      node.material = Array.isArray(node.material)
        ? node.material.map(clone)
        : clone(node.material);
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return {
    root,
    ...pose,
    dispose: () => {
      materials.forEach((material) => material.dispose());
      grain.dispose();
    },
  };
}
