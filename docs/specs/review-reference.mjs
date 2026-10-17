/** Design reference only. Caller establishes provenance, idempotency and local day. */
export const INTERVAL_DAYS = Object.freeze([1, 3, 7, 14, 30, 60]);

function validateDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`)) ||
      new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
    throw new TypeError('day must be a valid YYYY-MM-DD calendar date');
  }
}
export function addCalendarDays(day, count) {
  validateDay(day);
  if (!Number.isInteger(count)) throw new TypeError('count must be an integer');
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}
export function localDay(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(instant));
  const part = name => parts.find(p => p.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** eligible = online, server graded, first answer, no reveal, valid active lease. */
export function schedule(card, { day, outcome, eligible = true }) {
  validateDay(day);
  if (!['correct', 'incorrect', 'hinted', 'skipped', 'unscored'].includes(outcome)) {
    throw new TypeError('unsupported outcome');
  }
  if (!eligible || outcome === 'skipped' || outcome === 'unscored') return card ? { ...card } : null;
  const tomorrow = addCalendarDays(day, 1);
  const existing = Boolean(card);
  const next = card ? { ...card } : {
    stage: 0, dueDay: tomorrow, lapses: 0,
    independentSuccesses: 0, lastSuccessDay: null, version: 0,
  };
  if (next.stage < 0 || next.stage > 5 || !Number.isInteger(next.stage)) throw new RangeError('invalid stage');
  validateDay(next.dueDay);
  if (outcome === 'incorrect') {
    next.stage = Math.max(0, next.stage - 1);
    next.lapses += 1;
    next.dueDay = tomorrow;
  } else if (outcome === 'hinted') {
    next.dueDay = next.dueDay < tomorrow ? next.dueDay : tomorrow;
  } else if (!existing || (next.dueDay <= day && next.lastSuccessDay !== day)) {
    if (existing) next.stage = Math.min(5, next.stage + 1);
    next.independentSuccesses += 1;
    next.lastSuccessDay = day;
    next.dueDay = addCalendarDays(day, INTERVAL_DAYS[next.stage]);
  }
  next.version += 1;
  next.algorithmVersion = 'rules-v1';
  return next;
}
