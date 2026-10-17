import { buildPatternFacts, patternIds } from "../content/patterns-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { writeContent } from "./content-write.mjs";
const digest = (value) => createHash("sha256").update(value).digest("hex");
const rows = parse(
  await readFile("docs/curriculum/sentence-patterns.csv", "utf8"),
  { columns: true, skip_empty_lines: true, bom: true },
);
const legacy = JSON.parse(await readFile("content/exercises.json", "utf8"));
const course = JSON.parse(
  await readFile("content/course-release.v1.json", "utf8"),
);
const topics = JSON.parse(
  await readFile("content/topic-release.v1.json", "utf8"),
);
const expand = (text) =>
  text
    .replace(/\bI'm\b/gi, "I am")
    .replace(/\bYou're\b/gi, "you are")
    .replace(/\bIt's\b/gi, "it is")
    .replace(/\bWhat's\b/gi, "what is")
    .replace(/\bI'd\b/gi, "I would")
    .replace(/\bmustn't\b/gi, "must not")
    .replace(/\bshouldn't\b/gi, "should not")
    .replace(/\bdon't\b/gi, "do not")
    .replace(/\s+/g, " ")
    .trim();
const contract = (text) =>
  text
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bYou are\b/g, "You're")
    .replace(/\bIt is\b/g, "It's")
    .replace(/\bWhat is\b/g, "What's")
    .replace(/\bI would\b/g, "I'd")
    .replace(/\bmust not\b/g, "mustn't")
    .replace(/\bshould not\b/g, "shouldn't");
const orderForms = (fact) => {
  const forms = [
    fact.sentence,
    expand(fact.sentence),
    contract(fact.sentence),
    ...(fact.orderAlternatives ?? []),
  ];
  return [
    ...new Set(
      forms.flatMap((text) => [
        text,
        text.replace(/colour/g, "color").replace(/favourite/g, "favorite"),
      ]),
    ),
  ];
};
const releaseId = "pattern-bank-v1",
  items = [],
  stats = {};
if (
  rows.length !== 72 ||
  patternIds.length !== 72 ||
  rows.some((row) => !patternIds.includes(row.pattern_id))
)
  throw new Error("All 72 frames must have independent builders.");
for (const row of rows) {
  const facts = buildPatternFacts(row);
  if (facts.length !== 40 || new Set(facts.map((f) => f.context)).size !== 40)
    throw new Error(`Need 40 different contexts for ${row.pattern_id}`);
  for (const [index, fact] of facts.entries()) {
    const answers = [fact.answer, ...(fact.alternatives ?? [])];
    const normalize = (text) => text.trim().toLowerCase();
    if (
      fact.cloze.split("___").length !== 2 ||
      !fact.sentence ||
      fact.wrong.length !== 2 ||
      new Set([fact.answer, ...fact.wrong].map(normalize)).size !== 3 ||
      fact.wrong.some((w) => answers.map(normalize).includes(normalize(w)))
    )
      throw new Error(`Invalid slot or choices ${row.pattern_id}/${index}`);
    const family = `pattern-sentence-${digest(JSON.stringify([row.pattern_id, expand(fact.sentence).toLowerCase()])).slice(0, 20)}`;
    for (const type of ["choice", "input", "order"]) {
      items.push({
        id: `frame.${row.pattern_id}.${index + 1}.${type}`,
        patternId: row.pattern_id,
        pattern: `${row.pattern_id}.${type}`,
        category: "patterns",
        title: `${row.cluster} · 句式练习`,
        context: fact.context,
        prompt:
          type === "order"
            ? "根据情景，用词块搭出完整表达；问答任务请先问后答。"
            : fact.cloze,
        type,
        ...(type === "choice" ? { choices: [fact.answer, ...fact.wrong] } : {}),
        ...(type === "order" ? { tokens: fact.sentence.split(" ") } : {}),
        answers: type === "order" ? orderForms(fact) : answers,
        gradeMin: Number(row.grade_min),
        skill: `grammar.${row.pattern_id}`,
        modality: type === "choice" ? "recognition" : "controlled-production",
        family,
        hint: row.slot_rule,
        explanation: `${fact.sentence} ${fact.meaning}。${row.slot_rule}`,
      });
    }
  }
  const families = new Set(
    items
      .filter((item) => item.patternId === row.pattern_id)
      .map((item) => item.family),
  ).size;
  if (families < 20)
    throw new Error(
      `Need at least 20 different sentence families for a 20-item draw: ${row.pattern_id} has ${families}`,
    );
  stats[row.pattern_id] = {
    items: 120,
    contexts: 40,
    families,
    roundSizes: [5, 10, 20],
    mode: "choice-input-order",
  };
}
const imported = [...legacy, ...course.items, ...topics.items];
const manifestHash = digest(
  JSON.stringify({
    items,
    stats,
    importedHash: digest(JSON.stringify(imported)),
  }),
);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const statements = [
  "-- Immutable pattern-bank-v1; publish a new release to revise this snapshot.",
  `INSERT INTO content_releases VALUES('${releaseId}','published','${manifestHash}',unixepoch()*1000);`,
];
function inserts(prefix, values) {
  let buffer = [],
    bytes = Buffer.byteLength(prefix);
  for (const value of values) {
    const size = Buffer.byteLength(value) + 2;
    if (buffer.length && bytes + size > 70000) {
      statements.push(prefix + buffer.join(",\n") + ";");
      buffer = [];
      bytes = Buffer.byteLength(prefix);
    }
    buffer.push(value);
    bytes += size;
  }
  if (buffer.length) statements.push(prefix + buffer.join(",\n") + ";");
}
inserts(
  "INSERT INTO skills(id,kind,label) VALUES\n",
  rows.map(
    (row) =>
      `(${quote(`grammar.${row.pattern_id}`)},'grammar',${quote(row.frame)})`,
  ),
);
inserts(
  "INSERT INTO lessons VALUES\n",
  rows.map(
    (row) =>
      `(${quote(`frame.${row.pattern_id}`)},1,'${releaseId}',${Number(row.grade_min)},'A',1,${quote(row.frame)},'{}')`,
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
      patternId,
      pattern,
      ...publicData
    } = item;
    return `(${quote(item.id)},1,${quote(`frame.${patternId}`)},1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, hint, explanation, family, pattern }))},'published')`;
  }),
);
inserts(
  "INSERT INTO release_items VALUES\n",
  [...imported, ...items].map((item) => `('${releaseId}',${quote(item.id)},1)`),
);
const migration = statements.join("\n") + "\n",
  path = "migrations/0008_pattern_bank_v1.sql";
const previous = await readFile(path, "utf8").catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
if (previous !== null && previous.replaceAll("\r\n", "\n") !== migration)
  throw new Error(
    "Immutable pattern migration changed; publish a new version.",
  );
if (previous === null) await writeFile(path, migration);
await writeContent(
  "content/pattern-release.v1.json",
  JSON.stringify({ id: releaseId, manifestHash, items, stats }),
);
console.log(
  `Built 72 fixed-frame banks: 40 contexts x 3 variants = 120 items per frame; ${items.length} new variants.`,
);
