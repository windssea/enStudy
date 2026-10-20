import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";

const source = JSON.parse(
  await readFile("content/ket/source-2025.v1.json", "utf8"),
);
const variants = JSON.parse(
  await readFile("content/ket/variants.v1.json", "utf8"),
);
const authored = JSON.parse(
  await readFile("content/ket/reused-v1.json", "utf8"),
);
const lines = (text) =>
  text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split("|"));
for (const file of (await readdir("content/ket"))
  .filter((f) => f.startsWith("authored-") && f.endsWith(".tsv"))
  .sort())
  authored.push(...lines(await readFile(`content/ket/${file}`, "utf8")));
const byKey = new Map(authored.map((row) => [row[0], row]));
const sourceKeys = [...new Set(source.rows.map((r) => r.headword))];
if (
  source.rows.length !== 1727 ||
  sourceKeys.length !== 1725 ||
  byKey.size !== 1725 ||
  authored.length !== byKey.size
)
  throw Error(
    "KET source/authored inventory changed; publish another version.",
  );
if (
  sourceKeys.some((key) => !byKey.has(key)) ||
  [...byKey].some(([key]) => !sourceKeys.includes(key))
)
  throw Error("KET alphabetical coverage is incomplete.");
const words = sourceKeys.map((key, index) => {
  const [, meaning, example] = byKey.get(key);
  const spellings = variants[key] ?? [key];
  if (
    !meaning ||
    !example ||
    /[|<>]/.test(example) ||
    spellings.some((s) => /[()/]/.test(s))
  )
    throw Error(`Incomplete KET word ${key}`);
  const sourceRows = source.rows.filter((r) => r.headword === key);
  return {
    id: `ket.a${String(index + 1).padStart(4, "0")}`,
    word: spellings[0],
    meaning,
    example,
    alternatives: spellings.slice(1),
    section: "alphabet",
    headword: key,
    pos:
      { unfortunately: "adv", unhappy: "adj" }[key] ??
      [...new Set(sourceRows.map((r) => r.pos))].join(" / "),
    pages: [...new Set(sourceRows.map((r) => r.page))],
  };
});
const small = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const tens = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];
function number(n, and = true) {
  if (n === 1000) return "one thousand";
  if (n < 20) return small[n];
  if (n < 100)
    return tens[Math.floor(n / 10)] + (n % 10 ? `-${small[n % 10]}` : "");
  return `${small[Math.floor(n / 100)]} hundred${n % 100 ? `${and ? " and" : ""} ${number(n % 100, and)}` : ""}`;
}
const ordinalSmall = [
  "",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
];
const ordinal = (n) =>
  n <= 20
    ? ordinalSmall[n]
    : n === 30
      ? "thirtieth"
      : `${n < 30 ? "twenty" : "thirty"}-${ordinalSmall[n % 10]}`;
// 'one', 'first' and 'second' already have alphabetical cards. Do not duplicate them.
for (let n = 2; n <= 1000; n++) {
  const word = number(n);
  words.push({
    id: `ket.n${String(n).padStart(4, "0")}`,
    word,
    meaning: `数字 ${n}`,
    example: `The number on this card is ${word}.`,
    alternatives: [
      ...new Set([
        number(n, false),
        word.replaceAll("-", " "),
        number(n, false).replaceAll("-", " "),
      ]),
    ].filter((s) => s !== word),
    section: "numbers",
    headword: String(n),
    pos: "number",
    pages: [24],
  });
}
for (let n = 3; n <= 31; n++) {
  const word = ordinal(n);
  words.push({
    id: `ket.o${String(n).padStart(2, "0")}`,
    word,
    meaning: `第 ${n}（序数词）`,
    example: `This is the ${word} card in the set.`,
    alternatives: word.includes("-") ? [word.replaceAll("-", " ")] : [],
    section: "ordinals",
    headword: String(n),
    pos: "ordinal",
    pages: [24],
  });
}
for (const [index, [word, meaning, example]] of lines(
  await readFile("content/ket/appendix.v1.tsv", "utf8"),
).entries())
  words.push({
    id: `ket.g${String(index + 1).padStart(2, "0")}`,
    word,
    meaning,
    example,
    alternatives: [],
    section: "world",
    headword: word,
    pos: "proper name / adjective / language",
    pages: [24],
  });
