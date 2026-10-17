import authored from "../content/workshops-v1.mjs";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { writeContent } from "./content-write.mjs";
const hash = (text) => createHash("sha256").update(text).digest("hex"),
  quote = (value) => `'${String(value).replaceAll("'", "''")}'`,
  id = "interactive-workshops-v1",
  items = [],
  workshops = [];
const pairs = (values) =>
  values.flatMap((a, i) => values.slice(i + 1).map((b) => [a, b]));
for (const bank of authored) {
  const groups = bank.groups.map((g, i) => ({ id: `g${i}`, label: g.label }));
  const flat = bank.groups.flatMap((g, i) =>
    g.cards.map((text) => ({
      id: `c${hash(text).slice(0, 12)}`,
      text,
      group: `g${i}`,
    })),
  );
  if (
    new Set(flat.map((c) => c.text)).size !== flat.length ||
    bank.repairs.length !== 8 ||
    flat.length < 8
  )
    throw new Error(`Invalid workshop source ${bank.id}`);
  let combinations = [[]];
  for (const group of groups) {
    const candidates = flat.filter((c) => c.group === group.id),
      subsets =
        groups.length === 4 ? candidates.map((c) => [c]) : pairs(candidates);
    combinations = combinations.flatMap((previous) =>
      subsets.map((set) => [...previous, ...set]),
    );
  }
  // Deterministic spread avoids selecting only the beginning of the source pools.
  const selected = Array.from(
    { length: 24 },
    (_, i) => combinations[Math.floor((i * combinations.length) / 24)],
  );
  if (
    new Set(
      selected.map((cards) =>
        cards
          .map((c) => c.id)
          .sort()
          .join(),
      ),
    ).size !== 24
  )
    throw new Error(`Insufficient distinct sorting sets ${bank.id}`);
  const base = {
    workshopId: bank.id,
    category:
      bank.id.includes("past") || bank.id === "perfect-or-past"
        ? "tense"
        : "grammar",
    title: bank.title,
    gradeMin: bank.grade,
    skill: bank.skill,
    hint: bank.rule,
    lessonId: "interactive.workshops",
    version: 1,
  };
  for (const [index, cards] of selected.entries()) {
    const placement = Object.fromEntries(cards.map((c) => [c.id, c.group])),
      solutionSentences = cards.map(
        (c) => `${c.text} → ${groups.find((g) => g.id === c.group).label}`,
      );
    items.push({
      ...base,
      id: `workshop.${bank.id}.sort.${index + 1}`,
      type: "sort",
      context:
        "把每张卡放进符合本组规则的篮子。可以改放，不计速度；全部放好后一起检查。",
      prompt: "先点一张卡，再点它的篮子。",
      sorting: { cards: cards.map(({ id, text }) => ({ id, text })), groups },
      placements: placement,
      answers: [
        JSON.stringify(
          Object.entries(placement).sort(([a], [b]) => a.localeCompare(b)),
        ),
      ],
      modality: "rule-classification",
      family: `workshop-set-${hash(
        cards
          .map((c) => c.id)
          .sort()
          .join(),
      ).slice(0, 16)}`,
      solutionSentences,
      evidenceTargets: cards.map(
        (c) => `workshop-target:${bank.skill}:${c.id}`,
      ),
      explanation: `${solutionSentences.join("；")}。${bank.rule}`,
    });
  }
  for (const [index, repair] of bank.repairs.entries()) {
    const match = repair.sentence.match(/^(.*?)\[([^\[\]]+)\](.*?)$/);
    if (
      !match ||
      !flat[repair.target] ||
      !repair.meaning ||
      !repair.replacement ||
      /[\[\]]/.test(match[3])
    )
      throw new Error(`Invalid repair ${bank.id}/${index}`);
    const before = match[1].trim().split(/\s+/).filter(Boolean),
      after = match[3]
        .trim()
        .replace(/([.,!?])/g, " $1")
        .trim()
        .split(/\s+/)
        .filter(Boolean),
      original = [...before, match[2], ...after];
    const parts = original.map((text, i) => ({ id: `p${i}`, text })),
      partId = `p${before.length}`,
      sentence = [...before, repair.replacement, ...after]
        .join(" ")
        .replace(/\s+([.,!?])/g, "$1");
    const replacements = repair.replacement.split(";");
    items.push({
      ...base,
      id: `workshop.${bank.id}.repair.${index + 1}`,
      type: "repair",
      context: `目标意思：${repair.meaning}${bank.id === "now-or-usually" && repair.target < 4 ? " 这里说的是长期固定习惯，不是临时安排。" : ""} 找到一处需要调整的词块，只改这一处。`,
      prompt: "点选一个词块，填写符合情境的新词或短语。",
      editing: { parts },
      repairs: [{ partId, replacements }],
      answers: replacements.map((text) =>
        JSON.stringify([partId, text.toLowerCase()]),
      ),
      modality: "sentence-editing",
      family: `workshop-sentence-${hash(sentence.toLowerCase()).slice(0, 16)}`,
      solutionSentences: [sentence],
      evidenceTargets: [
        `workshop-target:${bank.skill}:${flat[repair.target].id}`,
      ],
      explanation: `${sentence} ${repair.meaning} ${bank.rule}`,
    });
  }
  workshops.push({
    id: bank.id,
    title: bank.title,
    grade: bank.grade,
    description: "词句分类 + 单处修正；规则练习不等于自由表达。",
    rule: bank.rule,
    items: 32,
    counts: { sort: 24, repair: 8 },
  });
}
if (
  workshops.length !== 12 ||
  items.length !== 384 ||
  new Set(items.map((i) => i.id)).size !== 384
)
  throw new Error("Workshop coverage changed.");
const manifestHash = hash(JSON.stringify({ workshops, items })),
  release = { id, version: 1, manifestHash, workshops, items };
const sql = [
  "-- Append only: 12 workshops, 288 distinct classification sets, 96 authored editing sentences.",
  `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
  `INSERT INTO lessons VALUES('interactive.workshops',1,'${id}',1,'A',1,'互动工坊','{}');`,
];
for (const item of items) {
  const {
    answers,
    placements,
    repairs,
    solutionSentences,
    evidenceTargets,
    explanation,
    hint,
    skill,
    modality,
    family,
    lessonId,
    version,
    workshopId,
    ...publicData
  } = item;
  sql.push(
    `INSERT OR IGNORE INTO skills VALUES(${quote(skill)},${quote(skill.split(".")[0])},${quote(item.title)});`,
    `INSERT INTO items VALUES(${quote(item.id)},1,'interactive.workshops',1,${quote(skill)},${quote(modality)},${quote(item.type)},${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, placements, repairs, solutionSentences, evidenceTargets, explanation, hint, family, workshopId }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(item.id)},1);`,
  );
}
const text = sql.join("\n") + "\n",
  path = "migrations/0018_interactive_workshops.sql",
  prior = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
if (prior !== null && prior.replaceAll("\r\n", "\n") !== text)
  throw new Error("Immutable workshop content changed. Publish a new version.");
if (prior === null) await writeFile(path, text);
await writeContent("content/workshop-release.v1.json", JSON.stringify(release));
await writeContent(
  "public/content/workshops.json",
  JSON.stringify({ release: id, workshops }),
);
console.log(
  `Built ${workshops.length} interactive banks / ${items.length} tasks (288 classification sets + 96 editing sentences).`,
);
