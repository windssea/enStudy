import vocab from "../content/vocabulary-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const media = JSON.parse(
  await readFile("public/content/picture-words.v1.json", "utf8"),
);
const id = "vocabulary-pictures-v1",
  items = [];
const groups = [
  ["cat", "tiger", "lion"],
  ["bird", "duck"],
  ["bear", "panda"],
  ["horse", "zebra"],
  ["circle", "oval"],
  ["square", "rectangle"],
  ["pencil", "eraser"],
];
const conflicts = (a, b) =>
  groups.some((group) => group.includes(a) && group.includes(b));
const schoolPool = [
  "pencil",
  "ruler",
  "eraser",
  "chair",
  "clock",
  "glue",
  "scissors",
  "computer",
];
for (const theme of vocab.filter((t) => t.grade === 1)) {
  for (const [index, word] of theme.words.entries()) {
    const publicWord = media.words.find((w) => w.id === word.id);
    if (!publicWord?.audioUrl) throw Error("Missing picture/audio " + word.id);
    const others = theme.words.filter(
      (other) =>
        other.id !== word.id &&
        !conflicts(word.word, other.word) &&
        (theme.id !== "colours-shapes" ||
          index < 11 === theme.words.indexOf(other) < 11) &&
        (theme.id !== "school" || schoolPool.includes(other.word)),
    );
    if (others.length < 6)
      throw Error("Insufficient unambiguous contrasts " + word.id);
    for (let variant = 0; variant < 3; variant++) {
      const choices = [
        word,
        others[(index + variant * 2) % others.length],
        others[(index + variant * 2 + 1) % others.length],
      ];
      items.push({
        id: `word.${word.id}.picture.${variant + 1}`,
        version: 1,
        lessonId: `picture.words.${theme.id}`,
        wordId: word.id,
        wordThemeId: theme.id,
        wordMode: "picture",
        category: "vocabulary",
        title: theme.title + " · 听音找图片",
        context:
          "先听英语，再选一张图片。听不清可以重播，也可以请大人帮忙使用文字辅助。",
        prompt: "听一听，找图片",
        type: "listen",
        audioText: word.word,
        audioUrl: publicWord.audioUrl,
        choices: choices.map((w) => w.id),
        pictureChoices: choices.map((w) => ({
          value: w.id,
          wordId: w.id,
          label: w.meaning,
        })),
        answers: [word.id],
        gradeMin: 1,
        skill: `lexeme.word.${word.id}`,
        modality: "listening-picture",
        family: `word-sense-${word.id}`,
        pattern: "vocabulary.picture",
        hint: "可以再听一遍，看看每张图片画的是什么。需要时请大人帮忙；使用提示会单独记录。",
        explanation: `${word.word}：${word.meaning}。${word.cloze.replace("___", word.word)}`,
        solutionSentences: [word.word],
      });
    }
  }
}
if (items.length !== 180 || media.words.length !== 60)
  throw Error("Expected 60 words / 180 picture tasks");
const manifestHash = createHash("sha256")
  .update(JSON.stringify(items))
  .digest("hex");
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
const sql = [
  `-- Add picture listening with separate evidence modality; never revise prior vocabulary publications.`,
  `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
];
for (const theme of vocab.filter((t) => t.grade === 1))
  sql.push(
    `INSERT INTO lessons VALUES(${quote("picture.words." + theme.id)},1,'${id}',1,'A',1,${quote(theme.title + " · 听音找图片")},'{}');`,
  );
for (const item of items) {
  const {
    answers,
    skill,
    modality,
    family,
    pattern,
    hint,
    explanation,
    solutionSentences,
    lessonId,
    version,
    wordId,
    wordThemeId,
    wordMode,
    ...data
  } = item;
  sql.push(
    `INSERT INTO items VALUES(${quote(item.id)},1,${quote(lessonId)},1,${quote(skill)},${quote(modality)},'listen',${quote(JSON.stringify(data))},${quote(JSON.stringify({ answers, family, pattern, hint, explanation, solutionSentences, wordId, wordMode }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(item.id)},1);`,
  );
}
const text = sql.join("\n") + "\n",
  path = "migrations/0045_picture_words_v1.sql";
const prior = await readFile(path, "utf8").catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw Error("Immutable picture-word migration differs");
if (prior === null) await writeFile(path, text);
await writeContent(
  "content/picture-word-release.v1.json",
  JSON.stringify({ id, manifestHash, items }),
);
console.log(
  "Built 60 illustrated words / 180 picture-listening tasks in three P1 themes; teacher/media review pending.",
);
