import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const source = JSON.parse(
  await readFile("content/be-action-release.v1.json", "utf8"),
);
const old = JSON.parse(
  await readFile("content/workshop-release.latest.json", "utf8"),
);
const original = source.items.find(
  (i) => i.id === "contrast.be-action.question-state",
);
if (!original || original.version !== 1)
  throw Error("Unexpected contrast source");
const revised = {
  ...original,
  version: 2,
  prompt: "请选择采用标准一般疑问句语序的问句。",
  explanation:
    original.explanation +
    " 口语中Nora is ready?可用升调确认信息；本题明确要求be放在主语前的标准一般疑问句语序，因此不选确认式表达。",
};
const id = "be-action-review-v2";
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const manifestHash = hash(revised);
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const {
  answers,
  repairs,
  solutionSentences,
  evidenceTargets,
  evidenceSolutions,
  explanation,
  hint,
  skill,
  modality,
  family,
  lessonId,
  version,
  workshopId,
  demand,
  ...data
} = revised;
const sql =
  [
    "-- Clarify standard question order without changing historical v1 questions or answers.",
    `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
    `INSERT INTO lessons VALUES('contrast.be-action',2,'${id}',3,'A',1,'be与行为动词辨析：明确问句要求','{}');`,
    `INSERT INTO items VALUES(${q(revised.id)},2,'contrast.be-action',2,${q(skill)},${q(modality)},${q(revised.type)},${q(JSON.stringify(data))},${q(JSON.stringify({ answers, repairs, solutionSentences, evidenceTargets, evidenceSolutions, explanation, hint, family, workshopId }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${q(revised.id)},2);`,
  ].join("\n") + "\n";
const path = "migrations/0049_be_action_question_review.sql";
const prior = await readFile(path, "utf8").catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
if (prior !== null && prior.replaceAll("\r\n", "\n") !== sql)
  throw Error("Immutable reviewed question changed");
if (prior === null) await writeFile(path, sql);
const items = source.items.map((i) => (i.id === revised.id ? revised : i));
const workshops = [source.workshop, ...old.workshops];
const catalogHash = hash({ workshops, items: [...old.items, ...items] });
await writeContent(
  "content/be-action-release.latest.json",
  JSON.stringify({ ...source, id, manifestHash, catalogHash, items }),
);
await writeContent(
  "public/content/workshops.json",
  JSON.stringify({ release: "workshop-catalog-v4", workshops }),
);
console.log(
  "Clarified one standard-question task as version 2; original content preserved.",
);
