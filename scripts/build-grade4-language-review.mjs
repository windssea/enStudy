import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { irregularVerbs } from "../packages/domain/irregularVerbs.ts";
import {
  perfectContexts,
  questionComplements,
  cardCorrections,
} from "../content/grade4-language-review.v1.mjs";
import { writeContent } from "./content-write.mjs";

const id = "grade4-language-review-v1";
const read = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const prior = await read("content/grade4-tense-release.cues-v2.json");
const topics = await read("content/topic-release.v1.json");
const course = await read("public/content/lessons.json");
const sources = [
  "course-release.v1",
  "course-expansion.latest",
  "story-course-release.v1",
  "action-course-release.latest",
  "discovery-course-release.v1",
  "journey-course-release.v1",
  "next-term-course-release.v1",
  "explorer-term-course-release.v1",
  "neighbourhood-term-course-release.v1",
  "cooperation-term-course-release.v1",
  "practical-term-course-release.latest",
  "portfolio-term-course-release.v1",
];
const releases = await Promise.all(
  sources.map((s) => read(`content/${s}.json`)),
);
const sourceLessons = releases
  .flatMap((s) => s.lessons)
  .filter((l) => l.grade === 4)
  .map((l) => prior.lessons.find((p) => p.id === l.id) ?? l);
const sourceItems = releases
  .flatMap((s) => s.items)
  .filter((i) => i.lessonId?.startsWith("P4"));
assert.equal(sourceLessons.length, 48);
assert.equal(sourceItems.length, 432);
assert.equal(new Set(perfectContexts.map((r) => r[0])).size, 60);
assert.deepEqual(
  perfectContexts.map((r) => r[0]),
  irregularVerbs.map((w) => w.base),
);
const perfect = new Map(
  perfectContexts.map(([word, prompt, translation]) => [
    word,
    { prompt, translation },
  ]),
);
const patches = [];
const revise = (old, updated) => {
  if (JSON.stringify(old) === JSON.stringify(updated)) return old;
  const current = { ...updated, version: (old.version ?? 1) + 1 };
  assert.equal(current.family, old.family);
  assert.equal(current.skill, old.skill);
  assert.equal(current.modality, old.modality);
  patches.push(current);
  return current;
};

const irregularItems = prior.items.map((old) => {
  const item = structuredClone(old);
  const word = irregularVerbs.find((w) => old.id.includes(`.${w.base}.`));
  assert.ok(word);
  if (item.id.includes(".participle.participle."))
    throw Error("Invalid word lookup");
  if (item.pattern.endsWith(".participle")) {
    const row = perfect.get(word.base);
    item.context = row.translation;
    item.prompt = `${row.prompt}（${word.base}）`;
    item.hint = `had后用过去分词${word.participle}。这里先确定过去参照点，再看此前的动作或持续状态；不是见到before就必须用过去完成时。${word.note}`;
    item.explanation = `${row.prompt.replace("___", word.participle)} ${row.translation} ${item.hint}`;
  } else {
    if (word.base === "come")
      item.prompt = item.prompt.replace(word.complement, "to the class party");
    if (item.pattern.endsWith(".question") && questionComplements[word.base])
      item.prompt = item.prompt.replace(
        word.complement,
        questionComplements[word.base],
      );
  }
  return revise(old, item);
});

// Every open verb-form blank supplies its lexical source; a synonymous verb
// is not silently rejected merely because the hidden key chose another word.
const courseBases = {
  "P4A-U01-L1.f1": "walk",
  "P4A-U01-L1.f2": "read",
  "P4A-U01-L1.f3": "study",
  "P4A-U01-L2.f3": "get",
  "P4A-U01-L3.f1": "read",
  "P4A-U01-L3.f2": "do",
  "P4A-U01-L3.f3": "swim",
  "P4A-U01-L4.f1": "read",
  "P4A-U01-L4.f2": "play",
  "P4A-U01-L4.f3": "start",
  "P4A-U03-L1.p6": "open",
  "P4A-U03-L2.p6": "carry",
  "P4A-U03-L3.p6": "try",
  "P4A-U03-L4.p6": "clean",
  "P4B-U06-L1.p8": "take",
};
const pastWaiting =
  "孩子们昨晚等候了那班火车。这里把这次等候作为一件过去的事来叙述。";
