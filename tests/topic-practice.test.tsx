import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { TrainingCycle } from "../packages/contracts/index";
import TopicJourney from "../src/TopicJourney";
import { trainingContinuation, trainingFollowUps } from "../src/topicPractice";

const now = 1_800_000_000_000;
function cycle(patch: Partial<TrainingCycle> = {}): TrainingCycle {
  return {
    id: "cycle",
    topicId: "sentence.negative",
    title: "肯定句变否定句",
    version: 1,
    planVersion: 1,
    scope: "controlled-context",
    finished: false,
    results: [],
    coaching: [],
    next: {
      phase: "retest",
      label: "隔天再试",
      checkpoint: 1,
      readyAt: now + 86_400_000,
      size: 5,
      sessionId: null,
      sessionState: null,
    },
    ...patch,
  };
}
describe("direct topic practice", () => {
  it("offers an enabled random-practice button while historical plans are still loading", () => {
    const html = renderToStaticMarkup(
      <TopicJourney
        topicId="sentence.negative"
        title="肯定句变否定句"
        childId="child"
        busy={false}
        onBack={() => {}}
        onStart={() => {}}
        onResume={() => {}}
        onPractice={() => {}}
        onProfile={() => {}}
      />,
    );
    expect(html).toContain('aria-label="开始练习，10题"');
    expect(html).not.toContain('disabled=""');
    expect(html).toContain('value="20"');
    expect(html).not.toMatch(
      /<details|刷新计划与日期|让记忆歇一歇|起可以回来|看看后面怎么学|只想练一小轮|专题分步计划/,
    );
  });
  it("does not present a future review as a restriction or mutate its real date", () => {
    const waiting = cycle(),
      before = JSON.stringify(waiting);
    expect(trainingContinuation(waiting, now)).toBeNull();
    expect(trainingContinuation(null, now)).toBeNull();
    expect(JSON.stringify(waiting)).toBe(before);
  });
  it("allows an interrupted session to resume even if the review date is in the future", () => {
    const saved = cycle();
    saved.next.sessionId = "saved-session";
    saved.next.sessionState = "paused";
    expect(trainingContinuation(saved, now)).toEqual({
      label: "上次的练习",
      sessionId: "saved-session",
    });
  });
  it("offers a real due review and unfinished phase without resurrecting completed plans", () => {
    const due = cycle();
    due.next.readyAt = now;
    expect(trainingContinuation(due, now)?.label).toBe("专题复习");
    due.next.phase = "practice";
    expect(trainingContinuation(due, now)?.label).toBe("专项练习");
    due.finished = true;
    expect(trainingContinuation(due, now)).toBeNull();
  });
  it("recommends only due reviews to the child while retaining all records for the parent", () => {
    const future = cycle(),
      due = cycle({ id: "due" }),
      finished = cycle({ id: "finished", finished: true });
    due.next.readyAt = now;
    const rows = [future, due, finished];
    expect(trainingFollowUps(rows, false, now)).toEqual([due]);
    expect(trainingFollowUps(rows, true, now)).toEqual(rows);
    expect(rows).toEqual([future, due, finished]);
  });
});
