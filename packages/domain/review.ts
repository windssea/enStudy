export const intervals = [1, 3, 7, 14, 30, 60] as const;
export interface Card {
  stage: number;
  dueDay: string;
  lapses: number;
  independentSuccesses: number;
  lastSuccessDay: string | null;
  version: number;
}
export function addDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== day
  )
    throw new Error("Invalid calendar date");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function localDay(instant: number, zone = "Asia/Shanghai"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function midnight(day: string, zone: string): number {
  const desired = Date.parse(`${day}T00:00:00Z`);
  let guess = desired;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 4; i++) {
    const p = formatter.formatToParts(guess);
    const v = (name: string) => p.find((x) => x.type === name)!.value;
    const rendered = Date.parse(
      `${v("year")}-${v("month")}-${v("day")}T${v("hour")}:${v("minute")}:00Z`,
    );
    const delta = desired - rendered;
    guess += delta;
    if (!delta) return guess;
  }
  throw new Error("Unable to resolve local midnight");
}
/** Historical day-based policy for compatibility fixtures. Live attempts use spacedReview.ts. */
export function schedule(
  card: Card | null,
  day: string,
  outcome: "correct" | "incorrect" | "hinted",
): Card {
  const tomorrow = addDays(day, 1);
  const next: Card = card
    ? { ...card }
    : {
        stage: 0,
        dueDay: tomorrow,
        lapses: 0,
        independentSuccesses: 0,
        lastSuccessDay: null,
        version: 0,
      };
  if (outcome === "incorrect") {
    next.stage = Math.max(0, next.stage - 1);
    next.lapses++;
    next.dueDay = tomorrow;
  } else if (outcome === "hinted") {
    next.dueDay = next.dueDay < tomorrow ? next.dueDay : tomorrow;
  } else if (!card || (next.dueDay <= day && next.lastSuccessDay !== day)) {
    if (card && card.independentSuccesses > 0)
      next.stage = Math.min(5, next.stage + 1);
    next.independentSuccesses++;
    next.lastSuccessDay = day;
    next.dueDay = addDays(day, intervals[next.stage]);
  }
  next.version++;
  return next;
}
