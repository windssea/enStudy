import frames from "../content/training-reserved-forms-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const original = JSON.parse(
  await readFile("content/training-reserved-release.forms.v1.json", "utf8"),
);
const previous = JSON.parse(
  await readFile("content/training-reserved-release.latest.json", "utf8"),
);
const id = "reserved-forms-v2",
  hash = (s) => createHash("sha256").update(JSON.stringify(s)).digest("hex");
const labels = {
  "forms.noun-plural": "一变多：复数",
  "forms.third-person": "he / she / it后的现在时",
  "forms.ing": "变成-ing形式",
  "forms.regular-past": "变成过去式",
  "forms.irregular-past": "变成过去式",
  "forms.past-participle": "变成过去分词",
  "forms.derivation": "加词缀，变词义",
};
const items = original.items.map((item) => {
  const index = Number(item.id.split(".").at(-1)) - 1;
  const render = frames
    .get(item.topicId)
    ?.find((d) => d[0] === item.trainingDimension)?.[2];
  if (!render) throw Error("Missing authored cue.");
  const fact = render(index),
    afterDid =
      item.topicId === "forms.irregular-past" &&
      item.trainingDimension === "after-did";
  const word = afterDid ? fact.secondForm : fact.sourceWord;
  const instruction = afterDid
    ? "did后，用原形"
    : item.topicId === "forms.comparison"
      ? index % 2
        ? "最高级，不写the"
        : "变成比较级"
      : labels[item.topicId];
  if (
    !/^[a-z]+$/.test(word ?? "") ||
    !instruction ||
    !item.prompt.includes(word)
  )
    throw Error("Word cue must use a word already present in the question.");
  return {
    ...item,
    version: 2,
    context:
      item.type === "choice"
        ? "看看原词，选出变好的词。"
        : "看看原词，把变好的词写下来。",
    prompt: item.prompt.replace("物品清单", "数量卡"),
    wordFormCue: { word, instruction },
  };
});
const manifestHash = hash(items),
  q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const statements = [
  "-- Child-facing word cards and direct instructions. All v1 rows stay immutable.",
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
  Object.keys(original.blueprints).map((topicId) => {
    const first = items.find((i) => i.topicId === topicId);
    return `(${q("reserved." + topicId)},2,${q(id)},${first.gradeMin},'A',1,${q(first.title)},'{}')`;
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
    return `(${q(item.id)},2,${q("reserved." + topicId)},2,${q(skill)},${q(modality)},${q(item.type)},${q(JSON.stringify(publicData))},${q(JSON.stringify({ answers, hint, explanation, family, pattern, trainingPhase, trainingDimension }))},'published')`;
  }),
);
insert(
  "INSERT INTO release_items VALUES\n",
  items.map((i) => `(${q(id)},${q(i.id)},2)`),
);
const sql = statements.join("\n") + "\n",
  path = "migrations/0047_reserved_word_forms_child_cues.sql";
const prior = await readFile(path, "utf8").catch((e) => {
  if (e.code !== "ENOENT") throw e;
  return null;
});
if (prior !== null && prior.replaceAll("\r\n", "\n") !== sql)
  throw Error("Immutable child-cue migration changed; append a revision.");
if (prior === null) await writeFile(path, sql);
const revised = {
  ...original,
  id,
  editionId: original.id,
  revisionId: id,
  releases: [original.id, id],
  manifestHash,
  items,
};
await writeContent(
  "content/training-reserved-release.forms.latest.json",
  JSON.stringify(revised),
);
const blueprints = {};
for (const [topic, b] of Object.entries(previous.blueprints))
  blueprints[topic] = {
    ...b,
    editionId: previous.editionId,
    revisionId: previous.revisionId,
    releases: previous.releases,
  };
for (const [topic, b] of Object.entries(original.blueprints))
  blueprints[topic] = {
    ...b,
    editionId: original.id,
    revisionId: id,
    releases: revised.releases,
  };
const catalog = {
  ...previous,
  id: "reserved-training-catalog-v4",
  releases: [...previous.releases, ...revised.releases],
  blueprints,
  items: [...previous.items, ...items],
};
catalog.manifestHash = hash({ items: catalog.items, blueprints });
await writeContent(
  "content/training-reserved-release.catalog.json",
  JSON.stringify(catalog),
);
console.log(
  "Appended 480 child-facing cue revisions; 1560 task families remain. Original word-form rows and applied migrations preserved.",
);
