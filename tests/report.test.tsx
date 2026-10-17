import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  reportWindow,
  emptyReportCounts,
  interactionLabels,
  modalityLabels,
  sourceLabels,
} from "../packages/domain/report";
import type { LearningReport } from "../packages/contracts/index";
import { ReportBody } from "../src/LearningReport";
import { exercises } from "../packages/server/exercises";

describe("guardian learning reports", () => {
  it("starts seven Chinese calendar days at local midnight, not UTC midnight", () => {
    const now = Date.parse("2026-10-17T16:00:00Z"),
      window = reportWindow(now, 7, "Asia/Shanghai");
    expect([window.from, window.through]).toEqual(["2026-10-12", "2026-10-18"]);
    expect(window.start).toBe(Date.parse("2026-10-11T16:00:00Z"));
    expect(window.end).toBe(now + 1);
    expect(window.intervals.at(-1)!.end - window.intervals.at(-1)!.start).toBe(
      1,
    );
    expect(window.intervals).toHaveLength(7);
    expect(
      window.intervals.slice(0, -1).every((d) => d.end - d.start === 86400000),
    ).toBe(true);
  });
  it("uses contiguous calendar intervals across spring daylight saving", () => {
    const window = reportWindow(
      Date.parse("2026-03-10T12:00:00Z"),
      7,
      "America/New_York",
    );
    const day = window.intervals.find((d) => d.day === "2026-03-08")!;
    expect(day.end - day.start).toBe(23 * 3600000);
    expect(
      window.intervals
        .slice(1)
        .every((d, i) => d.start === window.intervals[i].end),
    ).toBe(true);
  });
  it("includes both occurrences of a fall daylight-saving hour", () => {
    const window = reportWindow(
      Date.parse("2026-11-03T12:00:00Z"),
      7,
      "America/New_York",
    );
    const day = window.intervals.find((d) => d.day === "2026-11-01")!;
    expect(day.end - day.start).toBe(25 * 3600000);
    expect(Date.parse("2026-11-01T05:30:00Z")).toBeGreaterThan(day.start);
    expect(Date.parse("2026-11-01T06:30:00Z")).toBeLessThan(day.end);
  });
  it("covers all thirty days with an explicit timezone fallback and rejects oversized windows", () => {
    const window = reportWindow(
      Date.parse("2026-03-01T03:00:00Z"),
      30,
      "invalid-zone",
    );
    expect(window.intervals).toHaveLength(30);
    expect(window.timezoneFallback).toBe(true);
    expect(window.timezone).toBe("Asia/Shanghai");
    expect(window.from).toBe("2026-01-31");
    expect(() => reportWindow(NaN, 7, "Asia/Shanghai")).toThrow();
    expect(() => reportWindow(Date.now(), 365 as 7, "Asia/Shanghai")).toThrow();
  });
  it("names all current task types and modalities in Chinese instead of exposing internal tags", () => {
    for (const item of exercises) {
      expect(interactionLabels[item.type]).toBeTruthy();
      expect(modalityLabels[item.modality]).toBeTruthy();
    }
    expect(Object.keys(sourceLabels)).toHaveLength(7);
  });
  const report = (): LearningReport => {
    const window = reportWindow(
      Date.parse("2026-10-17T09:00:00Z"),
      7,
      "Asia/Shanghai",
    );
    return {
      child: { id: "fixture", nickname: "小星" },
      window,
      days: window.intervals.map((d) => ({
        ...emptyReportCounts(),
        day: d.day,
      })),
      totals: {
        ...emptyReportCounts(),
        activeDays: 0,
        completedRounds: 0,
        completedLessons: 0,
        taskFamilies: 0,
        independentTaskFamilies: 0,
      },
      sources: [],
      interactions: [],
      practice: [],
      review: { total: 0, dueNow: 0, dueNext7Days: 0 },
    };
  };
  it("renders honest empty data with an accessible daily table and no fabricated chart or mastery score", () => {
    const html = renderToStaticMarkup(
      <ReportBody report={report()} onReview={() => {}} />,
    );
    expect(html).toContain("还没有保存的作答");
    expect(html).not.toContain('class="report-plot"');
    expect(html).toContain("<caption>每日作答记录</caption>");
    expect(html).toContain('scope="col"');
    expect(html).toContain('role="region"');
    expect(html).not.toContain("0%");
  });
  it("keeps assisted, incorrect and unscored evidence visible alongside independent successes", () => {
    const value = report();
    Object.assign(value.totals, {
      attempts: 4,
      independent: 1,
      assisted: 1,
      incorrect: 1,
      unscored: 1,
      activeDays: 1,
    });
    Object.assign(value.days[6], value.totals);
    value.practice = [
      {
        ...value.days[6],
        skillId: "grammar.be",
        label: "be动词",
        modality: "recognition",
      },
    ];
    const html = renderToStaticMarkup(
      <ReportBody report={value} onReview={() => {}} />,
    );
    for (const text of [
      "独立答对",
      "辅助后答对",
      "还需再练",
      "未计分记录",
      "be动词",
      "词义与结构辨认",
    ])
      expect(html).toContain(text);
    expect(html).toContain('role="img"');
    expect(html).toContain("height:25%");
    expect(html).not.toContain("grammar.be");
    expect(html).not.toContain(">recognition<");
    expect(html).toContain("不是能力诊断或掌握排名");
  });
});
