import { intervals, localDay } from "./review";

export const reviewAlgorithm = "ebbinghaus-v1";
export const reviewPolicy = {
  intervalDays: [...intervals],
  incorrectMinutes: 10,
  assistedMinutes: 20,
} as const;
const dayMs = 86_400_000;
export interface MemoryCard {
  stage: number;
  dueAt: number;
  lapses: number;
  independentSuccesses: number;
  lastSuccessDay: string | null;
  lastReviewAt: number | null;
  relearning: boolean;
  version: number;
}

/** Expanding retrieval intervals are product defaults, not a fitted personal curve. */
export function scheduleSpacedReview(
  card: MemoryCard | null,
  now: number,
  timezone: string,
  outcome: "correct" | "incorrect" | "hinted",
  offline = false,
): MemoryCard {
  const today = localDay(now, timezone);
  const next: MemoryCard = card
    ? { ...card }
    : {
        stage: 0,
        dueAt: now + dayMs,
        lapses: 0,
        independentSuccesses: 0,
        lastSuccessDay: null,
        lastReviewAt: null,
        relearning: false,
        version: 0,
      };
  next.version++;
  next.lastReviewAt = now;
  if (offline) {
    // Unverified device timestamps and answers cannot strengthen a memory card.
    next.dueAt = Math.min(next.dueAt, now + dayMs);
  } else if (outcome === "incorrect") {
    next.stage = 0;
    next.lapses++;
    next.relearning = true;
    next.dueAt = now + reviewPolicy.incorrectMinutes * 60_000;
  } else if (outcome === "hinted") {
    next.relearning = true;
    if (card?.relearning && card.dueAt <= now) {
      next.dueAt = now + dayMs;
      return next;
    }
    next.dueAt = Math.min(
      next.dueAt > now ? next.dueAt : Infinity,
      now + reviewPolicy.assistedMinutes * 60_000,
    );
  } else if (card?.relearning) {
    if (card.dueAt > now) return next;
    // Recalling after a hint/error is followed by a fresh next-day check.
    next.stage = 0;
    next.relearning = false;
    next.dueAt = now + dayMs;
    if (next.lastSuccessDay !== today) {
      next.independentSuccesses++;
      next.lastSuccessDay = today;
    }
  } else if (!card || (card.dueAt <= now && card.lastSuccessDay !== today)) {
    if (card && card.independentSuccesses > 0)
      next.stage = Math.min(5, next.stage + 1);
    next.independentSuccesses++;
    next.lastSuccessDay = today;
    next.dueAt = now + intervals[next.stage] * dayMs;
  }
  return next;
}
