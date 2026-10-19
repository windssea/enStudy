import { createHash } from "node:crypto";

// A deployment secret supplies exact hosts. Never bundle this tenant-specific
// configuration into Vite assets, command arguments or deployment logs.
export function aiHostPlan(raw) {
  if (typeof raw !== "string" || raw.length > 2000)
    throw Error("Invalid AI host configuration.");
  const hosts = [
    ...new Set(raw.split(",").map((s) => s.trim().toLowerCase())),
  ].sort();
  if (
    !hosts.length ||
    hosts.length > 10 ||
    hosts.some(
      (h) =>
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) ||
        /(?:^|\.)(?:localhost|local|internal|test|invalid|onion)$/.test(h),
    )
  )
    throw Error("Invalid AI host configuration.");
  const value = hosts.join(",");
  return {
    value,
    fingerprint: createHash("sha256").update(value).digest("hex"),
  };
}

export async function configureCloudflareAiHosts({
  env,
  project,
  stage,
  databaseId,
  fetcher = fetch,
}) {
  if (!env.CLOUDFLARE_AI_HOST_ALLOWLIST) return { operation: "not-requested" };
  const plan = aiHostPlan(env.CLOUDFLARE_AI_HOST_ALLOWLIST);
  if (
    !/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID ?? "") ||
    !/^[a-z0-9][a-z0-9-]{1,60}$/.test(project.projectName) ||
    !["preview", "production"].includes(stage) ||
    !env.CLOUDFLARE_API_TOKEN
  )
    throw Error("Missing AI host deployment identity.");
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${project.projectName}`;
  async function api(method, body) {
    let r, data;
    try {
      r = await fetcher(url, {
        method,
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000),
      });
      data = await r.json();
    } catch {
      throw Error(
        method === "PATCH"
          ? "AI host update outcome is unknown; inspect metadata before retrying."
          : "Cannot read AI host deployment metadata.",
      );
    }
    if (!r.ok || data.success !== true || !data.result)
      throw Error(`AI host configuration ${method} failed (${r.status}).`);
    const cfg = data.result.deployment_configs?.[stage];
    if (
      data.result.name !== project.projectName ||
      data.result.production_branch !== project.productionBranch ||
      cfg?.d1_databases?.DB?.id !== databaseId
    )
      throw Error("AI host project or database identity mismatch.");
    return cfg;
  }
  const before = await api("GET"),
    vars = before.env_vars ?? {};
  const matches = (v) =>
    v.AI_HOST_ALLOWLIST?.type === "secret_text" &&
    v.EQ_AI_HOSTS_SHA256?.value === plan.fingerprint;
  if (matches(vars)) return { operation: "retained" };
  await api("PATCH", {
    deployment_configs: {
      [stage]: {
        env_vars: {
          AI_HOST_ALLOWLIST: { type: "secret_text", value: plan.value },
          EQ_AI_HOSTS_SHA256: { type: "plain_text", value: plan.fingerprint },
        },
        wrangler_config_hash: before.wrangler_config_hash,
      },
    },
  });
  const after = await api("GET");
  if (!matches(after.env_vars ?? {}))
    throw Error("AI host configuration verification failed.");
  for (const [name, binding] of Object.entries(vars)) {
    if (["AI_HOST_ALLOWLIST", "EQ_AI_HOSTS_SHA256"].includes(name) || !binding)
      continue;
    const saved = after.env_vars?.[name];
    if (
      !saved ||
      saved.type !== binding.type ||
      (binding.type === "plain_text" && saved.value !== binding.value)
    )
      throw Error(
        "An unrelated AI deployment binding changed; stopping before migration.",
      );
  }
  return { operation: "configured" };
}
