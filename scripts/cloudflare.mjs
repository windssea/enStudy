import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { run } from "./runtime.mjs";
import { parse, printParseErrorCode } from "jsonc-parser";
import { pagesProjectNames } from "./cloudflare-output.mjs";
import { deploymentTarget } from "./cloudflare-target.mjs";
const action = process.argv[2] ?? "plan";
const apply = process.argv.includes("--apply");
const production = process.argv.includes("--production");
const project = JSON.parse(await readFile("cloudflare.project.json", "utf8"));
const stage = production ? "production" : "preview";
const databaseName = production
  ? project.productionDatabaseName
  : project.databaseName;
// Validate local configuration before any resource can be created.
const configErrors = [];
const rootConfig = parse(
  await readFile("wrangler.jsonc", "utf8"),
  configErrors,
  {
    allowTrailingComma: true,
  },
);
if (
  configErrors.length ||
  !rootConfig ||
  Array.isArray(rootConfig) ||
  typeof rootConfig !== "object"
)
  throw new Error(
    `Invalid wrangler.jsonc: ${configErrors.map((error) => `${printParseErrorCode(error.error)} at ${error.offset}`).join(", ") || "expected an object"}`,
  );
for (const field of [
  "projectName",
  "databaseName",
  "productionDatabaseName",
  "productionBranch",
  "previewBranch",
])
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(project[field]))
    throw new Error(`Invalid ${field}`);
if (
  project.paidServicesAllowed !== false ||
  project.services.join(",") !== "pages,functions,d1"
)
  throw new Error(
    "This bootstrap supports the explicit Pages + Functions + D1 free-first scope only.",
  );
const plan = {
  creates: [
    { type: "D1", name: databaseName },
    { type: "Pages Direct Upload", name: project.projectName },
  ],
  disabled: [
    "R2",
    "KV",
    "Queues",
    "Durable Objects",
    "Workers AI",
    "paid-plan activation",
  ],
  stage,
  developmentIdentity: false,
  requiredEnvironment: ["CLOUDFLARE_ACCOUNT_ID"],
  commands: [
    "npm run cf:whoami",
    "npx wrangler login (only if not authenticated)",
    production
      ? "npm run cf:provision:production -- --apply"
      : "npm run cf:provision -- --apply",
    "npm run build",
    production
      ? "npm run cf:deploy:production -- --apply"
      : "npm run cf:deploy:preview -- --apply",
  ],
  note: "Uses explicit account selection and separate preview/production databases. Existing account plan and combined account usage still matter. Never upgrades a plan or activates billing.",
};
if (action === "plan" || !apply) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}
if (!["provision", "deploy"].includes(action))
  throw new Error("Use plan, provision or deploy.");
if (!/^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID ?? ""))
  throw new Error(
    "Set CLOUDFLARE_ACCOUNT_ID to your intended 32-character account ID before applying. Never paste API tokens into project files.",
  );
const jsonOutput = (text) => {
  const start = text.indexOf("["),
    end = text.lastIndexOf("]");
  if (start === -1 || end === -1)
    throw new Error(
      "Unexpected Wrangler JSON output; stop before making another resource.",
    );
  return JSON.parse(text.slice(start, end + 1));
};
await mkdir(".cloudflare", { recursive: true });
const statePath = production
  ? ".cloudflare/resources.production.local.json"
  : ".cloudflare/resources.local.json";
