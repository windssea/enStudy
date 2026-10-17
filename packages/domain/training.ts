import { selectTopicItems, type Candidate } from "./selection";
import { addDays, localDay, midnight } from "./review";
export type TrainingPhase = "diagnostic" | "practice" | "transfer" | "retest";
export const trainingLabels: Record<TrainingPhase, string> = {
  diagnostic: "先试一试",
  practice: "看规律，再巩固",
  transfer: "换一组材料应用",
  retest: "隔天再试",
};
export const trainingSizes: Record<TrainingPhase, number> = {
  diagnostic: 5,
  practice: 10,
  transfer: 5,
  retest: 5,
};
export interface TrainingResult {
  phase: TrainingPhase;
  checkpoint: number;
  sessionId: string;
  state: string;
  total: number | null;
  independent: number | null;
  correct: number | null;
  completedAt: number | null;
}
type TrainingCandidate = Candidate & { prompt?: string; reading?: string };
export function trainingExposureKeys(item: TrainingCandidate) {
  return [
    item.family ?? item.id,
    ...(item.prompt
      ? [
          `prompt:${JSON.stringify([item.prompt.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US"), (item.reading ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")])}`,
        ]
      : []),
  ];
}
export function nextTrainingStep(
  results: TrainingResult[],
  zone: string,
  now = Date.now(),
) {
  for (const phase of ["diagnostic", "practice", "transfer"] as const) {
    const run = results.find((r) => r.phase === phase);
    if (!run?.completedAt)
      return { phase, checkpoint: 0, readyAt: now, run, finished: false };
  }
  const anchor = results.find((r) => r.phase === "transfer")!.completedAt!;
  const due = (checkpoint: number) =>
    midnight(addDays(localDay(anchor, zone), checkpoint), zone);
  const visits = results.filter((r) => r.phase === "retest");
  const interrupted = visits.find((r) => !r.completedAt);
  if (interrupted)
    return {
      phase: "retest" as const,
      checkpoint: interrupted.checkpoint,
      readyAt: due(interrupted.checkpoint),
      run: interrupted,
      finished: false,
    };
  const pending = [1, 3, 7].filter(
    (checkpoint) =>
      !visits.some(
        (r) => r.completedAt !== null && r.completedAt >= due(checkpoint),
      ),
  );
  if (pending.length) {
    // Missed appointments merge into one visit. A late learner never owes
    // three separate rounds or gains fictitious successful review days.
    const checkpoint =
      pending.filter((c) => due(c) <= now).at(-1) ?? pending[0];
    return {
      phase: "retest" as const,
      checkpoint,
      readyAt: due(checkpoint),
      run: undefined,
      finished: false,
    };
  }
  return {
    phase: "retest" as const,
    checkpoint: 7,
    readyAt: now,
    run: undefined,
    finished: true,
  };
}
// Immutable v1 allocation. Evaluation frames are separate from the two taught
// frames. Lexical-only banks reserve disjoint word families instead; this is
// explicitly weaker evidence than a new task frame, never labelled mastery.
export function trainingPools<T extends Candidate>(items: readonly T[]) {
  const patterns = [
    ...new Set(items.map((i) => i.pattern ?? "default")),
  ].sort();
  const families = [...new Set(items.map((i) => i.family ?? i.id))].sort();
  const hasFrames = patterns.length >= 5;
  const group = (item: T) =>
    hasFrames
      ? patterns.indexOf(item.pattern ?? "default")
      : families.indexOf(item.family ?? item.id);
  return {
    scope: hasFrames ? ("new-frame" as const) : ("new-lexeme" as const),
    taught: items.filter((i) => (hasFrames ? group(i) < 2 : group(i) < 24)),
    transfer: items.filter((i) =>
      hasFrames ? group(i) === 2 : group(i) >= 24 && group(i) < 36,
    ),
    retest: items.filter((i) => (hasFrames ? group(i) >= 3 : group(i) >= 36)),
  };
}
export function drawTraining<T extends TrainingCandidate>(
  items: readonly T[],
  phase: TrainingPhase,
  exposed: ReadonlySet<string>,
  weakPatterns: ReadonlySet<string>,
  random?: () => number,
) {
  const pools = trainingPools(items),
    candidates = (
      phase === "transfer"
        ? pools.transfer
        : phase === "retest"
          ? pools.retest
          : pools.taught
    ).filter((i) => !trainingExposureKeys(i).some((key) => exposed.has(key)));
  const size = trainingSizes[phase];
  if (phase !== "practice" || !weakPatterns.size)
    return selectTopicItems(candidates, new Set(), size, random);
  const focused = selectTopicItems(
    candidates.filter((i) => weakPatterns.has(i.pattern ?? "default")),
    new Set(),
    7,
    random,
  );
  const used = new Set(focused.map((i) => i.family ?? i.id));
  return [
    ...focused,
    ...selectTopicItems(
      candidates.filter((i) => !used.has(i.family ?? i.id)),
      new Set(),
      size - focused.length,
      random,
    ),
  ];
}
