export type SpatialVisual = { relation: "in" | "on" | "under" };
export type SpatialPoint = [number, number, number];
export const SPATIAL_BALL_RADIUS = 0.19;
export const spatialHome: SpatialPoint = [-1.7, 0.2, 0.85];
export function spatialTarget(
  relation: SpatialVisual["relation"],
): SpatialPoint {
  return relation === "in"
    ? [1.2, 0.29, 0]
    : relation === "on"
      ? [-0.75, 1.16, 0]
      : [-0.75, 0.2, 0];
}
// Enter/leave under the table from the front; enter an open box from above.
// The ball follows explicit clearance points instead of crossing solid furniture.
export function spatialPath(
  from: SpatialPoint,
  target: SpatialPoint,
): SpatialPoint[] {
  return [
    from,
    ...(from[0] > 0.6 && Math.abs(from[2]) < 0.65
      ? [[from[0], 1.9, from[2]] as SpatialPoint]
      : []),
    [from[0], from[0] > 0.6 ? 1.9 : from[1], 1.1],
    [from[0], 1.9, 1.1],
    [target[0], 1.9, 1.1],
    ...(target[0] < 0 && target[1] < 0.5
      ? [[target[0], target[1], 1.1] as SpatialPoint]
      : [[target[0], 1.9, target[2]] as SpatialPoint]),
    target,
  ];
}
export function spatialPosition(
  path: SpatialPoint[],
  progress: number,
): SpatialPoint {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 1;
  if (p === 0) return [...path[0]];
  if (p === 1) return [...path[path.length - 1]];
  const lengths = path
    .slice(1)
    .map((point, i) =>
      Math.hypot(...point.map((v, axis) => v - path[i][axis])),
    );
  let distance = p * lengths.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] && lengths[i] > 0) {
      const t = distance / lengths[i];
      return path[i].map(
        (value, axis) => value + (path[i + 1][axis] - value) * t,
      ) as SpatialPoint;
    }
    distance -= lengths[i];
  }
  return [...path[path.length - 1]];
}
