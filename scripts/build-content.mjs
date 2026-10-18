import { readFile, mkdir, writeFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import "./build-course.mjs";
await import("./build-course-expansion.mjs");
await import("./build-course-targets.mjs");
// Sequenced after course generation: the topic snapshot imports its members.
await import("./build-topics.mjs");
await import("./build-patterns.mjs");
await import("./build-vocabulary.mjs");
await import("./build-workshops.mjs");
await import("./build-workshop-review.mjs");
await import("./build-story-courses.mjs");
await import("./build-word-listening.mjs");
await import("./build-action-courses.mjs");
await import("./build-action-course-review.mjs");
await import("./build-discovery-courses.mjs");
await import("./build-journey-courses.mjs");
await import("./build-next-term-courses.mjs");
await import("./build-concept-labs.mjs");
const readCSV = async (name) =>
  parse(
    await readFile(
      new URL(`../docs/curriculum/${name}`, import.meta.url),
      "utf8",
    ),
    { columns: true, skip_empty_lines: true, bom: true },
  );
const [units, topics, patterns] = await Promise.all(
  ["p1-p6-scope.csv", "topic-training-scope.csv", "sentence-patterns.csv"].map(
    readCSV,
  ),
);
if (units.length !== 72 || topics.length !== 60 || patterns.length !== 72)
  throw new Error(
    "Curriculum coverage changed: update the publication contract deliberately.",
  );
await mkdir("public/content", { recursive: true });
await writeFile(
  "public/content/catalog.json",
  JSON.stringify({ release: "planning-v0.3", units, topics, patterns }),
);
console.log(
  `Built public draft catalog: ${units.length} units, ${topics.length} topics, ${patterns.length} patterns. No private answers.`,
);
