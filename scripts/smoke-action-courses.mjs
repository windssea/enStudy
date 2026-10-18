import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { run } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  jar = new Map(),
  second = new Map();
const release = JSON.parse(
    await readFile("content/action-course-release.latest.json", "utf8"),
  ),
  byId = new Map(release.items.map((i) => [i.id, i]));
let child,
  labChild,
  checks = 0,
  player = "3",
  independent = 0;
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
      "X-EQ-Player-Version": player,
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of r.headers.getSetCookie()) {
    const p = header.split(";")[0],
      at = p.indexOf("="),
      key = p.slice(0, at),
      value = p.slice(at + 1);
    if (value) cookies.set(key, value);
    else cookies.delete(key);
  }
  return { status: r.status, data: await r.json() };
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
const open = (body) =>
  request("/sessions", { ...body, clientRequestId: crypto.randomUUID() });
const answer = (item) =>
  item.type === "sort"
    ? Object.entries(item.placements).map(([c, g]) => `${c}=${g}`)
    : ["repair", "evidence"].includes(item.type)
      ? JSON.parse(item.answers[0])
      : item.type === "order"
        ? item.answers[0].replace(/([.!?,])/g, " $1").split(/\s+/)
        : item.answers[0];
const submit = (s, value, cookies = jar, event = crypto.randomUUID()) =>
  request(
    "/attempts",
    {
      sessionId: s.id,
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
      eventId: event,
      answer: value,
    },
    cookies,
  );
const advance = (s, cookies = jar) =>
  request(
    `/sessions/${s.id}/next`,
    { assignmentId: s.assignmentId, leaseId: s.leaseId },
    cookies,
  );
