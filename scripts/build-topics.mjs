import bank from "../content/topics-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
const digest = (value) => createHash("sha256").update(value).digest("hex");
const topics = parse(
  await readFile("docs/curriculum/topic-training-scope.csv", "utf8"),
  { columns: true, skip_empty_lines: true, bom: true },
);
const legacy = JSON.parse(await readFile("content/exercises.json", "utf8"));
const course = JSON.parse(
  await readFile("content/course-release.v1.json", "utf8"),
);
const releaseId = "topic-bank-v1";
const items = [];
const stats = {};
for (const topic of topics) {
  const facts = bank.get(topic.topic_id);
  if (
    !facts ||
    facts.length < 60 ||
    new Set(facts.map((f) => JSON.stringify([f.prompt, f.reading ?? ""])))
      .size !== facts.length
  )
    throw new Error(
      `Topic ${topic.topic_id} needs 60 distinct authored prompts; found ${facts?.length}.`,
    );
  for (const [index, fact] of facts.entries()) {
    const answerKey = fact.answer.trim().toLowerCase();
    if (
      !answerKey ||
      fact.wrong.length !== 2 ||
      new Set([fact.answer, ...fact.wrong].map((v) => v.trim().toLowerCase()))
        .size !== 3
    )
      throw new Error(
        `Ambiguous choices: ${topic.topic_id}/${index}: ${fact.prompt}`,
      );
    const family = `topic-fact-${digest(JSON.stringify([fact.prompt, fact.answer, fact.reading ?? ""])).slice(0, 20)}`;
    for (const type of ["choice", "input"]) {
      const category = [
        "grammar",
        "tense",
        "forms",
        "vocabulary",
        "reading",
      ].includes(topic.category)
        ? topic.category
        : "grammar";
      items.push({
        id: `bank.${topic.topic_id}.${index + 1}.${type}`,
        topicId: topic.topic_id,
        pattern: fact.pattern ?? `${topic.topic_id}.lexical`,
        category,
        title: topic.title,
        context:
          fact.context ??
          (topic.category === "phonics"
            ? "先做文字音形练习；本轮不评分听音辨音。"
            : topic.category === "expression"
              ? "按给出的句框完成文字练习，不评分自由写作或口语。"
              : "读清情景和提示，再完成这一步。"),
        prompt: fact.prompt,
        type,
        ...(type === "choice" ? { choices: [fact.answer, ...fact.wrong] } : {}),
        ...(fact.reading ? { reading: fact.reading } : {}),
        answers: [fact.answer, ...(fact.alternatives ?? [])],
        gradeMin: Number(topic.grade_min),
        skill: topic.primary_skill,
        // Written contextual/reading recall is controlled production, not spelling mastery.
        modality:
          type === "choice"
            ? "recognition"
            : ["forms", "phonics"].includes(topic.category) ||
                topic.topic_id === "vocabulary.spelling"
              ? "spelling"
              : "controlled-production",
        family,
        hint: fact.rule,
        explanation: `${fact.answer}。${fact.rule}`,
      });
    }
  }
  stats[topic.topic_id] = {
    items: facts.length * 2,
    families: facts.length,
    roundSizes: [5, 10, 20],
    mode: "text-practice",
  };
}
if (bank.size !== topics.length)
  throw new Error("Topic source contains unknown topic IDs.");
const imported = [...legacy, ...course.items];
const manifestHash = digest(
  JSON.stringify({
    items,
    stats,
    importedHash: digest(JSON.stringify(imported)),
  }),
);
const release = { id: releaseId, manifestHash, items, stats };
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const statements = [
  "-- Immutable original topic-bank-v1. Publish a new release to revise content.",
  `INSERT INTO content_releases VALUES('${releaseId}','published','${manifestHash}',unixepoch()*1000);`,
];
// Chunk SQL by byte budget: D1's statement length is bounded.
function inserts(prefix, rows) {
  let current = [];
  let bytes = Buffer.byteLength(prefix);
  for (const row of rows) {
    const size = Buffer.byteLength(row) + 2;
    if (bytes + size > 70000 && current.length) {
      statements.push(prefix + current.join(",\n") + ";");
      current = [];
      bytes = Buffer.byteLength(prefix);
    }
    current.push(row);
    bytes += size;
  }
  if (current.length) statements.push(prefix + current.join(",\n") + ";");
}
inserts(
  "INSERT OR IGNORE INTO skills(id,kind,label) VALUES\n",
  topics.map(
    (t) =>
      `(${quote(t.primary_skill)},${quote(t.primary_skill.split(".")[0])},${quote(t.title)})`,
  ),
);
// Internal containers satisfy the existing item-to-lesson FK; not course completions.
inserts(
  "INSERT INTO lessons VALUES\n",
  topics.map(
    (t) =>
      `(${quote(`bank.${t.topic_id}`)},1,'${releaseId}',${Number(t.grade_min)},'A',1,${quote(t.title)},'{}')`,
  ),
);
inserts(
  "INSERT INTO items VALUES\n",
  items.map((item) => {
    const {
      answers,
      hint,
      explanation,
      skill,
      modality,
      family,
      topicId,
      pattern,
      ...publicData
    } = item;
    return `(${quote(item.id)},1,${quote(`bank.${topicId}`)},1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, hint, explanation, family, pattern }))},'published')`;
  }),
);
inserts(
  "INSERT INTO release_items VALUES\n",
  [...imported, ...items].map((item) => `('${releaseId}',${quote(item.id)},1)`),
);
const migration = statements.join("\n") + "\n";
const path = "migrations/0007_topic_bank_v1.sql";
const existing = await readFile(path, "utf8").catch((e) => {
  if (e.code !== "ENOENT") throw e;
  return null;
});
if (existing !== null && existing.replaceAll("\r\n", "\n") !== migration)
  throw new Error("Immutable topic migration changed; publish a new version.");
if (existing === null) await writeFile(path, migration);
await writeFile("content/topic-release.v1.json", JSON.stringify(release));
console.log(
  `Built ${topics.length} topic banks: ${items.length} variants / ${items.length / 2} authored text task groups; at least 120 items per topic.`,
);
