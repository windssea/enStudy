import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const old = JSON.parse(
    await readFile("content/course-expansion.v1.json", "utf8"),
  ),
  base = JSON.parse(await readFile("content/course-release.v1.json", "utf8"));
// Revision after content/skill review: test the actual blank's target rather
// than labelling every question with its whole lesson's composite objective.
const targets = {
  "P1A-U02-L2": [
    "grammar.be.present",
    "grammar.be.present",
    "grammar.be.present",
  ],
  "P1A-U02-L4": [
    "grammar.articles",
    "grammar.be.present",
    "vocabulary.colours",
  ],
  "P3A-U02-L4": [
    "grammar.present-simple",
    "grammar.prepositions",
    "grammar.questions.yes-no",
  ],
  "P5A-U02-L2": [
    "grammar.be.present",
    "grammar.adverbs.frequency",
    "grammar.adverbs.frequency",
  ],
  "P5A-U02-L4": [
    "grammar.adverbs.frequency",
    "grammar.modals",
    "grammar.adverbs.frequency",
  ],
  "P6A-U02-L3": [
    "grammar.past-simple",
    "grammar.past-simple",
    "grammar.past-simple",
  ],
};
const id = "course-targets-v2",
  quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
const items = old.items.map((item) =>
  targets[item.lessonId]
    ? {
        ...item,
        version: 2,
        skill:
          targets[item.lessonId][
            Math.floor((Number(item.id.match(/\.p(\d+)\./)[1]) - 1) / 3)
          ],
      }
    : item,
);
const lessons = old.lessons.map((l) =>
  targets[l.id] ? { ...l, version: 2, releaseId: id } : l,
);
const revised = items.filter((i) => i.version === 2),
  revisedLessons = lessons.filter((l) => l.version === 2);
const manifestHash = createHash("sha256")
  .update(JSON.stringify({ revised, revisedLessons }))
  .digest("hex");
const sql = [
  "-- Additive v2 target annotations. V1 lessons/items remain available to historical sessions.",
  `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
];
for (const lesson of revisedLessons)
  sql.push(
    `INSERT INTO lessons VALUES(${quote(lesson.id)},2,'${id}',${lesson.grade},'A',2,${quote(lesson.title)},${quote(JSON.stringify(lesson))});`,
  );
for (const item of revised) {
  const {
    answers,
    hint,
    explanation,
    skill,
    modality,
    family,
    lessonId,
    version,
    ...publicData
  } = item;
  sql.push(
    `INSERT OR IGNORE INTO skills VALUES(${quote(skill)},${quote(skill.split(".")[0])},${quote(item.title)});`,
    `INSERT INTO items VALUES(${quote(item.id)},2,${quote(lessonId)},2,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, hint, explanation, family }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(item.id)},2);`,
  );
}
const text = sql.join("\n") + "\n",
  path = "migrations/0016_course_targets_v2.sql",
  prior = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw new Error("Immutable target revision changed.");
if (prior === null) await writeFile(path, text);
await writeContent(
  "content/course-expansion.latest.json",
  JSON.stringify({ id, manifestHash, lessons, items }),
);
await writeContent(
  "public/content/lessons.json",
  JSON.stringify({
    release: "course-catalog-v2",
    releases: [base.id, old.id, id],
    lessons: [...base.lessons, ...lessons],
  }),
);
console.log(
  `Published additive target revision for ${revisedLessons.length} lessons / ${revised.length} versioned items; no historical rows replaced.`,
);
