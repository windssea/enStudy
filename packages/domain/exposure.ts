import type { PrivateExercise } from "../server/exercises";
export const sentenceKey = (sentence: string) =>
  `sentence:${sentence
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .toLocaleLowerCase("en-US")}`;
export function answerExposureKeys(
  item: Pick<
    PrivateExercise,
    | "type"
    | "answers"
    | "prompt"
    | "family"
    | "id"
    | "solutionSentences"
    | "evidenceTargets"
  >,
) {
  if (item.solutionSentences)
    return [
      `family:${item.family ?? item.id}`,
      ...item.solutionSentences.map(sentenceKey),
      ...(item.evidenceTargets ?? []),
    ];
  const sentence =
    item.type === "order"
      ? item.answers[0]
      : item.prompt.replace("___", item.answers[0]);
  return [
    `family:${item.family ?? item.id}`,
    sentenceKey(
      sentence
        .replace(/[（(][^()（）]*[\u4e00-\u9fff][^()（）]*[）)]/g, "")
        .trim(),
    ),
  ];
}
