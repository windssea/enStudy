export interface ReviewTarget {
  skillId: string;
  modality: string;
  dueAt: number;
  lastFamily?: string;
}
export interface Candidate {
  id: string;
  skill: string;
  modality: string;
  family?: string;
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
    .sort((a, b) => a.dueAt - b.dueAt || a.skillId.localeCompare(b.skillId))) {
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