const compact = {
  id: "ket-vocabulary-2025-v1",
  source: {
    edition: source.edition,
    url: source.url,
    sha256: source.sha256,
    alphabeticalRows: 1727,
    alphabeticalEntries: 1725,
    appendixEntries: words.length - 1725,
    appendixScope:
      "Numbers 1–1000; ordinals 1–31; days, months and seasons; seven continents; the eight named country/nationality pairs plus four English-speaking countries and English. Country sets are open-ended in the source.",
  },
  words,
};
await writeContent("content/ket/words.v1.json", JSON.stringify(compact) + "\n");
// Node 24 strips the erasable TypeScript. The worker imports exactly the same builder.
const { ketRelease } = await import("../packages/domain/ketVocabulary.ts");
const hash = createHash("sha256").update(JSON.stringify(compact)).digest("hex");
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const sql = [
  "-- Additive KET 2025 vocabulary. Existing word IDs and applied migrations stay unchanged.",
  `INSERT INTO content_releases VALUES('${compact.id}','published','${hash}',unixepoch()*1000);`,
];
function insert(prefix, rows) {
  let batch = [],
    size = prefix.length;
  for (const row of rows) {
    const bytes = Buffer.byteLength(row) + 2;
    if (batch.length && size + bytes > 70000) {
      sql.push(prefix + batch.join(",\n") + ";");
      batch = [];
      size = prefix.length;
    }
    batch.push(row);
    size += bytes;
  }
  if (batch.length) sql.push(prefix + batch.join(",\n") + ";");
}
insert(
  "INSERT INTO skills(id,kind,label) VALUES\n",
  words.map(
    (w) =>
      `(${q(`lexeme.word.${w.id}`)},'lexeme',${q(`${w.word} · ${w.meaning}`)})`,
  ),
);
// Core lessons require a storage grade. KET metadata uses grade=0 (exam scope),
// and these records never appear as school curriculum lessons or recommendations.
insert(
  "INSERT INTO lessons VALUES\n",
  ketRelease.themes.map(
    (t) =>
      `(${q(`words.${t.id}`)},1,'${compact.id}',1,'A',1,${q(t.title)},'{}')`,
  ),
);
insert(
  "INSERT INTO items VALUES\n",
  ketRelease.items.map((item) => {
    const {
      answers,
      hint,
      explanation,
      skill,
      modality,
      family,
      wordId,
      wordThemeId,
      wordMode,
      ...publicData
    } = item;
    return `(${q(item.id)},1,${q(`words.${wordThemeId}`)},1,${q(skill)},${q(modality)},${q(item.type)},${q(JSON.stringify(publicData))},${q(JSON.stringify({ answers, hint, explanation, family, wordId, wordMode }))},'published')`;
  }),
);
insert(
  "INSERT INTO release_items VALUES\n",
  ketRelease.items.map((i) => `('${compact.id}',${q(i.id)},1)`),
);
const migration = sql.join("\n") + "\n",
  path = "migrations/0050_ket_vocabulary_2025_v1.sql";
const previous = await readFile(path, "utf8").catch((e) => {
  if (e.code !== "ENOENT") throw e;
  return null;
});
if (previous !== null && previous.replaceAll("\r\n", "\n") !== migration)
  throw Error("Immutable KET migration changed.");
if (previous === null) await writeFile(path, migration);
await writeContent(
  "content/ket/release.v1.json",
  JSON.stringify({
    id: compact.id,
    manifestHash: hash,
    source: compact.source,
    totalWords: words.length,
    totalItems: ketRelease.items.length,
    themeCount: ketRelease.themes.length,
  }) + "\n",
);
console.log(
  `Built KET: ${words.length} cards, ${ketRelease.items.length} meaning/spelling tasks, ${ketRelease.themes.length} groups; all 1727 source rows mapped.`,
);
