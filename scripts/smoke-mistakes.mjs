import assert from "node:assert/strict";
import { readFile, mkdir, unlink } from "node:fs/promises";
import { build } from "esbuild";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";
import { createServer } from "node:http";
import { resolve, sep, extname } from "node:path";
const browserMode = process.argv.includes("--browser");
const worker = `.wrangler/mistakes-${browserMode ? "browser" : "smoke"}-worker.mjs`;
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
    bindings: { APP_STAGE: "local", ALLOW_DEV_AUTH: "true" },
    log: new Log(LogLevel.ERROR),
  }),
);
let checks = 0,
  child;
const check = (value, name) => {
  assert.ok(value, name);
  checks++;
  console.log("PASS " + name);
};
const jar = new Map(),
  sibling = new Map(),
  foreign = new Map();
async function request(path, body, cookies = jar, extra = {}) {
  const r = await mf.dispatchFetch("http://127.0.0.2/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": "4",
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: "http://127.0.0.2", "Content-Type": "application/json" }),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const h of r.headers.getSetCookie()) {
    const p = h.split(";")[0],
      i = p.indexOf("=");
    if (p.slice(i + 1)) cookies.set(p.slice(0, i), p.slice(i + 1));
    else cookies.delete(p.slice(0, i));
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
function statements(sql) {
  const result = [];
  let part = "",
    quote = "";
  sql = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    part += ch;
    if (quote) {
      if (ch === quote) {
        if (sql[i + 1] === quote) part += sql[++i];
        else quote = "";
      }
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (
      ch === ";" &&
      (!/^\s*CREATE\s+TRIGGER/i.test(part) || /\bEND\s*;\s*$/i.test(part))
    ) {
      result.push(part);
      part = "";
    }
  }
  if (part.trim()) result.push(part);
  return result;
}
const json = async (name) =>
  JSON.parse(await readFile("content/" + name, "utf8"));
const raw = await json("exercises.json"),
  topics = await json("topic-release.v1.json"),
  workshop = await json("workshop-release.latest.json"),
  oldWorkshop = await json("workshop-release.v1.json"),
  story = await json("story-course-release.v1.json"),
  listening = await json("word-listening-release.v1.json"),
  patterns = await json("pattern-release.v1.json");
const pool = [
  ...raw,
  ...topics.items,
  ...workshop.items,
  ...story.items,
  ...listening.items,
  ...patterns.items,
];
const chosen = [
  "choice",
  "input",
  "order",
  "sort",
  "repair",
  "listen",
  "evidence",
].map((type) => {
  const i = pool.find((i) => i.type === type && !i.graphemeTokens);
  assert.ok(i, type);
  return i;
});
const legacy = oldWorkshop.items.find((i) =>
  workshop.items.some(
    (n) => n.id === i.id && (n.version ?? 1) > (i.version ?? 1),
  ),
);
assert.ok(legacy, "immutable historical exercise exists");
const items = [
  ...new Map(
    [...chosen, legacy, workshop.items.find((i) => i.id === legacy.id)].map(
      (i) => [`${i.id}@${i.version ?? 1}`, i],
    ),
  ).values(),
];
const correctAnswer = (item) =>
  ["sort", "repair", "evidence"].includes(item.type)
    ? item.type === "sort"
      ? JSON.parse(item.answers[0]).map(([card, group]) => `${card}=${group}`)
      : JSON.parse(item.answers[0])
    : item.answers[0];
function wrongAnswer(item) {
  if (item.type === "sort") {
    const rows = JSON.parse(item.answers[0]);
    rows[0][1] = item.sorting.groups.find((g) => g.id !== rows[0][1]).id;
    return rows.map(([card, group]) => `${card}=${group}`);
  }
  if (item.type === "repair") return [item.editing.parts[0].id, "zebra"];
  if (item.type === "evidence")
    return [
      item.passage.find(
        (p) => !item.evidenceSolutions.some((s) => s.sentenceId === p.id),
      )?.id ?? item.passage[0].id,
      item.choices.find(
        (c) =>
          !item.evidenceSolutions.some(
            (s) => s.answer.toLowerCase() === c.toLowerCase(),
          ),
      ),
    ];
  return (
    item.choices?.find(
      (c) => !item.answers.some((a) => a.toLowerCase() === c.toLowerCase()),
    ) ?? "fixturewrong"
  );
}
const start = (item, extra = {}, cookies = jar) =>
  request(
    "/sessions",
    { exerciseId: item.id, clientRequestId: crypto.randomUUID(), ...extra },
    cookies,
  );
async function answer(s, value, cookies = jar) {
  if (s.exercise.type === "listen")
    assert.equal(
      (
        await request(
          `/sessions/${s.id}/listening`,
          { assignmentId: s.assignmentId, leaseId: s.leaseId, mode: "heard" },
          cookies,
        )
      ).status,
      200,
    );
  return request(
    "/attempts",
    {
      eventId: crypto.randomUUID(),
      sessionId: s.id,
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
      answer: value,
    },
    cookies,
  );
}
const detail = (id, cookies = jar) =>
  request(`/learning/mistakes/${id}/open`, {}, cookies);
let gateway;
try {
  const db = await mf.getD1Database("DB");
  for (const name of [
    "0001_core.sql",
    "0002_accounts.sql",
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
  ])
    for (const sql of statements(await readFile("migrations/" + name, "utf8")))
      await db.prepare(sql).run();
  await db
    .prepare(
      "INSERT INTO content_releases VALUES('mistake-fixture-v1','published','fixture',?)",
    )
    .bind(Date.now())
    .run();
  await db
    .prepare(
      "INSERT INTO lessons VALUES('mistake.fixture',1,'mistake-fixture-v1',3,'A',1,'错题本隔离材料','{}')",
    )
    .run();
  for (const item of items) {
    await db
      .prepare("INSERT OR IGNORE INTO skills VALUES(?,'grammar',?)")
      .bind(item.skill, item.title)
      .run();
    const { answers, hint, explanation, ...publicData } = item;
    await db
      .prepare(
        "INSERT INTO items VALUES(?,?, 'mistake.fixture',1,?,?,?,?,?,'published')",
      )
      .bind(
        item.id,
        item.version ?? 1,
        item.skill,
        item.modality,
        item.type,
        JSON.stringify(publicData),
        JSON.stringify(answers),
      )
      .run();
    await db
      .prepare("INSERT INTO release_items VALUES('mistake-fixture-v1',?,?)")
      .bind(item.id, item.version ?? 1)
      .run();
  }
  check(
    (await request("/learning/mistakes", undefined, new Map())).status === 401,
    "anonymous notebooks are rejected",
  );
  assert.equal((await login()).status, 200);
  child = (await request("/me")).data.child.id;
  check(
    (await request("/learning/mistakes")).data.items.length === 0,
    "a new child starts with an empty notebook",
  );
  for (const q of [
    "kind=correct",
    "kind=incorrect&kind=hinted",
    "snapshot=1&before=2",
    "childId=foreign",
    "limit=99999",
  ])
    check(
      (await request("/learning/mistakes?" + q)).status === 422,
      "invalid notebook query rejected: " + q,
    );
  const events = [];
  for (const item of chosen) {
    const made = await start(item);
    assert.equal(made.status, 201, JSON.stringify(made.data));
    const saved = await answer(made.data, wrongAnswer(item));
    assert.equal(saved.status, 201, JSON.stringify(saved.data));
    assert.equal(saved.data.outcome, "incorrect");
    events.push({ item, event: saved.data.eventId, session: made.data });
    const seen = await detail(saved.data.eventId);
    check(
      seen.status === 200 &&
        seen.data.exercise.type === item.type &&
        !JSON.stringify(seen.data).includes('"answers"') &&
        !JSON.stringify(seen.data).includes('"skill"'),
      "saved " + item.type + " has a private human-readable comparison",
    );
    if (["sort", "repair", "evidence"].includes(item.type))
      check(
        seen.data.details?.length > 0 && seen.data.submitted === null,
        "structured " +
          item.type +
          " shows saved rows instead of internal answer identifiers",
      );
  }
  const first = events[0],
    item = first.item;
  const exposureBefore = (
    await db.prepare("SELECT count(*) AS n FROM teaching_exposures").first()
  ).n;
  const list = await request("/learning/mistakes?kind=all");
  check(
    list.data.items.length === 7 &&
      list.cache?.includes("no-store") &&
      list.data.items.every(
        (i) =>
          !Object.hasOwn(i, "exercise") &&
          !Object.hasOwn(i, "reference") &&
          !Object.hasOwn(i, "submitted"),
      ),
    "list metadata is private and discloses no answer payload",
  );
  check(
    (await db.prepare("SELECT count(*) AS n FROM teaching_exposures").first())
      .n === exposureBefore,
    "listing records does not record unseen explanations",
  );
  for (let n = 0; n < 18; n++) {
    const s = await start(item);
    const r = await answer(s.data, wrongAnswer(item));
    assert.equal(r.status, 201);
  }
  const page = await request("/learning/mistakes");
  check(
    page.data.items.length === 20 && page.data.nextBefore !== null,
    "a large notebook returns a bounded keyset page",
  );
  const extra = await answer((await start(item)).data, wrongAnswer(item));
  const second = await request(
    `/learning/mistakes?snapshot=${page.data.snapshotSequence}&before=${page.data.nextBefore}`,
  );
  check(
    second.data.items.length === 5 &&
      !second.data.items.some((i) =>
        page.data.items.some((p) => p.eventId === i.eventId),
      ) &&
      !second.data.items.some((i) => i.eventId === extra.data.eventId),
    "pagination keeps one snapshot without duplicates or newly appended rows",
  );
  const filteredCategory = chosen.find(
    (i) => i.category !== item.category,
  ).category;
  const tense = await request(
    `/learning/mistakes?category=${filteredCategory}`,
  );
  check(
    tense.status === 200 &&
      tense.data.items.length > 0 &&
      tense.data.items.every((i) => i.category === filteredCategory),
    "category filters are applied inside the child's query",
  );
  check(
    (await detail(crypto.randomUUID())).status === 404,
    "unseen attempt identifiers cannot expose answers",
  );
  const other = (
    await request("/children", { nickname: "错题兄弟姐妹", grade: 3 })
  ).data.id;
  await login(sibling);
  await request(`/children/${other}/select`, {}, sibling);
  check(
    (await request("/learning/mistakes", undefined, sibling)).data.items
      .length === 0 && (await detail(first.event, sibling)).status === 404,
    "siblings cannot list or open each other's answers",
  );
  check(
    (await start(item, { mistakeEventId: first.event }, sibling)).status ===
      404,
    "a sibling cannot retry another child's answer record",
  );
  const temporary = "temporary-" + crypto.randomUUID(),
    password = "family-" + crypto.randomUUID();
  assert.equal(
    (
      await request("/admin/accounts", {
        username: "mistake.foreign",
        householdName: "另一错题家庭",
        temporaryPassword: temporary,
        currentPassword: "admin123123456",
      })
    ).status,
    201,
  );
  await request(
    "/auth/login",
    { username: "mistake.foreign", password: temporary },
    foreign,
  );
  await request(
    "/auth/password",
    { currentPassword: temporary, newPassword: password },
    foreign,
  );
  await request(
    "/auth/login",
    { username: "mistake.foreign", password },
    foreign,
  );
  const outsider = (
    await request("/children", { nickname: "另一家庭小本", grade: 3 }, foreign)
  ).data.id;
  await request(`/children/${outsider}/select`, {}, foreign);
  check(
    (await detail(first.event, foreign)).status === 404 &&
      (await start(item, { mistakeEventId: first.event }, foreign)).status ===
        404,
    "another household cannot disclose or retry private attempts",
  );
  check(
    (
      await request("/learning/mistakes", undefined, jar, {
        "X-EQ-Child-ID": other,
      })
    ).status === 409,
    "a stale child header is rejected",
  );
  const id = crypto.randomUUID(),
    retry = await start(item, {
      mistakeEventId: first.event,
      clientRequestId: id,
    });
  check(
    retry.status === 201 &&
      retry.data.guidedRetry === true &&
      retry.data.hintLevel === 1,
    "retrying a recorded question is explicitly guided from creation",
  );
  check(
    (await start(item, { mistakeEventId: first.event, clientRequestId: id }))
      .data.assignmentId === retry.data.assignmentId,
    "an unknown creation response can recover with the same request identifier",
  );
  check(
    (
      await start(item, {
        mistakeEventId: extra.data.eventId,
        clientRequestId: id,
      })
    ).status === 409,
    "the same request identifier cannot switch to another mistake",
  );
  const snap = await request(`/sessions/${retry.data.id}/snapshot`);
  check(
    snap.data.session.guidedRetry && snap.data.session.hintLevel === 1,
    "reloading a guided retry preserves its evidence label",
  );
  const receipt = await answer(retry.data, correctAnswer(item));
  check(
    receipt.status === 201 &&
      receipt.data.outcome === "hinted" &&
      receipt.data.independentEvidence === false &&
      receipt.data.rewardDelta === 0,
    "a correct guided retry never awards stars or independent mastery",
  );
  const ledger = await db
    .prepare("SELECT delta,reason FROM reward_ledger WHERE source_attempt_id=?")
    .bind(receipt.data.eventId)
    .first();
  check(
    ledger.delta === 0 && ledger.reason === "guided_retry",
    "the authoritative reward ledger agrees with the retry receipt",
  );
  check(
    (await request("/learning/mistakes?kind=hinted")).data.items.some(
      (i) => i.eventId === receipt.data.eventId,
    ),
    "guided results remain visible as assisted practice, not independent success",
  );
  await db
    .prepare(
      "UPDATE teaching_exposures SET shown_day='2000-01-01' WHERE child_id=?",
    )
    .bind(child)
    .run();
  assert.equal((await detail(first.event)).status, 200);
  const ordinary = await answer((await start(item)).data, correctAnswer(item));
  check(
    ordinary.data.outcome === "hinted",
    "opening an old answer today also protects other ordinary entry points from false independent credit",
  );
  const historicalSession = (await start(legacy)).data;
  await db
    .prepare(
      "UPDATE session_items SET item_version=?,presentation_json='{}' WHERE id=?",
    )
    .bind(legacy.version ?? 1, historicalSession.assignmentId)
    .run();
  const historicalSnapshot = (
    await request(`/sessions/${historicalSession.id}/snapshot`)
  ).data.session;
  const oldAttempt = await answer(historicalSnapshot, wrongAnswer(legacy));
  assert.equal(oldAttempt.status, 201);
  const originalReceipt = (
    await db
      .prepare("SELECT receipt_json FROM attempts WHERE event_id=?")
      .bind(oldAttempt.data.eventId)
      .first()
  ).receipt_json;
  const oldDetail = await detail(oldAttempt.data.eventId);
  const latest = workshop.items.find((i) => i.id === legacy.id);
  check(
    oldDetail.status === 200 &&
      oldDetail.data.itemVersion === (legacy.version ?? 1) &&
      oldDetail.data.feedback === legacy.explanation,
    "an old saved answer keeps its immutable original exercise and explanation",
  );
  check(
    oldDetail.data.retryVersion === (latest.version ?? 1) &&
      oldDetail.data.currentTeaching.feedback === latest.explanation &&
      oldDetail.data.currentTeaching.prompt === latest.prompt,
    "revised content explicitly discloses current teaching while retaining historical comparison",
  );
  check(
    (
      await start(legacy, {
        mistakeEventId: oldAttempt.data.eventId,
        mistakeVersion: legacy.version ?? 1,
      })
    ).status === 409,
    "stale expected retry versions require reopening the updated teaching",
  );
  const oldRetry = await start(legacy, {
    mistakeEventId: oldAttempt.data.eventId,
    mistakeVersion: latest.version ?? 1,
  });
  const oldVersion = (
    await db
      .prepare("SELECT item_version FROM session_items WHERE id=?")
      .bind(oldRetry.data.assignmentId)
      .first()
  ).item_version;
  const oldCorrect = await answer(oldRetry.data, correctAnswer(latest));
  check(
    oldVersion === (latest.version ?? 1) &&
      oldCorrect.data.outcome === "hinted" &&
      oldCorrect.data.rewardDelta === 0,
    "guided retry uses the disclosed revised rubric and remains assisted with zero reward",
  );
  check(
    (
      await db
        .prepare("SELECT receipt_json FROM attempts WHERE event_id=?")
        .bind(oldAttempt.data.eventId)
        .first()
    ).receipt_json === originalReceipt,
    "reading and retrying never rewrite the original receipt",
  );
  await db
    .prepare("UPDATE items SET status='withdrawn' WHERE id=? AND version=?")
    .bind(latest.id, latest.version ?? 1)
    .run();
  const unavailableCurrent = await detail(oldAttempt.data.eventId);
  check(
    unavailableCurrent.status === 200 &&
      unavailableCurrent.data.retryVersion === null &&
      unavailableCurrent.data.currentTeaching === null,
    "a withdrawn current revision leaves history readable but disables guided practice",
  );
  check(
    (await start(legacy, { mistakeEventId: oldAttempt.data.eventId }))
      .status === 409,
    "a withdrawn current revision cannot fall back to an obsolete grading rubric",
  );
  await db
    .prepare("UPDATE items SET status='published' WHERE id=? AND version=?")
    .bind(latest.id, latest.version ?? 1)
    .run();
  const active = (await start(item)).data;
  await db
    .prepare(
      `CREATE TRIGGER fixture_retry_race AFTER UPDATE OF state ON learning_sessions WHEN NEW.id='${active.id}' AND NEW.state='paused' BEGIN UPDATE items SET status='withdrawn' WHERE id='${item.id.replaceAll("'", "''")}' AND version=${item.version ?? 1}; END`,
    )
    .run();
  const raced = await start(item, { mistakeEventId: first.event });
  check(
    raced.status >= 400 &&
      (
        await db
          .prepare("SELECT state FROM learning_sessions WHERE id=?")
          .bind(active.id)
          .first()
      ).state === "active" &&
      (
        await db
          .prepare("SELECT status FROM items WHERE id=? AND version=?")
          .bind(item.id, item.version ?? 1)
          .first()
      ).status === "published",
    "a withdrawal during creation rolls back the new retry and the previous session pause together",
  );
  await db.prepare("DROP TRIGGER fixture_retry_race").run();
  await db
    .prepare("UPDATE items SET status='withdrawn' WHERE id=? AND version=?")
    .bind(item.id, item.version ?? 1)
    .run();
  check(
    (await detail(first.event)).status === 409 &&
      (await start(item, { mistakeEventId: first.event })).status === 404,
    "withdrawn material cannot be taught again or retried",
  );
  await db
    .prepare("UPDATE items SET status='published' WHERE id=? AND version=?")
    .bind(item.id, item.version ?? 1)
    .run();
  await db
    .prepare(
      "CREATE TRIGGER fixture_exposure_failure BEFORE INSERT ON teaching_exposures BEGIN SELECT RAISE(ABORT,'fixture exposure failure'); END",
    )
    .run();
  const failed = await detail(first.event);
  check(
    failed.status >= 400 &&
      !JSON.stringify(failed.data).includes('"reference"'),
    "a failed disclosure write never returns the answer",
  );
  await db.prepare("DROP TRIGGER fixture_exposure_failure").run();
  check(
    (await detail(first.event)).status === 200,
    "an explicit disclosure retry recovers after storage is available",
  );
  if (browserMode) {
    await db
      .prepare(
        "UPDATE learning_sessions SET state='replaced' WHERE state IN ('active','paused')",
      )
      .run();
    const root = resolve("dist"),
      host = "127.0.0.2",
      port = 5182,
      mime = {
        ".html": "text/html;charset=utf-8",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".glb": "model/gltf-binary",
        ".wav": "audio/wav",
        ".svg": "image/svg+xml",
      };
    gateway = createServer(async (req, res) => {
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
        if (!path.startsWith(root + sep)) throw Error("outside fixture");
        res.setHeader(
          "Content-Type",
          mime[extname(path)] ?? "application/octet-stream",
        );
        res.end(await readFile(path));
      } catch {
        res.writeHead(404);
        res.end("Fixture resource unavailable");
      }
    });
    await new Promise((r) => gateway.listen(port, host, r));
    console.log(
      `Isolated notebook fixture ready: http://${host}:${port}/#mistakes . Type stop to dispose (15 minute limit).`,
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
  }
  await request("/logout", {});
  check(
    (await detail(first.event)).status === 401,
    "revoked parent login cannot read an old answer",
  );
  await db.prepare("DELETE FROM children WHERE id=?").bind(child).run();
  check(
    (
      await db
        .prepare("SELECT count(*) AS n FROM attempts WHERE child_id=?")
        .bind(child)
        .first()
    ).n === 0,
    "deleting the child removes notebook attempt records through existing foreign keys",
  );
  console.log(
    `${checks} isolated mistake-notebook checks passed; memory D1 only, no real families or providers.`,
  );
} finally {
  if (gateway)
    await new Promise((r) => {
      gateway.close(r);
      gateway.closeAllConnections();
    });
  await mf.dispose();
  await unlink(worker).catch(() => {});
}
