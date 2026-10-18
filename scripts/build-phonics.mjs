import source from "../content/phonics-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
const audio = JSON.parse(
  await readFile("public/content/phonics-audio.v1.json", "utf8"),
);
const byWord = new Map(audio.items.map((a) => [a.word, a]));
const digest = (v) =>
  createHash("sha256")
    .update(
      Buffer.isBuffer(v) ? v : typeof v === "string" ? v : JSON.stringify(v),
    )
    .digest("hex");
for (const a of audio.items) {
  const b = await readFile("public" + a.url);
  if (b.length !== a.bytes || digest(b) !== a.sha256)
    throw Error("Audio asset changed " + a.word);
}
const attach = (w) => {
  const a = byWord.get(w.word);
  if (
    !a ||
    w.tiles.join("") !== w.word ||
    w.groups.flat().length !== w.tiles.length ||
    new Set(w.groups.flat()).size !== w.tiles.length
  )
    throw Error("Invalid word " + w.word);
  return { ...w, audioUrl: a.url };
};
const stages = [],
  items = [],
  id = "phonics-core-v1";
const groupLabel = (w, g) =>
  g
    .map((i) => w.tiles[i])
    .join(g.some((v, i) => i > 0 && v !== g[i - 1] + 1) ? "_" : "");
for (const s of source) {
  if (s.words.length !== 20) throw Error("Expected 20 words " + s.id);
  stages.push({
    ...s,
    words: undefined,
    demos: s.demos.map(attach),
    items: 40,
    families: 20,
    roundSizes: [5, 10, 20],
  });
  for (const [index, raw] of s.words.entries()) {
    const w = attach(raw),
      others = s.words.filter((x) => x.word !== w.word),
      distractors = [others[index % 19].word, others[(index + 7) % 19].word];
    const base = {
      version: 1,
      lessonId: `phonics.${s.id}`,
      phonicsStageId: s.id,
      phonicsWordId: w.word,
      category: "phonics",
      title: s.title,
      gradeMin: s.grade,
      skill: `phonics.${s.id}.${s.kind === "meaning" ? "compound" : w.focus.map((i) => w.tiles[i]).join("")}`,
      family: `phonics-word-${w.word}`,
      audioText: w.word,
      audioUrl: w.audioUrl,
      solutionSentences: [w.word],
      hint: s.rule,
    };
    items.push({
      ...base,
      id: `phonics.${s.id}.${w.word}.listen`,
      type: "listen",
      modality: "phonics-listening",
      pattern: "listen",
      context:
        "听完整单词，选择它的拼写；这是整词示范，不是字母名。听不到时可用文字辅助。",
      prompt: "听到的是哪个单词？",
      choices: [w.word, ...distractors],
      answers: [w.word],
      explanation: `${w.word}：${w.meaning}。${s.rule}`,
    });
    if (index % 3 === 0)
      items.push({
        ...base,
        id: `phonics.${s.id}.${w.word}.build`,
        type: "order",
        graphemeTokens: true,
        orderedTokens: w.tiles,
        modality: "phonics-spelling",
        pattern: "build",
        context: `目标词义：${w.meaning}。可先听整词，再按顺序取用全部字母块；不能跳过或多用。`,
        prompt:
          s.kind === "meaning"
            ? "把两个有意义的词块合起来。"
            : "把字母块拼成完整单词，中间不加空格。",
        tokens: [...w.tiles].reverse(),
        answers: [w.word],
        explanation: `${w.tiles.join(" + ")} → ${w.word}：${w.meaning}。${s.focus}`,
      });
    else if (index % 3 === 1) {
      let masked = w.tiles
        .map((t, i) => (w.focus.includes(i) ? "_".repeat(t.length) : t))
        .join("");
      let answer = w.focus.map((i) => w.tiles[i]).join("");
      items.push({
        ...base,
        id: `phonics.${s.id}.${w.word}.fill`,
        type: "input",
        modality: "phonics-spelling",
        pattern: "fill",
        context: `目标词义：${w.meaning}。听完整单词，补回缺少的字母；本题只填空缺部分。`,
        prompt: masked,
        answers: [answer],
        explanation: `${masked}补${answer}组成${w.word}：${w.meaning}。${s.focus}`,
      });
    } else {
      const correct = w.groups.map((g) => groupLabel(w, g)).join(" · ");
      const wrong = [
        s.id === "short-vowels" || s.id === "adjacent-consonants"
          ? w.tiles.slice(0, 2).join("") + " · " + w.tiles.slice(2).join(" · ")
          : [...w.word].join(" · "),
        s.id === "short-vowels"
          ? w.tiles[0] + " · " + w.tiles.slice(1).join("")
          : w.word,
      ];
      if (new Set([correct, ...wrong]).size !== 3)
        throw Error("Ambiguous grouping " + w.word);
      items.push({
        ...base,
        id: `phonics.${s.id}.${w.word}.groups`,
        type: "choice",
        modality:
          s.kind === "meaning"
            ? "word-part-recognition"
            : "grapheme-recognition",
        pattern: "groups",
        context: `目标词：${w.word}（${w.meaning}）。${s.kind === "meaning" ? "选择本课按两个熟悉小词拆分的方式，不是在数音素。" : "一组标记对应本词的一个音；隔开的元音伙伴用下划线连接。"}`,
        prompt:
          s.kind === "meaning"
            ? "哪项按两个熟悉的小词拆开了？"
            : "哪项是本课的音—字母对应标记？",
        choices: [correct, ...wrong],
        answers: [correct],
        explanation: `${correct}。${s.rule}`,
      });
    }
  }
}
if (
  items.length !== 240 ||
  new Set(items.map((i) => i.id)).size !== 240 ||
  new Set(items.map((i) => i.family)).size !== 120
)
  throw Error("Phonics publication counts");
const release = { id, manifestHash: digest({ stages, items }), stages, items };
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
const sql = [
  "-- Add phonics practice. Whole-word synthesis is not a pure-phoneme recording or speech score.",
  `INSERT INTO content_releases VALUES('${id}','published','${release.manifestHash}',unixepoch()*1000);`,
];
for (const s of stages)
  sql.push(
    `INSERT INTO lessons VALUES(${quote(`phonics.${s.id}`)},1,'${id}',${s.grade},'A',1,${quote(s.title)},${quote(JSON.stringify(s))});`,
  );
for (const i of items) {
  const {
    answers,
    skill,
    modality,
    family,
    hint,
    explanation,
    solutionSentences,
    lessonId,
    version,
    phonicsStageId,
    phonicsWordId,
    pattern,
    orderedTokens,
    ...publicData
  } = i;
  sql.push(
    `INSERT OR IGNORE INTO skills VALUES(${quote(skill)},'phonics',${quote(i.title)});`,
    `INSERT INTO items VALUES(${quote(i.id)},1,${quote(lessonId)},1,${quote(skill)},${quote(modality)},${quote(i.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, family, hint, explanation, solutionSentences, phonicsStageId, phonicsWordId, pattern, orderedTokens }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(i.id)},1);`,
  );
}
const text = sql.join("\n") + "\n",
  path = "migrations/0039_phonics_core_v1.sql";
const prior = await readFile(path, "utf8").catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw Error("Immutable phonics publication changed");
if (prior === null) await writeFile(path, text);
await writeContent("content/phonics-release.v1.json", JSON.stringify(release));
await writeContent(
  "public/content/phonics.json",
  JSON.stringify({ id, stages }),
);
console.log(
  "Built 6 phonics/word-part stages, 240 tasks / 120 word families; 25 separate demonstrations and 145 whole-word WAVs.",
);
