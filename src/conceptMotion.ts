export const CONCEPT_MOTION_MS = 700;
export function conceptProgress(elapsedMs: number, instant: boolean) {
  if (instant) return 1;
  const phase = Math.max(
    0,
    Math.min(1, Number.isFinite(elapsedMs) ? elapsedMs / CONCEPT_MOTION_MS : 1),
  );
  return 1 - (1 - phase) ** 3;
}
export const timelineX = (point: number) =>
  Math.max(0, Math.min(1, Number.isFinite(point) ? point : 0.6)) * 3.6 - 1.8;
