import authored from "../content/vocabulary-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const id = "vocabulary-listening-v1",
  quote = (v) => `'${String(v).replaceAll("'", "''")}'`,
  items = [];
for (const theme of authored)
  for (const [index, word] of theme.words.entries()) {
    const others = theme.words.filter(
        (w) =>
          w.id !== word.id &&
          w.meaning !== word.meaning &&
          w.word.toLowerCase() !== word.word.toLowerCase(),
      ),
      distractors = [
        others[index % others.length],
        others[(index + 7) % others.length],
      ];
    if (new Set(distractors.map((w) => w.meaning)).size !== 2)
      throw new Error(`Ambiguous listening choices ${word.id}`);
    items.push({
      id: `word.${word.id}.listening`,
      version: 1,
      lessonId: `audio.words.${theme.id}`,
      wordId: word.id,
      wordThemeId: theme.id,
      wordMode: "listening",
      category: "vocabulary",
      title: `${theme.title} · 听词辨义`,
      context:
        "主动播放英语词语，听清后确认，再选出本词条的意思。听不到时可用文字辅助。",
      prompt: "听到的词语，对应哪个意思？",
      type: "listen",
      audioText: word.word,
      choices: [word.meaning, ...distractors.map((w) => w.meaning)],
      answers: [word.meaning],
      gradeMin: theme.grade,
      skill: `lexeme.word.${word.id}`,
      modality: "listening-choice",
      family: `word-sense-${word.id}`,
      pattern: "vocabulary.listening",
      hint: "可以再听一遍，留意词的发音；没有合适的本机英语声音时，用文字辅助也能继续。",
      explanation: `${word.word}：${word.meaning}。${word.cloze.replace("___", word.word)}`,
      solutionSentences: [word.word],
    });
  }
const manifestHash = createHash("sha256")
    .update(JSON.stringify(items))
    .digest("hex"),
  sql = [
    "-- Add only 360 listening items; original vocabulary versions and memberships stay intact.",
    `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
  ];
for (const theme of authored)
  sql.push(
    `INSERT INTO lessons VALUES(${quote(`audio.words.${theme.id}`)},1,'${id}',${theme.grade},'A',1,${quote(theme.title)},'{}');`,
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
    ...publicData
  } = item;
  sql.push(
    `INSERT INTO items VALUES(${quote(item.id)},1,${quote(lessonId)},1,${quote(skill)},${quote(modality)},'listen',${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, family, hint, explanation, solutionSentences, wordId, wordMode }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(item.id)},1);`,
  );
}
const text = sql.join("\n") + "\n",
  path = "migrations/0022_word_listening_v1.sql",
  prior = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw new Error("Immutable word listening changed.");
if (prior === null) await writeFile(path, text);
await writeContent(
  "content/word-listening-release.v1.json",
  JSON.stringify({ id, manifestHash, items }),
);
console.log(
  "Built 360 additive word listening tasks across the existing 18 themes.",
);
