import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Progress } from "../packages/contracts/index";
import ReviewOverview from "../src/ReviewOverview";

const now = Date.parse("2026-10-20T13:00:00Z");
const progress: Progress = {
  answered: 12,
  correct: 8,
  stars: 5,
  recent: [],
  cards: [
    {
      skillId: "private-child-skill",
      label: "仅属于已选孩子的学习目标",
      modality: "recognition",
      dueAt: now + 600000,
      stage: 0,
      lapses: 0,
    },
  ],
  reviewPlan: {
    algorithm: "ebbinghaus-v1",
    generatedAt: now,
    timezone: "Asia/Shanghai",
    dueCount: 0,
    relearningDue: 0,
    nextAt: now + 600000,
    policy: {
      intervalDays: [1, 3, 7, 14, 30, 60],
      incorrectMinutes: 10,
      assistedMinutes: 20,
    },
  },
};
const noop = () => {};
function render(ready: boolean) {
  return renderToStaticMarkup(
    <ReviewOverview
      progress={progress}
      dueCount={0}
      ready={ready}
      busy={false}
      onStart={noop}
      onLearn={noop}
      onParent={noop}
      onMistakes={noop}
    />,
  );
}

describe("review identity and appointment presentation", () => {
  it("does not display previous child records or dates before a child is selected", () => {
    const html = render(false);
    expect(html).toContain("选择档案");
    expect(html).not.toMatch(/仅属于已选孩子|今天 21:10|累计练习记录|复习安排/);
  });
  it("uses the server appointment and timezone while keeping ordinary learning open", () => {
    const html = render(true);
    expect(html).toContain("今天 21:10");
    expect(html).toContain("继续学习");
    expect(html).toContain("仅属于已选孩子的学习目标");
    expect(html).not.toMatch(/disabled|必须复习|遗忘百分比/);
  });
});
