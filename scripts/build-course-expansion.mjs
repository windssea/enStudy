import authored from "../content/courses-expansion-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { writeContent } from "./content-write.mjs";
const digest = (value) => createHash("sha256").update(value).digest("hex"),
  quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
const legacy = JSON.parse(
  await readFile("content/course-release.v1.json", "utf8"),
);
const scope = parse(await readFile("docs/curriculum/p1-p6-scope.csv", "utf8"), {
  columns: true,
  skip_empty_lines: true,
  bom: true,
});
const items = [],
  id = "course-expansion-v1";
const lessons = authored.map((source) => {
  const unit = scope.find((u) => u.unit_id === source.unitId);
  if (!unit) throw new Error(`Unknown unit ${source.unitId}`);
  const { facts, rule, skill, examples, ...metadata } = source;
  if (
    facts.length !== 9 ||
    examples.length !== 3 ||
    new Set(facts.map((f) => f.sentence.toLowerCase())).size !== 9
  )
    throw new Error(`Need nine distinct practice contexts: ${source.id}`);
  if (
    facts.some((f) =>
      examples.some(
        (e) => e.example.toLowerCase() === f.sentence.toLowerCase(),
      ),
    )
  )
    throw new Error(`Demonstration reused in practice ${source.id}`);
  for (const [index, fact] of facts.entries()) {
    const type = ["choice", "input", "order"][index % 3],
      sentence = fact.sentence;
    if (
      fact.prompt.split("___").length !== 2 ||
      fact.prompt.replace("___", fact.answer) !== sentence ||
      new Set([fact.answer, ...fact.wrong].map((s) => s.toLowerCase())).size !==
        3 ||
      fact.wrong.some((w) => fact.alternatives.includes(w)) ||
      sentence.split(" ").length > 16
    )
      throw new Error(`Invalid practice fact ${source.id}/${index}`);
    const target = fact.skill ?? skill;
    items.push({
      id: `${source.id}.p${index + 1}.${type}`,
      lessonId: source.id,
      category: target.startsWith("vocabulary.")
        ? "vocabulary"
        : source.topicIds[0]?.startsWith("tense.")
          ? "tense"
          : "grammar",
      title: source.title,
      context: fact.context,
      prompt: type === "order" ? "用词块搭出这句英语。" : fact.prompt,
      type,
      ...(type === "choice" ? { choices: [fact.answer, ...fact.wrong] } : {}),
      ...(type === "order" ? { tokens: sentence.split(" ").reverse() } : {}),
      answers:
        type === "order" ? [sentence] : [fact.answer, ...fact.alternatives],
      gradeMin: source.grade,
      skill: target,
      modality: type === "choice" ? "recognition" : "controlled-production",
      family: `fact-${digest(sentence.toLowerCase()).slice(0, 16)}`,
      hint: rule,
      explanation: `${sentence} ${fact.meaning} ${rule}`,
    });
  }
  return {
    ...metadata,
    unitTitle: unit.title,
    releaseId: id,
    cards: examples.map((e) => ({ title: source.title, rule, ...e })),
    itemCount: 9,
  };
});
if (
  lessons.length !== 24 ||
  items.length !== 216 ||
  new Set(items.map((i) => i.id)).size !== 216
)
  throw new Error("Expansion coverage invalid.");
const manifestHash = digest(JSON.stringify({ lessons, items })),
  release = { id, version: 1, manifestHash, lessons, items };
const sql = [
  "-- Additive course expansion: only new content, no copied historical memberships.",
  `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
];
for (const lesson of lessons)
  sql.push(
    `INSERT INTO lessons VALUES(${quote(lesson.id)},1,'${id}',${lesson.grade},'A',2,${quote(lesson.title)},${quote(JSON.stringify(lesson))});`,
  );
for (const item of items) {
  const {
    answers,
    hint,
    explanation,
    skill,
    modality,
    family,
    lessonId,
    ...publicData
  } = item;
  sql.push(
    `INSERT OR IGNORE INTO skills VALUES(${quote(skill)},${quote(skill.split(".")[0])},${quote(item.title)});`,
    `INSERT INTO items VALUES(${quote(item.id)},1,${quote(lessonId)},1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, hint, explanation, family }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(item.id)},1);`,
  );
}
const migration = sql.join("\n") + "\n",
  path = "migrations/0014_course_expansion_v1.sql";
const existing = await readFile(path, "utf8").catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
if (existing !== null && existing.replaceAll("\r\n", "\n") !== migration)
  throw new Error("Immutable course expansion changed; publish a new release.");
if (existing === null) await writeFile(path, migration);
await writeContent("content/course-expansion.v1.json", JSON.stringify(release));
await writeContent(
  "public/content/lessons.json",
  JSON.stringify({
    release: "course-catalog-v2",
    releases: [legacy.id, id],
    lessons: [
      ...legacy.lessons.map((l) => ({ ...l, releaseId: legacy.id })),
      ...lessons,
    ],
  }),
);
console.log(
  `Built ${lessons.length} new second-unit lessons and ${items.length} distinct practice tasks; catalog ${legacy.lessons.length + lessons.length}/288 lessons.`,
);
