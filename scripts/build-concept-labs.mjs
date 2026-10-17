import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const source = JSON.parse(
  await readFile("content/concept-labs.v1.json", "utf8"),
);
const paths = [
  "exercises.json",
  "course-release.v1.json",
  "course-expansion.v1.json",
  "course-expansion.latest.json",
  "topic-release.v1.json",
  "pattern-release.v1.json",
  "vocabulary-release.v1.json",
  "workshop-release.v1.json",
  "workshop-release.latest.json",
  "story-course-release.v1.json",
  "word-listening-release.v1.json",
];
const items = [
  ...new Map(
    (
      await Promise.all(
        paths.map(async (path) => {
          const content = JSON.parse(await readFile(`content/${path}`, "utf8"));
          return Array.isArray(content) ? content : content.items;
        }),
      )
    )
      .flat()
      .map((item) => [`${item.id}:${item.version ?? 1}`, item]),
  ).values(),
];
const normalize = (value) =>
  value
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
const sentenceKey = (value) =>
  `sentence:${normalize(value).replace(/[.!?]+$/g, "")}`;
const answerKeys = (item) => {
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
};
const entries = {};
for (const lab of source.labs) {
  if (!["timeline", "morph"].includes(lab.kind) || lab.cases.length !== 3)
    throw Error(`Invalid concept lab ${lab.id}`);
  for (const example of lab.cases) {
    const keys = new Set([sentenceKey(example.sentence)]);
    const forms = new Set((example.targetForms ?? []).map(normalize));
    const skills = new Set([
      lab.skill,
      ...(lab.id === "forms.past-participle"
        ? ["morphology.verb.irregular-past"]
        : []),
    ]);
    for (const item of items) {
      const primary = answerKeys(item);
      if (primary.includes(sentenceKey(example.sentence)))
        for (const key of primary) keys.add(key);
      if (lab.kind !== "morph") continue;
      if (item.answers.some((answer) => forms.has(normalize(answer))))
        for (const key of primary) keys.add(key);
      if (
        skills.has(item.skill) &&
        item.repairs?.some((repair) =>
          repair.replacements.some((word) => forms.has(normalize(word))),
        )
      )
        for (const key of primary) keys.add(key);
      if (skills.has(item.skill) && item.sorting) {
        const ids = item.sorting.cards
          .filter((card) => normalize(card.text) === normalize(example.base))
          .map((card) => card.id);
        for (const key of item.evidenceTargets ?? [])
          if (ids.some((id) => key.endsWith(`:${id}`))) keys.add(key);
      }
    }
    if (
      lab.kind === "morph" &&
      (example.steps.length !== 3 ||
        example.steps.some(
          (step) => !step.tiles.length || step.tiles.length > 3,
        ))
    )
      throw Error(`Invalid morphology steps ${lab.id}/${example.id}`);
    entries[`${lab.id}/${example.id}`] = [...keys].sort();
  }
}
if (source.labs.length !== 16 || Object.keys(entries).length !== 48)
  throw Error("Expected sixteen labs and forty-eight distinct examples.");
await writeContent(
  "content/concept-exposure-map.json",
  JSON.stringify(
    {
      version: 1,
      sourceHash: createHash("sha256")
        .update(JSON.stringify(source))
        .digest("hex"),
      entries,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Built 16 optional concept labs / 48 teaching demonstrations and their private exposure mapping; no exercise or course credit added.",
);
