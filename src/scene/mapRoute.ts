export type MapPoint = readonly [number, number, number];
export const mapStops: readonly MapPoint[] = [
  [-3.3, 0, -1.65],
  [0, 0, -1.65],
  [3.3, 0, -1.65],
  [3.3, 0, 2.15],
  [0, 0, 2.15],
  [-3.3, 0, 2.15],
];
export const mapColors = [
  "#64dcae",
  "#ffc34d",
  "#68bbef",
  "#ff9f81",
  "#b697f2",
  "#65cecb",
] as const;
export const mapKinds = [
  "home",
  "library",
  "garden",
  "workshop",
  "observatory",
  "lighthouse",
] as const;
export const mapTravelMs = 2200;
export function mapRouteLeg(index: number): MapPoint[] {
  const a = mapStops[index],
    b = mapStops[index + 1];
  const start: MapPoint = [a[0], 0.37, a[2] + 0.85],
    end: MapPoint = [b[0], 0.37, b[2] + 0.85];
  return index === 2
    ? [start, [4.65, 0.37, start[2]], [4.65, 0.37, end[2]], end]
    : [start, end];
}
export function mapLegLength(points: readonly MapPoint[]) {
  return points
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[2] - points[i][2]),
      0,
    );
}
const clamp = (n: number, max: number) =>
  Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
export function mapRoutePoint(value: number): [number, number, number] {
  const bounded = clamp(value, mapStops.length - 1);
  const index = Math.min(mapStops.length - 2, Math.floor(bounded));
  const points = mapRouteLeg(index);
  let distance = (bounded - index) * mapLegLength(points);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1],
      length = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (distance <= length || i === points.length - 2) {
      const p = Math.min(1, distance / length);
      return [a[0] + (b[0] - a[0]) * p, 0.37, a[2] + (b[2] - a[2]) * p];
    }
    distance -= length;
  }
  return [...points[points.length - 1]];
}
/** Absolute interpolation supports interruption and a direct quiet-mode final state. */
export function mapTravel(
  from: number,
  to: number,
  elapsedMs: number,
  quiet = false,
  fromLift = 0,
) {
  const start = clamp(from, 5),
    end = clamp(to, 5);
  const p = quiet ? 1 : clamp(elapsedMs, mapTravelMs) / mapTravelMs;
  const ease = p * p * (3 - 2 * p);
  const value = start + (end - start) * ease;
  const position = mapRoutePoint(value);
  const moving = p < 1 && Math.abs(end - start) > 0.0001;
  if (moving)
    position[1] += Math.min(
      0.12,
      clamp(fromLift, 0.12) * (1 - p) +
        Math.sin(Math.PI * p) *
          Math.abs(Math.sin((value - start) * Math.PI * 2)) *
          0.12,
    );
  return { value, position, moving };
}
