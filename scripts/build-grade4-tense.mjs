import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  irregularVerbs,
  irregularTopics,
} from "../packages/domain/irregularVerbs.ts";
import { grade4Cards } from "../content/grade4-tense.v1.mjs";
import { writeContent } from "./content-write.mjs";
const id = "grade4-tense-v1",
  items = [],
  stats = {};
const hash = (s) =>
  createHash("sha256").update(JSON.stringify(s)).digest("hex");
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
function fact(
  topic,
  word,
  dimension,
  prompt,
  answer,
  candidates,
  rule,
  alternatives = [],
) {
  const accepted = new Set(
    [answer, ...alternatives].map((v) => v.toLowerCase()),
  );
  const wrong = [...new Set(candidates)]
    .filter((v) => !accepted.has(v.toLowerCase()))
    .slice(0, 2);
  if (wrong.length !== 2) throw Error("Ambiguous irregular fact: " + prompt);
  const family = "g4-fact-" + hash([prompt, answer]).slice(0, 20);
  for (const type of ["choice", "input"])
    items.push({
      id: `g4.${topic.id}.${word.base}.${dimension}.${type}`,
      version: 1,
      topicId: topic.id,
      pattern: `${topic.id}.${dimension}`,
      category: "forms",
      title: topic.title,
      context:
        type === "choice" ? "选出合适的动词形式。" : "写出合适的动词形式。",
      prompt,
      type,
      ...(type === "choice" ? { choices: [answer, ...wrong] } : {}),
      answers: [answer, ...alternatives],
      gradeMin: 4,
      skill: `${topic.skill}${topic.id.endsWith(".did") ? ".did" : ""}.${word.base}`,
      modality: type === "choice" ? "recognition" : "controlled-production",
      family,
      hint: rule,
      explanation: `${answer}。${rule}`,
      wordFormCue: {
        word: word.base,
        instruction: ["question", "negative", "restore"].includes(dimension)
          ? "did后，用原形"
          : dimension === "participle"
            ? "变成过去分词"
            : "变成过去式",
      },
    });
}
for (const topic of irregularTopics) {
  const words = topic.id.endsWith(".core")
    ? irregularVerbs.filter((w) => w.level === "core")
    : topic.id.endsWith(".extended")
      ? irregularVerbs.filter((w) => w.level === "extended")
      : irregularVerbs;
  for (const w of words) {
    const candidates = [
      w.base,
      w.past,
      w.participle,
      w.base + "ed",
      w.base + "s",
      w.base + "ing",
    ];
    const pastRule = `${w.base}的过去式是${w.past}，不能一律加-ed。${w.note}`;
    if (topic.id.endsWith(".did")) {
      fact(
        topic,
        w,
        "question",
        `Did you ___ ${w.complement} ${w.time}?（${w.base}）`,
        w.base,
        candidates,
        `Did已经承担过去变化，后面用原形${w.base}，不要另加过去时词尾。`,
      );
      fact(
        topic,
        w,
        "negative",
        `I didn't ___ ${w.complement} ${w.time}.（${w.base}）`,
        w.base,
        candidates,
        `didn't后用原形${w.base}，不因过去的否定再改变实义动词。`,
      );
    } else if (topic.id.endsWith(".participle")) {
      fact(
        topic,
        w,
        "past",
        `一般过去时：I ___ ${w.complement} ${w.time}.（${w.base}）`,
        w.past,
        candidates,
        `过去肯定句用过去式${w.past}；过去分词${w.participle}是另一种词形。${w.note}`,
      );
      fact(
        topic,
        w,
        "participle",
        `完成式结构 had + 过去分词：I had ___ ${w.complement} before lunch.（${w.base}）`,
        w.participle,
        candidates,
        `had后用过去分词${w.participle}。这里说午饭前已经发生，过去分词本身不是一种时态。${w.note}`,
        w.participleAlternatives,
      );
    } else {
      fact(
        topic,
        w,
        "form",
        `${w.base}（${w.meaning}）的过去式是___。`,
        w.past,
        candidates,
        pastRule,
      );
      fact(
        topic,
        w,
        "event",
        `I ___ ${w.complement} ${w.time}.（${w.base}）`,
        w.past,
        candidates,
        pastRule,
      );
      fact(
        topic,
        w,
        "restore",
        `肯定句动词是${w.past}。改为否定：I did not ___ ${w.complement}.`,
        w.base,
        candidates,
        `肯定过去句用${w.past}；did not后还原成${w.base}。`,
      );
    }
  }
  const group = items.filter((i) => i.topicId === topic.id);
  stats[topic.id] = {
    items: group.length,
    families: new Set(group.map((i) => i.family)).size,
    roundSizes: [5, 10, 20],
    mode: "text-practice",
  };
}
if (items.length !== 840 || new Set(items.map((i) => i.id)).size !== 840)
  throw Error("Expected 840 versioned variants.");