async function finish(session, { probe = false, lab = false } = {}) {
  let s = session,
    cookies = jar,
    result;
  for (let index = 1; index <= 9; index++) {
    const item = byId.get(s.exercise.id);
    assert.ok(item, `published fourth-unit item ${s.exercise.id}`);
    assert.ok(!JSON.stringify(s.exercise).includes('"answers"'));
    if (item.type === "listen") {
      if (probe && index === 1)
        check(
          (await submit(s, answer(item), cookies)).status === 409,
          "new listening tasks cannot be graded before confirmation or text support",
        );
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
    }
    if (probe && item.type === "repair")
      check(
        (await submit(s, ["unknown", "is"], cookies)).status === 422,
        "unknown correction part creates no answer",
      );
    if (probe && item.type === "sort")
      check(
        (await submit(s, answer(item).slice(1), cookies)).status === 422,
        "an incomplete new classification cannot consume an attempt",
      );
    const event = crypto.randomUUID(),
      saved = await submit(s, answer(item), cookies, event);
    assert.equal(saved.status, 201, item.id);
    assert.ok(["correct", "hinted"].includes(saved.data.outcome), item.id);
    if (lab && item.type === "repair")
      check(
        saved.data.support === "example" && !saved.data.independentEvidence,
        "the previously demonstrated sitting form stays assisted in new course correction",
      );
    if (lab && item.type === "sort")
      check(
        saved.data.support === "example" && !saved.data.independentEvidence,
        "the same demonstrated lemma stays assisted in new course classification",
      );
    if (probe && item.type === "repair") {
      const snapshot = (
        await request(`/sessions/${s.id}/snapshot`, undefined, cookies)
      ).data;
      check(
        JSON.stringify(snapshot.receipt) === JSON.stringify(saved.data) &&
          JSON.stringify(snapshot.session.exercise) ===
            JSON.stringify(s.exercise),
        "new editing assignment restores its exact receipt and public word parts",
      );
      check(
        JSON.stringify((await submit(s, answer(item), cookies, event)).data) ===
          JSON.stringify(saved.data),
        "saved correction replay does not regrade or reward twice",
      );
      const readonly = (
        await request(`/sessions/${s.id}/snapshot`, undefined, second)
      ).data.session;
      const claimed = await request(
        `/sessions/${s.id}/takeover`,
        {
          clientRequestId: crypto.randomUUID(),
          expectedLeaseVersion: readonly.leaseVersion,
        },
        second,
      );
      assert.equal(claimed.status, 200);
      check(
        claimed.data.session.assignmentId === s.assignmentId &&
          JSON.stringify(claimed.data.receipt) === JSON.stringify(saved.data),
        "another device takes over the mixed lesson without losing its saved correction",
      );
      check(
        (await advance(s, cookies)).status === 409,
        "previous device cannot advance the handed-over course",
      );
      s = claimed.data.session;
      cookies = second;
    }
    const next = await advance(s, cookies);
    assert.equal(next.status, 200, item.id);
    if (index < 9) {
      assert.equal(next.data.completed, undefined);
      s = next.data.session;
    } else {
      assert.ok(next.data.completed);
      result = next.data.result;
    }
  }
  assert.equal(result.total, 9);
  assert.equal(result.correct, 9);
  return result;
}
try {
  check(
    (await open({ lessonId: "P1A-U04-L1" })).status === 401,
    "anonymous fourth-unit start is denied",
  );
  assert.equal((await login(jar)).status, 200);
  child = (await request("/children", { nickname: "第四单元验证", grade: 6 }))
    .data.id;
  assert.ok(child);
  await request(`/children/${child}/select`, {});
  assert.equal((await login(second)).status, 200);
  assert.equal(
    (await request(`/children/${child}/select`, {}, second)).status,
    200,
  );
  const meta = (await request("/lessons")).data;
  check(
    meta.lessons.length === 168 &&
      new Set(meta.lessons.map((l) => l.unitId)).size === 42,
    "authoritative catalog contains six A-term units and one B-term unit for every grade and 168 lessons",
  );
  const old = (await open({ exerciseId: "sample.be.1" })).data;
  player = "2";
  check(
    (await open({ lessonId: "P1A-U04-L1" })).data.error?.code ===
      "PLAYER_UPDATE_REQUIRED",
    "version two cannot start a mixed lesson it cannot render",
  );
  player = "3";
  check(
    (await request("/sessions/current")).data.session.assignmentId ===
      old.assignmentId,
    "unsupported lesson attempt leaves the current assignment intact",
  );
  for (const lesson of release.lessons) {
    assert.equal(
      (await request(`/learning/lessons/${lesson.id}/view`, {})).status,
      200,
    );
    const started = await open({ lessonId: lesson.id });
    assert.equal(started.status, 201, lesson.id);
    const result = await finish(started.data, {
      probe: lesson.id === "P1A-U04-L1",
    });
    independent += result.independent;
    check(
      result.correct === 9,
      `${lesson.id} completes all nine authored mixed tasks on local D1`,
    );
  }
  check(
    independent > 0 && independent < 216,
    "repeated disclosed targets remain assisted instead of claiming 216 independent successes",
  );
  const summary = (await request("/learning/summary")).data;
  check(
    summary.completedLessons.length === 24 &&
      summary.completedLessons.every((l) => l.lessonId.includes("-U04-")),
    "twenty-four new course results persist once without completing other units",
  );
  const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
  const sql = (command) =>
    JSON.parse(
      run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
        capture: true,
      }),
    )[0].results;
  const counts = sql(
    `SELECT COUNT(*) AS count,SUM(total) AS tasks,SUM(correct) AS correct,SUM(independent) AS independent FROM session_results WHERE child_id=${quote(child)}`,
  )[0];
  check(
    counts.count === 24 &&
      counts.tasks === 216 &&
      counts.correct === 216 &&
      counts.independent === independent,
    "D1 result totals match every saved assignment and independent subtotal",
  );
  const origin = sql(
    `SELECT DISTINCT si.content_release_id AS origin FROM session_items si WHERE si.child_id=${quote(child)} AND si.item_id LIKE 'P%A-U04-%'`,
  );
  check(
    JSON.stringify(origin.map((row) => row.origin).sort()) ===
      JSON.stringify([...release.releases].sort()),
    "new assignments retain their actual release origin without copying older release memberships",
  );
  sql(
    `UPDATE review_cards SET due_at=${Date.now() - 86400000} WHERE child_id=${quote(child)}`,
  );
  const review = await open({ mode: "review" });
  const reviewSkills =
    review.status === 201
      ? sql(
          `SELECT i.primary_skill_id AS skill,i.modality FROM session_items si JOIN items i ON i.id=si.item_id AND i.version=si.item_version WHERE si.session_id=${quote(review.data.id)}`,
        )
      : [];
  const learnedSkills = new Set(
    release.items.map((item) => `${item.skill}:${item.modality}`),
  );
  check(
    review.status === 201 &&
      review.data.source === "review" &&
      reviewSkills.length > 0 &&
      reviewSkills.every((item) =>
        learnedSkills.has(`${item.skill}:${item.modality}`),
      ),
    "new seven-type learning evidence feeds shared skills into the existing due-review player",
  );
  const reviewId = review.data.id;
  labChild = (
    await request("/children", { nickname: "第四单元示范验证", grade: 3 })
  ).data.id;
  assert.ok(labChild);
  await request(`/children/${labChild}/select`, {});
  check(
    (await request(`/sessions/${reviewId}/snapshot`)).status === 404,
    "a sibling cannot read another child's new-course review assignments",
  );
  assert.equal(
    (await request("/learning/concepts/forms.ing/view", { caseId: "sit" }))
      .status,
    200,
  );
  const labStart = await open({ lessonId: "P3A-U04-L4" });
  assert.equal(labStart.status, 201);
  await finish(labStart.data, { lab: true });
  for (const path of [
    "/content/action-courses.v1.json",
    "/content/action-course-release.v1.json",
    "/content/action-course-release.latest.json",
  ])
    check(
      (await fetch(`http://127.0.0.1:5173${path}`)).status === 403,
      `private fourth-unit source is blocked ${path}`,
    );
  console.log(
    `${checks} fourth-unit checks passed; 24 lessons / 216 main-course tasks persisted, independent=${independent}. Audio confirmation is simulated; no real-device or cloud deployment test.`,
  );
} finally {
  for (const id of [labChild, child].filter(Boolean))
    if (jar.has("eq_account"))
      assert.equal(
        (await request(`/children/${id}/remove`, {})).status,
        200,
        "remove disposable fourth-unit profile",
      );
  for (const cookies of [second, jar])
    if (cookies.has("eq_account")) await request("/logout", {}, cookies);
}
