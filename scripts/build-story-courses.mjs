import authored from "../content/story-courses-v1.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { writeContent } from "./content-write.mjs";
const hash = (v) => createHash("sha256").update(v).digest("hex"),
  quote = (v) => `'${String(v).replaceAll("'", "''")}'`,
  norm = (v) =>
    v
      .normalize("NFKC")
      .replace(/[‘’]/g, "'")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("en-US"),
  id = "story-courses-v1";
const scope = parse(await readFile("docs/curriculum/p1-p6-scope.csv", "utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }),
  items = [];
const plans = {
  1: {
    skill: "morphology.noun.plural",
    topic: "forms.noun-plural",
    rule: "先看一件还是多件。本组练单数，以及常见的s/es复数；听句子时先抓物品和数量，阅读时回到原句找依据。",
    examples: [
      ["This is a blue truck.", "这是一辆蓝色卡车。"],
      ["I have nine marbles.", "我有九颗弹珠。"],
      ["These are two drums.", "这是两面鼓。"],
    ],
    words: [
      ["toy", "玩具"],
      ["block", "积木"],
      ["share", "分享"],
      ["number", "数量"],
    ],
  },
  2: {
    skill: "grammar.there-be.present",
    topic: "grammar.there-be",
    rule: "There is介绍一件可数物品，There are介绍多件。位置词帮助找到物品；原文里的地点和数量是回答问题的依据。",
    examples: [
      ["There is a picture above the piano.", "钢琴上方有一张画。"],
      ["There are seven stools in this room.", "这个房间有七把凳子。"],
      ["There is one basket near the window.", "窗边有一个篮子。"],
    ],
    words: [
      ["room", "房间"],
      ["shelf", "架子"],
      ["beside", "在旁边"],
      ["window", "窗户"],
    ],
  },
  3: {
    skill: "grammar.present-simple.questions",
    topic: "tense.present-simple",
    rule: "一般现在时的这些问句里，he/she或一个名字配Does，you/we/they和复数主语配Do；助动词后用动词原形。调查信息要找原文的活动、人物或频率。",
    examples: [
      ["Do you like skating?", "你喜欢滑冰吗？"],
      ["Does Eva collect stones?", "伊娃收集石头吗？"],
      ["Do your classmates play cards?", "你的同学玩纸牌吗？"],
    ],
    words: [
      ["hobby", "爱好"],
      ["club", "社团"],
      ["survey", "调查"],
      ["result", "结果"],
    ],
  },
  4: {
    skill: "grammar.past-simple",
    topic: "tense.past-simple",
    rule: "讲明确过去发生的事情，本组练规则过去式：通常加ed；有些词只加d、变y为ied或双写后加ed。阅读时按原文顺序找时间与行动。",
    examples: [
      ["We climbed a hill last Tuesday.", "我们上周二爬了山。"],
      ["Owen washed the boots yesterday.", "欧文昨天洗了靴子。"],
      ["They played badminton last weekend.", "他们上周末打了羽毛球。"],
    ],
    words: [
      ["journey", "旅程"],
      ["ticket", "票"],
      ["path", "小路"],
      ["postcard", "明信片"],
    ],
  },
  5: {
    skill: "grammar.past-continuous",
    topic: "tense.past-continuous",
    rule: "过去某时正在进行的动作，用was/were加动词ing形式。本组I/he/she等配was，you/we/they等配were。听读时注意谁在何时做什么。",
    examples: [
      [
        "At noon yesterday, Eva was feeding the birds.",
        "昨天中午伊娃正在喂鸟。",
      ],
      ["Two boys were sweeping the path at five.", "两个男孩五点时正在扫路。"],
      ["I was painting when the bell rang.", "铃响时我正在画画。"],
    ],
    words: [
      ["meanwhile", "与此同时"],
      ["equipment", "器材"],
      ["torch", "手电筒"],
      ["forecast", "预报"],
    ],
  },
  6: {
    skill: "grammar.present-perfect.intro",
    topic: "tense.present-perfect",
    rule: "本组用have/has加过去分词谈到现在的经历或改变，用一般过去时讲yesterday等明确过去时间。找证据时注意时间、变化和作者说明的原因。",
    examples: [
      [
        "Our school has opened a new science room.",
        "学校已经开设了一个新科学教室。",
      ],
      ["Eva visited the old hall in May.", "伊娃五月参观了旧礼堂。"],
      ["We have never tried that puzzle.", "我们从没试过那个谜题。"],
    ],
    words: [
      ["change", "变化"],
      ["evidence", "依据"],
      ["reduce", "减少"],
      ["compare", "比较"],
    ],
  },
};
const lessons = authored.map((source) => {
  const plan = plans[source.grade],
    unit = scope.find((u) => u.unit_id === source.unitId),
    { audio, reading, grammar, ...metadata } = source;
  if (
    !unit ||
    audio.length !== 3 ||
    reading.length !== 3 ||
    grammar.length !== 3
  )
    throw new Error(`Invalid story lesson ${source.id}`);
  const passage = reading.map(([text], i) => ({ id: `s${i + 1}`, text }));
  const base = {
    lessonId: source.id,
    version: 1,
    title: source.title,
    gradeMin: source.grade,
  };
  for (let n = 0; n < 3; n++) {
    const [script, question, answer, ...wrong] = audio[n];
    if (!script || wrong.length !== 2 || new Set([answer, ...wrong]).size !== 3)
      throw new Error(`Bad listening fact ${source.id}`);
    items.push({
      ...base,
      id: `${source.id}.p${n * 3 + 1}.listen`,
      category: "vocabulary",
      type: "listen",
      context:
        "先主动播放一句英文。听清后确认，再选意思；听不到时可以用文字辅助。",
      prompt: question,
      audioText: script,
      choices: [answer, ...wrong],
      answers: [answer],
      skill: `listening.${source.unitId}`,
      modality: "listening-choice",
      family: `fact-${hash(norm(script)).slice(0, 16)}`,
      hint: "先抓住句子里的人物、物品、地点、时间或数量。听不到时可改用文字辅助，不计独立听辨证据。",
      explanation: `${script} 对应答案：${answer}。`,
      solutionSentences: [script],
    });
    const [readingSentence, ask, response, ...distractors] = reading[n];
    if (
      distractors.length !== 2 ||
      new Set([response, ...distractors]).size !== 3
    )
      throw new Error(`Bad reading fact ${source.id}`);
    items.push({
      ...base,
      id: `${source.id}.p${n * 3 + 2}.evidence`,
      category: "reading",
      type: "evidence",
      context: "先读小故事，点选一句支持答案的原文，再回答问题。",
      prompt: ask,
      passage,
      choices: [response, ...distractors],
      answers: [JSON.stringify([`s${n + 1}`, norm(response)])],
      evidenceSolutions: [{ sentenceId: `s${n + 1}`, answer: response }],
      skill: `reading.${source.unitId}`,
      modality: "reading-evidence",
      family: `fact-${hash(norm(readingSentence)).slice(0, 16)}`,
      hint: "回到原文找关键人物、时间、地点、数量或原因；先选依据句，再检查它是否支持你的答案。",
      explanation: `依据：${readingSentence} 对应答案：${response}。`,
      solutionSentences: [readingSentence],
    });
    const [context, prompt, target, ...wrongGrammar] = grammar[n],
      sentence = prompt.replace("___", target),
      type = ["choice", "input", "order"][n];
    if (prompt.split("___").length !== 2 || wrongGrammar.length !== 2)
      throw new Error(`Bad grammar ${source.id}`);
    const alternatives = [sentence];
    if (type === "order") {
      const match = sentence.match(
        /^(.*?) ((?:last (?:night|week|year)|yesterday(?: afternoon)?|at \w+ yesterday|this term))\.$/,
      );
      if (match) {
        alternatives.push(
          `${match[2]} ${match[1]}.`,
          `${match[2]}, ${match[1]}.`,
        );
      }
    }
    const tokens = sentence
      .replace(/([.!?,])/g, " $1")
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length > 16)
      throw new Error(`Too many order tokens ${source.id}`);
    items.push({
      ...base,
      id: `${source.id}.p${n * 3 + 3}.${type}`,
      category: source.grade >= 4 ? "tense" : "grammar",
      type,
      context,
      prompt:
        type === "order"
          ? "用词块表达给出的意思。末尾标点单独成块；时间短语可放在句首或句尾。"
          : prompt,
      ...(type === "choice" ? { choices: [target, ...wrongGrammar] } : {}),
      ...(type === "order"
        ? { tokens: tokens.reverse(), punctuationTokens: true }
        : {}),
      answers: type === "order" ? alternatives : [target],
      skill: plan.skill,
      modality: type === "choice" ? "recognition" : "controlled-production",
      family: `fact-${hash(norm(sentence)).slice(0, 16)}`,
      hint: plan.rule,
      explanation: `${sentence} ${context} ${plan.rule}`,
      solutionSentences: alternatives,
    });
  }
  return {
    ...metadata,
    unitTitle: unit.title,
    releaseId: id,
    cards: plan.examples.map(([example, translation]) => ({
      title: source.title,
      rule: plan.rule,
      example,
      translation,
    })),
    vocabulary: plan.words.map(([word, meaning]) => ({ word, meaning })),
    task: "用听到的内容、原文依据和句子形式完成9个不同目标的小任务。",
    topicIds: [plan.topic],
    itemCount: 9,
  };
});
if (
  lessons.length !== 24 ||
  items.length !== 216 ||
  new Set(items.map((i) => i.family)).size !== 216
)
  throw new Error("Story coverage or distinct fact count invalid.");
for (const lesson of lessons)
  if (
    items
      .filter((i) => i.lessonId === lesson.id)
      .some((i) =>
        i.solutionSentences.some((s) =>
          lesson.cards.some((c) => norm(c.example) === norm(s)),
        ),
      )
  )
    throw new Error(`Demonstration reused ${lesson.id}`);
const manifestHash = hash(JSON.stringify({ lessons, items })),
  release = { id, version: 1, manifestHash, lessons, items };
const sql = [
  "-- Additive third-unit lessons: 72 listening, 72 reading-with-evidence, 72 controlled grammar tasks.",
  `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
];
for (const l of lessons)
  sql.push(
    `INSERT INTO lessons VALUES(${quote(l.id)},1,'${id}',${l.grade},'A',3,${quote(l.title)},${quote(JSON.stringify(l))});`,
  );
for (const item of items) {
  const {
    answers,
    evidenceSolutions,
    skill,
    modality,
    family,
    hint,
    explanation,
    solutionSentences,
    lessonId,
    version,
    ...publicData
  } = item;
  const label = `${scope.find((u) => u.unit_id === lessonId.split("-L")[0]).title} · ${item.type === "listen" ? "听句理解" : item.type === "evidence" ? "阅读找依据" : "句子表达"}`;
  sql.push(
    `INSERT OR IGNORE INTO skills VALUES(${quote(skill)},${quote(skill.split(".")[0])},${quote(label)});`,
    `INSERT INTO items VALUES(${quote(item.id)},1,${quote(lessonId)},1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, evidenceSolutions, family, hint, explanation, solutionSentences }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(item.id)},1);`,
  );
}
const text = sql.join("\n") + "\n",
  path = "migrations/0020_story_courses_v1.sql",
  prior = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw new Error("Immutable story course changed.");
if (prior === null) await writeFile(path, text);
await writeContent(
  "content/story-course-release.v1.json",
  JSON.stringify(release),
);
const base = JSON.parse(
    await readFile("content/course-release.v1.json", "utf8"),
  ),
  expansion = JSON.parse(
    await readFile("content/course-expansion.latest.json", "utf8"),
  );
await writeContent(
  "public/content/lessons.json",
  JSON.stringify({
    release: "course-catalog-v3",
    releases: [base.id, expansion.id, id],
    lessons: [...base.lessons, ...expansion.lessons, ...lessons],
  }),
);
console.log(
  "Built 24 third-unit lessons / 216 distinct facts; course catalog 72/288 (device listening, evidence reading, controlled grammar).",
);