const catalog = JSON.parse(
  await readFile("public/content/catalog.json", "utf8"),
);
const course = JSON.parse(
  await readFile("public/content/lessons.json", "utf8"),
);
const lessons = course.lessons
  .filter((l) => grade4Cards[l.id])
  .map((l) => ({
    ...l,
    version: 2,
    releaseId: id,
    cards: [...grade4Cards[l.id], ...l.cards],
  }));
if (
  lessons.length !== 28 ||
  lessons.some((l) => l.grade !== 4 || l.cards.length < 5)
)
  throw Error("Expected 28 enriched P4 lessons.");
const topics = irregularTopics.map((t) => ({
  topic_id: t.id,
  category: "forms",
  title: t.title,
  grade_min: "4",
  grade_max: "6",
  primary_skill: t.skill,
  interaction: t.dimension,
  minimum_item_refs: String(stats[t.id].items),
  new_unique_items: String(stats[t.id].families),
  status: "published",
}));
const manifestHash = hash({ lessons, items, topics, stats });
const sql = [
  "-- Additive P4 teaching and four original irregular-verb banks. Historical rows stay immutable.",
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
insert(
  "INSERT OR IGNORE INTO skills VALUES\n",
  [...new Map(items.map((t) => [t.skill, t])).values()].map(
    (t) =>
      `(${q(t.skill)},${q(t.skill.split(".")[0])},${q(`${t.wordFormCue.word} · ${t.title}`)})`,
  ),
);
insert("INSERT INTO lessons VALUES\n", [
  ...lessons.map(
    (l) =>
      `(${q(l.id)},2,${q(id)},4,${q(l.term)},${l.unitNumber ?? 1},${q(l.title)},${q(JSON.stringify(l))})`,
  ),
  ...topics.map(
    (t) =>
      `(${q("g4.topic." + t.topic_id)},1,${q(id)},4,'A',1,${q(t.title)},'{}')`,
  ),
]);
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
      topicId,
      pattern,
      version,
      ...publicData
    } = item;
    return `(${q(item.id)},1,${q("g4.topic." + topicId)},1,${q(skill)},${q(modality)},${q(item.type)},${q(JSON.stringify(publicData))},${q(JSON.stringify({ answers, hint, explanation, family, pattern }))},'published')`;
  }),
);
insert(
  "INSERT INTO release_items VALUES\n",
  items.map((i) => `(${q(id)},${q(i.id)},1)`),
);
const migration = sql.join("\n") + "\n",
  path = "migrations/0052_grade4_tense.sql";
const prior = await readFile(path, "utf8").catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
if (prior !== null && prior.replaceAll("\r\n", "\n") !== migration)
  throw Error("Immutable grade4 release changed; publish a new version.");
await writeContent(path, migration);
await writeContent(
  "content/grade4-tense-release.v1.json",
  JSON.stringify({ id, manifestHash, lessons, topics, stats, items }),
);
const revised = new Map(lessons.map((l) => [l.id, l]));
await writeContent(
  "public/content/lessons.json",
  JSON.stringify({
    ...course,
    release: "course-catalog-v13",
    releases: [...course.releases, id],
    lessons: course.lessons.map((l) => revised.get(l.id) ?? l),
  }),
);
await writeContent(
  "public/content/catalog.json",
  JSON.stringify({
    ...catalog,
    release: "planning-v0.4",
    topics: [...catalog.topics, ...topics],
  }),
);
console.log(
  "Built P4 tense enrichment: 28 lessons / 56 contrast cards, 4 topics / 420 facts / 840 variants.",
);
