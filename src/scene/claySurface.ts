import {
  DataTexture,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
} from "three";

/** Tiny deterministic, linear-data height map; no downloads or animated noise. */
export function createClayGrain() {
  const size = 64,
    data = new Uint8Array(size * size * 4);
  let seed = 7319;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 110 + Math.floor((seed / 4294967296) * 36);
    data.set([value, value, value, 255], i * 4);
  }
  const texture = new DataTexture(
    data,
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.name = "subtle-air-dry-clay-grain";
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  return texture;
}
