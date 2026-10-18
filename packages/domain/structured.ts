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
