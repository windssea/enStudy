import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { run } from "./runtime.mjs";
import { prepareLocalAi } from "./prepare-local-ai.mjs";
const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );
if (!(await exists(".dev.vars")))
  await writeFile(".dev.vars", await readFile(".dev.vars.example", "utf8"));
await prepareLocalAi();
await mkdir(".wrangler", { recursive: true });
run(["d1", "migrations", "apply", "DB", "--local"]);
const samples = JSON.parse(await readFile("content/exercises.json", "utf8"));
const sql = (value) => `'${String(value).replaceAll("'", "''")}'`;
const now = Date.now();
const statements = [
  `INSERT OR IGNORE INTO adults VALUES('dev-adult','development-only',${now});`,
  `INSERT OR IGNORE INTO content_releases VALUES('dev-samples-v1','published','local-samples-v1',${now});`,
  `INSERT OR IGNORE INTO lessons VALUES('dev.samples',1,'dev-samples-v1',1,'A',1,'开发样课','{}');`,
];
for (const family of ["a", "b"]) {
  statements.push(
    `INSERT OR IGNORE INTO households VALUES('dev-family-${family}','开发家庭${family.toUpperCase()}',${now});`,
  );
  statements.push(
    `INSERT OR IGNORE INTO household_members VALUES('dev-family-${family}','dev-adult','owner');`,
  );
  for (const child of [1, 2]) {
    const nickname =
      family === "a"
        ? ["乐乐", "小雨"][child - 1]
        : ["小河", "小树"][child - 1];
    statements.push(
      `INSERT OR IGNORE INTO children(id,household_id,nickname,grade,created_at) VALUES('dev-child-${family}${child}','dev-family-${family}',${sql(nickname)},${child === 1 ? 3 : 1},${now});`,
    );
  }
}
for (const exercise of samples) {
  statements.push(
    `INSERT OR IGNORE INTO skills VALUES(${sql(exercise.skill)},${sql(exercise.skill.split(".")[0])},${sql(exercise.title)});`,
  );
  const { answers, hint, explanation, skill, modality, ...publicData } =
    exercise;
  statements.push(
    `INSERT OR IGNORE INTO items VALUES(${sql(exercise.id)},1,'dev.samples',1,${sql(skill)},${sql(modality)},${sql(exercise.type)},${sql(JSON.stringify(publicData))},${sql(JSON.stringify({ answers }))},'published');`,
  );
}
await writeFile(".wrangler/development-seed.sql", statements.join("\n"));
run([
  "d1",
  "execute",
  "DB",
  "--local",
  "--file",
  ".wrangler/development-seed.sql",
]);
console.log(
  "Local D1 ready: 2 fictional households, 4 children, 8 developer sample items. No cloud resources created.",
);
