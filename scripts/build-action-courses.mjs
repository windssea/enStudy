import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { writeContent } from "./content-write.mjs";
const source = JSON.parse(
  await readFile("content/action-courses.v1.json", "utf8"),
);
const scope = parse(await readFile("docs/curriculum/p1-p6-scope.csv", "utf8"), {
  columns: true,
  skip_empty_lines: true,
  bom: true,
});
const hash = (value) => createHash("sha256").update(value).digest("hex"),
  quote = (value) => `'${String(value).replaceAll("'", "''")}'`,
  norm = (value) =>
    value
      .normalize("NFKC")
      .replace(/[‘’]/g, "'")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase(),
  tokens = (value) =>
    value
      .replace(/([.!?,])/g, " $1")
      .trim()
      .split(/\s+/);
const join = (value) => value.join(" ").replace(/\s+([.!?,])/g, "$1");
const id = "action-courses-v1",
  items = [];
const lessons = source.lessons.map((lesson) => {
  const plan = source.plans[lesson.grade],
    unit = scope.find((row) => row.unit_id === lesson.unitId);
  if (
    !unit ||
    !plan ||
    lesson.audio.length !== 2 ||
    lesson.reading.length !== 3
  )
    throw Error(`Invalid action lesson ${lesson.id}`);
  const {
    audio,
    reading,
    choice,
    repair,
    sorting,
    fill,
    ordering,
    repairTarget,
    ...metadata
  } = lesson;
  const base = {
    lessonId: lesson.id,
    version: 1,
    title: lesson.title,
    gradeMin: lesson.grade,
  };
  const add = (position, type, config) =>
    items.push({
      ...base,
      id: `${lesson.id}.p${position}.${type}`,
      type,
      ...config,
    });
  const passage = reading.map(([text], i) => ({ id: `s${i + 1}`, text }));
  for (let n = 0; n < 2; n++) {
    const [sentence, ask, answer, ...wrong] = audio[n];
    if (wrong.length !== 2 || new Set([answer, ...wrong]).size !== 3)
      throw Error(`Audio choices ${lesson.id}`);
    add(n * 3 + 1, "listen", {
      category: "vocabulary",
      context: "主动播放一句英文，听清后确认；听不到时可用文字辅助。",
      prompt: ask,
      audioText: sentence,
      choices: [answer, ...wrong],
      answers: [answer],
      skill: `listening.${lesson.unitId}`,
      modality: "listening-choice",
      family: `fact-${hash(norm(sentence)).slice(0, 16)}`,
      hint: "先听人物、动作、物品或位置。需要时使用文字辅助，辅助会单独记录。",
      explanation: `${sentence} 对应答案：${answer}。`,
      solutionSentences: [sentence],
    });
    const [text, question, response, ...distractors] = reading[n];
    if (
      distractors.length !== 2 ||
      new Set([response, ...distractors]).size !== 3
    )
      throw Error(`Reading choices ${lesson.id}`);
    add(n * 3 + 2, "evidence", {
      category: "reading",
      context: "读小故事，先选支持答案的原句，再回答问题。",
      prompt: question,
      passage,
      choices: [response, ...distractors],
      answers: [JSON.stringify([`s${n + 1}`, norm(response)])],
      evidenceSolutions: [{ sentenceId: `s${n + 1}`, answer: response }],
      skill: `reading.${lesson.unitId}`,
      modality: "reading-evidence",
      family: `fact-${hash(norm(text)).slice(0, 16)}`,
      hint: "回到原文找人物、地点、物品或因果；所选句子必须支持答案。",
      explanation: `依据：${text} 对应答案：${response}。`,
      solutionSentences: [text],
    });
  }
  const [context, prompt, target, ...wrong] = choice;
  if (
    prompt.split("___").length !== 2 ||
    wrong.length !== 2 ||
    new Set([target, ...wrong]).size !== 3
  )
    throw Error(`Choice ${lesson.id}`);
  const sentence = prompt.replace("___", target);
  add(3, "choice", {
    category: lesson.grade >= 4 ? "tense" : "grammar",
    context,
    prompt,
    choices: [target, ...wrong],
    answers: [target],
    skill: plan.skill,
    modality: "recognition",
    family: `fact-${hash(norm(sentence)).slice(0, 16)}`,
    hint: plan.rule,
    explanation: `${sentence} ${context} ${plan.rule}`,
    solutionSentences: [sentence],
  });
  const [meaning, marked, replacement] = repair,
    match = marked.match(/^(.*?)\[([^\[\]]+)\](.*?)$/);
  if (!match || /[\[\]]/.test(match[3])) throw Error(`Repair ${lesson.id}`);
  const before = match[1].trim() ? tokens(match[1]) : [],
    after = match[3].trim() ? tokens(match[3]) : [],
    parts = [...before, match[2], ...after].map((text, i) => ({
      id: `p${i}`,
      text,
    })),
    partId = `p${before.length}`,
    corrected = join([...before, replacement, ...after]);
  const repairTargets = repairTarget
    ? [
        `workshop-target:${plan.repairSkill}:c${hash(repairTarget).slice(0, 12)}`,
      ]
    : [];
  add(6, "repair", {
    category: lesson.grade >= 4 ? "tense" : "grammar",
    context: meaning,
    prompt: "点选一处需要修改的词块，填写改后的词；只改这一处。",
    editing: { parts },
    repairs: [{ partId, replacements: [replacement] }],
    answers: [JSON.stringify([partId, norm(replacement)])],
    skill: plan.repairSkill,
    modality: "sentence-editing",
    family: `fact-${hash(norm(corrected)).slice(0, 16)}`,
    hint: plan.rule,
    explanation: `${corrected} ${meaning} ${plan.rule}`,
    solutionSentences: [corrected],
    evidenceTargets: repairTargets,
  });
  const groups = sorting.groups.map((label, i) => ({ id: `g${i}`, label })),
    cards = sorting.cards.map(([text, group]) => ({
      id: `c${hash(text).slice(0, 12)}`,
      text,
      group: `g${group}`,
    }));
  if (
    groups.length !== 2 ||
    cards.length !== 4 ||
    new Set(cards.map((c) => c.id)).size !== 4 ||
    cards.some((c) => !groups.some((g) => g.id === c.group))
  )
    throw Error(`Sorting ${lesson.id}`);
  const placements = Object.fromEntries(cards.map((c) => [c.id, c.group]));
  const solutions = cards.map(
    (c) => `${c.text} → ${groups.find((g) => g.id === c.group).label}`,
  );
  add(7, "sort", {
    category:
      lesson.grade === 3 || lesson.grade === 4
        ? "forms"
        : lesson.grade >= 5
          ? "tense"
          : "grammar",
    context: "看清两个篮子的意思，把四张卡片分好；可以改放，不计速度。",
    prompt: "先点卡片，再点篮子，全部放好后一起检查。",
    sorting: { cards: cards.map(({ group, ...card }) => card), groups },
    placements,
    answers: [
      JSON.stringify(
        Object.entries(placements).sort(([a], [b]) => a.localeCompare(b)),
      ),
    ],
    skill: plan.sortingSkill,
    modality: "rule-classification",
    family: `workshop-set-${hash(JSON.stringify([...solutions].sort())).slice(0, 16)}`,
    hint: plan.rule,
    explanation: solutions.join("；"),
    solutionSentences: solutions,
    evidenceTargets: cards.map(
      (c) => `workshop-target:${plan.sortingSkill}:${c.id}`,
    ),
  });
  const [fillContext, fillPrompt, answer] = fill,
    filled = fillPrompt.replace("___", answer);
  if (fillPrompt.split("___").length !== 2) throw Error(`Input ${lesson.id}`);
  add(8, "input", {
    category: lesson.grade >= 4 ? "tense" : "grammar",
    context: fillContext,
    prompt: fillPrompt,
    answers: [answer],
    skill: plan.skill,
    modality: "controlled-production",
    family: `fact-${hash(norm(filled)).slice(0, 16)}`,
    hint: plan.rule,
    explanation: `${filled} ${fillContext} ${plan.rule}`,
    solutionSentences: [filled],
  });
  const [orderContext, ordered] = ordering,
    alternatives = [ordered],
    matchTime = ordered.match(/^(.*?) (now|yesterday)\.$/);
  if (matchTime) {
    const [, clause, time] = matchTime;
    alternatives.push(`${time} ${clause}.`, `${time}, ${clause}.`);
    if (time === "now")
      alternatives.push(clause.replace(/\b(am|is|are)\b/, `$1 now`) + ".");
    else {
      const first = clause.indexOf(" ");
      if (first > 0)
        alternatives.push(
          `${clause.slice(0, first)} ${time} ${clause.slice(first + 1)}.`,
        );
    }
  }
  if (tokens(ordered).length > 17) throw Error(`Long order task ${lesson.id}`);
  add(9, "order", {
    category: lesson.grade >= 4 ? "tense" : "grammar",
    context: orderContext,
    prompt:
      lesson.grade >= 5
        ? "按要求先说背景，再用when接事件；词块末尾标点单独成块。"
        : "用词块表达给出的意思；末尾标点单独成块，时间短语按情景提示放置。",
    tokens: tokens(ordered).reverse(),
    punctuationTokens: true,
    answers: alternatives,
    skill: plan.skill,
    modality: "controlled-production",
    family: `fact-${hash(norm(ordered)).slice(0, 16)}`,
    hint: plan.rule,
    explanation: `${ordered} ${orderContext} ${plan.rule}`,
    solutionSentences: alternatives,
  });
  return {
    ...metadata,
    releaseId: id,
    unitTitle: unit.title,
    cards: plan.examples.map(([example, translation]) => ({
      title: lesson.title,
      rule: plan.rule,
      example,
      translation,
    })),
    vocabulary: plan.words.map(([word, meaning]) => ({ word, meaning })),
    task: "听读找依据，再分类、改一处句子、填词和拼句。是受控练习，不代替自由口语或写作。",
    topicIds: plan.topics,
    itemCount: 9,
  };
});
items.sort(
  (a, b) =>
    a.lessonId.localeCompare(b.lessonId) ||
    Number(a.id.match(/\.p(\d+)\./)[1]) - Number(b.id.match(/\.p(\d+)\./)[1]),
);
if (
  lessons.length !== 24 ||
  items.length !== 216 ||
  new Set(items.map((i) => i.family)).size !== 216
)
  throw Error(
    "Course coverage / repeated targets: " +
      JSON.stringify(
        items
          .filter(
            (item, index) =>
              items.findIndex((other) => other.family === item.family) !==
              index,
          )
          .map((item) => ({
            id: item.id,
            sameAs: items.find((other) => other.family === item.family).id,
          })),
      ),
  );