const courseItems = sourceItems.map((old) => {
  const item = structuredClone(old);
  if (item.id.startsWith("P4A-U01-L4.f1."))
    item.context = "根据学习日志，说明我每天在家读书。";
  if (item.id.startsWith("P4A-U01-L4.f2."))
    item.context = "日志：Mia常常在周一弹钢琴。用肯定句描述她的习惯。";
  if (item.type === "input") {
    const key = item.id.replace(/\.input$/, "");
    const base =
      courseBases[key] ?? (item.lessonId.startsWith("P4A-U02-") ? "be" : null);
    if (base) item.prompt += `（${base}）`;
  }
  if (item.id === "P4A-U03-L4.p9.order") {
    item.context = pastWaiting;
    item.explanation = item.explanation.replace(old.context, pastWaiting);
  }
  if (item.lessonId === "P4A-U04-L2" && item.type === "evidence") {
    item.passage[0].text = "Yesterday, Tom lost his red dog lead.";
    item.passage[2].text = "She gave it back to Tom.";
    item.explanation = item.explanation.replace(
      old.passage[0].text,
      item.passage[0].text,
    );
    item.solutionSentences = item.solutionSentences.map((s) =>
      s === old.passage[0].text ? item.passage[0].text : s,
    );
  }
  if (item.id === "P4A-U04-L4.p8.input") {
    item.prompt = "Grandpa ___ me how to tie a knot yesterday.";
    item.explanation = item.explanation.replace(
      "Grandpa taught me a knot yesterday.",
      "Grandpa taught me how to tie a knot yesterday.",
    );
    item.solutionSentences = ["Grandpa taught me how to tie a knot yesterday."];
  }
  if (item.id === "P4B-U02-L1.p8.input") {
    item.context = "询问Bo昨天下午是否参观了模型展。";
    item.prompt = "Did Bo ___ the model display yesterday afternoon?（visit）";
    item.explanation =
      "Did Bo visit the model display yesterday afternoon? Bo昨天下午参观模型展了吗？Did后用动词原形visit。";
    item.solutionSentences = [
      "Did Bo visit the model display yesterday afternoon?",
    ];
  }
  if (item.id === "P4B-U06-L4.p8.input") {
    item.answers = ["finally", "lastly"];
    item.hint =
      "finally或lastly都可以引出最后一步；这里前两步是sketched和folded。";
    item.explanation = "finally / lastly。两者在这里都可以表示最后一步。";
  }
  if (item.type === "order" && /^P4A-U0[34]-/.test(item.lessonId)) {
    const sentenceCase = (s) =>
      s
        .replace(
          /^(yesterday|last [a-z]+)(,?) (They|We|She)\b/,
          (_, time, comma, subject) =>
            time[0].toUpperCase() +
            time.slice(1) +
            comma +
            " " +
            subject.toLowerCase(),
        )
        .replace(
          /^(yesterday|last [a-z]+)\b/,
          (s) => s[0].toUpperCase() + s.slice(1),
        );
    item.answers = item.answers.map(sentenceCase);
    item.solutionSentences = item.solutionSentences?.map(sentenceCase);
  }
  return revise(old, item);
});

