import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  comparisonGeometry,
  comparisonRowsFor,
  comparisonSentence,
  tenseComparisonRows,
  timeReferences,
  isTimeReference,
} from "../packages/domain/tenseComparison";
import TenseComparisonDiagram from "../src/TenseComparisonDiagram";
import TenseComparison from "../src/TenseComparison";
import TenseTimelineGame, { timelineReference } from "../src/TenseTimelineGame";
describe("one action across time references", () => {
  it("covers all twelve unique time/aspect combinations with the same action and explicit contexts", () => {
    expect(tenseComparisonRows).toHaveLength(12);
    expect(new Set(tenseComparisonRows.map((row) => row.id)).size).toBe(12);
    for (const reference of timeReferences) {
      const rows = comparisonRowsFor(reference);
      expect(new Set(rows.map((row) => row.aspect)).size).toBe(4);
      for (const row of rows) {
        expect(comparisonSentence(row)).toContain("an apple");
        expect(row.translation).toContain("苹果");
        if (row.aspect === "perfect-continuous")
          expect(comparisonSentence(row)).toContain("for two minutes");
      }
    }
    expect(
      comparisonRowsFor("present").find((row) => row.aspect === "simple")!
        .after,
    ).toContain("every afternoon");
    expect(
      comparisonRowsFor("present").every(
        (row) => !comparisonSentence(row).includes("yesterday"),
      ),
    ).toBe(true);
    expect(comparisonRowsFor("all")).toHaveLength(12);
    expect(isTimeReference("yesterday")).toBe(false);
    expect(isTimeReference(null)).toBe(false);
  });
  it("keeps now and the comparison reference distinct and makes completion earlier than its anchor", () => {
    for (const reference of timeReferences) {
      const perfect = comparisonGeometry(reference, "perfect"),
        ongoing = comparisonGeometry(reference, "continuous"),
        duration = comparisonGeometry(reference, "perfect-continuous");
      expect(perfect.now).toBe(ongoing.now);
      expect(perfect.anchor).toBe(ongoing.anchor);
      expect(perfect.end).toBeLessThan(perfect.anchor);
      expect(ongoing.start).toBeLessThan(ongoing.anchor);
      expect(ongoing.end).toBeGreaterThan(ongoing.anchor);
      expect(duration.start).toBeLessThan(ongoing.start);
      if (reference === "past")
        expect(perfect.anchor).toBeLessThan(perfect.now);
      else if (reference === "future")
        expect(perfect.anchor).toBeGreaterThan(perfect.now);
      else expect(perfect.anchor).toBe(perfect.now);
    }
  });
  it("announces habits, duration and future predictions instead of drawing them as completed facts", () => {
    const render = (id: string) =>
      renderToStaticMarkup(
        <TenseComparisonDiagram
          row={tenseComparisonRows.find((row) => row.id === id)!}
        />,
      );
    expect(render("present.simple")).toContain("不限定现在是否在吃");
    expect(render("past.perfect-continuous")).toContain("已持续 2 分钟");
    expect(render("future.perfect")).toContain("这是对将来的预测");
    expect(render("future.continuous")).toContain('stroke-dasharray="8 5"');
  });
  it("requires explicit opening before exposing sentences for a selected child", () => {
    const html = renderToStaticMarkup(<TenseComparison childId="test-child" />);
    expect(html).toContain("打开时态对比");
    expect(html).toContain("玩时态小游戏");
    expect(html).not.toContain('type="range"');
    for (const row of tenseComparisonRows)
      expect(html).not.toContain(comparisonSentence(row));
    expect(html).not.toContain("tense-comparison-row");
  });
  it("keeps yesterday, today and tomorrow stable at the slider region boundaries", () => {
    for (const position of [0, 24])
      expect(timelineReference(position)).toBe("past");
    for (const position of [25, 50, 75])
      expect(timelineReference(position)).toBe("present");
    for (const position of [76, 100])
      expect(timelineReference(position)).toBe("future");
  });
  it("opens at the current ongoing action with keyboard and tap alternatives", () => {
    const html = renderToStaticMarkup(<TenseTimelineGame />);
    expect(html).toContain('type="range"');
    expect(html).toContain('value="50"');
    expect(html).toContain(
      'aria-valuetext="现在，现在进行时：I am eating an apple now."',
    );
    expect(html).toContain('aria-label="移动到时间点"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("小人标记观察的时间");
    expect(html).toContain("tense-apple-child.webp");
    expect(html).toContain("tense-timeline.webp");
  });
});
