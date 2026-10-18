import { Group, Mesh, MeshStandardMaterial, type Material } from "three";
import { createClayGrain } from "./claySurface";
import type { FoxPoseNodes } from "./foxModel";
import type { CompanionId } from "../../packages/domain/companions";

/** Clone pose nodes and materials; leave the loader-owned shared geometry intact. */
export function prepareClayPartner(source: Group, kind: CompanionId) {
  const root = source.clone(true);
  const find = (name: string) => {
    const node = root.getObjectByName(name);
    if (!node) throw new Error(`Clay partner pose node missing: ${name}`);
    return node;
  };
  const pose: FoxPoseNodes = {
    body: find(kind === "fox" ? "fox-pose" : "pikachu-pose"),
    head: find(kind === "fox" ? "fox-head" : "pikachu-head"),
    arm: find(kind === "fox" ? "waving-paw" : "pikachu-waving-paw"),
    tail: find(kind === "fox" ? "fox-tail" : "pikachu-tail"),
    eyes: find(kind === "fox" ? "blinking-eyes" : "pikachu-eyes"),
  };
  const grain = createClayGrain(),
    materials = new Map<Material, Material>();
  const clone = (source: Material) => {
    let owned = materials.get(source);
    if (owned) return owned;
    owned = source.clone();
    materials.set(source, owned);
    if (owned instanceof MeshStandardMaterial) {
      const bead =
        Math.max(owned.color.r, owned.color.g, owned.color.b) < 0.12 &&
        owned.roughness < 0.5;
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
export const prepareClayFox = (source: Group) =>
  prepareClayPartner(source, "fox");
