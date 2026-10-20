export interface ReviewTarget {
  skillId: string;
  modality: string;
  dueAt: number;
  priority?: number;
  lastFamily?: string;
}
export interface Candidate {
  id: string;
  skill: string;
  modality: string;
  family?: string;
  pattern?: string;
}
export const secureRandom = () =>
  crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
export function shuffle<T>(values: readonly T[], random = secureRandom): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
// Draw distinct families, unseen first. Rotate task frames to avoid a run of
// near-identical slots. Randomness is frozen into D1 assignments, never re-run
// when returning an existing session.
export function selectTopicItems<T extends Candidate>(
  items: readonly T[],
  recentFamilies: ReadonlySet<string>,
  size = 10,
  random = secureRandom,
): T[] {
  const families = new Map<string, T[]>();
  for (const item of items) {
    const key = item.family ?? item.id;
    const group = families.get(key) ?? [];
    group.push(item);
    families.set(key, group);
  }
  const selected: T[] = [];
  const groups = Array.from(families, ([key, group]) => ({ key, group }));
  for (const seen of [false, true]) {
    if (seen) {
      // The D1 query/set is newest first. Once all unseen families are used,
      // revisit least-recently assigned families before the latest ones.
      const recency = new Map(
        Array.from(recentFamilies, (key, index) => [key, index]),
      );
      const oldest = shuffle(
        groups.filter((group) => recentFamilies.has(group.key)),
        random,
      ).sort((a, b) => recency.get(b.key)! - recency.get(a.key)!);
      for (const row of oldest) {
        if (selected.length >= Math.min(20, Math.max(1, size))) break;
        selected.push(row.group[Math.floor(random() * row.group.length)]);
      }
      break;
    }
    const buckets = new Map<string, typeof groups>();
    for (const group of shuffle(
      groups.filter((g) => recentFamilies.has(g.key) === seen),
      random,
    )) {
      const pattern = group.group[0].pattern ?? "default";
      const bucket = buckets.get(pattern) ?? [];
      bucket.push(group);
      buckets.set(pattern, bucket);
    }
    const rows = shuffle(Array.from(buckets.values()), random);
    while (rows.some((row) => row.length)) {
      for (const row of rows) {
        if (selected.length >= Math.min(20, Math.max(1, size)))
          return shuffle(selected, random);
        const group = row.pop()?.group;
        if (group) selected.push(group[Math.floor(random() * group.length)]);
      }
    }
  }
  return shuffle(selected, random);
}
export function selectReviewItems<T extends Candidate>(
  cards: ReviewTarget[],
  items: T[],
  now: number,
  limit = 8,
): T[] {
  const selected: T[] = [];
  const seen = new Set<string>();
  for (const card of [...cards]
    .filter((card) => card.dueAt <= now)
    .sort(
      (a, b) =>
        (a.priority ?? 1) - (b.priority ?? 1) ||
        a.dueAt - b.dueAt ||
        a.skillId.localeCompare(b.skillId),
    )) {
    const candidates = items.filter(
      (item) =>
        item.skill === card.skillId &&
        item.modality === card.modality &&
        !seen.has(item.family ?? item.id),
    );
    const next =
      candidates.find((item) => (item.family ?? item.id) !== card.lastFamily) ??
      candidates[0];
    if (next) {
      selected.push(next);
      seen.add(next.family ?? next.id);
    }
    if (selected.length >= Math.min(8, Math.max(1, limit))) break;
  }
  return selected;
}
