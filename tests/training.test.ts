import { describe, it, expect } from "vitest";
import { topicRelease } from "../packages/server/exercises";
import {
  trainingPools,
  drawTraining,
  nextTrainingStep,
  trainingExposureKeys,
  type TrainingResult,
} from "../packages/domain/training";
import { localDay } from "../packages/domain/review";
describe("independent training pools", () => {
  it("all 60 topics have enough disjoint material for a complete first cycle", () => {
    for (const topic of Object.keys(topicRelease.stats)) {
      const items = topicRelease.items.filter((i) => i.topicId === topic),
        pools = trainingPools(items);
      const families = (rows: typeof items) =>
        new Set(rows.map((i) => i.family!));
      expect(families(pools.taught).size).toBe(24);
      expect(families(pools.transfer).size).toBe(12);
      expect(families(pools.retest).size).toBe(24);
      expect(
        pools.transfer.every((i) => !families(pools.taught).has(i.family!)),
      ).toBe(true);
      expect(
        pools.retest.every(
          (i) => !families([...pools.taught, ...pools.transfer]).has(i.family!),
        ),
      ).toBe(true);
      if (pools.scope === "new-frame")
        expect(
          pools.transfer.every(
            (i) => !new Set(pools.taught.map((j) => j.pattern)).has(i.pattern),
          ),
        ).toBe(true);
      const exposed = new Set<string>();
      for (const phase of [
        "diagnostic",
        "practice",
        "transfer",
        "retest",
        "retest",
        "retest",
      ] as const) {
        const chosen = drawTraining(
          items,
          phase,
          exposed,
          new Set(),
          () => 0.4,
        );
        expect(chosen).toHaveLength(phase === "practice" ? 10 : 5);
        expect(chosen.every((i) => !exposed.has(i.family!))).toBe(true);
        chosen.forEach((i) => exposed.add(i.family!));
      }
      expect(exposed.size).toBe(35);
    }
  });
  it("does not backfill an assessment with previously exposed variants", () => {
    const items = topicRelease.items.filter((i) => i.topicId === "grammar.be"),
      pool = trainingPools(items);
    expect(
      drawTraining(
        items,
        "transfer",
        new Set(pool.transfer.map((i) => i.family!)),
        new Set(),
      ),
    ).toEqual([]);
  });
  it("does not accept the same prompt under a different content source or family ID", () => {
    const items = topicRelease.items.filter((i) => i.topicId === "grammar.be"),
      pools = trainingPools(items);
    const exposed = new Set(
      pools.transfer.flatMap((i) =>
        trainingExposureKeys({
          ...i,
          family: `other-release.${i.family}`,
          prompt: `  ${i.prompt.toUpperCase()}  `,
        }),
      ),
    );
    expect(drawTraining(items, "transfer", exposed, new Set())).toEqual([]);
  });
  it("prioritizes observed difficult taught frames in practice without repeating diagnostic families", () => {
    const items = topicRelease.items.filter(
        (i) => i.topicId === "tense.present-simple",
      ),
      pattern = trainingPools(items).taught[0].pattern!;
    const diag = drawTraining(
        items,
        "diagnostic",
        new Set(),
        new Set(),
        () => 0.3,
      ),
      seen = new Set(diag.map((i) => i.family!));
    const chosen = drawTraining(
      items,
      "practice",
      seen,
      new Set([pattern]),
      () => 0.3,
    );
    expect(
      chosen.filter((i) => i.pattern === pattern).length,
    ).toBeGreaterThanOrEqual(7);
    expect(chosen.every((i) => !seen.has(i.family!))).toBe(true);
    expect(
      trainingPools(topicRelease.items.filter((i) => i.topicId === "forms.ing"))
        .scope,
    ).toBe("new-lexeme");
  });
});
describe("calendar checkpoints", () => {
  const now = Date.parse("2026-10-17T16:10:00Z"),
    result = (
      phase: TrainingResult["phase"],
      checkpoint = 0,
    ): TrainingResult => ({
      phase,
      checkpoint,
      sessionId: phase + checkpoint,
      state: "completed",
      total: 5,
      correct: 5,
      independent: 4,
      completedAt: now,
    });
  it("requires complete saved results and cannot skip an unfinished step", () => {
    expect(nextTrainingStep([], "Asia/Shanghai", now).phase).toBe("diagnostic");
    const paused = {
      ...result("diagnostic"),
      state: "paused",
      completedAt: null,
    };
    expect(nextTrainingStep([paused], "Asia/Shanghai", now).run).toEqual(
      paused,
    );
    expect(
      nextTrainingStep([result("diagnostic")], "Asia/Shanghai", now).phase,
    ).toBe("practice");
  });
  it("uses the child's local calendar rather than adding 24 hours", () => {
    const results = [
      result("diagnostic"),
      result("practice"),
      result("transfer"),
    ];
    expect(
      localDay(
        nextTrainingStep(results, "Asia/Shanghai", now).readyAt,
        "Asia/Shanghai",
      ),
    ).toBe("2026-10-19");
    results.push({ ...result("retest", 1), completedAt: now + 86400000 });
    expect(
      localDay(
        nextTrainingStep(results, "Asia/Shanghai", now + 86400000).readyAt,
        "Asia/Shanghai",
      ),
    ).toBe("2026-10-21");
    results.push(
      { ...result("retest", 3), completedAt: now + 3 * 86400000 },
      { ...result("retest", 7), completedAt: now + 7 * 86400000 },
    );
    expect(
      nextTrainingStep(results, "Asia/Shanghai", now + 7 * 86400000).finished,
    ).toBe(true);
  });
  it("merges overdue checkpoints into one real visit without manufacturing three successes", () => {
    const results = [
      result("diagnostic"),
      result("practice"),
      result("transfer"),
    ];
    expect(
      nextTrainingStep(results, "Asia/Shanghai", now + 7 * 86400000).checkpoint,
    ).toBe(7);
    results.push({ ...result("retest", 7), completedAt: now + 7 * 86400000 });
    expect(
      nextTrainingStep(results, "Asia/Shanghai", now + 7 * 86400000).finished,
    ).toBe(true);
    expect(results.filter((r) => r.phase === "retest")).toHaveLength(1);
  });
  it("resolves local midnight across daylight saving time", () => {
    const anchor = Date.parse("2026-03-08T04:30:00Z");
    const results = [
      result("diagnostic"),
      result("practice"),
      { ...result("transfer"), completedAt: anchor },
    ];
    expect(nextTrainingStep(results, "America/New_York", anchor).readyAt).toBe(
      Date.parse("2026-03-08T05:00:00Z"),
    );
    results.push({
      ...result("retest", 1),
      completedAt: Date.parse("2026-03-08T16:00:00Z"),
    });
    expect(
      nextTrainingStep(
        results,
        "America/New_York",
        Date.parse("2026-03-08T16:00:00Z"),
      ).readyAt,
    ).toBe(Date.parse("2026-03-10T04:00:00Z"));
  });
});
