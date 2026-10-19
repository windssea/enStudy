import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
// Original v1 was already applied locally. Append reviewed item versions;
// never edit its SQL, content snapshot, families, or saved observations.
// Language references (context-specific alternatives, not universal synonyms):
// https://dictionary.cambridge.org/grammar/british-grammar/ought-to
// https://dictionary.cambridge.org/grammar/british-grammar/be-expressions-be-able-to-be-due-to
// https://dictionary.cambridge.org/grammar/british-grammar/must
// https://www.ef.com/wwen/english-resources/english-grammar/forming-possessive/
const source = JSON.parse(
  await readFile("content/training-reserved-release.v1.json", "utf8"),
);
const revisionId = "reserved-training-v2",
  revised = [];
const places = [
  "美术室",
  "音乐室",
  "科学教室",
  "体育中心",
  "玩具店",
  "书店",
  "教室",
  "餐厅",
  "公交车站",
  "火车站",
  "学校礼堂",
  "动物中心",
];
const items = source.items.map((original) => {
  const item = { ...original, answers: [...original.answers] },
    d = item.trainingDimension;
  let changed = false;
  const context = (text) => {
    item.context = text;
    changed = true;
  };
  const alternatives = (values, rule) => {
    item.answers = [...new Set([...item.answers, ...values])];
    item.hint = rule;
    item.explanation = `${item.answers[0]}。${rule}`;
    changed = true;
  };
  if (item.topicId === "grammar.be") {
    if (d === "negative") {
      const index = Number(item.id.split(".").at(-1)) - 1;
      item.prompt = item.prompt.replace(
        "现在不在活动室",
        `现在不在${places[index]}`,
      );
      context("按现在的英文地点填写is的否定形式，可以用完整形式或合法缩写。");
    } else context("用am、is或are完成现在时句子；问句开头注意大写。");
  }
  if (item.topicId === "grammar.articles")
    context(
      d === "known"
        ? "第二句仍指第一句提过的同一个物品，再选择冠词。"
        : "这里首次提到一个没有特别指定的事物，请用a或an，按开头实际声音判断。",
    );
  if (item.topicId === "grammar.prepositions")
    context(
      ["at", "on", "in"].includes(d)
        ? "这里比较时间介词at、on和in，请从这三个词中选择填写。"
        : "按给出的中文位置，在under和behind中选择填写。",
    );
  if (item.topicId === "grammar.quantifiers" && ["some", "any"].includes(d))
    context("这里比较some和any，请按给出的情景选择其中一个词填写。");
  if (item.topicId === "grammar.frequency") {
    if (d === "be-position") {
      const name = item.answers[0].split(" ")[0];
      item.type = "choice";
      item.modality = "recognition";
      item.choices = [
        item.answers[0],
        `${name} always is time on.`,
        `${name} on is always time.`,
      ];
      item.solutionSentences = [item.answers[0]];
      changed = true;
    } else
      context(
        "这一题练习本单元的always、usually、sometimes和never，请从这四个频率词中选择作答。",
      );
  }
  if (item.topicId === "grammar.modals") {
    if (d === "ability") {
      item.prompt = item.prompt.replace(
        "（能，表示能力）",
        "（现在能，表示能力）",
      );
      context("请用can或be able to的适当形式表达现在的能力。");
      alternatives(
        ["is able to"],
        "这里说明现在的能力。can后接原形；is able to后接原形也是合适表达。",
      );
    }
    if (d === "advice") {
      context("请用should或ought to给建议。");
      alternatives(
        ["ought to"],
        "should可用来给建议；在这个句子中ought to也能表达相近的建议。",
      );
    }
    if (d === "rule") {
      context("请用must、have to或have got to的适当形式表达这条外部要求。");
      alternatives(
        ["has to", "has got to"],
        "这是外部安全要求。must表示必须；单数主语在此也可以用has to或has got to，不把所有语境下的用法等同。",
      );
    }
  }
  if (
    item.topicId === "grammar.possession" &&
    d === "name" &&
    item.answers[0] === "Iris's"
  )
    alternatives(
      ["Iris'"],
      "Iris以s结尾。本题接受Iris's和Iris'两种所有格写法，书写风格可能不同。",
    );
  if (item.topicId === "grammar.there-be" && d !== "negative")
    context("这里使用现在时There be句型，请选择is或are；问句开头注意大写。");
  if (item.topicId === "tense.future" && ["going-to", "plural"].includes(d))
    context("这是现在已经确定的明日计划，请用am、is或are完成be going to结构。");
  if (!changed) return original;
  // A wording correction is the SAME material family, not a new unseen task.
  item.version = 2;
  revised.push(item);
  return item;
});
const hash = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const statements = [
  "-- Reviewed wording, constrained prompts and accepted variants. Prior versions stay immutable.",
  `INSERT INTO content_releases VALUES(${q(revisionId)},'published',${q(hash(revised))},unixepoch()*1000);`,
];
for (const topic of new Set(revised.map((i) => i.topicId))) {
  const first = revised.find((i) => i.topicId === topic);
  statements.push(
    `INSERT INTO lessons VALUES(${q(`reserved.${topic}`)},2,${q(revisionId)},${first.gradeMin},'A',1,${q(first.title)},'{}');`,
  );
}
function insert(prefix, rows) {
  let current = [],
    bytes = Buffer.byteLength(prefix);
  for (const row of rows) {
    const size = Buffer.byteLength(row) + 2;
    if (bytes + size > 70000 && current.length) {
      statements.push(prefix + current.join(",\n") + ";");
      current = [];
      bytes = Buffer.byteLength(prefix);
    }
    current.push(row);
    bytes += size;
  }
  if (current.length) statements.push(prefix + current.join(",\n") + ";");
}
insert(
  "INSERT INTO items VALUES\n",
  revised.map((item) => {
    const {
      answers,
      hint,
      explanation,
      skill,
      modality,
      family,
      topicId,
      pattern,
      trainingPhase,
      trainingDimension,
      solutionSentences,
      version,
      ...publicData
    } = item;
    return `(${q(item.id)},2,${q(`reserved.${topicId}`)},2,${q(skill)},${q(modality)},${q(item.type)},${q(JSON.stringify(publicData))},${q(JSON.stringify({ answers, hint, explanation, family, pattern, trainingPhase, trainingDimension, solutionSentences }))},'published')`;
  }),
);
insert(
  "INSERT INTO release_items VALUES\n",
  revised.map((i) => `(${q(revisionId)},${q(i.id)},2)`),
);
const sql = statements.join("\n") + "\n",
  path = "migrations/0044_reserved_training_review_v2.sql";
const old = await readFile(path, "utf8").catch((e) => {
  if (e.code !== "ENOENT") throw e;
  return null;
});
if (old !== null && old.replaceAll("\r\n", "\n") !== sql)
  throw Error("Immutable reserved review changed; append a new review.");
if (old === null) await writeFile(path, sql);
await writeContent(
  "content/training-reserved-release.latest.json",
  JSON.stringify({
    ...source,
    id: "reserved-training-catalog-v2",
    editionId: source.id,
    revisionId,
    releases: [source.id, revisionId],
    manifestHash: hash({ items, blueprints: source.blueprints }),
    items,
  }),
);
console.log(
  `Reviewed ${revised.length} item versions; 1080 task families remain, original v1 and applied migrations unchanged.`,
);
