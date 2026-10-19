import { mistakeKinds, type MistakeKind } from "../contracts/mistakes";
export const mistakeCategories = [
  "grammar",
  "tense",
  "forms",
  "patterns",
  "vocabulary",
  "phonics",
  "reading",
] as const;
export function mistakeQuery(params: URLSearchParams) {
  const allowed = new Set(["kind", "category", "snapshot", "before"]);
  for (const key of params.keys())
    if (!allowed.has(key) || params.getAll(key).length !== 1) return null;
  const number = (key: string) => {
    const raw = params.get(key);
    if (raw === null) return undefined;
    if (!/^(0|[1-9]\d{0,14})$/.test(raw)) return null;
    const n = Number(raw);
    return Number.isSafeInteger(n) ? n : null;
  };
  const snapshot = number("snapshot"),
    before = number("before");
  const kind = params.get("kind") ?? "incorrect",
    category = params.get("category") ?? "all";
  if (
    !mistakeKinds.includes(kind as MistakeKind) ||
    (category !== "all" &&
      !mistakeCategories.includes(
        category as (typeof mistakeCategories)[number],
      )) ||
    snapshot === null ||
    before === null ||
    (before !== undefined &&
      (snapshot === undefined || before > snapshot || before < 1))
  )
    return null;
  return { kind: kind as MistakeKind, category, snapshot, before };
}
export const isGuidedRetry = (ref: string | null) =>
  !!ref && /^single:.+:mistake:[0-9a-f-]{36}$/i.test(ref);
