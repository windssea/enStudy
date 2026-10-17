import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  mkdtempSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const invoke = (...args: string[]) =>
  spawnSync(process.execPath, ["scripts/cloudflare.mjs", ...args], {
    encoding: "utf8",
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: "" },
  });
describe("cloud resource guardrails", () => {
  it("validates isolated production bindings and selects main", () => {
    const code = `
      import assert from 'node:assert/strict';
      import { deploymentTarget } from './scripts/cloudflare-target.mjs';
      const project={projectName:'english-quest-dev',databaseName:'english-quest-dev-db',productionDatabaseName:'english-quest-prod-db',productionBranch:'main',previewBranch:'development'};
      const preview={vars:{APP_STAGE:'preview',ALLOW_DEV_AUTH:'false'},d1_databases:[{binding:'DB',database_name:project.databaseName,database_id:'11111111-1111-4111-8111-111111111111'}]};
      const production={vars:{APP_STAGE:'production',ALLOW_DEV_AUTH:'false'},d1_databases:[{binding:'DB',database_name:project.productionDatabaseName,database_id:'22222222-2222-4222-8222-222222222222'}]};
      const root={name:project.projectName,...preview,env:{production}};
      assert.equal(deploymentTarget(root,project,true).branch,'main');
      assert.equal(deploymentTarget(root,project).branch,'development');
      assert.throws(()=>deploymentTarget({...root,env:{}},project,true),/explicit configuration/);
      assert.throws(()=>deploymentTarget({...root,env:{production:{...production,d1_databases:[{...production.d1_databases[0],database_id:preview.d1_databases[0].database_id}]}}},project,true),/different D1/);
      assert.throws(()=>deploymentTarget({...root,env:{production:{...production,vars:{APP_STAGE:'production',ALLOW_DEV_AUTH:'true'}}}},project,true),/Unsafe/);
      assert.throws(()=>deploymentTarget({...root,env:{production:{...production,vars:{APP_STAGE:'preview',ALLOW_DEV_AUTH:'false'}}}},project,true),/Unsafe/);
    `;
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", code],
      { encoding: "utf8" },
    );
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });
  it("recognizes the actual Wrangler Pages JSON display headings", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import { pagesProjectNames } from './scripts/cloudflare-output.mjs'; console.log(JSON.stringify(pagesProjectNames(JSON.parse(process.argv[1]))));",
        JSON.stringify([
          {
            "Project Name": "english-quest-dev",
            "Project Domains": "english-quest-dev.pages.dev",
          },
        ]),
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(["english-quest-dev"]);
  });
  it("rejects unknown Pages list formats instead of treating resources as absent", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import { pagesProjectNames } from './scripts/cloudflare-output.mjs'; pagesProjectNames([{ unexpected: 'value' }]);",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Unknown Pages project list format");
  });
  it.each([
    ['{ // comment\n "vars": {}, }', true],
    ['{"vars": BROKEN }', false],
    ["null", false],
  ])("validates JSONC before cloud operations: %s", (source, valid) => {
    const directory = mkdtempSync(join(tmpdir(), "english-quest-config-"));
    try {
      writeFileSync(
        join(directory, "cloudflare.project.json"),
        readFileSync("cloudflare.project.json"),
      );
      writeFileSync(join(directory, "wrangler.jsonc"), source as string);
      const result = spawnSync(
        process.execPath,
        [resolve("scripts/cloudflare.mjs"), "plan"],
        {
          cwd: directory,
          encoding: "utf8",
          env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: "" },
        },
      );
      expect(result.status === 0).toBe(valid);
      if (!valid) expect(result.stderr).toContain("Invalid wrangler.jsonc");
    } finally {
      unlinkSync(join(directory, "cloudflare.project.json"));
      unlinkSync(join(directory, "wrangler.jsonc"));
      rmdirSync(directory);
    }
  });
  it("provides a credential-free free-first plan", () => {
    const result = invoke("plan");
    expect(result.status).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.creates.map((r: { type: string }) => r.type)).toEqual([
      "D1",
      "Pages Direct Upload",
    ]);
    expect(plan.developmentIdentity).toBe(false);
    expect(plan.disabled).toContain("paid-plan activation");
  });
  it("does not mutate config without the explicit apply flag", () => {
    const before = readFileSync("wrangler.jsonc", "utf8");
    const result = invoke("provision");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).stage).toBe("preview");
    expect(readFileSync("wrangler.jsonc", "utf8")).toBe(before);
  });
  it("rejects missing account selection before any cloud command", () => {
    const before = readFileSync("wrangler.jsonc", "utf8");
    const result = invoke("provision", "--apply");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Set CLOUDFLARE_ACCOUNT_ID");
    expect(readFileSync("wrangler.jsonc", "utf8")).toBe(before);
  });
});
