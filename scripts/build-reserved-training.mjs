import frames from "../content/training-reserved-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { writeContent } from "./content-write.mjs";
const topics = parse(
  await readFile("docs/curriculum/topic-training-scope.csv", "utf8"),
  { columns: true, skip_empty_lines: true, bom: true },
);
const id = "reserved-training-v1",
  items = [],
  blueprints = {};
const digest = (s) => createHash("sha256").update(s).digest("hex");
for (const [topicId, dimensions] of frames) {
  const topic = topics.find((t) => t.topic_id === topicId);
  if (
    !topic ||
    dimensions.length !== 5 ||
    new Set(dimensions.map((d) => d[0])).size !== 5
  )
    throw Error(`Invalid blueprint ${topicId}`);
  blueprints[topicId] = {
    title: topic.title,
    dimensions: dimensions.map(([id, label]) => ({ id, label })),
    scope: "controlled-context",
    families: 60,
  };
  for (const [dimension, , render] of dimensions)
    for (let i = 0; i < 12; i++) {
      const fact = render(i),
        phase =
          i < 2
            ? "diagnostic"
            : i < 6
              ? "practice"
              : i < 8
                ? "transfer"
                : "retest";
      if (
        !fact.prompt ||
        !fact.rule ||
        !fact.answer ||
        fact.wrong.length !== 2 ||
        new Set([fact.answer, ...fact.wrong].map((s) => s.toLowerCase().trim()))
          .size !== 3
      )
        throw Error(`Ambiguous ${topicId}/${dimension}/${i}`);
      const type = i % 2 ? "input" : "choice";
      items.push({
        id: `reserved.${topicId}.${dimension}.${i + 1}`,
        version: 1,
        topicId,
        trainingPhase: phase,
        trainingDimension: dimension,
        pattern: `${topicId}.${dimension}`,
        category: topic.category,
        title: topic.title,
        context:
          "读清情景，再独立想一想。不会时可以看提示，提示后的记录会另外保存。",
        prompt: fact.prompt,
        type,
        ...(type === "choice" ? { choices: [fact.answer, ...fact.wrong] } : {}),
        answers: [fact.answer, ...fact.alternatives],
        gradeMin: Number(topic.grade_min),
        skill: topic.primary_skill,
        modality: type === "choice" ? "recognition" : "controlled-production",
        family: `reserved-fact-${digest(JSON.stringify([fact.prompt, fact.answer])).slice(0, 20)}`,
        hint: fact.rule,
        explanation: `${fact.answer}。${fact.rule}`,
      });
    }
}
if (
  frames.size !== 18 ||
  items.length !== 1080 ||
  new Set(items.map((i) => i.prompt)).size !== items.length
)
  throw Error("Reserved coverage or prompt uniqueness changed");
const manifestHash = digest(JSON.stringify({ items, blueprints }));
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const statements = [
  "-- Immutable dedicated controlled-text material. Review revisions in a new release.",
  `INSERT INTO content_releases VALUES(${q(id)},'published',${q(manifestHash)},unixepoch()*1000);`,
];
function insert(prefix, rows) {
  let batch = [],
    bytes = Buffer.byteLength(prefix);
  for (const r of rows) {
    const size = Buffer.byteLength(r) + 2;
    if (bytes + size > 70000 && batch.length) {
      statements.push(prefix + batch.join(",\n") + ";");
      batch = [];
      bytes = Buffer.byteLength(prefix);
    }
    batch.push(r);
    bytes += size;
  }
  if (batch.length) statements.push(prefix + batch.join(",\n") + ";");
}
insert(
  "INSERT INTO lessons VALUES\n",
  [...frames.keys()].map((topicId) => {
    const topic = topics.find((t) => t.topic_id === topicId);
    return `(${q(`reserved.${topicId}`)},1,${q(id)},${Number(topic.grade_min)},'A',1,${q(topic.title)},'{}')`;
  }),
);
insert(
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
      trainingPhase,
      trainingDimension,
      version,
      ...publicData
    } = item;
    return `(${q(item.id)},1,${q(`reserved.${topicId}`)},1,${q(skill)},${q(modality)},${q(item.type)},${q(JSON.stringify(publicData))},${q(JSON.stringify({ answers, hint, explanation, family, pattern, trainingPhase, trainingDimension }))},'published')`;
  }),
);
insert(
  "INSERT INTO release_items VALUES\n",
  items.map((item) => `(${q(id)},${q(item.id)},1)`),
);
const migration = statements.join("\n") + "\n",
  path = "migrations/0043_reserved_training_content_v1.sql";
const old = await readFile(path, "utf8").catch((e) => {
  if (e.code !== "ENOENT") throw e;
  return null;
});
if (old !== null && old.replaceAll("\r\n", "\n") !== migration)
  throw Error("Immutable reserved migration changed; publish a new release");
if (old === null) await writeFile(path, migration);
await writeContent(
  "content/training-reserved-release.v1.json",
  JSON.stringify({ id, manifestHash, blueprints, items }),
);
console.log(
  `Built 18 dedicated training blueprints / 1080 controlled text tasks; ordinary banks unchanged. Other 42 topics and external teaching review remain pending.`,
);
