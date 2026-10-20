import type { TrainingCycle } from "../packages/contracts/index";

/** Review dates recommend a return visit; they never gate ordinary practice. */
export function trainingContinuation(
  cycle: TrainingCycle | null,
  now = Date.now(),
) {
  if (!cycle || cycle.finished) return null;
  if (cycle.next.sessionId)
    return { label: "上次的练习", sessionId: cycle.next.sessionId };
  if (cycle.next.readyAt > now) return null;
  return {
    label: cycle.next.phase === "retest" ? "专题复习" : "专项练习",
    sessionId: null,
  };
}

export function trainingFollowUps(
  items: TrainingCycle[],
  all: boolean,
  now = Date.now(),
) {
  return all
    ? items
    : items
        .filter(
          (cycle) =>
            !cycle.finished &&
            cycle.next.phase === "retest" &&
            cycle.next.readyAt <= now,
        )
        .sort((a, b) => a.next.readyAt - b.next.readyAt);
}