if (action === "provision") {
  const identity = run(["whoami"], { capture: true });
  if (/not authenticated|not logged in/i.test(identity))
    throw new Error(
      "Cloudflare login required. Run npm exec wrangler login in your own terminal, then retry.",
    );
  const priorState = await readFile(statePath, "utf8").then(
    JSON.parse,
    () => null,
  );
  if (
    priorState?.accountId &&
    priorState.accountId !== process.env.CLOUDFLARE_ACCOUNT_ID
  )
    throw new Error(
      "This checkout is registered to a different account. Use a separate checkout or reconcile resource ownership before applying.",
    );
  let databases = jsonOutput(run(["d1", "list", "--json"], { capture: true }));
  let database = databases.find((row) => row.name === databaseName);
  if (
    database &&
    priorState?.databaseId !== database.uuid &&
    !process.argv.includes("--reuse-existing")
  )
    throw new Error(
      "A database with this name already exists but is not registered to this checkout. Choose distinct names or explicitly use --reuse-existing after review.",
    );
  if (!database) {
    if (databases.length >= 10)
      throw new Error(
        "Free-first guard: account already has 10 or more D1 databases; no new resource or plan upgrade attempted.",
      );
    run(["d1", "create", databaseName]);
    databases = jsonOutput(run(["d1", "list", "--json"], { capture: true }));
    database = databases.find((row) => row.name === databaseName);
  }
  if (!database?.uuid)
    throw new Error(
      "D1 creation could not be verified. Inspect the account before retrying.",
    );
  await writeFile(
    statePath,
    JSON.stringify(
      {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        projectName: project.projectName,
        databaseName,
        databaseId: database.uuid,
        pagesVerified: Boolean(
          priorState?.pagesVerified &&
          priorState.projectName === project.projectName,
        ),
      },
      null,
      2,
    ),
  );
  const projects = jsonOutput(
    run(["pages", "project", "list", "--json"], { capture: true }),
  );
  const existing = pagesProjectNames(projects).includes(project.projectName);
  if (
    existing &&
    !(
      priorState?.pagesVerified &&
      priorState.projectName === project.projectName
    ) &&
    !process.argv.includes("--reuse-existing")
  )
    throw new Error(
      "A Pages project with this name already exists. Review ownership and use a distinct name or --reuse-existing.",
    );
  if (!existing)
    run([
      "pages",
      "project",
      "create",
      project.projectName,
      "--production-branch",
      project.productionBranch,
    ]);
  const verified = jsonOutput(
    run(["pages", "project", "list", "--json"], { capture: true }),
  );
  if (!pagesProjectNames(verified).includes(project.projectName))
    throw new Error(
      "Pages creation could not be verified; reconcile the account before retrying.",
    );
  const environment = {
    vars: { APP_STAGE: stage, ALLOW_DEV_AUTH: "false" },
    d1_databases: [
      {
        binding: "DB",
        database_name: databaseName,
        database_id: database.uuid,
        migrations_dir: "migrations",
      },
    ],
  };
  const config = {
    ...rootConfig,
    name: project.projectName,
    pages_build_output_dir: "./dist",
    ...(!production ? environment : {}),
    env: {
      ...rootConfig.env,
      [production ? "production" : "preview"]: environment,
    },
  };
  deploymentTarget(config, project, production);
  await writeFile("wrangler.jsonc", JSON.stringify(config, null, 2));
  await writeFile(
    statePath,
    JSON.stringify(
      {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        projectName: project.projectName,
        databaseName,
        databaseId: database.uuid,
        pagesVerified: true,
      },
      null,
      2,
    ),
  );
  console.log(
    `Verified D1 and Pages project. ${stage} configuration written. No deployment performed.`,
  );
} else {
  await access("dist/index.html");
  const target = deploymentTarget(rootConfig, project, production);
  const config = target.config;
  let state;
  if (process.argv.includes("--ci")) {
    if (process.env.GITHUB_ACTIONS !== "true")
      throw new Error("--ci requires the GitHub Actions environment.");
    const databases = jsonOutput(
      run(["d1", "list", "--json"], { capture: true }),
    );
    const database = databases.find((row) => row.name === databaseName);
    const projects = jsonOutput(
      run(["pages", "project", "list", "--json"], { capture: true }),
    );
    state = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      projectName: project.projectName,
      databaseId: database?.uuid,
      pagesVerified: pagesProjectNames(projects).includes(project.projectName),
    };
  } else {
    await access(statePath);
    state = JSON.parse(await readFile(statePath, "utf8"));
  }
  if (
    state.accountId !== process.env.CLOUDFLARE_ACCOUNT_ID ||
    state.projectName !== project.projectName ||
    state.databaseId !== config.d1_databases?.[0]?.database_id ||
    !state.pagesVerified
  )
    throw new Error(
      "Account, project or database identity does not match the provisioned resources.",
    );
  if (
    config.vars?.ALLOW_DEV_AUTH !== "false" ||
    config.vars?.APP_STAGE !== stage ||
    config.name !== project.projectName ||
    !config.d1_databases?.[0]?.database_id ||
    config.d1_databases[0].database_id.startsWith("00000000")
  )
    throw new Error("Unsafe or unprovisioned remote configuration.");
  run([
    "d1",
    "migrations",
    "apply",
    "DB",
    "--remote",
    ...(rootConfig.env?.[stage] ? ["--env", stage] : []),
  ]);
  run([
    "pages",
    "deploy",
    "dist",
    "--project-name",
    project.projectName,
    "--branch",
    target.branch,
  ]);
}
