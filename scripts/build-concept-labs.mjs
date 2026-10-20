import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
import { ketRelease } from "../packages/domain/ketVocabulary.ts";
const source = JSON.parse(
  await readFile("content/concept-labs.v1.json", "utf8"),
);
const paths = [
  "grade4-tense-release.v1.json",
  "exercises.json",
  "course-release.v1.json",
  "course-expansion.v1.json",
  "course-expansion.latest.json",
  "topic-release.v1.json",
  "training-reserved-release.v1.json",
  "training-reserved-release.latest.json",
  "training-reserved-release.catalog.json",
  "training-reserved-release.forms.v1.json",
  "pattern-release.v1.json",
  "vocabulary-release.v1.json",
  "workshop-release.v1.json",
  "workshop-release.latest.json",
  "story-course-release.v1.json",
  "word-listening-release.v1.json",
  "action-course-release.v1.json",
  "action-course-release.latest.json",
  "discovery-course-release.v1.json",
  "journey-course-release.v1.json",
  "next-term-course-release.v1.json",
  "explorer-term-course-release.v1.json",
  "neighbourhood-term-course-release.v1.json",
  "cooperation-term-course-release.v1.json",
  "practical-term-course-release.v1.json",
  "practical-term-course-release.latest.json",
  "portfolio-term-course-release.v1.json",
  "phonics-release.v1.json",
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
items.push(...ketRelease.items);
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
  if (
    !["timeline", "morph", "spatial"].includes(lab.kind) ||
    lab.cases.length !== (lab.id === "forms.comparison" ? 6 : 3)
  )
    throw Error(`Invalid concept lab ${lab.id}`);
  for (const example of lab.cases) {
    if (
      lab.kind === "spatial" &&
      (lab.id !== "grammar.prepositions" ||
        !["in", "on", "under"].includes(example.spatial?.relation))
    )
      throw Error(`Invalid spatial example ${lab.id}/${example.id}`);
    if (example.measurement) {
      const data = example.measurement;
      if (
        lab.id !== "forms.comparison" ||
        !["tower", "bridge", "book"].includes(data.kind) ||
        !["larger", "smaller"].includes(data.preference) ||
        !["米", "厘米"].includes(data.unit) ||
        !data.metric ||
        !data.comparative ||
        !data.superlative ||
        !Array.isArray(data.items) ||
        ![2, 3].includes(data.items.length) ||
        new Set(data.items.map((item) => item.id)).size !== data.items.length ||
        data.items.some(
          (item) =>
            !/^[a-z][a-z-]*$/.test(item.id) ||
            !item.label ||
            !Number.isFinite(item.value) ||
            item.value <= 0,
        )
      )
        throw Error(`Invalid measurement ${lab.id}/${example.id}`);
      const best =
        data.preference === "larger"
          ? Math.max(...data.items.map((item) => item.value))
          : Math.min(...data.items.map((item) => item.value));
      if (
        data.items.filter((item) => item.value === best).length !== 1 ||
        data.items.find((item) => item.id === data.targetId)?.value !== best
      )
        throw Error(`Measurement claim contradicts its data ${example.id}`);
    }
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
          .filter(
            (card) =>
              normalize(card.text) === normalize(example.base) ||
              forms.has(normalize(card.text)),
          )
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
if (source.labs.length !== 17 || Object.keys(entries).length !== 54)
  throw Error("Expected seventeen labs and fifty-four distinct examples.");
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
  "Built 17 optional concept labs / 54 teaching demonstrations including spatial placement and three measured comparisons; no exercise or course credit added.",
);
