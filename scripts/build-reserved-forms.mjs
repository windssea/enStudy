import frames from "../content/training-reserved-forms-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { writeContent } from "./content-write.mjs";
const topics = parse(
  await readFile("docs/curriculum/topic-training-scope.csv", "utf8"),
  { columns: true, skip_empty_lines: true, bom: true },
);
const id = "reserved-forms-v1",
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
    throw Error("Invalid forms blueprint: " + topicId);
  blueprints[topicId] = {
    title: topic.title,
    dimensions: dimensions.map(([id, label]) => ({ id, label })),
    scope: "controlled-context",
    families: 60,
  };
  for (const [dimension, , render] of dimensions)
    for (let i = 0; i < 12; i++) {
      const fact = render(i),
        type = i % 2 ? "input" : "choice";
      if (
        !fact.prompt.includes("___") ||
        !fact.answer ||
        !fact.rule ||
        fact.wrong.length !== 2 ||
        new Set([fact.answer, ...fact.wrong].map((s) => s.toLowerCase().trim()))
          .size !== 3 ||
        fact.wrong.some((s) =>
          fact.alternatives.some((a) => a.toLowerCase() === s.toLowerCase()),
        )
      )
        throw Error(
          "Ambiguous word-form task " + topicId + "/" + dimension + "/" + i,
        );
      items.push({
        id: `reserved.${topicId}.${dimension}.${i + 1}`,
        version: 1,
        topicId,
        trainingPhase:
          i < 2
            ? "diagnostic"
            : i < 6
              ? "practice"
              : i < 8
                ? "transfer"
                : "retest",
        trainingDimension: dimension,
        pattern: `${topicId}.${dimension}`,
        category: topic.category,
        title: topic.title,
        context:
          "按词卡要求练习词形。本轮是受控文字练习，不评定口语、听辨或自由表达。",
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
  frames.size !== 8 ||
  items.length !== 480 ||
  new Set(items.map((i) => i.prompt)).size !== 480
)
  throw Error("Forms coverage must be eight topics and 480 unique prompts.");
const manifestHash = digest(JSON.stringify({ items, blueprints }));
await writeContent(
  "content/training-reserved-release.forms.v1.json",
  JSON.stringify({ id, manifestHash, blueprints, items }),
);
const old = JSON.parse(
  await readFile("content/training-reserved-release.latest.json", "utf8"),
);
const catalogBlueprints = {};
for (const [topic, b] of Object.entries(old.blueprints))
  catalogBlueprints[topic] = {
    ...b,
    editionId: old.editionId,
    revisionId: old.revisionId,
    releases: old.releases,
  };
for (const [topic, b] of Object.entries(blueprints)) {
  if (catalogBlueprints[topic])
    throw Error("Topic edition cannot be replaced by an extension.");
  catalogBlueprints[topic] = {
    ...b,
    editionId: id,
    revisionId: id,
    releases: [id],
  };
}
const catalog = {
  ...old,
  id: "reserved-training-catalog-v3",
  releases: [...old.releases, id],
  blueprints: catalogBlueprints,
  items: [...old.items, ...items],
};
catalog.manifestHash = digest(
  JSON.stringify({ items: catalog.items, blueprints: catalog.blueprints }),
);
await writeContent(
  "content/training-reserved-release.catalog.json",
  JSON.stringify(catalog),
);
if (!process.argv.includes("--draft")) {
  const q = (v) => `'${String(v).replaceAll("'", "''")}'`,
    statements = [
      "-- Eight additional word-form topics. Existing editions and migrations remain immutable.",
      `INSERT INTO content_releases VALUES(${q(id)},'published',${q(manifestHash)},unixepoch()*1000);`,
    ];
  function insert(prefix, rows) {
    let batch = [],
      bytes = Buffer.byteLength(prefix);
    for (const row of rows) {
      const size = Buffer.byteLength(row) + 2;
      if (bytes + size > 70000 && batch.length) {
        statements.push(prefix + batch.join(",\n") + ";");
        batch = [];
        bytes = Buffer.byteLength(prefix);
      }
      batch.push(row);
      bytes += size;
    }
    if (batch.length) statements.push(prefix + batch.join(",\n") + ";");
  }
  insert(
    "INSERT INTO lessons VALUES\n",
    [...frames.keys()].map((topicId) => {
      const t = topics.find((t) => t.topic_id === topicId);
      return `(${q("reserved." + topicId)},1,${q(id)},${Number(t.grade_min)},'A',1,${q(t.title)},'{}')`;
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
      return `(${q(item.id)},1,${q("reserved." + topicId)},1,${q(skill)},${q(modality)},${q(item.type)},${q(JSON.stringify(publicData))},${q(JSON.stringify({ answers, hint, explanation, family, pattern, trainingPhase, trainingDimension }))},'published')`;
    }),
  );
  insert(
    "INSERT INTO release_items VALUES\n",
    items.map((item) => `(${q(id)},${q(item.id)},1)`),
  );
  const sql = statements.join("\n") + "\n",
    path = "migrations/0046_reserved_word_forms_v1.sql";
  const previous = await readFile(path, "utf8").catch((e) => {
    if (e.code !== "ENOENT") throw e;
    return null;
  });
  if (previous !== null && previous.replaceAll("\r\n", "\n") !== sql)
    throw Error("Immutable word-form migration changed; append a revision.");
  if (previous === null) await writeFile(path, sql);
}
console.log(
  "Built 8 word-form blueprints / 480 reserved tasks; 26 topics / 1560 tasks in the combined catalog. Remaining 34 topics and teaching review are still pending.",
);
