import authored from "../content/vocabulary-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const releaseId = "vocabulary-bank-v1",
  items = [],
  themes = [];
for (const theme of authored) {
  if (
    theme.words.length !== 20 ||
    new Set(theme.words.map((w) => w.id)).size !== 20
  )
    throw new Error(`Each word theme needs 20 entries: ${theme.id}`);
  for (const [index, word] of theme.words.entries()) {
    if (!word.word || !word.meaning || word.cloze.split("___").length !== 2)
      throw new Error(`Invalid vocabulary entry ${word.id}`);
    const others = theme.words.filter(
      (w) =>
        w.id !== word.id &&
        w.meaning !== word.meaning &&
        w.word.toLowerCase() !== word.word.toLowerCase(),
    );
    const distractors = [
      others[index % others.length],
      others[(index + 7) % others.length],
    ];
    if (new Set(distractors.map((w) => w.id)).size !== 2)
      throw new Error(`Insufficient word distractors ${word.id}`);
    const example = word.cloze.replace("___", word.word);
    for (const mode of ["meaning", "spelling", "context"]) {
      const answer = mode === "meaning" ? word.meaning : word.word;
      const choices =
        mode === "spelling"
          ? null
          : [
              answer,
              ...distractors.map((w) =>
                mode === "meaning" ? w.meaning : w.word,
              ),
            ];
      if (choices && new Set(choices.map((w) => w.toLowerCase())).size !== 3)
        throw new Error(`Ambiguous word choices ${word.id}`);
      items.push({
        id: `word.${word.id}.${mode}`,
        wordId: word.id,
        wordThemeId: theme.id,
        wordMode: mode,
        category: "vocabulary",
        title: `${theme.title} · ${{ meaning: "词义辨认", spelling: "单词拼写", context: "语境选词" }[mode]}`,
        context:
          mode === "meaning"
            ? "读这个词和例句，选择本词条对应的中文意思。"
            : `根据提示${mode === "spelling" ? "写出英文单词或词组" : "选择词语"}：${word.meaning}。`,
        prompt:
          mode === "meaning"
            ? word.word
            : mode === "spelling"
              ? `按本词表写出“${word.meaning}”的英文${word.alternatives.length ? "" : `（${word.word.replace(/[^a-z]/gi, "").length}个英文字母）`}。`
              : word.cloze,
        ...(mode === "meaning" ? { reading: example } : {}),
        type: mode === "spelling" ? "input" : "choice",
        ...(choices ? { choices } : {}),
        answers:
          mode === "meaning"
            ? [word.meaning]
            : [word.word, ...word.alternatives],
        gradeMin: theme.grade,
        skill: `lexeme.word.${word.id}`,
        modality:
          mode === "meaning"
            ? "recognition"
            : mode === "spelling"
              ? "spelling"
              : "context-recognition",
        family: `word-sense-${word.id}`,
        pattern: `vocabulary.${mode}`,
        hint:
          mode === "meaning"
            ? `再读例句：${example}`
            : `英文以${word.word[0]}开头，包含${word.word.replace(/[^a-z]/gi, "").length}个字母。`,
        explanation: `${word.word}：${word.meaning}。${example}`,
      });
    }
  }
  themes.push({
    id: theme.id,
    grade: theme.grade,
    title: theme.title,
    description: theme.description,
    wordCount: 20,
    items: 60,
    modes: ["mixed", "meaning", "spelling", "context"],
    words: theme.words.map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      example: w.cloze.replace("___", w.word),
    })),
  });
}
if (themes.length !== 18 || items.length !== 1080)
  throw new Error("Expected 18 themes and 360 word-sense entries.");
for (let grade = 1; grade <= 6; grade++)
  if (themes.filter((t) => t.grade === grade).length !== 3)
    throw new Error("Each grade needs three real themes.");
const imports = await Promise.all(
  [
    "content/exercises.json",
    "content/course-release.v1.json",
    "content/topic-release.v1.json",
    "content/pattern-release.v1.json",
  ].map(async (path) => {
    const data = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(data) ? data : data.items;
  }),
);
const imported = imports.flat();
const manifestHash = hash(
  JSON.stringify({
    themes,
    items,
    importedHash: hash(JSON.stringify(imported)),
  }),
);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = [
  "-- Immutable vocabulary-bank-v1; publish a new release to revise.",
  `INSERT INTO content_releases VALUES('${releaseId}','published','${manifestHash}',unixepoch()*1000);`,
];
function insert(prefix, rows) {
  let buffer = [],
    bytes = Buffer.byteLength(prefix);
  for (const row of rows) {
    const n = Buffer.byteLength(row) + 2;
    if (buffer.length && bytes + n > 70000) {
      sql.push(prefix + buffer.join(",\n") + ";");
      buffer = [];
      bytes = Buffer.byteLength(prefix);
    }
    buffer.push(row);
    bytes += n;
  }
  if (buffer.length) sql.push(prefix + buffer.join(",\n") + ";");
}
insert(
  "INSERT INTO skills(id,kind,label) VALUES\n",
  authored.flatMap((t) =>
    t.words.map(
      (w) =>
        `(${quote(`lexeme.word.${w.id}`)},'lexeme',${quote(`${w.word} · ${w.meaning}`)})`,
    ),
  ),
);
insert(
  "INSERT INTO lessons VALUES\n",
  themes.map(
    (t) =>
      `(${quote(`words.${t.id}`)},1,'${releaseId}',${t.grade},'A',1,${quote(t.title)},'{}')`,
  ),
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
      pattern,
      wordId,
      wordThemeId,
      wordMode,
      ...publicData
    } = item;
    return `(${quote(item.id)},1,${quote(`words.${wordThemeId}`)},1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, hint, explanation, family, wordId, wordMode }))},'published')`;
  }),
);
insert(
  "INSERT INTO release_items VALUES\n",
  [...imported, ...items].map((item) => `('${releaseId}',${quote(item.id)},1)`),
);
const migration = sql.join("\n") + "\n",
  path = "migrations/0009_vocabulary_bank_v1.sql";
const previous = await readFile(path, "utf8").catch((e) => {
  if (e.code !== "ENOENT") throw e;
  return null;
});
if (previous !== null && previous.replaceAll("\r\n", "\n") !== migration)
  throw new Error(
    "Immutable vocabulary migration changed; publish a new version.",
  );
if (previous === null) await writeFile(path, migration);
await writeContent(
  "content/vocabulary-release.v1.json",
  JSON.stringify({
    id: releaseId,
    manifestHash,
    themes,
    items,
    totalWords: 360,
    totalItems: 1080,
  }),
);
console.log(
  `Built 360 vocabulary entries, 18 grade themes, and ${items.length} meaning/spelling/context tasks.`,
);
