import { addDays, localDay, midnight } from "./review";
import type { ReportCounts } from "../contracts/index";

export const sourceLabels: Record<string, string> = {
  lesson: "课程小讲堂",
  topic: "专题特训",
  pattern: "固定句式",
  vocabulary: "单词特训",
  workshop: "互动工坊",
  review: "到期复习",
  single: "单题练习",
};
export const interactionLabels: Record<string, string> = {
  choice: "选择",
  input: "填写与拼写",
  order: "组句",
  listen: "听音辨义",
  evidence: "阅读找依据",
  repair: "句子修正",
  sort: "分类",
};
export const modalityLabels: Record<string, string> = {
  recognition: "词义与结构辨认",
  spelling: "拼写与填写",
  "controlled-production": "受控组句",
  "context-recognition": "词语语境",
  "listening-choice": "听音辨义",
  "reading-evidence": "阅读找依据",
  "rule-classification": "规则分类",
  "sentence-editing": "句子修正",
};
export const emptyReportCounts = (): ReportCounts => ({
  attempts: 0,
  independent: 0,
  assisted: 0,
  incorrect: 0,
  unscored: 0,
});
export function totalReportCounts(rows: ReportCounts[]): ReportCounts {
  return rows.reduce(
    (sum, row) => ({
      attempts: sum.attempts + row.attempts,
      independent: sum.independent + row.independent,
      assisted: sum.assisted + row.assisted,
      incorrect: sum.incorrect + row.incorrect,
      unscored: sum.unscored + row.unscored,
    }),
    emptyReportCounts(),
  );
}
export function reportWindow(now: number, days: 7 | 30, timezone: string) {
  if (!Number.isSafeInteger(now) || (days !== 7 && days !== 30))
    throw Error("Invalid report window");
  let timezoneFallback = false;
  try {
    localDay(now, timezone);
  } catch {
    timezone = "Asia/Shanghai";
    timezoneFallback = true;
  }
  const through = localDay(now, timezone),
    from = addDays(through, 1 - days);
  const intervals = Array.from({ length: days }, (_, index) => {
    const day = addDays(from, index);
    return {
      day,
      start: midnight(day, timezone),
      end: Math.min(midnight(addDays(day, 1), timezone), now + 1),
    };
  });
  return {
    days,
    from,
    through,
    timezone,
    timezoneFallback,
    generatedAt: now,
    intervals,
    start: intervals[0].start,
    end: now + 1,
  };
}
