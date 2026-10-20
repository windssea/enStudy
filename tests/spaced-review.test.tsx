import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  scheduleSpacedReview,
  reviewPolicy,
  type MemoryCard,
} from "../packages/domain/spacedReview";
import { selectReviewItems } from "../packages/domain/selection";
import { reviewDueLabel, reviewRefreshDelay } from "../src/reviewPresentation";
import ChildHome from "../src/ChildHome";

const now = Date.parse("2026-10-20T13:00:00Z"),
  zone = "Asia/Shanghai",
  day = 86400000;
const schedule = (
  card: MemoryCard | null,
  at: number,
  result: "correct" | "incorrect" | "hinted",
  offline = false,
) => scheduleSpacedReview(card, at, zone, result, offline);
describe("Ebbinghaus inspired expanding retrieval policy", () => {
  it("starts a genuine one-day gap even when learning just before midnight", () => {
    const late = Date.parse("2026-10-20T15:59:00Z");
    expect(schedule(null, late, "correct")).toMatchObject({
      stage: 0,
      dueAt: late + day,
      independentSuccesses: 1,
      lastSuccessDay: "2026-10-20",
    });
  });
  it("expands through all configured gaps after spaced independent retrieval", () => {
    let at = now,
      card: MemoryCard | null = null;
    for (const [stage, gap] of reviewPolicy.intervalDays.entries()) {
      card = schedule(card, at, "correct");
      expect(card.stage).toBe(stage);
      expect(card.dueAt - at).toBe(gap * day);
      at = card.dueAt;
    }
    expect(schedule(card, at, "correct").stage).toBe(5);
  });
  it("does not advance or postpone an early correct attempt", () => {
    const first = schedule(null, now, "correct"),
      early = schedule(first, now + 60000, "correct");
    expect(early).toMatchObject({
      stage: 0,
      dueAt: first.dueAt,
      independentSuccesses: 1,
    });
    expect(early.version).toBe(first.version + 1);
  });
  it("does not award two memory-stage confirmations on the same local day", () => {
    const first = schedule(null, now, "correct");
    expect(
      schedule({ ...first, dueAt: now }, now + 60000, "correct")
        .independentSuccesses,
    ).toBe(1);
  });
  it("moves forgotten mature knowledge into a short relearning gap", () => {
    const mature = { ...schedule(null, now, "correct"), stage: 5 };
    expect(schedule(mature, now + day, "incorrect")).toMatchObject({
      stage: 0,
      relearning: true,
      dueAt: now + day + 600000,
      lapses: 1,
    });
    expect(mature.stage).toBe(5);
  });
  it("schedules assisted answers soon without granting independent memory evidence", () => {
    expect(schedule(null, now, "hinted")).toMatchObject({
      dueAt: now + 1200000,
      relearning: true,
      independentSuccesses: 0,
    });
  });
  it("does not postpone a closer relearning appointment after a hint", () => {
    const failed = schedule(null, now, "incorrect");
    expect(schedule(failed, now + 60000, "hinted").dueAt).toBe(failed.dueAt);
  });
  it("moves a completed short assisted practice to tomorrow without looping all day or granting credit", () => {
    const assisted = schedule(null, now, "hinted");
    expect(schedule(assisted, assisted.dueAt, "hinted")).toMatchObject({
      dueAt: assisted.dueAt + day,
      relearning: true,
      independentSuccesses: 0,
    });
  });
  it("cannot erase a relearning appointment through immediate repeated answers", () => {
    const failed = schedule(null, now, "incorrect");
    expect(schedule(failed, now + 60000, "correct")).toMatchObject({
      relearning: true,
      dueAt: failed.dueAt,
      independentSuccesses: 0,
    });
  });
  it("checks recovered knowledge again the next day before expanding", () => {
    const failed = schedule(null, now, "incorrect"),
      recovered = schedule(failed, failed.dueAt, "correct");
    expect(recovered).toMatchObject({
      stage: 0,
      dueAt: failed.dueAt + day,
      relearning: false,
      independentSuccesses: 1,
    });
    expect(schedule(recovered, recovered.dueAt, "correct").stage).toBe(1);
  });
  it("does not skip gaps or punish the learner for returning late", () => {
    const first = schedule(null, now, "correct");
    expect(schedule(first, now + 90 * day, "correct")).toMatchObject({
      stage: 1,
      lapses: 0,
      dueAt: now + 93 * day,
    });
  });
  it("keeps offline observations conservative and existing dates intact", () => {
    const first = schedule(null, now, "correct"),
      old = { ...first, dueAt: now - 1000 };
    expect(schedule(null, now, "correct", true)).toMatchObject({
      stage: 0,
      independentSuccesses: 0,
      dueAt: now + day,
    });
    expect(schedule(old, now, "incorrect", true)).toMatchObject({
      dueAt: old.dueAt,
      lapses: 0,
      independentSuccesses: 1,
    });
  });
  it("uses elapsed gaps across daylight saving transitions", () => {
    const at = Date.parse("2026-03-08T05:30:00Z");
    expect(
      scheduleSpacedReview(null, at, "America/New_York", "correct").dueAt - at,
    ).toBe(day);
  });
  it("prioritizes relearning while still selecting another question family", () => {
    const items = [
      { id: "old", skill: "old", modality: "recognition" },
      { id: "seen", skill: "weak", modality: "spelling", family: "seen" },
      { id: "fresh", skill: "weak", modality: "spelling", family: "fresh" },
    ];
    expect(
      selectReviewItems(
        [
          { skillId: "old", modality: "recognition", dueAt: 0 },
          {
            skillId: "weak",
            modality: "spelling",
            dueAt: 1,
            priority: 0,
            lastFamily: "seen",
          },
        ],
        items,
        now,
      ).map((i) => i.id),
    ).toEqual(["fresh", "old"]);
  });
  it("shows exact same-day due time without a lock or countdown", () => {
    expect(reviewDueLabel(now + 600000, zone, now)).toBe("今天 21:10");
    expect(reviewDueLabel(now - 1, zone, now)).toBe("可以复习");
  });
  it("refreshes from server-relative time without trusting the device clock or polling in a loop", () => {
    expect(reviewRefreshDelay({ generatedAt: now, nextAt: now + 600000 })).toBe(
      601000,
    );
    expect(reviewRefreshDelay({ generatedAt: now, nextAt: null })).toBeNull();
    expect(
      reviewRefreshDelay({ generatedAt: now, nextAt: now + 60 * day }),
    ).toBe(2147483647);
  });
  it("offers review from the existing homepage action without adding another guide", () => {
    const html = renderToStaticMarkup(
      <ChildHome
        nickname="孩子"
        taskTitle="复习已学内容"
        review
        busy={false}
        ready
        resume={false}
        onStart={() => {}}
        onGo={() => {}}
      />,
    );
    expect(html).toContain('aria-label="开始复习"');
    expect(html).not.toMatch(/遗忘百分比|必须|<details[^>]*>.*艾宾浩斯/);
  });
});
