import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";
let mode = "valid",
  calls = 0,
  last,
  began,
  release;
const secret = "fixture-" + randomBytes(24).toString("hex"),
  master = randomBytes(32).toString("base64");
const upstream = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw),
    probe = body.messages[1].content.includes("compatibility");
  last = body;
  if (!probe) calls++;
  if (!probe && mode === "slow") {
    began?.();
    await new Promise((r) => {
      release = r;
    });
  }
  if (!probe && mode === "redirect") {
    res.writeHead(302, { Location: "http://127.0.0.1:1/private" });
    res.end();
    return;
  }
  if (!probe && mode === "401") {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end('{"error":"private-provider-error"}');
    return;
  }
  const review = {
    encouragementChinese: "你写清楚了过去的时间和感受。",
    observations: [
      {
        quote: mode === "quote" ? "not in this paragraph" : "I go to the park.",
        suggestionEnglish: "I went to the park.",
        reasonChinese: "Yesterday表示过去，这里可以用went。",
      },
    ],
    nextStepChinese:
      mode === "unsafe"
        ? "访问 https://bad.invalid"
        : mode === "key"
          ? "密钥：" + secret
          : "读回句子，自己试着修改动词。",
  };
  const content = probe
    ? '{"ok":true}'
    : mode === "bad-json"
      ? "not-json"
      : JSON.stringify(review);
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
await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${upstream.address().port}`,
  worker = process.argv.includes("--browser")
    ? ".wrangler/writing-ai-browser-worker.mjs"
    : ".wrangler/writing-ai-smoke-worker.mjs";
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
  outfile: worker,
  logLevel: "silent",
});
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    scriptPath: worker,
    compatibilityDate: "2026-10-17",
    d1Databases: ["DB"],
    bindings: {
      APP_STAGE: "local",
      ALLOW_DEV_AUTH: "true",
      AI_KEYRING: JSON.stringify({ test: master }),
      AI_ACTIVE_KEY_ID: "test",
      AI_HOST_ALLOWLIST: "api.openai.com",
      AI_LOCAL_TEST_ORIGIN: origin,
    },
    log: new Log(LogLevel.ERROR),
  }),
);
const jar = new Map(),
  sibling = new Map(),
  foreign = new Map(),
  childOnly = new Map();
let child,
  conn,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log("PASS " + label);
  checks++;
};
async function request(path, body, cookies = jar) {
  const r = await mf.dispatchFetch("http://127.0.0.1/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": "4",
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: "http://127.0.0.1", "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const h of r.headers.getSetCookie()) {
    const p = h.split(";")[0],
      at = p.indexOf("=");
    if (p.slice(at + 1)) cookies.set(p.slice(0, at), p.slice(at + 1));
    else cookies.delete(p.slice(0, at));
  }
  return {
    status: r.status,
    data: await r.json(),
    cache: r.headers.get("Cache-Control"),
  };
}
const login = (cookies = jar) =>
  request(
    "/auth/login",
    { username: "admin", password: "admin123123456" },
    cookies,
  );
const config = () => ({
  clientRequestId: crypto.randomUUID(),
  label: "本地点评服务",
  baseUrl: origin + "/v1",
  apiKey: secret,
  model: "fixture",
  policyUrl: "https://provider.example/privacy",
  tokenParameter: "max_completion_tokens",
  instructionRole: "system",
  currentPassword: "admin123123456",
});
const paragraph = "Yesterday I go to the park. I was happy.";
async function draft(text = paragraph) {
  const created = await request("/learning/writing/drafts", {
    childId: child,
    promptId: "writing.p4.story-letter",
    requestId: crypto.randomUUID(),
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data.draftId,
    content = {
      title: "PRIVATE-TITLE-FIXTURE",
      plan: "PRIVATE-CHINESE-PLAN-FIXTURE",
      paragraphs: [text, "PRIVATE-OTHER-PARAGRAPH", "PRIVATE-THIRD-PARAGRAPH"],
      checks: [],
    };
  const saved = await request(`/learning/writing/drafts/${id}/save`, {
    childId: child,
    requestId: crypto.randomUUID(),
    expectedRevision: created.data.revision,
    content,
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  return { id, revision: saved.data.revision, content };
}
const body = (d, extra = {}) => ({
  childId: child,
  expectedRevision: d.revision,
  section: 0,
  clientRequestId: crypto.randomUUID(),
  confirmed: true,
  ...extra,
});
const review = (d, b = body(d), cookies = jar) =>
  request(`/learning/writing/drafts/${d.id}/review`, b, cookies);
async function settings(enabled = true, extra = {}) {
  const before = (await request("/ai/writing-settings")).data.settings;
  return request("/ai/writing-settings", {
    ...before,
    connectionId: conn?.id,
    enabled,
    consent: true,
    currentPassword: "admin123123456",
    ...extra,
  });
}
function statements(sql) {
  const output = [];
  let current = "",
    quote = "";
  sql = sql
    .split("\n")
    .filter((s) => !s.trim().startsWith("--"))
    .join("\n");
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    current += ch;
    if (quote) {
      if (ch === quote) {
        if (sql[i + 1] === quote) current += sql[++i];
        else quote = "";
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (
      ch === ";" &&
      (!/^\s*CREATE\s+TRIGGER/i.test(current) || /\bEND\s*;\s*$/i.test(current))
    ) {
      output.push(current);
      current = "";
    }
  }
  if (current.trim()) output.push(current);
  return output;
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
    "0032_household_membership.sql",
    "0033_household_member_lookup.sql",
    "0038_writing_drafts.sql",
    "0041_writing_ai_review.sql",
  ])
    for (const sql of statements(await readFile("migrations/" + name, "utf8")))
      await db.prepare(sql).run();
  check(
    (await request("/ai/writing-settings", undefined, new Map())).status ===
      401,
    "parent writing-review settings reject anonymous access",
  );
  assert.equal((await login()).status, 200);
  const me = (await request("/me")).data;
  child = me.child.id;
  childOnly.set("eq_child", jar.get("eq_child"));
  check(
    (await request("/ai/writing-settings", undefined, childOnly)).status ===
      401,
    "child token cannot enable or inspect parent consent settings",
  );
  check(
    !(await request("/learning/writing/ai/status")).data.enabled,
    "writing review is off by default",
  );
  const d = await draft();
  check(
    (await review(d)).status === 403 && calls === 0,
    "saved writing stays private until separately enabled",
  );
  conn = (await request("/ai/connections", config())).data;
  assert.equal(
    (
      await request(`/ai/connections/${conn.id}/test`, {
        version: conn.version,
        currentPassword: "admin123123456",
        clientRequestId: crypto.randomUUID(),
      })
    ).status,
    200,
  );
  check(
    (await settings(true, { consent: false })).status === 409,
    "answer or voice consent does not substitute for paragraph-review consent",
  );
  check(
    (await settings(true, { currentPassword: "wrong-password" })).status ===
      401,
    "enabling requires a fresh valid parent password",
  );
  assert.equal((await settings()).status, 200);
  const existing = (await request("/ai/connections")).data.settings;
  assert.equal(
    (
      await request("/ai/settings", {
        ...existing,
        enabled: false,
        consent: false,
        dailyCalls: 100,
        dailyUnits: 300000,
        childCalls: 70,
        currentPassword: "admin123123456",
      })
    ).status,
    200,
  );
  check(
    !(await request("/ai/connections")).data.settings.enabled,
    "enabling review leaves answer-explanation consent off",
  );
  if (process.argv.includes("--browser")) {
    mode = "valid";
    assert.equal(
      (
        await request(`/learning/writing/drafts/${d.id}/save`, {
          childId: child,
          requestId: crypto.randomUUID(),
          expectedRevision: d.revision,
          content: {
            title: "My park story",
            plan: "先说昨天去了哪里，再说现在做什么，最后写计划。",
            paragraphs: [
              paragraph,
              "Now I am drawing a picture.",
              "Tomorrow I am going to read a book.",
            ],
            checks: [],
          },
        })
      ).status,
      200,
    );
    const root = fileURLToPath(new URL("../dist", import.meta.url)),
      host = "127.0.0.2",
      port = 5181;
    const mime = {
      ".html": "text/html;charset=utf-8",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".glb": "model/gltf-binary",
      ".wav": "audio/wav",
      ".svg": "image/svg+xml",
      ".png": "image/png",
    };
    const gateway = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${host}:${port}`);
        if (url.pathname.startsWith("/api/")) {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const response = await mf.dispatchFetch(url.href, {
            method: req.method,
            headers: req.headers,
            body: ["GET", "HEAD"].includes(req.method)
              ? undefined
              : Buffer.concat(chunks),
          });
          res.statusCode = response.status;
          for (const [name, value] of response.headers)
            if (name.toLowerCase() !== "set-cookie") res.setHeader(name, value);
          if (response.headers.getSetCookie().length)
            res.setHeader("Set-Cookie", response.headers.getSetCookie());
          res.end(Buffer.from(await response.arrayBuffer()));
          return;
        }
        const path = resolve(
          root,
          "." +
            decodeURIComponent(
              url.pathname === "/" ? "/index.html" : url.pathname,
            ),
        );
        if (!path.startsWith(root + sep)) {
          res.writeHead(404);
          res.end();
          return;
        }
        const bytes = await readFile(path);
        res.setHeader(
          "Content-Type",
          mime[extname(path)] ?? "application/octet-stream",
        );
        res.end(bytes);
      } catch {
        res.writeHead(404);
        res.end("Fixture resource unavailable");
      }
    });
    await new Promise((r) => gateway.listen(port, host, r));
    console.log(
      `Isolated browser fixture ready: http://${host}:${port}/#writing=writing.p4.story-letter (localhost mock only). Type stop on stdin to dispose.`,
    );
    await new Promise((r) => {
      const timer = setTimeout(r, 15 * 60 * 1000);
      process.stdin.on("data", (v) => {
        if (v.toString().trim() === "stop") {
          clearTimeout(timer);
          r();
        }
      });
    });
    process.stdin.removeAllListeners("data");
    process.stdin.pause();
    await new Promise((r) => {
      gateway.close(r);
      gateway.closeAllConnections();
    });
  } else {
    const status = await request("/learning/writing/ai/status");
    check(
      status.data.enabled &&
        status.data.providerHost === new URL(origin).host &&
        !JSON.stringify(status.data).includes(secret),
      "child sees provider label and host without credentials",
    );
    check(
      (await review(d, body(d, { confirmed: false }))).status === 422 &&
        calls === 0,
      "explicit per-paragraph confirmation is required before dispatch",
    );
    check(
      (await review(d, body(d, { expectedRevision: d.revision - 1 })))
        .status === 409 && calls === 0,
      "stale revisions do not dispatch or reserve a new review",
    );
    check(
      (await review(d, body(d, { readOnly: true }))).status === 409 &&
        calls === 0,
      "read-only recovery never dispatches when no saved result exists",
    );
    const b = body(d),
      result = await review(d, b);
    check(
      result.status === 200 &&
        result.data.review.observations[0].quote === "I go to the park.",
      "a saved paragraph receives anchored Chinese feedback and a local English suggestion",
    );
    check(
      result.cache?.includes("no-store"),
      "review response is private and not cacheable by shared intermediaries",
    );
    check(
      (
        await db
          .prepare(
            "SELECT count(*) AS n FROM teaching_exposures WHERE child_id=?",
          )
          .bind(child)
          .first()
      ).n === 1,
      "suggested English is conservatively recorded as teaching exposure without adding mastery",
    );
    const outgoing = JSON.parse(last.messages[1].content);
    check(
      Object.keys(outgoing).sort().join(",") ===
        "grade,guidance,paragraph,task" &&
        outgoing.paragraph === paragraph &&
        !JSON.stringify(last).includes("PRIVATE-"),
      "provider receives only the selected paragraph and public section guidance",
    );
    let raw = await db
      .prepare("SELECT * FROM ai_requests WHERE request_id=?")
      .bind(b.clientRequestId)
      .first();
    check(
      raw.response_json.includes("ciphertext") &&
        !raw.response_json.includes(paragraph) &&
        !raw.response_json.includes("I go to the park.") &&
        !raw.response_json.includes(secret),
      "temporary suggestions are encrypted at rest without plaintext writing or provider key",
    );
    const firstCalls = calls;
    const cached = await review(d, b);
    check(
      cached.status === 200 && cached.data.cached && calls === firstCalls,
      "same request replays the same review without another provider call",
    );
    check(
      (
        await db
          .prepare(
            "SELECT count(*) AS n FROM teaching_exposures WHERE child_id=?",
          )
          .bind(child)
          .first()
      ).n === 1,
      "cached advice does not duplicate the same day's teaching exposure",
    );
    check(
      (await review(d, body(d))).status === 200 && calls === firstCalls,
      "a new UI request for the same grant and saved section reuses the existing result",
    );
    check(
      (await review(d, body(d, { readOnly: true }))).status === 200 &&
        calls === firstCalls,
      "read-only recovery can return an existing authorized result without a new call",
    );
    check(
      (await review(await draft(), b)).status === 409 && calls === firstCalls,
      "a request id cannot be reused for another saved draft",
    );
    const counts = await db
      .prepare(
        "SELECT (SELECT count(*) FROM attempts) AS attempts,(SELECT count(*) FROM review_cards) AS cards,(SELECT count(*) FROM reward_ledger) AS rewards",
      )
      .first();
    check(
      counts.attempts === 0 && counts.cards === 0 && counts.rewards === 0,
      "AI feedback does not create grades, rewards, attempts or review mastery",
    );
    const unchanged = (await request(`/learning/writing/drafts/${d.id}`)).data
      .draft;
    check(
      unchanged.revision === d.revision &&
        JSON.stringify(unchanged.paragraphs) ===
          JSON.stringify(d.content.paragraphs),
      "AI never changes the saved paragraphs or self-check state",
    );
    assert.equal((await login(sibling)).status, 200);
    const otherChild = (
      await request(
        "/children",
        { nickname: "另一写作档案", grade: 4 },
        sibling,
      )
    ).data.id;
    assert.equal(
      (await request(`/children/${otherChild}/select`, {}, sibling)).status,
      200,
    );
    check(
      (await review(d, { ...body(d), childId: otherChild }, sibling)).status ===
        404,
      "a sibling with a valid own child id cannot read or review this draft",
    );
    const foreignUser = "writing.foreign",
      temporary = "temporary-" + crypto.randomUUID(),
      foreignPassword = "family-" + crypto.randomUUID();
    assert.equal(
      (
        await request("/admin/accounts", {
          username: foreignUser,
          householdName: "另一点评家庭",
          temporaryPassword: temporary,
          currentPassword: "admin123123456",
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await request(
          "/auth/login",
          { username: foreignUser, password: temporary },
          foreign,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/auth/password",
          { currentPassword: temporary, newPassword: foreignPassword },
          foreign,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/auth/login",
          { username: foreignUser, password: foreignPassword },
          foreign,
        )
      ).status,
      200,
    );
    const foreignId = (
      await request(
        "/children",
        { nickname: "另一家庭的作品", grade: 4 },
        foreign,
      )
    ).data.id;
    assert.equal(
      (await request(`/children/${foreignId}/select`, {}, foreign)).status,
      200,
    );
    check(
      (await review(d, { ...body(d), childId: foreignId }, foreign)).status ===
        404,
      "another household cannot send this paragraph to its provider",
    );
    const privateDraft = await draft("Contact me at kid@example.com.");
    const beforePrivate = calls;
    check(
      (await review(privateDraft)).status === 422 && calls === beforePrivate,
      "obvious contact information is blocked without blocking ordinary draft saving",
    );
    mode = "slow";
    const concurrent = await draft(),
      concurrentBody = body(concurrent);
    const start = new Promise((r) => {
      began = r;
    });
    const pending = review(concurrent, concurrentBody);
    await start;
    const second = await review(concurrent, body(concurrent));
    check(
      second.status === 200 && second.data.pending,
      "concurrent requests share one pending reservation",
    );
    release();
    began = null;
    const completed = await pending;
    check(
      completed.status === 200,
      "the original pending review completes once",
    );
    mode = "valid";
    for (const mutation of [
      "edit",
      "delete",
      "disable",
      "connection",
      "logout",
    ]) {
      const target = await draft(),
        requestBody = body(target);
      mode = "slow";
      const hit = new Promise((r) => {
        began = r;
      });
      const work = review(target, requestBody);
      await hit;
      if (mutation === "edit")
        assert.equal(
          (
            await request(`/learning/writing/drafts/${target.id}/save`, {
              childId: child,
              requestId: crypto.randomUUID(),
              expectedRevision: target.revision,
              content: {
                ...target.content,
                paragraphs: ["I stayed in the garden.", "", ""],
              },
            })
          ).status,
          200,
        );
      else if (mutation === "delete")
        assert.equal(
          (
            await request(`/learning/writing/drafts/${target.id}/remove`, {
              childId: child,
              expectedRevision: target.revision,
            })
          ).status,
          200,
        );
      else if (mutation === "disable")
        assert.equal((await settings(false)).status, 200);
      else if (mutation === "connection") {
        const changed = await request(`/ai/connections/${conn.id}`, {
          ...config(),
          version: conn.version,
        });
        assert.equal(changed.status, 200);
        conn = changed.data;
      } else assert.equal((await request("/logout", {})).status, 200);
      release();
      began = null;
      const r = await work;
      raw = await db
        .prepare("SELECT response_json FROM ai_requests WHERE request_id=?")
        .bind(requestBody.clientRequestId)
        .first();
      check(
        r.status === 409 && raw.response_json === null,
        `${mutation} during provider work prevents stale display and late encrypted retention`,
      );
      mode = "valid";
      if (mutation === "disable") assert.equal((await settings()).status, 200);
      if (mutation === "connection") {
        assert.equal(
          (
            await request(`/ai/connections/${conn.id}/test`, {
              version: conn.version,
              currentPassword: "admin123123456",
              clientRequestId: crypto.randomUUID(),
            })
          ).status,
          200,
        );
        assert.equal((await settings()).status, 200);
      }
      if (mutation === "logout") {
        assert.equal((await login()).status, 200);
        assert.equal(
          (await request(`/children/${child}/select`, {})).status,
          200,
        );
      }
    }
    for (const invalid of [
      "quote",
      "unsafe",
      "key",
      "bad-json",
      "redirect",
      "401",
    ]) {
      mode = invalid;
      const bad = await draft(),
        before = calls,
        r = await review(bad);
      check(
        r.status === 503 &&
          calls === before + 1 &&
          !JSON.stringify(r.data).includes(secret) &&
          !JSON.stringify(r.data).includes("private-provider-error"),
        `${invalid} provider response fails safely without leaking data or rewriting the draft`,
      );
    }
    mode = "no-usage";
    const noUsage = await draft(),
      noUsageBody = body(noUsage);
    check(
      (await review(noUsage, noUsageBody)).status === 200,
      "compatible providers without usage can return a review",
    );
    raw = await db
      .prepare(
        "SELECT reserved_units,actual_units FROM ai_requests WHERE request_id=?",
      )
      .bind(noUsageBody.clientRequestId)
      .first();
    check(
      raw.actual_units === null && raw.reserved_units > 0,
      "missing usage retains the conservative reservation instead of claiming a free call",
    );
    mode = "valid";
    const expire = await draft(),
      expireBody = body(expire);
    assert.equal((await review(expire, expireBody)).status, 200);
    await db
      .prepare("UPDATE ai_requests SET expires_at=0 WHERE request_id=?")
      .bind(expireBody.clientRequestId)
      .run();
    const beforeExpiry = calls;
    check(
      (await review(expire, expireBody)).status === 503 &&
        calls === beforeExpiry,
      "expired feedback cannot silently bill a replacement",
    );
    check(
      (
        await db
          .prepare("SELECT response_json FROM ai_requests WHERE request_id=?")
          .bind(expireBody.clientRequestId)
          .first()
      ).response_json === null,
      "expired ciphertext is cleared on later access",
    );
    const rollback = await draft(),
      rollbackBody = body(rollback),
      beforeBudget = await db
        .prepare("SELECT calls,units FROM ai_daily_budget")
        .first();
    await db
      .prepare(
        "CREATE TRIGGER fixture_review_failure BEFORE INSERT ON writing_ai_links BEGIN SELECT RAISE(ABORT,'fixture'); END",
      )
      .run();
    const beforeFailure = calls;
    check(
      (await review(rollback, rollbackBody)).status === 429 &&
        calls === beforeFailure,
      "link creation failure rolls back reservation before any provider call",
    );
    check(
      JSON.stringify(
        await db.prepare("SELECT calls,units FROM ai_daily_budget").first(),
      ) === JSON.stringify(beforeBudget),
      "atomic failure does not consume shared budget",
    );
    await db.prepare("DROP TRIGGER fixture_review_failure").run();
    const h = (await request("/me")).data.adult.householdId;
    await db
      .prepare(
        "UPDATE household_members SET role='guardian' WHERE household_id=? AND adult_id=(SELECT adult_id FROM account_credentials WHERE username='admin')",
      )
      .bind(h)
      .run();
    check(
      (await request("/ai/writing-settings")).status === 403,
      "a guardian cannot change parent writing-review consent",
    );
    await db
      .prepare(
        "UPDATE household_members SET role='owner' WHERE household_id=? AND adult_id=(SELECT adult_id FROM account_credentials WHERE username='admin')",
      )
      .bind(h)
      .run();
    const budgetTarget = await draft();
    await db
      .prepare(
        "UPDATE ai_child_budget SET calls=1000 WHERE household_id=? AND child_id=?",
      )
      .bind(h, child)
      .run();
    const beforeLimit = calls;
    check(
      (await review(budgetTarget)).status === 429 && calls === beforeLimit,
      "writing review shares the enforced child call budget",
    );
    check(
      (await request("/auth/register", { username: "no-registration" }))
        .status === 403,
      "public registration remains closed",
    );
    await request("/logout", {});
    check(
      (await review(d, b)).status === 401,
      "revoked browser login cannot retrieve an old review",
    );
    console.log(
      `${checks} isolated writing-AI checks passed; localhost fake provider only, no real family or cloud deployment.`,
    );
  }
} finally {
  release?.();
  await mf.dispose();
  await new Promise((r) => upstream.close(r));
  await unlink(worker).catch(() => {});
}
