import { tasks, workshop } from "../content/be-action-contrast.v1.mjs";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { writeContent } from "./content-write.mjs";

const id = "be-action-contrast-v1";
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
if (tasks.length !== 12 || new Set(tasks.map((t) => t.id)).size !== 12)
  throw Error("Expected twelve distinct authored judgments");
const items = tasks.map((task) => {
  if (!task.explanation || !task.hint || !task.context || !task.answers.length)
    throw Error(`Incomplete teaching: ${task.id}`);
  if (
    task.type === "choice" &&
    (new Set(task.choices).size !== 3 ||
      task.choices.filter((c) => task.answers.includes(c)).length !== 1)
  )
    throw Error(`Ambiguous choices: ${task.id}`);
  return {
    ...task,
    id: `contrast.be-action.${task.id}`,
    version: 1,
    category: "grammar",
    title: workshop.title,
    workshopId: workshop.id,
    lessonId: "contrast.be-action",
    gradeMin: 3,
    skill: "grammar.be-action-contrast",
    family: `contrast.be-action.${task.id}`,
    modality: `contrast-${task.type}`,
  };
});
const manifestHash = createHash("sha256")
  .update(JSON.stringify({ workshop, items }))
  .digest("hex");
const sql = [
  "-- Append-only: twelve authored be/action judgments. No historical item versions change.",
  `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
  `INSERT INTO lessons VALUES('contrast.be-action',1,'${id}',3,'A',1,'be与行为动词辨析','{}');`,
  `INSERT OR IGNORE INTO skills VALUES('grammar.be-action-contrast','grammar','be与行为动词辨析');`,
];
for (const item of items) {
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
    ...publicData
  } = item;
  const privateData = {
    answers,
    repairs,
    solutionSentences,
    evidenceTargets,
    evidenceSolutions,
    explanation,
    hint,
    family,
    workshopId,
  };
  sql.push(
    `INSERT INTO items VALUES(${quote(item.id)},1,'contrast.be-action',1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify(privateData))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(item.id)},1);`,
  );
}
const text = sql.join("\n") + "\n",
  path = "migrations/0048_be_action_contrast.sql";
const prior = await readFile(path, "utf8").catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw Error("Immutable contrast release changed; append another edition.");
if (prior === null) await writeFile(path, text);
const old = JSON.parse(
  await readFile("content/workshop-release.latest.json", "utf8"),
);
const catalogHash = createHash("sha256")
  .update(
    JSON.stringify({
      workshops: [workshop, ...old.workshops],
      items: [...old.items, ...items],
    }),
  )
  .digest("hex");
await writeContent(
  "content/be-action-release.v1.json",
  JSON.stringify({ id, manifestHash, catalogHash, workshop, items }),
);
await writeContent(
  "public/content/workshops.json",
  JSON.stringify({
    release: "workshop-catalog-v3",
    workshops: [workshop, ...old.workshops],
  }),
);
console.log(
  "Built twelve distinct contextual be/action tasks; no name substitutions or historical edits.",
);