const activities = [
  "play",
  "read",
  "draw",
  "make",
  "write",
  "eat",
  "drink",
  "watch",
  "wash",
  "clean",
  "build",
  "take",
];
const sharedItems = topics.items.map((old) => {
  if (
    !old.topicId?.startsWith("tense.") ||
    !old.prompt.includes("___") ||
    /（[^）]+）/.test(old.prompt)
  )
    return old;
  const item = structuredClone(old);
  const answer = item.answers[0].toLowerCase();
  const base = ["am", "is", "are", "was", "were"].includes(answer)
    ? "be"
    : ["have", "has"].includes(answer)
      ? "have"
      : answer === "do"
        ? "do"
        : activities[(Number(item.id.split(".").at(-2)) - 1) % 12];
  assert.ok(base);
  item.prompt += `（${base}）`;
  return revise(old, item);
});
const revisedCourseItems = patches.filter((i) => i.lessonId);
const changedLessons = new Set(revisedCourseItems.map((i) => i.lessonId));
const lessons = sourceLessons.flatMap((old) => {
  const cards = old.cards.map((c) => ({ ...c, ...cardCorrections[c.example] }));
  if (
    !changedLessons.has(old.id) &&
    JSON.stringify(cards) === JSON.stringify(old.cards)
  )
    return [];
  return [{ ...old, version: (old.version ?? 1) + 1, releaseId: id, cards }];
});
const metadata = {
  id,
  lessons,
  items: patches,
  auditScope: {
    lessons: 48,
    cards: 200,
    courseItems: 432,
    irregularVariants: 840,
    sharedTenseAndPastFormVariants: 1320,
    irregularVerbs: 60,
  },
  revised: {
    lessons: lessons.length,
    courseItems: revisedCourseItems.length,
    irregularVariants: patches.filter((i) => i.id.startsWith("g4.")).length,
    sharedTenseVariants: patches.filter((i) => i.id.startsWith("bank.")).length,
  },
};
const manifestHash = hash(metadata);
const immutable = async (path, text) => {
  const old = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
  if (old !== null && old.replaceAll("\r\n", "\n") !== text)
    throw Error(`Immutable review changed: ${path}`);
  await writeContent(path, text);
};
const sql = [
  "-- Reviewed P4 English: additive versions only; prior lessons, assignments and learning evidence remain intact.",
  `INSERT INTO content_releases VALUES(${q(id)},'published',${q(manifestHash)},unixepoch()*1000);`,
];
function insert(prefix, rows) {
  let batch = [],
    bytes = Buffer.byteLength(prefix);
  for (const row of rows) {
    const size = Buffer.byteLength(row) + 2;
    if (bytes + size > 70000 && batch.length) {
      sql.push(prefix + batch.join(",\n") + ";");
      batch = [];
      bytes = Buffer.byteLength(prefix);
    }
    batch.push(row);
    bytes += size;
  }
  if (batch.length) sql.push(prefix + batch.join(",\n") + ";");
}
const containers = new Map();
for (const item of patches.filter((i) => i.topicId)) {
  const g4 = item.id.startsWith("g4.");
  const key = `${g4 ? "g4.topic." : "bank."}${item.topicId}`;
  containers.set(item.topicId, {
    id: key,
    version: g4 ? 3 : 2,
    title: item.title,
    grade: item.gradeMin,
  });
}
insert("INSERT INTO lessons VALUES\n", [
  ...lessons.map(
    (l) =>
      `(${q(l.id)},${l.version},${q(id)},4,${q(l.term)},${l.unitNumber ?? Number(l.id.match(/-U(\d+)/)[1])},${q(l.title)},${q(JSON.stringify(l))})`,
  ),
  ...[...containers.values()].map(
    (l) =>
      `(${q(l.id)},${l.version},${q(id)},${l.grade},'A',1,${q(l.title)},'{}')`,
  ),
]);
insert(
  "INSERT INTO items VALUES\n",
  patches.map((i) => {
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
      topicId,
      pattern,
      version,
      ...data
    } = i;
    const container = topicId
      ? containers.get(topicId)
      : lessons.find((l) => l.id === lessonId);
    assert.ok(container);
    return `(${q(i.id)},${version},${q(container.id)},${container.version},${q(skill)},${q(modality)},${q(i.type)},${q(JSON.stringify(data))},${q(JSON.stringify({ answers, evidenceSolutions, placements, repairs, family, hint, explanation, solutionSentences, evidenceTargets, pattern }))},'published')`;
  }),
);
insert(
  "INSERT INTO release_items VALUES\n",
  patches.map((i) => `(${q(id)},${q(i.id)},${i.version})`),
);
const migration = sql.join("\n") + "\n";
assert.ok(
  !/\bundefined\b|\bNaN\b/.test(migration),
  "Every SQL value must be defined",
);
await immutable("migrations/0054_grade4_language_review.sql", migration);
await immutable(
  "content/grade4-language-review.v1.json",
  JSON.stringify({ ...metadata, manifestHash }),
);
const revisedLessons = new Map(lessons.map((l) => [l.id, l]));
await writeContent(
  "content/grade4-tense-release.latest.json",
  JSON.stringify({
    ...prior,
    id: "grade4-tense-catalog-v3",
    manifestHash,
    releases: [...prior.releases, id],
    lessons: prior.lessons.map((l) => revisedLessons.get(l.id) ?? l),
    items: irregularItems,
  }),
);
await writeContent(
  "public/content/lessons.json",
  JSON.stringify({
    ...course,
    release: "course-catalog-v14",
    releases: [...course.releases.filter((r) => r !== id), id],
    lessons: course.lessons.map((l) => revisedLessons.get(l.id) ?? l),
  }),
);
console.log("Reviewed P4 teaching and questions:", metadata.revised);
