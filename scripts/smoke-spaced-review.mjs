import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { run } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  jar = new Map();
const samples = JSON.parse(await readFile("content/exercises.json", "utf8"));
let child,
  sibling,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(path, body, extra = {}) {
  const response = await fetch(base + "/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Connection: "close",
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": "5",
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0],
      at = pair.indexOf("="),
      key = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) jar.set(key, value);
    else jar.delete(key);
  }
  return { status: response.status, data: await response.json() };
}
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
function sql(command) {
  assert.ok(
    child && command.includes(quote(child)),
    "fixture SQL must be scoped to its own temporary child",
  );
  return JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
}
const card = (skill) =>
  sql(
    `SELECT * FROM review_cards WHERE child_id=${quote(child)} AND skill_id=${quote(skill)}`,
  )[0];
const open = async (body) => {
  const result = await request("/sessions", {
    ...body,
    clientRequestId: crypto.randomUUID(),
  });
  assert.equal(result.status, 201, result.data.error?.message);
  return result.data;
};
const payload = (s, answer, extra = {}) => ({
  sessionId: s.id,
  assignmentId: s.assignmentId,
  leaseId: s.leaseId,
  eventId: crypto.randomUUID(),
  answer,
  ...extra,
});
const sample = (id) => samples.find((i) => i.id === id);
try {
  assert.equal(
    (await request("/health")).data.stage,
    "local",
    "this fixture only runs against local workerd",
  );
  check(
    (await request("/progress")).status === 401,
    "spaced review metadata requires a selected child's authority",
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
  child = (await request("/children", { nickname: "间隔复习核验", grade: 3 }))
    .data.id;
  assert.ok(child);
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  const legacy = sample("sample.form.go"),
    legacyDue = Date.now() + 3 * 86400000;
  sql(
    `INSERT INTO review_cards(household_id,child_id,skill_id,modality,stage,due_at,lapses,independent_successes,last_success_day,version,algorithm_version) SELECT household_id,id,${quote(legacy.skill)},${quote(legacy.modality)},3,${legacyDue},0,4,'2026-10-01',7,'rules-v3-offline' FROM children WHERE id=${quote(child)}`,
  );
  await request("/progress");
  const unchanged = card(legacy.skill);
  check(
    unchanged.due_at === legacyDue &&
      unchanged.stage === 3 &&
      unchanged.version === 7 &&
      unchanged.last_review_at === null &&
      unchanged.relearning === 0,
    "new schema and read-only planning preserve legacy dates and evidence",
  );
  const be = sample("sample.be.1"),
    s = await open({ exerciseId: be.id });
  const wrong = payload(
      s,
      be.choices.find((v) => !be.answers.includes(v)),
    ),
    failed = await request("/attempts", wrong);
  assert.equal(failed.status, 201);
  const failedCard = card(be.skill);
  check(
    failedCard.due_at - failedCard.last_review_at === 600000 &&
      failedCard.relearning === 1 &&
      failedCard.lapses === 1,
    "incorrect online retrieval schedules a genuine ten-minute relearning gap",
  );
  check(
    failed.data.reviewAlgorithm === "ebbinghaus-v1" &&
      failed.data.nextReviewAt === failedCard.due_at,
    "receipt and persistent card share the exact versioned due time",
  );
  const replay = await request("/attempts", wrong);
  check(
    JSON.stringify(replay.data) === JSON.stringify(failed.data) &&
      card(be.skill).version === failedCard.version,
    "replayed attempts preserve the original receipt and cannot reschedule twice",
  );
  const there = sample("sample.there.1"),
    correct = await request(
      "/attempts",
      payload(await open({ exerciseId: there.id }), there.answers[0]),
    );
  const first = card(there.skill);
  check(
    correct.data.independentEvidence &&
      first.due_at - first.last_review_at === 86400000 &&
      first.stage === 0,
    "first independent recall creates a full one-day review interval",
  );
  sql(
    `UPDATE review_cards SET due_at=${Date.now() - 1000},last_success_day=date(last_success_day,'-1 day') WHERE child_id=${quote(child)} AND skill_id=${quote(there.skill)}; UPDATE teaching_exposures SET shown_day=date(shown_day,'-1 day') WHERE child_id=${quote(child)}`,
  );
  const spaced = await request(
      "/attempts",
      payload(await open({ exerciseId: there.id }), there.answers[0]),
    ),
    grown = card(there.skill);
  check(
    spaced.data.independentEvidence &&
      grown.stage === 1 &&
      grown.due_at - grown.last_review_at === 3 * 86400000,
    "a simulated later independent retrieval expands the persistent interval to three days",
  );
  const past = sample("sample.past.1"),
    assistedSession = await open({ exerciseId: past.id });
  assert.equal(
    (await request(`/sessions/${assistedSession.id}/hint`, {})).status,
    200,
  );
  const assisted = await request(
      "/attempts",
      payload(assistedSession, past.answers[0]),
    ),
    assistedCard = card(past.skill);
  check(
    !assisted.data.independentEvidence &&
      assistedCard.independent_successes === 0 &&
      assistedCard.due_at - assistedCard.last_review_at === 1200000,
    "hinted success schedules twenty-minute practice without independent memory credit",
  );
  sql(
    `UPDATE review_cards SET due_at=${Date.now() - 1000} WHERE child_id=${quote(child)} AND skill_id=${quote(past.skill)}`,
  );
  await request(
    "/attempts",
    payload(await open({ exerciseId: past.id }), past.answers[0]),
  );
  const practisedAgain = card(past.skill);
  check(
    practisedAgain.relearning === 1 &&
      practisedAgain.independent_successes === 0 &&
      practisedAgain.due_at - practisedAgain.last_review_at === 86400000,
    "a completed short assisted review moves to tomorrow without an endless same-day loop",
  );
  const ing = sample("sample.form.ing"),
    offline = await request(
      "/attempts",
      payload(await open({ exerciseId: ing.id }), ing.answers[0], {
        evidenceSource: "offline_unverified",
        clientOccurredAt: Date.now(),
      }),
    );
  check(
    !offline.data.independentEvidence && offline.data.rewardDelta === 0,
    "offline synchronization cannot manufacture independent recall or rewards",
  );
  check(
    card(ing.skill).independent_successes === 0,
    "offline observations do not strengthen persistent memory stages",
  );
  const progress = (await request("/progress")).data;
  check(
    progress.reviewPlan.algorithm === "ebbinghaus-v1" &&
      progress.reviewPlan.policy.intervalDays.join(",") === "1,3,7,14,30,60" &&
      progress.reviewPlan.nextAt === failedCard.due_at,
    "all learning sources share one server-owned review policy and next appointment",
  );
  sql(
    `UPDATE review_cards SET due_at=${Date.now() - 1000} WHERE child_id=${quote(child)} AND skill_id=${quote(be.skill)}`,
  );
  const due = (await request("/progress")).data.reviewPlan;
  check(
    due.dueCount === 1 && due.relearningDue === 1,
    "review summary identifies an actual due relearning target",
  );
  const review = await open({ mode: "review" });
  check(
    review.source === "review" && review.total >= 1,
    "due knowledge opens as an ordinary active review session",
  );
  check(
    (await request("/progress", undefined, { "X-EQ-Child-ID": "wrong-child" }))
      .status === 409,
    "stale child context cannot read another child's schedule",
  );
  sibling = (
    await request("/children", { nickname: "间隔复习隔离核验", grade: 3 })
  ).data.id;
  assert.ok(sibling);
  await request(`/children/${sibling}/select`, {});
  const empty = (await request("/progress")).data;
  check(
    empty.cards.length === 0 &&
      empty.reviewPlan.dueCount === 0 &&
      empty.reviewPlan.nextAt === null,
    "another child starts with an independent empty review plan",
  );
  await request(`/children/${child}/select`, {});
  check(
    (await request("/progress")).data.reviewPlan.dueCount === 1,
    "switching profiles preserves the original child's schedule",
  );
  console.log(
    `${checks} spaced-review checks passed on local workerd/D1; dates were advanced only inside the temporary fixture.`,
  );
} finally {
  for (const id of [sibling, child].filter(Boolean))
    if (jar.has("eq_account"))
      assert.equal((await request(`/children/${id}/remove`, {})).status, 200);
  if (jar.has("eq_account")) await request("/logout", {});
}