for (const lesson of lessons)
  for (const item of items.filter((i) => i.lessonId === lesson.id))
    if (
      item.solutionSentences.some((s) =>
        lesson.cards.some((c) => norm(c.example) === norm(s)),
      )
    )
      throw Error(`Demonstration reused as task ${item.id}`);
const manifestHash = hash(JSON.stringify({ lessons, items })),
  release = { id, version: 1, manifestHash, lessons, items };
const sql = [
  "-- Append fourth-unit lessons; seven supported modalities share existing grading and review.",
  `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
];
for (const lesson of lessons)
  sql.push(
    `INSERT INTO lessons VALUES(${quote(lesson.id)},1,'${id}',${lesson.grade},'A',4,${quote(lesson.title)},${quote(JSON.stringify(lesson))});`,
  );
for (const item of items) {
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
    version,
    ...publicData
  } = item;
  sql.push(
    `INSERT OR IGNORE INTO skills VALUES(${quote(skill)},${quote(skill.split(".")[0])},${quote(`${lessons.find((l) => l.id === lessonId).unitTitle} · ${item.type}`)});`,
    `INSERT INTO items VALUES(${quote(item.id)},1,${quote(lessonId)},1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, evidenceSolutions, placements, repairs, family, hint, explanation, solutionSentences, evidenceTargets }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(item.id)},1);`,
  );
}
const text = sql.join("\n") + "\n",
  path = "migrations/0023_action_courses_v1.sql",
  prior = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw Error("Immutable fourth-unit course changed.");
if (prior === null) await writeFile(path, text);
await writeContent(
  "content/action-course-release.v1.json",
  JSON.stringify(release),
);
const earlier = JSON.parse(
  await readFile("public/content/lessons.json", "utf8"),
);
await writeContent(
  "public/content/lessons.json",
  JSON.stringify({
    release: "course-catalog-v4",
    releases: [...earlier.releases.filter((r) => r !== id), id],
    lessons: [...earlier.lessons.filter((l) => l.releaseId !== id), ...lessons],
  }),
);
console.log(
  "Built 24 fourth-unit lessons / 216 mixed tasks (48 listening, 48 evidence reading, 24 each choice, editing, classification, input and ordering); catalog 96/288.",
);
