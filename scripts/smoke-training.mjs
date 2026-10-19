import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { wrangler } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  bank = JSON.parse(await readFile("content/topic-release.v1.json", "utf8")),
  reserved = JSON.parse(
    await readFile("content/training-reserved-release.latest.json", "utf8"),
  ),
  byId = new Map([...bank.items, ...reserved.items].map((i) => [i.id, i]));
const jar = new Map(),
  device = new Map();
let child,
  otherChild,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(path, body, cookies = jar) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const h of response.headers.getSetCookie()) {
    const p = h.split(";")[0],
      at = p.indexOf("="),
      k = p.slice(0, at),
      v = p.slice(at + 1);
    if (v) cookies.set(k, v);
    else cookies.delete(k);
  }
  return { status: response.status, data: await response.json() };
}
const login = (cookies) =>
  request(
    "/auth/login",
    {
      username: "admin",
      password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
    },
    cookies,
  );
const create = (topicId, id = crypto.randomUUID()) =>
  request("/training/cycles", { topicId, clientRequestId: id });
const read = async (id) => {
  const r = await request(`/training/cycles/${id}`);
  assert.equal(r.status, 200);
  return r.data;
};
const open = (cycle, extra = {}) =>
  request("/sessions", {
    topicId: cycle.topicId,
    trainingCycleId: cycle.id,
    trainingVersion: cycle.version,
    clientRequestId: crypto.randomUUID(),
    ...extra,
  });
const claim = (s, cookies, resume = false, id = crypto.randomUUID()) =>
  request(
    `/sessions/${s.id}/takeover`,
    {
      clientRequestId: id,
      expectedLeaseVersion: s.leaseVersion,
      ...(resume ? { resume: true } : {}),
    },
    cookies,
  );
