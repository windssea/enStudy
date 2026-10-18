import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { wrangler } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  jar = new Map();
const expansion = JSON.parse(
    await readFile("content/course-expansion.latest.json", "utf8"),
  ),
  foundation = JSON.parse(
    await readFile("content/course-release.v1.json", "utf8"),
  );
const byId = new Map(
  [...foundation.items, ...expansion.items].map((i) => [i.id, i]),
);
let child,
  archiveChild,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(path, body, cookies = jar) {
  const r = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const h of r.headers.getSetCookie()) {
    const p = h.split(";")[0],
      at = p.indexOf("="),
      k = p.slice(0, at),
      v = p.slice(at + 1);
    if (v) cookies.set(k, v);
    else cookies.delete(k);
  }
  return { status: r.status, data: await r.json() };
}
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
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
  assert.equal(r.status, 0, "synthetic local course fixture query");
  return JSON.parse(r.stdout)[0].results;
}
const open = (body) =>
  request("/sessions", { ...body, clientRequestId: crypto.randomUUID() });
const submit = (s, answer) =>
  request("/attempts", {
    eventId: crypto.randomUUID(),
    sessionId: s.id,
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
    answer,
  });
async function finish(session) {
  let s = session,
    last,
    result;
  for (let step = 0; step < s.total; step++) {
    const item = byId.get(s.exercise.id);
    assert.ok(item);
    last = await submit(s, item.answers[0]);
    assert.equal(last.status, 201);
    assert.ok(["correct", "hinted"].includes(last.data.outcome));
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
  return result;
}
try {
  check(
    (await request("/learning/lessons/P1A-U02-L1/view", {}, new Map()))
      .status === 401,
    "anonymous demonstration logging denied",
  );
  assert.equal(
    (
      await request("/auth/login", {
        username: "admin",
        password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
      })
    ).status,
    200,
  );
  child = (await request("/children", { nickname: "新课程验证", grade: 1 }))
    .data.id;
  assert.ok(child);
  await request(`/children/${child}/select`, {});
  const catalog = (await request("/lessons")).data.lessons;
  check(
    catalog.length === 216 && new Set(catalog.map((l) => l.unitId)).size === 54,
    "public catalog includes six units for all six grades",
  );
  check(
    (await request("/learning/lessons/unknown/view", {})).status === 404,
    "unknown lesson cannot create arbitrary exposures",
  );
  let firstResult,
    allIndependent = 0,
    allCorrect = 0;
  for (const lesson of expansion.lessons) {
    assert.equal(
      (await request(`/learning/lessons/${lesson.id}/view`, {})).status,
      200,
    );
    const started = await open({ lessonId: lesson.id });
    assert.equal(started.status, 201, lesson.id);
    assert.equal(started.data.total, 9);
    const frozen = (await request(`/sessions/${started.data.id}`)).data;
    assert.deepEqual(frozen.exercise, started.data.exercise);
    const result = await finish(started.data);
    assert.equal(result.correct, 9);
    allCorrect += result.correct;
    allIndependent += result.independent;
    if (!firstResult) firstResult = result;
  }
  check(
    allCorrect === 216,
    "all twenty-four new lessons complete all nine correct tasks on real workerd/D1",
  );
  check(
    firstResult.independent === 9,
    "new first lesson's demonstrated examples do not pre-answer its nine practice contexts",
  );
  check(
    allIndependent === 213,
    "three repeated integration sentences count as assisted instead of inflating independent totals",
  );
  const summary = (await request("/learning/summary")).data;
  check(
    summary.completedLessons.length === 24 &&
      summary.completedLessons.find((l) => l.lessonId === "P1A-U02-L1")
        .bestIndependent === 9,
    "new lesson completion and independent evidence survive report aggregation",
  );
  const publicText = JSON.stringify(catalog);
  check(
    !publicText.includes('"answers"') &&
      !publicText.includes('"private_answer_json"'),
    "public course material carries examples without private practice keys",
  );
  const keys = sql(
    `SELECT evidence_key FROM teaching_exposures WHERE child_id=${quote(child)}`,
  );
  check(
    keys.length > 200 &&
      keys.every((r) => /^sha256:[a-f0-9]{64}$/.test(r.evidence_key)),
    "D1 exposure records contain hashes rather than raw example sentences",
  );
  const singleton = await open({ exerciseId: "P1A-U01-L3.f1.choice" });
  assert.equal(singleton.status, 201);
  await request("/learning/lessons/P1A-U01-L3/view", {});
  const supported = await submit(singleton.data, "am");
  check(
    supported.data.outcome === "hinted" &&
      supported.data.support === "example" &&
      !supported.data.independentEvidence,
    "viewed demonstration suppresses independent evidence even outside a lesson session",
  );
  const replay = await request("/attempts", {
    eventId: crypto.randomUUID(),
    sessionId: singleton.data.id,
    assignmentId: singleton.data.assignmentId,
    leaseId: singleton.data.leaseId,
    answer: "am",
  });
  check(
    replay.status === 200 && replay.data.eventId === supported.data.eventId,
    "supported receipt replay remains immutable and awards once",
  );
  // Model a later day only in this synthetic child's exposure and review rows.
  sql(
    `UPDATE teaching_exposures SET shown_day='2000-01-01' WHERE child_id=${quote(child)}; UPDATE review_cards SET due_at=0,last_success_day='2000-01-01' WHERE child_id=${quote(child)} AND skill_id='grammar.be.present';`,
  );
  const recalled = (await open({ exerciseId: "P1A-U01-L3.f1.choice" })).data,
    independent = await submit(recalled, "am");
  check(
    independent.data.outcome === "correct" &&
      independent.data.independentEvidence,
    "later retrieval without a fresh demonstration can supply independent review evidence",
  );
  await request("/learning/lessons/P1A-U01-L3/view", {});
  const reminded = (await open({ exerciseId: "P1A-U01-L3.f1.input" })).data;
  check(
    (await submit(reminded, "am")).data.support === "example",
    "another modality cannot bypass a same-day example exposure",
  );
  const parent = (await request("/me")).data.adult.householdId;
  sql(
    `UPDATE review_cards SET due_at=${Date.now() + 864000000} WHERE child_id=${quote(child)}; INSERT OR IGNORE INTO review_cards(household_id,child_id,skill_id,modality,stage,due_at,lapses,independent_successes,last_success_day,version) VALUES(${quote(parent)},${quote(child)},'vocabulary.greetings','recognition',0,0,0,0,NULL,0); UPDATE review_cards SET due_at=0 WHERE child_id=${quote(child)} AND skill_id='grammar.adverbs.degree' AND modality='controlled-production';`,
  );
  const review = await open({ mode: "review" });
  assert.equal(review.status, 201);
  const origins = sql(
    `SELECT DISTINCT content_release_id AS origin FROM session_items WHERE session_id=${quote(review.data.id)}`,
  );
  check(
    review.data.total === 2 && origins.length === 2,
    "one review round validates and freezes content from separate original releases without copying memberships",
  );
  await finish(review.data);
  const legacy = (await open({ lessonId: "P1A-U01-L3" })).data;
  await finish(legacy);
  sql(
    `UPDATE session_results SET independent=9 WHERE session_id=${quote(legacy.id)} AND child_id=${quote(child)}`,
  );
  const adjusted = (await request("/learning/summary")).data;
  check(
    adjusted.recent.find((r) => r.sessionId === legacy.id).independent === 0 &&
      sql(
        `SELECT independent FROM session_results WHERE session_id=${quote(legacy.id)}`,
      )[0].independent === 9,
    "historical demonstration summaries are adjusted without rewriting stored receipts or source results",
  );
  archiveChild = (
    await request("/children", { nickname: "课程版本验证", grade: 1 })
  ).data.id;
  await request(`/children/${archiveChild}/select`, {});
  const hintedItem = foundation.items.find(
    (i) => i.lessonId === "P5A-U01-L3" && i.type === "choice",
  );
  const hinted = (await open({ exerciseId: hintedItem.id })).data;
  assert.equal(
    (
      await request(`/sessions/${hinted.id}/hint`, {
        assignmentId: hinted.assignmentId,
        leaseId: hinted.leaseId,
      })
    ).status,
    200,
  );
  const changedMode = (
    await open({ exerciseId: hintedItem.id.replace(".choice", ".input") })
  ).data;
  const changedAnswer = await submit(changedMode, hintedItem.answers[0]);
  check(
    changedAnswer.data.outcome === "hinted" &&
      !changedAnswer.data.independentEvidence,
    "abandoning a hinted question and changing modality cannot manufacture independent evidence",
  );
  const current = (await open({ lessonId: "P1A-U02-L2" })).data;
  const currentVersions = sql(
    `SELECT DISTINCT item_version FROM session_items WHERE session_id=${quote(current.id)}`,
  );
  check(
    currentVersions.length === 1 && currentVersions[0].item_version === 2,
    "new composite lessons freeze the reviewed v2 content version",
  );
  // Simulate an already persisted v1 assignment without rewriting its item row.
  sql(
    `UPDATE session_items SET item_version=1,content_release_id='course-expansion-v1' WHERE session_id=${quote(current.id)}; UPDATE learning_sessions SET release_id='course-expansion-v1' WHERE id=${quote(current.id)};`,
  );
  const historic = (await request(`/sessions/${current.id}`)).data;
  assert.equal((await submit(historic, "is")).status, 201);
  check(
    sql(
      `SELECT count(*) AS n FROM review_cards WHERE child_id=${quote(archiveChild)} AND skill_id='grammar.demonstratives'`,
    )[0].n === 1,
    "historical v1 assignment keeps its original target while v2 is active",
  );
  const countBefore = sql(
    `SELECT count(*) AS n FROM teaching_exposures WHERE child_id=${quote(child)}`,
  )[0].n;
  await request("/learning/lessons/P1A-U01-L3/view", {});
  check(
    sql(
      `SELECT count(*) AS n FROM teaching_exposures WHERE child_id=${quote(child)}`,
    )[0].n === countBefore,
    "viewing material under another child cannot change the first child's exposure records",
  );
  console.log(
    `${checks} expansion/exposure checks passed on local workerd/D1. Fixtures only affect disposable children; no cloud/provider calls.`,
  );
} finally {
  if (jar.has("eq_account")) {
    for (const id of [child, archiveChild].filter(Boolean))
      assert.equal((await request(`/children/${id}/remove`, {})).status, 200);
    await request("/logout", {});
  }
}
