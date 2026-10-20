import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { irregularVerbs } from "../packages/domain/irregularVerbs.ts";
import { writeContent } from "./content-write.mjs";
const original = JSON.parse(
  await readFile("content/grade4-tense-release.v1.json", "utf8"),
);
const id = "grade4-tense-cues-v2",
  q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const revised = original.items
  .filter((i) => i.topicId.endsWith(".did") || i.id.includes(".restore."))
  .map((item) => {
    const word = irregularVerbs.find((w) => w.base === item.wordFormCue.word);
    if (!word) throw Error("Unknown irregular cue");
    return {
      ...item,
      version: 2,
      prompt: item.prompt.replace(
        `（${word.base}）`,
        `（过去式 ${word.past}）`,
      ),
      wordFormCue: {
        word: word.past,
        instruction:
          item.type === "choice" ? "选出句中合适的形式" : "写出句中合适的形式",
      },
    };
  });
if (revised.length !== 360) throw Error("Expected 360 revised cue variants");
const manifestHash = createHash("sha256")
    .update(JSON.stringify(revised))
    .digest("hex"),
  topics = [...new Set(revised.map((i) => i.topicId))];
const sql = [
  "-- Additive question cues: recall the base from a past form; do not print the answer as the source cue. V1 rows remain unchanged.",
  `INSERT INTO content_releases VALUES(${q(id)},'published',${q(manifestHash)},unixepoch()*1000);`,
];
function insert(prefix, rows) {
  let batch = [],
    bytes = Buffer.byteLength(prefix);
  for (const row of rows) {
    const size = Buffer.byteLength(row) + 2;
    if (bytes + size > 70000 && batch.length) {
      sql.push(prefix + batch.join(",\n") + ";");
      batch = [];
      bytes = Buffer.byteLength(prefix);
    }
    batch.push(row);
    bytes += size;
  }
  if (batch.length) sql.push(prefix + batch.join(",\n") + ";");
}
insert(
  "INSERT INTO lessons VALUES\n",
  topics.map(
    (t) =>
      `(${q("g4.topic." + t)},2,${q(id)},4,'A',1,${q(original.topics.find((r) => r.topic_id === t).title)},'{}')`,
  ),
);
insert(
  "INSERT INTO items VALUES\n",
  revised.map((item) => {
    const {
      answers,
      hint,
      explanation,
      skill,
      modality,
      family,
      topicId,
      pattern,
      version,
      ...data
    } = item;
    return `(${q(item.id)},2,${q("g4.topic." + topicId)},2,${q(skill)},${q(modality)},${q(item.type)},${q(JSON.stringify(data))},${q(JSON.stringify({ answers, hint, explanation, family, pattern }))},'published')`;
  }),
);
insert(
  "INSERT INTO release_items VALUES\n",
  revised.map((i) => `(${q(id)},${q(i.id)},2)`),
);
const migration = sql.join("\n") + "\n",
  path = "migrations/0053_grade4_cues.sql";
const prior = await readFile(path, "utf8").catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
if (prior !== null && prior.replaceAll("\r\n", "\n") !== migration)
  throw Error("Immutable cue revision changed; create a new version.");
await writeContent(path, migration);
const byId = new Map(revised.map((i) => [i.id, i]));
await writeContent(
  "content/grade4-tense-release.latest.json",
  JSON.stringify({
    ...original,
    id: "grade4-tense-catalog-v2",
    editionId: original.id,
    releases: [original.id, id],
    manifestHash,
    items: original.items.map((i) => byId.get(i.id) ?? i),
  }),
);
console.log(
  "Revised 360 did/restoration variants to recall from a past-form cue; v1 keys and families preserved.",
);
