import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const source = JSON.parse(
  await readFile("content/practical-term-course-release.v1.json", "utf8"),
);
const id = "practical-order-aliases-v2";
const alternatives = {
  "P2B-U05-L1.p9.order": "I pack a comb and a towel.",
  "P2B-U05-L4.p9.order": "We pack a cup and a cloth bag.",
};
const revised = source.items
  .filter((i) => alternatives[i.id])
  .map((i) => ({
    ...i,
    version: 2,
    answers: [...i.answers, alternatives[i.id]],
    solutionSentences: [...i.solutionSentences, alternatives[i.id]],
  }));
if (revised.length !== 2 || revised.some((i) => i.answers.length !== 2))
  throw Error("Unexpected practical order source");
const lessonIds = new Set(revised.map((i) => i.lessonId));
const revisedLessons = source.lessons
  .filter((l) => lessonIds.has(l.id))
  .map((l) => ({ ...l, version: 2, releaseId: id }));
const digest = (v) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
const sql = [
  "-- Accept either order of parallel objects. Preserve v1 assignments and evidence families.",
  `INSERT INTO content_releases VALUES('${id}','published','${digest({ revised, revisedLessons })}',unixepoch()*1000);`,
];
for (const l of revisedLessons)
  sql.push(
    `INSERT INTO lessons VALUES(${quote(l.id)},2,'${id}',${l.grade},'B',5,${quote(l.title)},${quote(JSON.stringify(l))});`,
  );
for (const i of revised) {
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
  } = i;
  sql.push(
    `INSERT INTO items VALUES(${quote(i.id)},2,${quote(lessonId)},2,${quote(skill)},${quote(modality)},'order',${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, evidenceSolutions, placements, repairs, family, hint, explanation, solutionSentences, evidenceTargets }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(i.id)},2);`,
  );
}
const path = "migrations/0036_practical_order_aliases_v2.sql",
  text = sql.join("\n") + "\n";
const prior = await readFile(path, "utf8").catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw Error("Immutable practical order revision changed");
if (prior === null) await writeFile(path, text);
const lessons = source.lessons.map(
  (l) => revisedLessons.find((r) => r.id === l.id) ?? l,
);
const items = source.items.map((i) => revised.find((r) => r.id === i.id) ?? i);
await writeContent(
  "content/practical-term-course-release.latest.json",
  JSON.stringify({
    id: "practical-course-catalog-v2",
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
    lessons: catalog.lessons.map(
      (l) => revisedLessons.find((r) => r.id === l.id) ?? l,
    ),
  }),
);
console.log(
  "Reviewed two practical order items: parallel objects accept either sequence; v1 remains immutable.",
);
