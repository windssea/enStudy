import { describe, expect, it } from "vitest";
import {
  aiHostPlan,
  configureCloudflareAiHosts,
} from "../scripts/cloudflare-ai-hosts.mjs";
const project = { projectName: "english-quest-test", productionBranch: "main" };
const env = {
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "fake-token",
  CLOUDFLARE_AI_HOST_ALLOWLIST: "api.openai.com,speech.example.com",
};
function fixture() {
  const configs: any = {
    preview: {
      d1_databases: { DB: { id: "preview-db" } },
      env_vars: {
        AI_KEYRING: { type: "secret_text" },
        OTHER: { type: "plain_text", value: "keep" },
      },
      wrangler_config_hash: "keep-hash",
    },
    production: {
      d1_databases: { DB: { id: "production-db" } },
      env_vars: { OTHER: { type: "plain_text", value: "untouched" } },
    },
  };
  const calls: any[] = [];
  let failPatch = false;
  const fetcher: typeof fetch = async (_, options) => {
    const method = options?.method ?? "GET",
      body = options?.body ? JSON.parse(String(options.body)) : null;
    calls.push({ method, body });
    if (body) {
      for (const [stage, cfg] of Object.entries(body.deployment_configs) as [
        string,
        any,
      ][])
        Object.assign(configs[stage].env_vars, cfg.env_vars);
      if (failPatch) throw Error("private-error");
    }
    return Response.json({
      success: true,
      result: {
        name: project.projectName,
        production_branch: "main",
        deployment_configs: configs,
      },
    });
  };
  const configure = (extra = {}) =>
    configureCloudflareAiHosts({
      env,
      project,
      stage: "preview",
      databaseId: "preview-db",
      fetcher,
      ...extra,
    });
  return {
    configs,
    calls,
    configure,
    fail: () => {
      failPatch = true;
    },
  };
}
describe("private exact AI host deployment", () => {
  it("canonicalizes exact hosts without wildcard matching", () => {
    expect(
      aiHostPlan(" Speech.Example.com,api.openai.com,speech.example.com ")
        .value,
    ).toBe("api.openai.com,speech.example.com");
  });
  it.each([
    "",
    "*.example.com",
    "https://speech.example.com/v1",
    "127.0.0.1",
    "localhost",
    "a.internal",
    "a.example.com:443",
    "example.com/path",
    "x.example.com\nother.example.com",
  ])("rejects unsafe host configuration %s", (value) =>
    expect(() => aiHostPlan(value)).toThrow(),
  );
  it("does not contact Cloudflare when no host configuration is requested", async () => {
    const s = fixture();
    expect((await s.configure({ env: {} })).operation).toBe("not-requested");
    expect(s.calls).toHaveLength(0);
  });
  it("patches only selected environment hosts and retains encryption and other bindings", async () => {
    const s = fixture();
    expect((await s.configure()).operation).toBe("configured");
    const patch = s.calls.find((c) => c.method === "PATCH").body
      .deployment_configs;
    expect(Object.keys(patch)).toEqual(["preview"]);
    expect(patch.preview.wrangler_config_hash).toBe("keep-hash");
    expect(patch.preview.env_vars.AI_HOST_ALLOWLIST).toEqual({
      type: "secret_text",
      value: env.CLOUDFLARE_AI_HOST_ALLOWLIST,
    });
    expect(patch.preview.env_vars.AI_KEYRING).toBeUndefined();
    expect(s.configs.production.env_vars.OTHER.value).toBe("untouched");
    expect((await s.configure()).operation).toBe("retained");
    expect(s.calls.filter((c) => c.method === "PATCH")).toHaveLength(1);
  });
  it("refuses a different D1 before writing", async () => {
    const s = fixture();
    await expect(s.configure({ databaseId: "other-db" })).rejects.toThrow(
      "identity mismatch",
    );
    expect(s.calls.some((c) => c.method === "PATCH")).toBe(false);
  });
  it("does not repeat an unknown write and recovers from authoritative metadata", async () => {
    const s = fixture();
    s.fail();
    await expect(s.configure()).rejects.toThrow("outcome is unknown");
    expect(s.calls.filter((c) => c.method === "PATCH")).toHaveLength(1);
    expect((await s.configure()).operation).toBe("retained");
  });
});
