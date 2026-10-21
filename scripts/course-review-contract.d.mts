type Item = { id: string; version?: number; [key: string]: unknown };
type Origin = {
  itemId: string;
  version: number;
  origin: string;
  publishedOrigin: string;
  itemStatus: string;
  releaseStatus: string;
};
export function courseReviewContract(
  release: { id: string; releases?: string[]; items: Item[] },
  review: { id: string; items: Item[] },
): { byId: Map<string, Item>; valid(rows: Origin[]): boolean };
