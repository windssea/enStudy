import { localDay } from "../packages/domain/review";

export function reviewRefreshDelay(plan?: {
  generatedAt: number;
  nextAt: number | null;
}) {
  return plan?.nextAt == null
    ? null
    : Math.min(
        2_147_483_647,
        Math.max(1000, plan.nextAt - plan.generatedAt + 1000),
      );
}

export function reviewDueLabel(
  at: number,
  timezone = "Asia/Shanghai",
  now = Date.now(),
) {
  const time = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  const day = localDay(at, timezone);
  if (at <= now) return "可以复习";
  if (day === localDay(now, timezone)) return `今天 ${time}`;
  return `${new Intl.DateTimeFormat("zh-CN", { timeZone: timezone, month: "numeric", day: "numeric" }).format(at)} ${time}`;
}
