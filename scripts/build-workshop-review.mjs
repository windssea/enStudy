import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeContent } from "./content-write.mjs";
// Cambridge Dictionary accepts US "busses" alongside "buses".
// https://dictionary.cambridge.org/dictionary/english/bus
const source = JSON.parse(
    await readFile("content/workshop-release.v1.json", "utf8"),
  ),
  quote = (v) => `'${String(v).replaceAll("'", "''")}'`,
  id = "workshop-spelling-v2";
const original = source.items.find((i) => i.id === "workshop.plurals.repair.4");
if (!original || !original.solutionSentences[0].includes("buses"))
  throw new Error("Unexpected reviewed item.");
const revised = {
  ...original,
  version: 2,
  answers: [
    ...original.answers,
    JSON.stringify([original.repairs[0].partId, "busses"]),
  ],
  repairs: [
    {
      ...original.repairs[0],
      replacements: [...original.repairs[0].replacements, "busses"],
    },
  ],
  solutionSentences: [
    ...original.solutionSentences,
    original.solutionSentences[0].replace("buses", "busses"),
  ],
  explanation:
    original.explanation + " bus的常用复数是buses，也接受美式变体busses。",
};
const manifestHash = createHash("sha256")
    .update(JSON.stringify(revised))
    .digest("hex"),
  {
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
  } = revised;
const sql =
  [
    "-- Reviewed spelling addition. Original v1 items and historical receipts stay immutable.",
    `INSERT INTO content_releases VALUES('${id}','published','${manifestHash}',unixepoch()*1000);`,
    `INSERT INTO lessons VALUES('interactive.workshops',2,'${id}',1,'A',1,'互动工坊拼写修订','{}');`,
    `INSERT INTO items VALUES(${quote(revised.id)},2,'interactive.workshops',2,${quote(skill)},${quote(modality)},'repair',${quote(JSON.stringify(publicData))},${quote(JSON.stringify({ answers, placements, repairs, solutionSentences, evidenceTargets, explanation, hint, family, workshopId }))},'published');`,
    `INSERT INTO release_items VALUES('${id}',${quote(revised.id)},2);`,
  ].join("\n") + "\n";
const path = "migrations/0019_workshop_spelling_v2.sql",
  previous = await readFile(path, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
if (previous !== null && previous.replaceAll("\r\n", "\n") !== sql)
  throw new Error("Immutable workshop revision changed.");
if (previous === null) await writeFile(path, sql);
const latestItems = source.items.map((i) =>
  i.id === revised.id ? revised : i,
);
const catalogHash = createHash("sha256")
  .update(JSON.stringify({ workshops: source.workshops, items: latestItems }))
  .digest("hex");
await writeContent(
  "content/workshop-release.latest.json",
  JSON.stringify({
    ...source,
    id: "workshop-catalog-v2",
    manifestHash: catalogHash,
    releases: [source.id, id],
    items: latestItems,
  }),
);
console.log(
  "Appended one reviewed item version accepting buses / busses; original versions preserved.",
);
