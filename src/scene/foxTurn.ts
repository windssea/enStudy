/** Short reversible turn, independent of frame rate; reduced motion snaps. */
export function foxTurnAngle(
  from: number,
  target: number,
  age: number,
  paused: boolean,
) {
  if (paused) return target;
  const t = Math.max(0, Math.min(1, age / 0.7));
  const eased = t * t * (3 - 2 * t);
  return from + (target - from) * eased;
}
