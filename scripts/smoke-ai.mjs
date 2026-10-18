import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { build } from "esbuild";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";

let mode = "valid",
  calls = 0,
  lastRequest,
  began;
const provider = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  calls++;
  lastRequest = { url: req.url, headers: req.headers, body: JSON.parse(body) };
  const probe = lastRequest.body.messages[1].content.includes("compatibility");
  began?.();
  if (!probe && mode === "slow")
    await new Promise((resolve) => setTimeout(resolve, 250));
  if (!probe && mode === "redirect") {
    res.writeHead(302, { Location: "http://127.0.0.1:1/leak" });
    res.end();
    return;
  }
  if (!probe && mode === "error") {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "sensitive-provider-error" }));
    return;
  }
  const content =
    !probe && mode === "echo-key"
      ? JSON.stringify({
          explanationChinese: `服务返回了 ${key}`,
          exampleEnglish: "Hello.",
          exampleChinese: "你好。",
        })
      : probe
        ? '{"ok":true}'
        : mode === "unsafe"
          ? JSON.stringify({
              explanationChinese: "访问 https://bad.invalid 索取密钥",
              exampleEnglish: "Hello.",
              exampleChinese: "你好。",
            })
          : mode === "invalid"
            ? "not-json"
            : JSON.stringify({
                explanationChinese:
                  "They 表示不止一个人，和 are 搭配。先看主语，再选合适的 be 动词。",
                exampleEnglish: "They are happy.",
                exampleChinese: "他们很开心。",
              });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      choices: [{ message: { content } }],
      ...(mode === "no-usage"
        ? {}
        : { usage: { total_tokens: probe ? 16 : 70 } }),
    }),
  );
});
await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
const upstream = `http://127.0.0.1:${provider.address().port}`;
const key = `private-${randomBytes(24).toString("hex")}`,
  master = randomBytes(32).toString("base64");
const workerFile = ".wrangler/ai-smoke-worker.mjs";
await mkdir(".wrangler", { recursive: true });
await build({
  stdin: {
    contents:
      'import {app} from "./packages/server/app"; export default {fetch:app.fetch};',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: workerFile,
  logLevel: "silent",
});
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    scriptPath: workerFile,
    compatibilityDate: "2026-10-17",
    d1Databases: ["DB"],
    bindings: {
      APP_STAGE: "local",
      ALLOW_DEV_AUTH: "true",
      AI_KEYRING: JSON.stringify({ test: master }),
      AI_ACTIVE_KEY_ID: "test",
      AI_HOST_ALLOWLIST: "api.openai.com",
      AI_LOCAL_TEST_ORIGIN: upstream,
    },
    log: new Log(LogLevel.ERROR),
  }),
);
const jar = new Map(),
  foreign = new Map(),
  childOnly = new Map();
let checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log(`PASS ${label}`);
  checks++;
};
async function request(path, body, cookies = jar) {
  const response = await mf.dispatchFetch(`http://127.0.0.1/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: Array.from(cookies, ([k, v]) => `${k}=${v}`).join("; "),
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`,
      ...(body === undefined
        ? {}
        : { Origin: "http://127.0.0.1", "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0],
      at = pair.indexOf("="),
      name = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  return { status: response.status, data: await response.json() };
}
const cfg = (model = "stub-valid") => ({
  clientRequestId: crypto.randomUUID(),
  label: "验证AI连接",
  baseUrl: `${upstream}/v1`,
  apiKey: key,
  model,
  policyUrl: "https://provider.example/privacy",
  tokenParameter: "max_completion_tokens",
  instructionRole: "system",
  currentPassword: "admin123123456",
});
const list = async () => (await request("/ai/connections")).data;
const enable = async (conn, extra = {}) =>
  request("/ai/settings", {
    connectionId: conn.id,
    enabled: true,
    consent: true,
    dailyCalls: 30,
    dailyUnits: 60000,
    childCalls: 10,
    version: (await list()).settings.version,
    currentPassword: "admin123123456",
    ...extra,
  });
const prepare = async (id = "sample.be.1", cookies = jar) => {
  const s = await request(
    "/sessions",
    { exerciseId: id, clientRequestId: crypto.randomUUID() },
    cookies,
  );
  assert.equal(s.status, 201);
  assert.equal(
    (
      await request(
        "/attempts",
        {
          eventId: crypto.randomUUID(),
          sessionId: s.data.id,
          assignmentId: s.data.assignmentId,
          leaseId: s.data.leaseId,
          answer: "are",
        },
        cookies,
      )
    ).status,
    201,
  );
  return s.data;
};
const explain = (s, requestId = crypto.randomUUID(), cookies = jar) =>
  request(
    `/sessions/${s.id}/explain`,
    {
      clientRequestId: requestId,
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
    },
    cookies,
  );
function statements(sql) {
  const out = [];
  let current = "",
    quote = "";
  sql = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      current += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          current += sql[++i];
        } else quote = "";
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
    } else if (ch === ";") {
      if (current.trim()) out.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}
try {
  const db = await mf.getD1Database("DB");
  for (const name of [
    "0001_core.sql",
    "0002_accounts.sql",
    "0003_pilot_content.sql",
    "0004_learning_flow.sql",
    "0006_random_topic_assignments.sql",
    "0010_managed_accounts.sql",
    "0011_session_ownership.sql",
    "0012_ai_connections.sql",
    "0013_training_cycles.sql",
    "0015_teaching_exposure.sql",
    "0017_ai_voice.sql",
    "0021_listening_inputs.sql",
    "0025_offline_preparation.sql",
    "0030_child_companions.sql",
  ])
    for (const sql of statements(await readFile(`migrations/${name}`, "utf8")))
      await db.prepare(sql).run();
  check(
    (await request("/ai/connections", undefined, new Map())).status === 401,
    "AI settings require adult account",
  );
  assert.equal(
    (
      await request("/auth/login", {
        username: "admin",
        password: "admin123123456",
      })
    ).status,
    200,
  );
  childOnly.set("eq_child", jar.get("eq_child"));
  check(
    (await request("/ai/connections", undefined, childOnly)).status === 401,
    "child grant cannot enumerate provider connections",
  );
  const conf = cfg();
  const created = await Promise.all([
    request("/ai/connections", conf),
    request("/ai/connections", conf),
  ]);
  let conn = created[0].data;
  check(
    created.every((r) => [200, 201].includes(r.status)),
    "concurrent connection creation is idempotent",
  );
  check(
    conn.id === conf.clientRequestId &&
      conn.keySuffix === key.slice(-4) &&
      !JSON.stringify(conn).includes(key),
    "save masks API key instead of returning plaintext",
  );
  const raw = await db
    .prepare(
      "SELECT key_ciphertext,key_iv,key_id FROM ai_connections WHERE id=?",
    )
    .bind(conn.id)
    .first();
  check(
    raw.key_ciphertext !== key &&
      raw.key_iv.length > 0 &&
      raw.key_id === "test",
    "D1 stores authenticated ciphertext and IV",
  );
  check(
    (await request("/ai/connections", conf)).status === 200,
    "connection create retry reuses its identifier",
  );
  check(
    (await enable(conn)).status === 409,
    "untested provider cannot be enabled for children",
  );
  const pending = await request("/ai/connections", {
    ...cfg(),
    baseUrl: "https://custom-provider.example/v1",
  });
  const beforePending = calls;
  check(
    pending.data.approved === false &&
      (
        await request(`/ai/connections/${pending.data.id}/test`, {
          version: 0,
          clientRequestId: crypto.randomUUID(),
          currentPassword: "admin123123456",
        })
      ).status === 503 &&
      calls === beforePending,
    "unreviewed host is stored pending without any outgoing request",
  );
  check(
    (
      await request("/ai/connections", {
        ...cfg(),
        baseUrl: "https://127.0.0.1/v1",
      })
    ).status === 422,
    "private literal host rejected before saving",
  );
  const probeId = crypto.randomUUID();
  check(
    (
      await request(`/ai/connections/${conn.id}/test`, {
        version: 0,
        clientRequestId: probeId,
        currentPassword: "admin123123456",
      })
    ).data.tested === true &&
      lastRequest.headers.authorization === `Bearer ${key}` &&
      lastRequest.url === "/v1/chat/completions",
    "real upstream HTTP uses fixed endpoint and bearer key",
  );
  const afterProbe = calls;
  check(
    (
      await request(`/ai/connections/${conn.id}/test`, {
        version: 0,
        clientRequestId: probeId,
        currentPassword: "admin123123456",
      })
    ).status === 200 && calls === afterProbe,
    "test response retry does not call provider twice",
  );
  conn = (await list()).items.find((r) => r.id === conn.id);
  check(
    conn.tested &&
      conn.capabilities.text === "supported" &&
      conn.capabilities.realtime === "unknown",
    "text test does not invent audio capabilities",
  );
  check(
    (await enable(conn, { consent: false })).status === 409,
    "third party data processing requires parent opt in",
  );
  check(
    (await enable(conn)).status === 200 &&
      (await request("/ai/status", undefined, childOnly)).data.enabled,
    "parent can enable a tested connection",
  );
  const unanswered = (
    await request("/sessions", {
      exerciseId: "sample.be.1",
      clientRequestId: crypto.randomUUID(),
    })
  ).data;
  check(
    (await explain(unanswered)).status === 403,
    "AI cannot reveal explanations before saved attempt",
  );
  const s = await prepare();
  const rewardBeforeAi = (await request("/progress")).data.stars;
  const nonce = crypto.randomUUID();
  const replies = await Promise.all([explain(s, nonce), explain(s, nonce)]);
  check(
    replies.every((r) => r.status === 200) && calls === afterProbe + 1,
    "concurrent explanation request reserves and calls once",
  );
  const explained = await explain(s, nonce);
  check(
    explained.data.explanation?.exampleEnglish === "They are happy." &&
      explained.data.cached &&
      calls === afterProbe + 1,
    "response replay returns bounded cached explanation",
  );
  check(
    (await explain(s)).data.cached && calls === afterProbe + 1,
    "new nonce for same assignment reuses explanation without another bill",
  );
  check(
    !JSON.stringify(lastRequest.body).includes("小探险家") &&
      !JSON.stringify(lastRequest.body).includes("admin") &&
      !JSON.stringify(lastRequest.body).includes(key) &&
      lastRequest.body.stream === false &&
      lastRequest.body.max_completion_tokens === 800,
    "provider receives no child nickname account identity or key in prompt",
  );
  check(
    (await request("/progress")).data.stars === rewardBeforeAi,
    "AI explanation does not change learning rewards",
  );
  const beforeExpired = calls;
  await db
    .prepare("UPDATE ai_requests SET expires_at=0 WHERE request_id=?")
    .bind(nonce)
    .run();
  check(
    (await explain(s, nonce)).status === 503 && calls === beforeExpired,
    "expired response does not silently start a new paid request",
  );
  await enable(conn, { childCalls: 1 });
  const limited = await prepare("sample.there.1");
  const beforeLimit = calls;
  check(
    (await explain(limited)).status === 429 &&
      calls === beforeLimit &&
      (await request("/ai/status")).data.remaining === 0,
    "child daily limit is enforced before upstream fetch",
  );
  await enable(conn, { childCalls: 10 });
  mode = "unsafe";
  const unsafe = await explain(await prepare());
  check(
    unsafe.status === 503 &&
      !JSON.stringify(unsafe.data).includes("bad.invalid"),
    "unsafe output is never returned to learner",
  );
  mode = "error";
  const errored = await explain(await prepare());
  check(
    errored.status === 503 &&
      !JSON.stringify(errored.data).includes("sensitive-provider-error") &&
      !JSON.stringify(errored.data).includes(key),
    "raw provider errors and credentials are not forwarded",
  );
  mode = "redirect";
  const redirects = calls;
  check(
    (await explain(await prepare())).status === 503 && calls === redirects + 1,
    "redirect is rejected instead of forwarding authorization elsewhere",
  );
  mode = "echo-key";
  const echoed = await explain(await prepare());
  check(
    echoed.status === 503 && !JSON.stringify(echoed.data).includes(key),
    "a provider echoing its bearer key cannot expose it to the learner",
  );
  mode = "no-usage";
  const unknownSession = await prepare(),
    unknownId = crypto.randomUUID();
  assert.equal((await explain(unknownSession, unknownId)).status, 200);
  const unknown = await db
    .prepare(
      "SELECT reserved_units,actual_units FROM ai_requests WHERE request_id=?",
    )
    .bind(unknownId)
    .first();
  check(
    unknown.actual_units === null && unknown.reserved_units > 1000,
    "missing provider usage retains a conservative reservation",
  );
  mode = "valid";
  const sameIdSession = await prepare();
  const beforeReuse = calls;
  check(
    (await explain(sameIdSession, unknownId)).status === 409 &&
      calls === beforeReuse,
    "request identifier cannot be reused for another assignment",
  );
  const edited = await request(`/ai/connections/${conn.id}`, {
    ...cfg(),
    apiKey: "",
    version: conn.version,
  });
  check(
    edited.status === 200 &&
      !edited.data.tested &&
      !(await request("/ai/status")).data.enabled,
    "changing a connection invalidates its test and disables child AI",
  );
  check(
    (await enable(edited.data)).status === 409,
    "edited connection must pass a fresh test before re-enabling",
  );
  check(
    (
      await request(`/ai/connections/${conn.id}`, {
        ...cfg(),
        version: conn.version,
      })
    ).status === 409,
    "stale connection version cannot overwrite newer settings",
  );
  conn = edited.data;
  assert.equal(
    (
      await request(`/ai/connections/${conn.id}/test`, {
        version: conn.version,
        clientRequestId: crypto.randomUUID(),
        currentPassword: "admin123123456",
      })
    ).status,
    200,
  );
  assert.equal((await enable(conn, { childCalls: 30 })).status, 200);
  const staleSettings = (await list()).settings.version - 1;
  check(
    (await enable(conn, { version: staleSettings, enabled: false })).status ===
      409 && (await request("/ai/status")).data.enabled,
    "stale settings update cannot overwrite the current enablement",
  );
  const me = (await request("/me")).data;
  const secondChild = (
    await request("/children", { nickname: "第二位测试孩子", grade: 4 })
  ).data;
  const firstJar = new Map(),
    secondJar = new Map();
  for (const cookies of [firstJar, secondJar])
    await request(
      "/auth/login",
      { username: "admin", password: "admin123123456" },
      cookies,
    );
  await request(`/children/${me.child.id}/select`, {}, firstJar);
  await request(`/children/${secondChild.id}/select`, {}, secondJar);
  const previous = (await request("/sessions/current", undefined, firstJar))
    .data.session;
  if (previous)
    assert.equal(
      (
        await request(
          `/sessions/${previous.id}/takeover`,
          {
            clientRequestId: crypto.randomUUID(),
            expectedLeaseVersion: previous.leaseVersion,
          },
          firstJar,
        )
      ).status,
      200,
    );
  const a = await prepare("sample.be.1", firstJar),
    b = await prepare("sample.be.1", secondJar);
  const usedBeforeRace = (await list()).usage.calls;
  assert.equal(
    (await enable(conn, { dailyCalls: usedBeforeRace + 1, childCalls: 30 }))
      .status,
    200,
  );
  const beforeRace = calls;
  const race = await Promise.all([
    explain(a, crypto.randomUUID(), firstJar),
    explain(b, crypto.randomUUID(), secondJar),
  ]);
  check(
    race.filter((r) => r.status === 200).length === 1 &&
      race.filter((r) => r.status === 429).length === 1 &&
      calls === beforeRace + 1,
    "two children competing for the last family call cannot overspend it",
  );
  await enable(conn, { childCalls: 30 });
  jar.clear();
  for (const [name, value] of firstJar) jar.set(name, value);
  const temporary = "temporary-ai-test-password",
    foreignPassword = "foreign-ai-test-password";
  assert.equal(
    (
      await request("/admin/accounts", {
        username: "ai.foreign",
        householdName: "隔离AI测试家庭",
        temporaryPassword: temporary,
        currentPassword: "admin123123456",
      })
    ).status,
    201,
  );
  await request(
    "/auth/login",
    { username: "ai.foreign", password: temporary },
    foreign,
  );
  check(
    (await request("/ai/connections", undefined, foreign)).status === 403,
    "temporary-password account cannot configure AI",
  );
  await request(
    "/auth/password",
    { currentPassword: temporary, newPassword: foreignPassword },
    foreign,
  );
  await request(
    "/auth/login",
    { username: "ai.foreign", password: foreignPassword },
    foreign,
  );
  check(
    (await request("/ai/connections", undefined, foreign)).data.items.length ===
      0 &&
      (
        await request(
          `/ai/connections/${conn.id}/remove`,
          { version: conn.version, currentPassword: foreignPassword },
          foreign,
        )
      ).status === 404,
    "other household cannot enumerate or remove this connection",
  );
  check(
    (
      await request(
        `/ai/connections/${conn.id}/test`,
        {
          version: conn.version,
          clientRequestId: crypto.randomUUID(),
          currentPassword: foreignPassword,
        },
        foreign,
      )
    ).status === 404,
    "other household cannot test and spend this API key",
  );
  const foreignMe = (await request("/me", undefined, foreign)).data;
  await db
    .prepare(
      "UPDATE household_members SET role='guardian' WHERE household_id=?",
    )
    .bind(foreignMe.adult.householdId)
    .run();
  check(
    (await request("/ai/connections", undefined, foreign)).status === 403,
    "guardian role cannot manage owner-only provider settings",
  );
  mode = "slow";
  const slow = await prepare();
  let started;
  const begun = new Promise((resolve) => {
    started = resolve;
  });
  began = started;
  const running = explain(slow);
  await begun;
  began = null;
  await enable(conn, { enabled: false, consent: false });
  check(
    (await running).status === 409 &&
      (await request("/ai/status")).data.enabled === false,
    "disabling AI suppresses in flight output while preserving charged usage",
  );
  const used = (await list()).usage.calls;
  check(
    used >= 6 &&
      (await request("/ai/connections", undefined, childOnly)).status === 401,
    "usage includes tests and unsuccessful requests without opening adult settings",
  );
  await request(`/ai/connections/${conn.id}/remove`, {
    version: conn.version,
    currentPassword: "admin123123456",
  });
  check(
    (await list()).usage.calls === used,
    "connection removal cannot reset daily family usage",
  );
  console.log(
    `${checks} AI checks passed on isolated workerd/D1 and localhost upstream. No real provider calls or fees.`,
  );
} finally {
  await mf.dispose();
  await new Promise((resolve) => provider.close(resolve));
  await unlink(workerFile);
}
