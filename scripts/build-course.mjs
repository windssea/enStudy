import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import authored from "../content/courses-v1.mjs";
import { parse } from "csv-parse/sync";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const items = [];
const lessons = authored.map((source) => {
  const { facts, rule, skill, ...metadata } = source;
  for (const type of ["choice", "input", "order"])
    for (const [index, fact] of facts.entries()) {
      const [context, prompt, answer, distractors, sentence, meaning] = fact;
      const itemSkill = fact[6] ?? skill;
      if (
        !sentence.includes(answer) ||
        !prompt.includes("___") ||
        distractors.includes(answer)
      )
        throw new Error(`Invalid authored fact ${source.id}/${index}`);
      const category = itemSkill.startsWith("vocabulary.")
        ? "vocabulary"
        : itemSkill.startsWith("morphology.")
          ? "forms"
          : source.topicIds[0]?.startsWith("tense.")
            ? "tense"
            : "grammar";
      // Keep each family together across task variants and repeated appearances.
      const family = `fact-${digest(sentence.toLowerCase()).slice(0, 16)}`;
      const choices = [...distractors];
      choices.splice((index + source.grade) % 3, 0, answer);
      items.push({
        id: `${source.id}.f${index + 1}.${type}`,
        lessonId: source.id,
        category,
        title: source.title,
        context,
        prompt: type === "order" ? "用词块搭出这句英语。" : prompt,
        type,
        ...(type === "choice" ? { choices } : {}),
        ...(type === "order" ? { tokens: sentence.split(" ").reverse() } : {}),
        answers:
          type === "input" && answer === "learned"
            ? ["learned", "learnt"]
            : type === "input" && answer === "practised"
              ? ["practised", "practiced"]
              : [type === "order" ? sentence : answer],
        gradeMin: source.grade,
        skill: itemSkill,
        modality:
          type === "choice"
            ? "recognition"
            : type === "input"
              ? "spelling"
              : "controlled-production",
        family,
        hint: rule,
        explanation: `${sentence} ${meaning} ${rule}`,
      });
    }
  return {
    ...metadata,
    cards: facts.map((f) => ({
      title: source.title,
      rule,
      example: f[4],
      translation: f[5],
    })),
    itemCount: facts.length * 3,
  };
});
if (
  lessons.length !== 24 ||
  items.length !== 216 ||
  new Set(items.map((i) => i.id)).size !== items.length
)
  throw new Error("Course release coverage or IDs invalid.");
const legacy = JSON.parse(await readFile("content/exercises.json", "utf8"));
const legacyItemIds = legacy.map((item) => item.id);
const manifestHash = digest(
  JSON.stringify({
    lessons,
    items,
    legacyHash: digest(JSON.stringify(legacy)),
  }),
);
const topicRows = parse(
  await readFile("docs/curriculum/topic-training-scope.csv", "utf8"),
  { columns: true, skip_empty_lines: true, bom: true },
);
const topicSkills = Object.fromEntries(
  topicRows.map((topic) => [topic.topic_id, topic.primary_skill]),
);
const release = {
  id: "course-foundations-v1",
  version: 1,
  manifestHash,
  lessons,
  items,
  topicSkills,
  legacyItemIds,
};
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const statements = [
  "-- Immutable original course-foundations-v1. Create a new release for revisions.",
  `INSERT INTO content_releases VALUES(${quote(release.id)},'published',${quote(manifestHash)},unixepoch()*1000);`,
];
for (const lesson of lessons)
  statements.push(
    `INSERT INTO lessons VALUES(${quote(lesson.id)},1,${quote(release.id)},${lesson.grade},'A',1,${quote(lesson.title)},${quote(JSON.stringify(lesson))});`,
  );
for (const item of items) {
  statements.push(
    `INSERT OR IGNORE INTO skills VALUES(${quote(item.skill)},${quote(item.skill.split(".")[0])},${quote(item.title)});`,
  );
  const {
    answers,
    hint,
    explanation,
    skill,
    modality,
    family,
    lessonId,
    ...publicData
  } = item;
  statements.push(
    `INSERT INTO items VALUES(${quote(item.id)},1,${quote(lessonId)},1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, hint, explanation, family }))},'published');`,
  );
}
for (const item of [...legacy, ...items])
  statements.push(
    `INSERT INTO release_items VALUES(${quote(release.id)},${quote(item.id)},1);`,
  );
for (const topic of topicRows)
  statements.push(
    `UPDATE skills SET label=${quote(topic.title)} WHERE id=${quote(topic.primary_skill)};`,
  );
const migration = statements.join("\n") + "\n";
const path = "migrations/0005_course_foundations_v1.sql";
const existing = await readFile(path, "utf8").catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
if (existing !== null && existing.replaceAll("\r\n", "\n") !== migration)
  throw new Error(
    "Immutable course migration changed. Publish a new version instead of rewriting this release.",
  );
if (existing === null) await writeFile(path, migration);
await mkdir("public/content", { recursive: true });
await writeFile("content/course-release.v1.json", JSON.stringify(release));
await writeFile(
  "public/content/lessons.json",
  JSON.stringify({ release: release.id, manifestHash, lessons }),
);
console.log(
  `Built ${lessons.length} original micro-lessons, ${items.length} practice variants and ${new Set(items.map((i) => i.family)).size} sentence families. Remaining units are still planned.`,
);
