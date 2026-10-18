import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { run } from "./runtime.mjs";
import { build } from "esbuild";
import { setTimeout as delay } from "node:timers/promises";
const base = "http://127.0.0.1:8788",
  stamp = crypto.randomUUID().replaceAll("-", "").slice(0, 12),
  admin = { jar: new Map() },
  people = ["a", "b", "c"].map((x) => ({
    name: `export.${x}.${stamp}`,
    password: `test-${crypto.randomUUID()}`,
    jar: new Map(),
    id: null,
    home: null,
  }));
const [a, b, g] = people,
  second = { ...a, jar: new Map() },
  empty = { jar: new Map() },
  adminPassword = process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
  temporary = `temporary-${crypto.randomUUID()}`;
const sql = (q) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", q], {
      capture: true,
    }),
  )[0].results;
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
let checks = 0,
  child,
  sibling,
  draft,
  failTrigger = null;
const check = (v, label) => {
  assert.ok(v, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(actor, path, body, extra = {}) {
  const r = await fetch(base + "/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...actor.jar].map(([k, v]) => k + "=" + v).join("; "),
      "X-EQ-Player-Version": "4",
      ...(actor.context
        ? {
            "X-EQ-Household-ID": actor.context.id,
            "X-EQ-Household-Version": String(actor.context.version),
          }
        : {}),
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  for (const h of r.headers.getSetCookie()) {
    const p = h.split(";")[0],
      at = p.indexOf("=");
    if (p.slice(at + 1)) actor.jar.set(p.slice(0, at), p.slice(at + 1));
    else actor.jar.delete(p.slice(0, at));
  }
  const data = await r.json();
  if (r.ok && path === "/me")
    actor.context = data.adult
      ? { id: data.adult.householdId, version: data.adult.contextVersion }
      : null;
  if (r.ok && path === "/households/switch")
    actor.context = { id: body.householdId, version: data.contextVersion };
  if (r.ok && path === "/logout") actor.context = null;
  return {
    status: r.status,
    data,
    cache: r.headers.get("Cache-Control"),
    retry: r.headers.get("Retry-After"),
  };
}
async function login(actor) {
  assert.equal(
    (
      await request(actor, "/auth/login", {
        username: actor.name ?? "admin",
        password: actor.password ?? adminPassword,
      })
    ).status,
    200,
  );
  return (await request(actor, "/me")).data;
}
async function enter(actor, id) {
  const m = (await request(actor, "/me")).data;
  assert.equal(
    (
      await request(actor, "/households/switch", {
        householdId: id,
        expectedContextVersion: m.adult.contextVersion,
        requestId: crypto.randomUUID(),
      })
    ).status,
    200,
  );
  return (await request(actor, "/me")).data;
}
const create = (actor, requestId = crypto.randomUUID(), extra = {}) =>
  request(actor, "/family/exports/create", {
    requestId,
    householdId: actor.context.id,
    currentPassword: actor.password,
    confirmed: true,
    ...extra,
  });
const manifest = (actor, id) => request(actor, `/family/exports/${id}`);
const part = (actor, id, p) =>
  request(actor, `/family/exports/${id}/parts/${p.section}/${p.part}`);
const remove = (actor, id) =>
  request(actor, `/family/exports/${id}/remove`, {});
const read = (actor) => async (path) => {
  const r = await request(actor, path);
  assert.equal(r.status, 200, r.data.error?.code);
  return r.data;
};
async function allRecords(actor, m) {
  const records = {};
  for (const p of m.parts) {
    const r = await part(actor, m.job.id, p);
    assert.equal(r.status, 200);
    (records[p.section] ??= []).push(...r.data.records);
  }
  return records;
}
try {
  check(
    (await request(empty, "/family/exports/list")).status === 401,
    "anonymous callers cannot list private exports",
  );
  await login(admin);
  for (const actor of people) {
    const created = await request(admin, "/admin/accounts", {
      username: actor.name,
      householdName: `导出验证-${stamp}-${actor.name[7]}`,
      temporaryPassword: temporary,
      currentPassword: adminPassword,
    });
    assert.equal(created.status, 201);
    actor.id = created.data.id;
    assert.equal(
      (
        await request(actor, "/auth/login", {
          username: actor.name,
          password: temporary,
        })
      ).status,
      200,
    );
    check(
      (await request(actor, "/family/exports/list")).status === 403,
      "temporary-password account cannot enter private exports",
    );
    assert.equal(
      (
        await request(actor, "/auth/password", {
          currentPassword: temporary,
          newPassword: actor.password,
        })
      ).status,
      200,
    );
    actor.home = (await login(actor)).adult.householdId;
  }
  second.name = a.name;
  second.password = a.password;
  await login(second);
  child = (
    await request(a, "/children", { nickname: `中文😀导出-${stamp}`, grade: 6 })
  ).data.id;
  sibling = (
    await request(a, "/children", { nickname: "同家庭第二档案", grade: 2 })
  ).data.id;
  assert.ok(child && sibling);
  await request(a, `/children/${child}/select`, {});
  const sample = JSON.parse(
    await readFile("content/exercises.json", "utf8"),
  ).find((i) => i.id === "sample.form.go");
  const started = (
    await request(a, "/sessions", {
      exerciseId: sample.id,
      clientRequestId: crypto.randomUUID(),
    })
  ).data;
  const saved = await request(a, "/attempts", {
    sessionId: started.id,
    assignmentId: started.assignmentId,
    leaseId: started.leaseId,
    eventId: crypto.randomUUID(),
    answer: "went",
  });
  assert.equal(saved.status, 201);
  assert.equal(
    (
      await request(a, `/sessions/${started.id}/next`, {
        assignmentId: started.assignmentId,
        leaseId: started.leaseId,
      })
    ).status,
    200,
  );
  draft = (
    await request(a, "/learning/writing/drafts", {
      childId: child,
      promptId: "writing.p6.project",
      requestId: crypto.randomUUID(),
    })
  ).data.draftId;
  const writing = {
    title: "我的中文项目😀",
    plan: "中文计划，<script>只是文字</script>",
    paragraphs: [
      "I like reading.",
      "I counted four books.",
      "I will read again.",
    ],
    checks: [],
  };
  assert.equal(
    (
      await request(a, `/learning/writing/drafts/${draft}/save`, {
        childId: child,
        expectedRevision: 1,
        content: writing,
        requestId: crypto.randomUUID(),
      })
    ).status,
    200,
  );
  // Create a real guardian invitation so exports must omit both raw invitation
  // tokens and their stored hashes while retaining the family-owned history.
  const state = (await request(a, "/households/current")).data;
  const invite = (
    await request(a, "/households/invitations", {
      username: g.name,
      role: "guardian",
      currentPassword: a.password,
      expectedVersion: state.version,
      requestId: crypto.randomUUID(),
    })
  ).data;
  assert.ok(invite.token);
  const preview = (
    await request(g, "/households/invitations/preview", { token: invite.token })
  ).data;
  assert.equal(
    (
      await request(g, "/households/invitations/accept", {
        token: invite.token,
        expectedVersion: preview.version,
        currentPassword: g.password,
        requestId: crypto.randomUUID(),
      })
    ).status,
    200,
  );
  await enter(g, a.home);
  check(
    (await request(g, "/family/exports/list")).status === 403 &&
      (await create(g)).status === 403,
    "a guardian cannot generate or list the owner's private archive",
  );
  // Add enough valid historical observations to exercise several 25-row parts.
  // These are explicitly synthetic records for this disposable family only.
  const seed = [],
    now = Date.now();
  for (let i = 0; i < 52; i++) {
    const sid = crypto.randomUUID(),
      aid = crypto.randomUUID(),
      event = crypto.randomUUID();
    seed.push(
      `INSERT INTO learning_sessions(id,household_id,child_id,release_id,lease_id,state,created_at,source) VALUES(${quote(sid)},${quote(a.home)},${quote(child)},'dev-samples-v1',${quote(crypto.randomUUID())},'completed',${now + i},'single');`,
      `INSERT INTO session_items(id,household_id,child_id,session_id,position,item_id,item_version,content_release_id) VALUES(${quote(aid)},${quote(a.home)},${quote(child)},${quote(sid)},0,'sample.form.go',1,'dev-samples-v1');`,
      `INSERT INTO attempts(event_id,household_id,child_id,assignment_id,server_sequence,answer_json,outcome,independent_evidence,evidence_source,received_at,algorithm_version,receipt_json) VALUES(${quote(event)},${quote(a.home)},${quote(child)},${quote(aid)},${i + 2},'"went"','hinted',0,'online',${now + i},'export-fixture',${quote(JSON.stringify({ eventId: event, outcome: "hinted", independentEvidence: false, feedback: "went", rewardDelta: 0, serverSequence: i + 2, nextReviewDay: "2000-01-01" }))});`,
      `INSERT INTO session_results VALUES(${quote(sid)},${quote(a.home)},${quote(child)},NULL,1,1,0,${now + i});`,
    );
  }
  const secret = `not-for-export-${crypto.randomUUID()}`,
    foreignMarker = `foreign-${crypto.randomUUID()}`,
    connection = crypto.randomUUID();
  seed.push(
    `UPDATE children SET stream_version=53 WHERE id=${quote(child)};`,
    `INSERT INTO ai_connections(id,household_id,label,adapter,base_url,model,key_ciphertext,key_iv,key_id,key_suffix,capabilities_json,state,created_at) VALUES(${quote(connection)},${quote(a.home)},'导出隔离连接','openai-compatible','https://api.openai.com/v1','placeholder',${quote(secret)},${quote(secret)},${quote(secret)},${quote(secret)},'{}','disabled',${now});`,
    `INSERT INTO ai_settings(household_id,active_connection_id,enabled) VALUES(${quote(a.home)},${quote(connection)},0);`,
    `INSERT INTO children(id,household_id,nickname,grade,created_at) VALUES(${quote(crypto.randomUUID())},${quote(b.home)},${quote(foreignMarker)},2,${now});`,
  );
  const seedFile = `.wrangler/export-seed-${stamp}.sql`;
  await writeFile(seedFile, seed.join("\n"));
  try {
    run(["d1", "execute", "DB", "--local", "--file", seedFile], {
      capture: true,
    });
  } finally {
    await unlink(seedFile);
  }
  const learningBefore = (await request(a, "/progress")).data;
  const wrong = await create(a, crypto.randomUUID(), {
    currentPassword: "wrong-password",
  });
  assert.equal(wrong.status, 401, JSON.stringify(wrong.data));
  check(true, "wrong parent password creates no archive");
  check(
    (await create(a, crypto.randomUUID(), { confirmed: false })).status ===
      422 &&
      (await create(a, crypto.randomUUID(), { householdId: b.home })).status ===
        422,
    "scope confirmation cannot be omitted or replaced with another family",
  );
  const requestId = crypto.randomUUID(),
    first = await create(a, requestId);
  assert.equal(first.status, 201, JSON.stringify(first.data));
  const jobId = first.data.job.id,
    m = (await manifest(a, jobId)).data;
  check(
    m.sections.length === 25 &&
      m.job.rows > 150 &&
      m.parts.filter((p) => p.section === "attempts").length === 3,
    "full family snapshot has all sections and multiple paginated observation parts",
  );
  const records = await allRecords(a, m),
    encoded = JSON.stringify(records);
  const learningAfter = (await request(a, "/progress")).data;
  check(
    learningAfter.answered === learningBefore.answered &&
      learningAfter.stars === learningBefore.stars &&
      learningAfter.dueCount === learningBefore.dueCount,
    "generating and reading a private archive does not award or alter learning progress",
  );
  check(
    records.children.length === 2 &&
      records.attempts.length === 53 &&
      new Set(records.attempts.map((r) => r.event_id)).size === 53 &&
      records.attempts.every((r) => r.answer === "went") &&
      records.assignments.length === 53 &&
      records.results.length === 53,
    "every seeded and real learning observation is exported exactly once",
  );
  check(
    records.writing[0].title === writing.title &&
      records.writing[0].plan === writing.plan &&
      JSON.stringify(records.writing[0].paragraphs) ===
        JSON.stringify(writing.paragraphs),
    "saved Chinese, emoji and plain-text writing survive export without modification",
  );
  check(
    !encoded.includes(secret) &&
      !encoded.includes(invite.token) &&
      !encoded.includes(foreignMarker),
    "keys, invitation tokens and foreign-family markers are excluded",
  );
  for (const forbidden of [
    '"password_hash"',
    '"key_ciphertext"',
    '"key_suffix"',
    '"token_hash"',
    '"lease_id"',
    '"private_answer_json"',
  ])
    assert.ok(!encoded.includes(forbidden), forbidden);
  check(
    records.connections.length === 1 &&
      records.invitations.length === 1 &&
      records.members.length === 2 &&
      records.membership_history.length >= 2,
    "safe connection metadata and real membership history remain useful",
  );
  check(
    (await manifest(a, jobId)).cache === "private, no-store" &&
      (await part(a, jobId, m.parts[0])).cache === "private, no-store",
    "manifest and private parts are never shared-cache responses",
  );
  const replay = await create(a, requestId);
  check(
    replay.status === 200 &&
      replay.data.replayed &&
      replay.data.job.createdAt === m.job.createdAt &&
      replay.data.job.expiresAt === m.job.expiresAt,
    "repeating a confirmed request restores the same snapshot without extending expiry",
  );
  check(
    (await create(a)).status === 409 &&
      sql(
        `SELECT count(*) AS n FROM family_exports WHERE session_id=(SELECT session_id FROM family_exports WHERE id=${quote(jobId)})`,
      )[0].n === 1,
    "a second package cannot accumulate in the same verified login",
  );
  check(
    (await manifest(b, jobId)).status === 404 &&
      (await part(b, jobId, m.parts[0])).status === 404,
    "another family cannot enumerate a snapshot or download its parts",
  );
  check(
    (await manifest(second, jobId)).status === 404,
    "another device needs its own password-confirmed archive",
  );
  check(
    (await manifest(g, jobId)).status === 403,
    "family membership alone cannot read a manager's export",
  );
  const childOnly = {
    jar: new Map([...a.jar].filter(([k]) => k === "eq_child")),
  };
  check(
    (await manifest(childOnly, jobId)).status === 401,
    "a child grant without the parent cookie cannot read a private snapshot",
  );
  await request(a, `/learning/writing/drafts/${draft}/save`, {
    childId: child,
    expectedRevision: 2,
    content: { ...writing, title: "稍后修改的项目" },
    requestId: crypto.randomUUID(),
  });
  const unchanged = await part(
    a,
    jobId,
    m.parts.find((p) => p.section === "writing"),
  );
  check(
    unchanged.data.records[0].title === writing.title,
    "later edits do not mutate the already generated writing snapshot",
  );
  const secondJob = (await create(second)).data.job.id,
    secondManifest = (await manifest(second, secondJob)).data;
  check(
    (
      await part(
        second,
        secondJob,
        secondManifest.parts.find((p) => p.section === "writing"),
      )
    ).data.records[0].title === "稍后修改的项目",
    "a newly confirmed device snapshot sees the newer saved work",
  );
  const bJob = (await create(b)).data.job.id;
  await build({
    entryPoints: ["src/dataExportDownload.ts"],
    outfile: ".wrangler/export-verifier-client.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
  });
  const { prepareExportVolume } =
    await import("../.wrangler/export-verifier-client.mjs");
  const blob = await prepareExportVolume(
      m,
      m.parts,
      1,
      1,
      read(a),
      () => {},
      () => true,
    ),
    lines = (await blob.text())
      .trim()
      .split("\n")
      .map((s) => JSON.parse(s));
  check(
    lines.length === m.parts.length + 1 &&
      lines[0].manifest.job.rows === m.job.rows &&
      lines.slice(1).reduce((n, l) => n + l.records.length, 0) === m.job.rows,
    "the real authenticated download assembler preserves all manifest records in one complete JSONL volume",
  );
  let downloadedParts = 0;
  await assert.rejects(
    prepareExportVolume(
      m,
      m.parts,
      1,
      1,
      async (path) => {
        const data = await read(a)(path);
        if (++downloadedParts === 1)
          assert.equal(
            (await request(a, `/children/${sibling}/remove`, {})).status,
            200,
          );
        return data;
      },
      () => {},
      () => true,
    ),
    /EXPORT_UNAVAILABLE/,
  );
  check(
    downloadedParts === 1,
    "a child removed during preparation prevents a misleading complete download",
  );
  check(
    (await manifest(a, jobId)).status === 404 &&
      (await manifest(second, secondJob)).status === 404,
    "deleting any included child invalidates every old snapshot of that family",
  );
  check(
    (await manifest(b, bJob)).status === 200,
    "another family's active snapshot survives unrelated deletion",
  );
  check(
    (await create(a, requestId)).data.error?.code === "EXPORT_REMOVED",
    "a removed archive cannot be resurrected by replaying its old request",
  );
  const failedId = crypto.randomUUID();
  failTrigger = `export_fail_${stamp}`;
  sql(
    `CREATE TRIGGER ${failTrigger} BEFORE INSERT ON family_export_parts WHEN NEW.export_id=${quote(failedId)} AND NEW.section='writing' BEGIN SELECT RAISE(ABORT,'export-fixture-rollback'); END;`,
  );
  check(
    (await create(a, failedId)).status === 409,
    "an injected copy failure is reported as unconfirmed instead of ready",
  );
  check(
    sql(
      `SELECT (SELECT count(*) FROM family_exports WHERE id=${quote(failedId)})+(SELECT count(*) FROM family_export_parts WHERE export_id=${quote(failedId)})+(SELECT count(*) FROM family_export_commands WHERE id=${quote(failedId)}) AS n`,
    )[0].n === 0,
    "a copy failure rolls back the job, all parts and its creation receipt",
  );
  sql(`DROP TRIGGER ${failTrigger}`);
  failTrigger = null;
  const twins = await Promise.all([create(a, failedId), create(a, failedId)]);
  check(
    twins.filter((r) => r.status === 201).length === 1 &&
      twins.filter((r) => r.status === 200 && r.data.replayed).length === 1,
    "simultaneous identical create requests produce one package and one replay",
  );
  await remove(a, failedId);
  const competing = [crypto.randomUUID(), crypto.randomUUID()],
    competed = await Promise.all(competing.map((id) => create(a, id)));
  check(
    competed.filter((r) => r.status === 201).length === 1 &&
      competed.filter((r) => r.status === 409).length === 1,
    "competing request IDs cannot allocate two live packages in one login",
  );
  let liveJob = competed.find((r) => r.status === 201).data.job.id;
  check(
    sql(
      `SELECT count(*) AS n FROM family_export_commands WHERE id IN(${competing.map(quote).join(",")})`,
    )[0].n === 1,
    "the losing creation race leaves no orphan receipt",
  );
  await remove(a, liveJob);
  check(
    (await manifest(a, liveJob)).status === 404 &&
      (await remove(a, liveJob)).status === 200,
    "manual archive removal is idempotent and leaves no downloadable parts",
  );
  const expiring = (await create(a)).data.job.id;
  sql(`UPDATE family_exports SET expires_at=0 WHERE id=${quote(expiring)}`);
  check(
    (await manifest(a, expiring)).status === 404,
    "expired snapshots cannot be read even before background cleanup",
  );
  liveJob = (await create(a)).data.job.id;
  check(
    sql(
      `SELECT count(*) AS n FROM family_export_parts WHERE export_id=${quote(expiring)}`,
    )[0].n === 0,
    "a later successful operation clears expired snapshot content",
  );
  sql(
    `UPDATE household_members SET role='owner' WHERE household_id=${quote(a.home)} AND adult_id=${quote(g.id)}; UPDATE household_members SET role='guardian' WHERE household_id=${quote(a.home)} AND adult_id=${quote(a.id)};`,
  );
  check(
    (await manifest(a, liveJob)).status === 403 &&
      sql(
        `SELECT count(*) AS n FROM family_exports WHERE id=${quote(liveJob)}`,
      )[0].n === 0,
    "losing the manager role immediately purges the old archive and denies access",
  );
  sql(
    `UPDATE household_members SET role='owner' WHERE household_id=${quote(a.home)} AND adult_id=${quote(a.id)}; UPDATE household_members SET role='guardian' WHERE household_id=${quote(a.home)} AND adult_id=${quote(g.id)};`,
  );
  liveJob = (await create(a)).data.job.id;
  const removedWork = await request(
    a,
    `/learning/writing/drafts/${draft}/remove`,
    { childId: child, expectedRevision: 3 },
  );
  assert.equal(removedWork.status, 200);
  check(
    (await manifest(a, liveJob)).status === 404,
    "deleting a saved writing work invalidates its old archive copy",
  );
  liveJob = (await create(a)).data.job.id;
  sql(
    `DELETE FROM ai_connections WHERE id=${quote(connection)} AND household_id=${quote(a.home)}`,
  );
  check(
    (await manifest(a, liveJob)).status === 404,
    "removing a provider connection also invalidates its previous metadata snapshot",
  );
  liveJob = (await create(a)).data.job.id;
  sql(
    `INSERT INTO household_members(household_id,adult_id,role) VALUES(${quote(g.home)},${quote(a.id)},'owner')`,
  );
  const oldContext = { ...a.context };
  await enter(a, g.home);
  check(
    sql(
      `SELECT count(*) AS n FROM family_exports WHERE id=${quote(liveJob)}`,
    )[0].n === 0,
    "an explicit household switch purges the old family's current-login package",
  );
  await enter(a, a.home);
  liveJob = (await create(a)).data.job.id;
  check(
    (
      await request(a, `/family/exports/${liveJob}`, undefined, {
        "X-EQ-Household-ID": oldContext.id,
        "X-EQ-Household-Version": String(oldContext.version),
      })
    ).status === 409,
    "a stale parent tab cannot download after switching away and back",
  );
  const rotated = `rotated-${crypto.randomUUID()}`;
  assert.equal(
    (
      await request(a, "/auth/password", {
        currentPassword: a.password,
        newPassword: rotated,
      })
    ).status,
    200,
  );
  a.password = rotated;
  check(
    sql(
      `SELECT count(*) AS n FROM family_exports WHERE id=${quote(liveJob)}`,
    )[0].n === 0 && (await manifest(second, liveJob)).status === 401,
    "password rotation removes private packages and revokes other device access",
  );
  await login(a);
  liveJob = (await create(a)).data.job.id;
  await request(a, "/logout", {});
  check(
    sql(
      `SELECT count(*) AS n FROM family_exports WHERE id=${quote(liveJob)}`,
    )[0].n === 0 && (await manifest(a, liveJob)).status === 401,
    "logout immediately removes this verified login's package",
  );
  await request(b, "/logout", {});
  check(
    sql(`SELECT count(*) AS n FROM family_exports WHERE id=${quote(bJob)}`)[0]
      .n === 0,
    "logout also removes the other family's own snapshot",
  );
  // Dedicated same-IP verification budget; ordinary tests isolate their IP buckets.
  await login(a);
  const untilReset = 300000 - (Date.now() % 300000);
  if (untilReset < 5000) await delay(untilReset + 50);
  const ip = "198.19.250.250";
  let last;
  for (let i = 0; i < 16; i++)
    last = await request(
      a,
      "/family/exports/create",
      {
        requestId: crypto.randomUUID(),
        householdId: a.context.id,
        currentPassword: "wrong-password",
        confirmed: true,
      },
      { "CF-Connecting-IP": ip },
    );
  check(
    last.status === 429 && Number(last.retry) > 0,
    "repeated export reauthentication is rate-limited with a retry interval",
  );
  console.log(
    `${checks} private family export checks passed on local workerd/D1. Browser disk saving and remote deployment remain unverified.`,
  );
} finally {
  if (failTrigger) sql(`DROP TRIGGER IF EXISTS ${failTrigger}`);
  for (const actor of [a, b, g, second, admin])
    if (actor.jar.has("eq_account")) await request(actor, "/logout", {});
  const ids = sql(
      `SELECT adult_id FROM account_credentials WHERE username IN(${people.map((p) => quote(p.name)).join(",")})`,
    ).map((r) => r.adult_id),
    homes = ids.length
      ? sql(
          `SELECT DISTINCT h.id FROM households h JOIN household_members m ON m.household_id=h.id WHERE m.adult_id IN(${ids.map(quote).join(",")}) AND h.name LIKE ${quote(`导出验证-${stamp}-%`)}`,
        ).map((r) => r.id)
      : [];
  if (ids.length) {
    const file = `.wrangler/export-cleanup-${stamp}.sql`;
    await writeFile(
      file,
      `DELETE FROM account_audit WHERE actor_id IN(${ids.map(quote).join(",")}) OR target_id IN(${ids.map(quote).join(",")});\n${homes.length ? `DELETE FROM households WHERE id IN(${homes.map(quote).join(",")});` : ""}\nDELETE FROM adults WHERE id IN(${ids.map(quote).join(",")});`,
    );
    try {
      run(["d1", "execute", "DB", "--local", "--file", file], {
        capture: true,
      });
    } finally {
      await unlink(file);
    }
  }
}
