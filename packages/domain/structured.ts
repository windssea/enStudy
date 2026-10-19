import type { Answer, Exercise } from "../contracts/index";
export const normalizeText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
export function sortPlacements(
  exercise: Exercise,
  answer: Answer,
): Record<string, string> | null {
  if (
    !exercise.sorting ||
    !Array.isArray(answer) ||
    answer.length !== exercise.sorting.cards.length
  )
    return null;
  const result: Record<string, string> = {};
  for (const entry of answer) {
    if (typeof entry !== "string") return null;
    const [card, group, extra] = entry.split("=");
    if (
      extra !== undefined ||
      Object.hasOwn(result, card) ||
      !exercise.sorting.cards.some((c) => c.id === card) ||
      !exercise.sorting.groups.some((g) => g.id === group)
    )
      return null;
    result[card] = group;
  }
  return result;
}
export function structuredCanonical(
  exercise: Exercise,
  answer: Answer,
): string | null {
  if (exercise.type === "order" && exercise.graphemeTokens) {
    if (
      !Array.isArray(answer) ||
      !exercise.tokens ||
      !answer.every((token) => typeof token === "string") ||
      answer.length !== exercise.tokens.length
    )
      return null;
    const expected = exercise.tokens.map(normalizeText).sort(),
      given = answer.map(normalizeText).sort();
    if (JSON.stringify(expected) !== JSON.stringify(given)) return null;
    return JSON.stringify(answer.map(normalizeText).join(""));
  }
  if (exercise.type === "evidence") {
    if (
      !Array.isArray(answer) ||
      answer.length !== 2 ||
      !exercise.passage?.some((s) => s.id === answer[0]) ||
      typeof answer[1] !== "string" ||
      !exercise.choices?.some(
        (c) => normalizeText(c) === normalizeText(answer[1]),
      )
    )
      return null;
    return JSON.stringify([answer[0], normalizeText(answer[1])]);
  }
  if (
    exercise.type === "listen" &&
    (typeof answer !== "string" ||
      !exercise.choices?.some(
        (c) => normalizeText(c) === normalizeText(answer),
      ))
  )
    return null;
  if (exercise.type === "order" && exercise.punctuationTokens)
    return JSON.stringify(
      normalizeText(joinParts(Array.isArray(answer) ? answer : [answer])),
    );
  if (exercise.type === "sort") {
    const result = sortPlacements(exercise, answer);
    return result
      ? JSON.stringify(
          Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
        )
      : null;
  }
  if (exercise.type === "repair") {
    if (
      !Array.isArray(answer) ||
      answer.length !== 2 ||
      !exercise.editing?.parts.some((p) => p.id === answer[0]) ||
      typeof answer[1] !== "string" ||
      !answer[1].trim() ||
      answer[1].length > 60 ||
      /[<>\u0000-\u001f]/.test(answer[1])
    )
      return null;
    return JSON.stringify([answer[0], normalizeText(answer[1])]);
  }
  return JSON.stringify(
    normalizeText(Array.isArray(answer) ? answer.join(" ") : answer),
  );
}
export function joinParts(parts: string[]) {
  return parts.join(" ").replace(/\s+([.,!?;:])/g, "$1");
}
export function emptyAnswer(exercise: Exercise): Answer {
  return ["order", "sort", "repair", "evidence"].includes(exercise.type)
    ? []
    : "";
}
// Recover only the learner's stored canonical response, using public controls.
// This never reads a solution key or grades the response again.
export function restoreStoredAnswer(
  exercise: Exercise,
  stored: unknown,
): Answer {
  const choice = (text: string) =>
    exercise.choices?.find((c) => normalizeText(c) === normalizeText(text)) ??
    text;
  if (exercise.type === "sort") {
    if (
      !Array.isArray(stored) ||
      !stored.every(
        (r) =>
          Array.isArray(r) &&
          r.length === 2 &&
          r.every((v) => typeof v === "string"),
      )
    )
      return [];
    const answer = stored.map(([card, group]) => `${card}=${group}`);
    return sortPlacements(exercise, answer) ? answer : [];
  }
  if (exercise.type === "repair" || exercise.type === "evidence") {
    if (
      !Array.isArray(stored) ||
      stored.length !== 2 ||
      stored.some((v) => typeof v !== "string")
    )
      return [];
    if (exercise.type === "repair")
      return exercise.editing?.parts.some((p) => p.id === stored[0])
        ? [stored[0], stored[1]]
        : [];
    return exercise.passage?.some((p) => p.id === stored[0])
      ? [stored[0], choice(stored[1])]
      : [];
  }
  if (typeof stored !== "string") return emptyAnswer(exercise);
  if (exercise.type === "choice" || exercise.type === "listen")
    return choice(stored);
  if (exercise.type !== "order") return stored;
  const tokens = exercise.tokens ?? [],
    target = normalizeText(stored),
    used = new Set<number>();
  let budget = 4096;
  const join = (path: string[]) =>
    normalizeText(
      exercise.graphemeTokens
        ? path.join("")
        : exercise.punctuationTokens
          ? joinParts(path)
          : path.join(" "),
    );
  function search(path: string[]): string[] | null {
    if (--budget < 0) return null;
    const text = join(path);
    if (
      text === target &&
      (!exercise.graphemeTokens || path.length === tokens.length)
    )
      return path;
    const tried = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      const token = normalizeText(tokens[i]);
      if (used.has(i) || tried.has(token)) continue;
      tried.add(token);
      const next = [...path, tokens[i]];
      if (!target.startsWith(join(next))) continue;
      used.add(i);
      const result = search(next);
      used.delete(i);
      if (result) return result;
    }
    return null;
  }
  return search([]) ?? [];
}
