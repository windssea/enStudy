import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const source = JSON.parse(
    await readFile("content/action-course-release.v1.json", "utf8"),
  ),
  id = "action-course-wording-v2";
const original = source.items.find((i) => i.id === "P3A-U04-L3.p3.choice");
if (!original || !original.prompt.includes("finding a dictionary"))
  throw Error("Unexpected fourth-unit wording source.");
const revised = {
  ...original,
  version: 2,
  prompt: "The boys ___ looking for a dictionary now.",
  explanation: original.explanation.replace(
    "are finding a dictionary",
    "are looking for a dictionary",
  ),
  solutionSentences: ["The boys are looking for a dictionary now."],
};
// This is the same intended fact, so retain its family and preserve existing evidence.
const revisedLesson = {
  ...source.lessons.find((l) => l.id === original.lessonId),
  version: 2,
  releaseId: id,
};
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`,
  digest = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  manifestHash = digest({ revised, revisedLesson });
const {
  answers,
  evidenceSolutions,
  placements,
  repairs,
  skill,
  modality,
  family,
  hint,
  explanation,
  solutionSentences,
  evidenceTargets,
  lessonId,
  version,
  ...publicData
} = revised;
const sql =
  [
    "-- Reviewed wording only: looking for expresses searching. Prior v1 assignments stay immutable.",
    `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
    `INSERT INTO lessons VALUES(${quote(lessonId)},2,'${id}',3,'A',4,${quote(revisedLesson.title)},${quote(JSON.stringify(revisedLesson))});`,
    `INSERT INTO items VALUES(${quote(revised.id)},2,${quote(lessonId)},2,${quote(skill)},${quote(modality)},'choice',${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, evidenceSolutions, placements, repairs, family, hint, explanation, solutionSentences, evidenceTargets }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(revised.id)},2);`,
  ].join("\n") + "\n";
const path = "migrations/0024_action_course_wording_v2.sql",
  prior = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
if (prior !== null && prior.replaceAll("\r\n", "\n") !== sql)
  throw Error("Immutable action wording revision changed.");
if (prior === null) await writeFile(path, sql);
const lessons = source.lessons.map((l) =>
    l.id === lessonId ? revisedLesson : l,
  ),
  items = source.items.map((i) => (i.id === revised.id ? revised : i));
await writeContent(
  "content/action-course-release.latest.json",
  JSON.stringify({
    id: "action-course-catalog-v2",
    manifestHash: digest({ lessons, items }),
    releases: [source.id, id],
    lessons,
    items,
  }),
);
const catalog = JSON.parse(
  await readFile("public/content/lessons.json", "utf8"),
);
await writeContent(
  "public/content/lessons.json",
  JSON.stringify({
    ...catalog,
    releases: [...catalog.releases.filter((r) => r !== id), id],
    lessons: catalog.lessons.map((l) =>
      l.id === lessonId ? revisedLesson : l,
    ),
  }),
);
console.log(
  "Published one reviewed fourth-unit item version; original v1 task and history preserved.",
);
