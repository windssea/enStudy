import { createHash } from "node:crypto";

const markerPrefix = "EQ_AI_MANAGED_";
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
export function aiKeyStorePlan(raw, accountId, projectName, stage) {
  const invalid = () => {
    throw new Error("Invalid AI key-store deployment configuration.");
  };
  let bundle;
  try {
    bundle = JSON.parse(raw);
  } catch {
    invalid();
  }
  if (
    !object(bundle) ||
    bundle.schema !== 1 ||
    bundle.accountId !== accountId ||
    bundle.projectName !== projectName ||
    !/^[a-f0-9]{32}$/.test(accountId) ||
    !/^[a-z0-9][a-z0-9-]{1,60}$/.test(projectName) ||
    !["preview", "production"].includes(stage)
  )
    invalid();
  const stores = {};
  const seen = new Set();
  for (const env of ["preview", "production"]) {
    const s = bundle[env];
    if (
      !object(s) ||
      !object(s.keys) ||
      !/^[a-z0-9-]{1,32}$/.test(s.activeKeyId ?? "")
    )
      invalid();
    const ids = Object.keys(s.keys).sort();
    if (!ids.length || ids.length > 4 || !ids.includes(s.activeKeyId))
      invalid();
    const keys = {};
    for (const id of ids) {
      const value = s.keys[id];
      if (
        !/^[a-z0-9-]{1,32}$/.test(id) ||
        typeof value !== "string" ||
        !/^[A-Za-z0-9+/]{43}=$/.test(value)
      )
        invalid();
      const bytes = Buffer.from(value, "base64");
      if (
        bytes.length !== 32 ||
        bytes.toString("base64") !== value ||
        seen.has(value)
      )
        invalid();
      seen.add(value);
      keys[id] = value;
    }
    const canonical = JSON.stringify({ activeKeyId: s.activeKeyId, keys });
    const fingerprint = createHash("sha256").update(canonical).digest("hex");
    stores[env] = {
      activeKeyId: s.activeKeyId,
      keys,
      fingerprint,
      marker: markerPrefix + fingerprint,
    };
  }
  return stores[stage];
}

export async function configureCloudflareAi({
  env,
  project,
  stage,
  databaseId,
  fetcher = fetch,
}) {
  const raw = env.CLOUDFLARE_AI_KEYSTORES;
  if (!raw) {
    if (env.CLOUDFLARE_AI_KEYSTORES_REQUIRED === "true")
      throw new Error(
        "AI key-store deployment secret is required but missing.",
      );
    return { configured: false, operation: "not-requested" };
  }
  const plan = aiKeyStorePlan(
    raw,
    env.CLOUDFLARE_ACCOUNT_ID,
    project.projectName,
    stage,
  );
  if (!env.CLOUDFLARE_API_TOKEN)
    throw new Error("Cloudflare deployment credential is missing.");
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
      throw new Error(
        method === "PATCH"
          ? "AI secret update outcome is unknown; inspect metadata before another deployment."
          : "Could not read Cloudflare project metadata.",
      );
    }
    if (!r.ok || data.success !== true || !object(data.result))
      throw new Error(
        `Cloudflare AI configuration ${method} failed (${r.status}).`,
      );
    return data.result;
  }
  const before = await api("GET");
  const cfg = before.deployment_configs?.[stage];
  if (
    before.name !== project.projectName ||
    before.production_branch !== project.productionBranch ||
    cfg?.d1_databases?.DB?.id !== databaseId
  )
    throw new Error("AI configuration project or database identity mismatch.");
  const vars = cfg.env_vars ?? {};
  const hasStore = !!vars.AI_KEYRING || !!vars.AI_ACTIVE_KEY_ID;
  const managed = Object.keys(vars).filter((k) => k.startsWith(markerPrefix));
  // No blind replacement: a different/unknown ring could strand stored family keys.
  if ((hasStore || managed.length) && !managed.includes(plan.marker))
    throw new Error(
      "Existing AI key store is unmanaged or differs; refusing to replace it.",
    );
  if (
    vars[plan.marker]?.type === "secret_text" &&
    vars.AI_KEYRING?.type === "secret_text" &&
    vars.AI_ACTIVE_KEY_ID?.type === "secret_text"
  )
    return { configured: true, operation: "retained" };
  await api("PATCH", {
    deployment_configs: {
      [stage]: {
        env_vars: {
          AI_KEYRING: { type: "secret_text", value: JSON.stringify(plan.keys) },
          AI_ACTIVE_KEY_ID: { type: "secret_text", value: plan.activeKeyId },
          [plan.marker]: { type: "secret_text", value: "1" },
        },
        wrangler_config_hash: cfg.wrangler_config_hash,
      },
    },
  });
  const after = await api("GET");
  const saved = after.deployment_configs?.[stage]?.env_vars;
  if (
    after.name !== project.projectName ||
    after.deployment_configs?.[stage]?.d1_databases?.DB?.id !== databaseId ||
    ["AI_KEYRING", "AI_ACTIVE_KEY_ID", plan.marker].some(
      (k) => saved?.[k]?.type !== "secret_text",
    )
  )
    throw new Error(
      "AI secret metadata verification failed; deployment stopped.",
    );
  return { configured: true, operation: "installed" };
}