const snapshot = async (s, cookies = jar) => {
  const r = await request(`/sessions/${s.id}/snapshot`, undefined, cookies);
  assert.equal(r.status, 200);
  return r.data;
};
function sql(command) {
  const r = spawnSync(
    process.execPath,
    [
      wrangler,
      "d1",
      "execute",
      "DB",
      "--local",
      "--json",
      "--command",
      command,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  assert.equal(r.status, 0, "synthetic local training fixture query");
  return JSON.parse(r.stdout)[0].results;
}
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
async function finish(s, { mixed = false, seen = new Set() } = {}) {
  const phase = s.training?.phase,
    patterns = new Set();
  let result;
  for (let index = (s.position ?? 1) - 1; index < s.total; index++) {
    const item = byId.get(s.exercise.id);
    assert.ok(item);
    assert.ok(!seen.has(item.family), "no exposed family reused in cycle");
    seen.add(item.family);
    patterns.add(item.pattern);
    const state = await snapshot(s);
    if (!state.receipt) {
      if (mixed && index === 1)
        assert.equal(
          (
            await request(`/sessions/${s.id}/hint`, {
              assignmentId: s.assignmentId,
              leaseId: s.leaseId,
            })
          ).status,
          200,
        );
      const saved = await request("/attempts", {
        eventId: crypto.randomUUID(),
        sessionId: s.id,
        assignmentId: s.assignmentId,
        leaseId: s.leaseId,
        answer: mixed && index === 0 ? "not-the-answer" : item.answers[0],
      });
      assert.equal(saved.status, 201);
    }
    const next = await request(`/sessions/${s.id}/next`, {
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
    });
    assert.equal(next.status, 200);
    if (next.data.completed) {
      result = next.data.result;
      break;
    }
    s = next.data.session;
  }
  assert.ok(result);
  return { result, patterns, seen, phase };
}
async function advanceAnchor(cycle, days) {
  const transfer = cycle.results.find((r) => r.phase === "transfer");
  assert.ok(transfer);
  const anchor = Date.now() - days * 86400000;
  sql(
    `UPDATE session_results SET completed_at=${anchor} WHERE session_id=${quote(transfer.sessionId)} AND child_id=${quote(child)};`,
  );
  for (const visit of cycle.results.filter(
    (r) => r.phase === "retest" && r.completedAt,
  ))
    sql(
      `UPDATE session_results SET completed_at=${anchor + visit.checkpoint * 86400000} WHERE session_id=${quote(visit.sessionId)} AND child_id=${quote(child)};`,
    );
}
try {
  check(
    (await request("/training/cycles", undefined, new Map())).status === 401,
    "anonymous training history rejected",
  );
  assert.equal((await login(jar)).status, 200);
  child = (await request("/children", { nickname: "分步特训验证", grade: 3 }))
    .data.id;
  assert.ok(child);
  await request(`/children/${child}/select`, {});
  check(
    (await create("unknown-topic")).status === 422 &&
      (
        await request("/training/cycles", {
          topicId: "grammar.be",
          clientRequestId: [crypto.randomUUID()],
        })
      ).status === 422,
    "unknown topics and non-string request IDs rejected",
  );
  const nonce = crypto.randomUUID(),
    made = await Promise.all([
      create("grammar.be", nonce),
      create("grammar.be", nonce),
    ]),
    cycle = made[0].data;
  // Preserve the full original v1 allocation regression. These rows belong
  // only to this disposable local child; dedicated editions have their own suite.
  sql(
    `UPDATE training_cycles SET material_release_id=NULL,material_adopted_at=NULL WHERE id=${quote(cycle.id)} AND child_id=${quote(child)};`,
  );
  Object.assign(cycle, await read(cycle.id));
  check(
    made.every((r) => [200, 201].includes(r.status)) &&
      made[1].data.id === cycle.id,
    "concurrent cycle creation preserves one plan",
  );
  check(
    (await create("grammar.be")).data.id === cycle.id &&
      (await create("forms.ing", nonce)).status === 409,
    "new nonce cannot reset a plan or change a request topic",
  );
  check(
    (await open(cycle, { trainingVersion: 99 })).status === 409 &&
      (await open(cycle, { roundSize: 20 })).status === 422,
    "client cannot choose a later version or assessment length",
  );
  const firstId = crypto.randomUUID(),
    opened = await Promise.all([
      open(cycle, { clientRequestId: firstId }),
      open(cycle, { clientRequestId: firstId }),
    ]);
  let s = opened[0].data;
  check(
    opened.every((r) => [200, 201].includes(r.status)) &&
      s.total === 5 &&
      s.training.phase === "diagnostic",
    "diagnostic concurrent retry freezes one five-item phase",
  );
  check(
    (await open(await read(cycle.id))).status === 409,
    "unfinished diagnostic cannot be skipped",
  );
  check(
    !JSON.stringify(await read(cycle.id)).includes('"answers"') &&
      JSON.stringify((await snapshot(s)).session.exercise) ===
        JSON.stringify(s.exercise),
    "public plan hides keys and refresh freezes the presentation",
  );
  const wrong = await request("/attempts", {
    eventId: crypto.randomUUID(),
    sessionId: s.id,
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
    answer: "not-the-answer",
  });
  assert.equal(wrong.status, 201);
  const normal = (
    await request("/sessions", {
      topicId: "grammar.articles",
      roundSize: 5,
      clientRequestId: crypto.randomUUID(),
    })
  ).data;
  const paused = await snapshot(s);
  check(
    paused.session.state === "paused" && paused.receipt.outcome === "incorrect",
    "opening another task preserves paused phase and saved receipt",
  );
  assert.equal((await login(device)).status, 200);
  await request(`/children/${child}/select`, {}, device);
  assert.equal((await claim(normal, device)).status, 200);
  check(
    (await claim(paused.session, jar, true)).status === 409 &&
      (await snapshot(normal, device)).session.state === "active",
    "resuming a paused phase cannot silently pause another device's active task",
  );
  const resumeId = crypto.randomUUID(),
    resumed = await claim(paused.session, device, true, resumeId);
  assert.equal(resumed.status, 200);
  check(
    resumed.data.session.assignmentId === s.assignmentId &&
      resumed.data.receipt.eventId === wrong.data.eventId &&
      (await snapshot(normal, device)).session.state === "paused",
    "explicit resume restores original phase assignment and receipt atomically",
  );
  const replay = await claim(paused.session, device, true, resumeId);
  check(
    replay.status === 200 &&
      replay.data.session.leaseId === resumed.data.session.leaseId,
    "paused resume retry cannot rotate the lease twice",
  );
  const blocked = await request(`/sessions/${s.id}/hint`, {
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
  });
  check(
    blocked.status === 409,
    "previous device cannot write after explicit phase resume",
  );
  jar.clear();
  for (const [k, v] of device) jar.set(k, v);
  s = resumed.data.session;
  const diag = await finish(s, { mixed: true }),
    view = await read(cycle.id);
  check(
    diag.result.independent === 3 &&
      diag.result.correct === 4 &&
      view.coaching.length === 2 &&
      view.next.phase === "practice",
    "diagnostic distinguishes independent hinted and incorrect work with specific rule cards",
  );
  const competitors = await Promise.all([open(view), open(view)]),
    practice = competitors.find((r) => r.status === 201);
  assert.ok(practice);
  check(
    competitors.filter((r) => r.status === 409).length === 1 &&
      (await snapshot(practice.data)).session.state === "active",
    "competing phase claims keep exactly one active run and roll back the losing pause",
  );
  const practised = await finish(practice.data, { seen: diag.seen });
  check(
    practised.result.total === 10 && practised.seen.size === 15,
    "practice uses ten new families instead of repeating diagnosis",
  );
  const transfer = await open(await read(cycle.id));
  assert.equal(transfer.status, 201);
  const applied = await finish(transfer.data, { seen: practised.seen });
  check(
    [...applied.patterns].every(
      (p) => !diag.patterns.has(p) && !practised.patterns.has(p),
    ),
    "application uses a task frame withheld from diagnosis and practice",
  );
  let current = await read(cycle.id);
  check(
    current.next.phase === "retest" &&
      current.next.checkpoint === 1 &&
      (await open(current, { checkpoint: 7 })).status === 409,
    "same-day retest and client checkpoint override are blocked",
  );
  for (const day of [1, 3, 7]) {
    await advanceAnchor(current, day);
    current = await read(cycle.id);
    const retest = await open(current);
    assert.equal(retest.status, 201);
    assert.equal(retest.data.training.checkpoint, day);
    await finish(retest.data, { seen: applied.seen });
    current = await read(cycle.id);
  }
  check(
    current.finished &&
      current.results.length === 6 &&
      applied.seen.size === 35,
    "all three delayed checkpoints use fifteen additional unseen families",
  );
  check(
    (await open(current)).status === 409 &&
      (await create("grammar.be")).data.id === cycle.id,
    "completed cycle cannot be reset to manufacture another assessment",
  );
  const record = sql(
    `SELECT count(*) AS total,max(stage) AS stage FROM review_cards WHERE child_id=${quote(child)} AND skill_id='grammar.be.present'`,
  )[0];
  check(
    record.total > 0 && record.total <= 2 && record.stage === 0,
    "all phases share the original cards without same-day repeated promotion",
  );
  const lexical = (await create("forms.ing")).data,
    ld = await finish((await open(lexical)).data),
    lp = await finish((await open(await read(lexical.id))).data, {
      seen: ld.seen,
    }),
    lt = await finish((await open(await read(lexical.id))).data, {
      seen: lp.seen,
    });
  check(
    (await read(lexical.id)).scope === "new-lexeme" && lt.seen.size === 20,
    "lexical banks state their limited transfer scope and keep material disjoint",
  );
  await advanceAnchor(await read(lexical.id), 7);
  const late = await read(lexical.id);
  assert.equal(late.next.checkpoint, 7);
  await finish((await open(late)).data, { seen: lt.seen });
  const merged = await read(lexical.id);
  check(
    merged.finished &&
      merged.results.filter((r) => r.phase === "retest").length === 1,
    "returning after a week merges missed checkpoints into one actual visit",
  );
  const exhausted = (await create("grammar.countability")).data;
  sql(
    `UPDATE training_cycles SET material_release_id=NULL,material_adopted_at=NULL WHERE id=${quote(exhausted.id)} AND child_id=${quote(child)};`,
  );
  Object.assign(exhausted, await read(exhausted.id));
  for (let i = 0; i < 3; i++)
    assert.equal(
      (
        await request("/sessions", {
          topicId: "grammar.countability",
          roundSize: 20,
          clientRequestId: crypto.randomUUID(),
        })
      ).status,
      201,
    );
  const noFresh = await open(exhausted);
  check(
    noFresh.status === 409 &&
      noFresh.data.error.code === "TRAINING_CONTENT_EXPOSED" &&
      (await read(exhausted.id)).next.sessionId === null,
    "fully exposed banks cannot be relabelled as a fresh diagnostic",
  );
  for (const topic of Object.keys(bank.stats).filter(
    (id) => !["grammar.be", "forms.ing", "grammar.countability"].includes(id),
  )) {
    const plan = (await create(topic)).data;
    const phase = await open(plan);
    assert.equal(phase.status, 201, topic);
    assert.equal(phase.data.total, 5);
    assert.equal(byId.get(phase.data.exercise.id).topicId, topic);
  }
  check(
    (await request("/training/cycles")).data.items.length === 60,
    "sixty topic plans preserve their separate steps across all eight categories",
  );
  const overview = (await request("/training/cycles")).data.items.find(
    (r) => r.id === cycle.id,
  );
  check(
    JSON.stringify(overview.results) === JSON.stringify(current.results) &&
      overview.coaching.length === 2,
    "batched sixty-plan overview preserves detailed saved results and coaching",
  );
  otherChild = (
    await request("/children", { nickname: "特训隔离验证", grade: 2 })
  ).data.id;
  await request(`/children/${otherChild}/select`, {});
  check(
    (await request(`/training/cycles/${cycle.id}`)).status === 404 &&
      (await request("/training/cycles")).data.items.length === 0,
    "another child cannot read or resume this child's training plans",
  );
  check(
    (await open(current)).status === 409,
    "foreign child cannot create a phase for this cycle",
  );
  const fresh = (await create("grammar.countability")).data;
  check(
    (await open(fresh)).status === 201,
    "the sixtieth topic assessment remains available to an unexposed child",
  );
  console.log(
    `${checks} training checks passed on local workerd/D1. Calendar fixtures touch only this disposable child's results; no cloud changes.`,
  );
} finally {
  if (jar.has("eq_account")) {
    for (const id of [child, otherChild].filter(Boolean))
      assert.equal((await request(`/children/${id}/remove`, {})).status, 200);
    await request("/logout", {});
  }
}
