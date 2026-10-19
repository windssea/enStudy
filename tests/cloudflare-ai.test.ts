import { describe, expect, it } from "vitest";
import {
  aiKeyStorePlan,
  configureCloudflareAi,
} from "../scripts/cloudflare-ai.mjs";
const accountId = "a".repeat(32),
  project = { projectName: "english-quest-test", productionBranch: "main" };
const bundle = () => ({
  schema: 1,
  accountId,
  projectName: project.projectName,
  preview: {
    activeKeyId: "preview-v1",
    keys: { "preview-v1": Buffer.alloc(32, 1).toString("base64") },
  },
  production: {
    activeKeyId: "production-v1",
    keys: { "production-v1": Buffer.alloc(32, 2).toString("base64") },
  },
});
const raw = () => JSON.stringify(bundle());
const env = () => ({
  CLOUDFLARE_ACCOUNT_ID: accountId,
  CLOUDFLARE_API_TOKEN: "fake-deployment-token",
  CLOUDFLARE_AI_KEYSTORES: raw(),
  CLOUDFLARE_AI_KEYSTORES_REQUIRED: "true",
});
function server(initial: Record<string, unknown> = {}, failPatch = false) {
  const data: any = {
    name: project.projectName,
    production_branch: "main",
    deployment_configs: {
      preview: {
        d1_databases: { DB: { id: "preview-db" } },
        wrangler_config_hash: "keep-config",
        env_vars: { OTHER: { type: "secret_text" }, ...initial },
      },
      production: {
        d1_databases: { DB: { id: "production-db" } },
        env_vars: {},
      },
    },
  };
  const calls: { method: string; body: any }[] = [];
  const fetcher: typeof fetch = async (_url, options) => {
    const method = options?.method ?? "GET",
      body = options?.body ? JSON.parse(String(options.body)) : null;
    calls.push({ method, body });
    if (method === "PATCH") {
      Object.assign(
        data.deployment_configs.preview.env_vars,
        body.deployment_configs.preview.env_vars,
      );
      if (failPatch) throw Error("private-upstream-body");
    }
    return Response.json({ success: true, result: data });
  };
  return { data, calls, fetcher };
}
const configure = (s: ReturnType<typeof server>, extra = {}) =>
  configureCloudflareAi({
    env: env(),
    project,
    stage: "preview",
    databaseId: "preview-db",
    fetcher: s.fetcher,
    ...extra,
  });
describe("managed Cloudflare AI secrets", () => {
  it("keeps independent canonical key rings and stable ownership markers", () => {
    const p = aiKeyStorePlan(raw(), accountId, project.projectName, "preview"),
      q = aiKeyStorePlan(raw(), accountId, project.projectName, "production");
    expect(p.fingerprint).not.toBe(q.fingerprint);
    expect(p.keys[p.activeKeyId]).not.toBe(q.keys[q.activeKeyId]);
    expect(
      aiKeyStorePlan(
        JSON.stringify(JSON.parse(raw())),
        accountId,
        project.projectName,
        "preview",
      ).marker,
    ).toBe(p.marker);
    expect(p.marker).toMatch(/^EQ_AI_MANAGED_[a-f0-9]{64}$/);
  });
  it.each([
    "wrong-size",
    "same-key",
    "missing-active",
    "invalid-base64",
    "wrong-project",
    "wrong-account",
  ])("rejects %s before any cloud request", (kind) => {
    const b: any = bundle();
    if (kind === "wrong-size")
      b.preview.keys["preview-v1"] = Buffer.alloc(31).toString("base64");
    if (kind === "same-key")
      b.production.keys["production-v1"] = b.preview.keys["preview-v1"];
    if (kind === "missing-active") b.preview.activeKeyId = "absent";
    if (kind === "invalid-base64")
      b.preview.keys["preview-v1"] = "private-invalid-key";
    if (kind === "wrong-project") b.projectName = "other-project";
    if (kind === "wrong-account") b.accountId = "b".repeat(32);
    expect(() =>
      aiKeyStorePlan(
        JSON.stringify(b),
        accountId,
        project.projectName,
        "preview",
      ),
    ).toThrow("Invalid AI key-store deployment configuration.");
  });
  it("writes only three encrypted bindings in the selected environment, preserving config and D1", async () => {
    const s = server(),
      result = await configure(s);
    expect(result.operation).toBe("installed");
    const body = s.calls.find((c) => c.method === "PATCH")!.body;
    expect(Object.keys(body.deployment_configs)).toEqual(["preview"]);
    expect(Object.keys(body.deployment_configs.preview)).toEqual([
      "env_vars",
      "wrangler_config_hash",
    ]);
    expect(body.deployment_configs.preview.wrangler_config_hash).toBe(
      "keep-config",
    );
    expect(
      Object.values(body.deployment_configs.preview.env_vars).every(
        (v: any) => v.type === "secret_text",
      ),
    ).toBe(true);
    expect(s.data.deployment_configs.preview.env_vars.OTHER).toEqual({
      type: "secret_text",
    });
    expect(s.data.deployment_configs.production.env_vars).toEqual({});
  });
  it("repeated deployment retains the known ring without a write", async () => {
    const s = server();
    await configure(s);
    s.calls.length = 0;
    expect((await configure(s)).operation).toBe("retained");
    expect(s.calls.map((c) => c.method)).toEqual(["GET"]);
  });
  it.each([{}, { EQ_AI_MANAGED_unknown: { type: "secret_text" } }])(
    "refuses an unknown existing encryption store",
    async (extra) => {
      const s = server({ AI_KEYRING: { type: "secret_text" }, ...extra });
      await expect(configure(s)).rejects.toThrow("refusing to replace");
      expect(s.calls.some((c) => c.method === "PATCH")).toBe(false);
    },
  );
  it("stops before changing a different database", async () => {
    const s = server();
    s.data.deployment_configs.preview.d1_databases.DB.id = "other-db";
    await expect(configure(s)).rejects.toThrow("identity mismatch");
    expect(s.calls.some((c) => c.method === "PATCH")).toBe(false);
  });
  it("requires the deployment secret when enabled and never contacts Cloudflare without it", async () => {
    const s = server();
    await expect(
      configure(s, { env: { ...env(), CLOUDFLARE_AI_KEYSTORES: undefined } }),
    ).rejects.toThrow("required but missing");
    expect(s.calls).toHaveLength(0);
  });
  it("does not retry an unknown PATCH outcome, then recovers from authoritative metadata", async () => {
    const s = server({}, true);
    await expect(configure(s)).rejects.toThrow("outcome is unknown");
    expect(s.calls.filter((c) => c.method === "PATCH")).toHaveLength(1);
    expect((await configure(s)).operation).toBe("retained");
    expect(s.calls.filter((c) => c.method === "PATCH")).toHaveLength(1);
  });
});
