import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const source = JSON.parse(
  await readFile("content/topic-release.v1.json", "utf8"),
);
const wording = JSON.parse(
  await readFile("content/grade4-language-review.v1.json", "utf8"),
);
const id = "grade4-tense-concepts-v1";
const patterns = new Set([
  "tense.present-contrast.2",
  "tense.present-contrast.3",
  "tense.present-contrast.4",
  "tense.past-contrast.3",
  "tense.past-contrast.4",
]);
const items = source.items
  .filter((i) => i.type === "input" && patterns.has(i.pattern))
  .map((old) => {
    assert.ok(!wording.items.some((i) => i.id === old.id));
    const choice = source.items.find(
      (i) => i.id === old.id.replace(/\.input$/, ".choice"),
    );
    assert.ok(choice?.choices?.length === 3);
    return {
      ...old,
      version: 2,
      type: "choice",
      modality: "recognition",
      choices: choice.choices,
    };
  });
assert.equal(items.length, 60);
const topics = [...new Set(items.map((i) => i.topicId))];
const manifestHash = createHash("sha256")
  .update(JSON.stringify({ id, items }))
  .digest("hex");
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const sql = [
  `-- Tense concepts and sentence selection use visible choices; old input versions remain immutable.`,
  `INSERT INTO content_releases VALUES(${q(id)},'published',${q(manifestHash)},unixepoch()*1000);`,
];
for (const topic of topics) {
  const row = items.find((i) => i.topicId === topic);
  sql.push(
    `INSERT INTO lessons VALUES(${q("bank." + topic)},3,${q(id)},${row.gradeMin},'A',1,${q(row.title)},'{}');`,
  );
}
for (const i of items) {
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
  } = i;
  sql.push(
    `INSERT INTO items VALUES(${q(i.id)},2,${q("bank." + topicId)},3,${q(skill)},${q(modality)},'choice',${q(JSON.stringify(data))},${q(JSON.stringify({ answers, hint, explanation, family, pattern }))},'published');`,
    `INSERT INTO release_items VALUES(${q(id)},${q(i.id)},2);`,
  );
}
for (const [path, text] of [
  [
    "content/grade4-tense-concepts.v1.json",
    JSON.stringify({ id, manifestHash, topics, items }),
  ],
  ["migrations/0055_grade4_tense_concepts.sql", sql.join("\n") + "\n"],
]) {
  const old = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
  if (old !== null && old.replaceAll("\r\n", "\n") !== text)
    throw Error("Immutable concept review changed");
  await writeContent(path, text);
}
console.log(
  "Reviewed 60 tense-concept variants: visible choices replace arbitrary free-text keys; old versions remain.",
);
