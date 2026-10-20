import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { run } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  jar = new Map();
const source = JSON.parse(
  await readFile("content/concept-labs.v1.json", "utf8"),
);
const topic = JSON.parse(
  await readFile("content/topic-release.v1.json", "utf8"),
);
const workshops = JSON.parse(
  await readFile("content/workshop-release.latest.json", "utf8"),
);
const discovery = JSON.parse(
  await readFile("content/discovery-course-release.v1.json", "utf8"),
);
let child,
  sibling,
  measuredChild,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(path, body, cookies = jar, extraHeaders = {}) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": "3",
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of response.headers.getSetCookie()) {
    const value = header.split(";")[0],
      at = value.indexOf("="),
      key = value.slice(0, at),
      val = value.slice(at + 1);
    if (val) cookies.set(key, val);
    else cookies.delete(key);
  }
  return { status: response.status, data: await response.json() };
}
const view = (labId = "forms.ing", caseId = "sit", cookies = jar, extra = {}) =>
  request(`/learning/concepts/${labId}/view`, { caseId }, cookies, extra);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = (command) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
const single = async (id) => {
  const value = await request("/sessions", {
    exerciseId: id,
    clientRequestId: crypto.randomUUID(),
  });
  assert.equal(value.status, 201, value.data.error?.code);
  return value.data;
};
const submit = (session, item, eventId = crypto.randomUUID()) =>
  request("/attempts", {
    eventId,
    sessionId: session.id,
    assignmentId: session.assignmentId,
    leaseId: session.leaseId,
    answer: item.answers[0],
  });
const finish = (session) =>
  request(`/sessions/${session.id}/next`, {
    assignmentId: session.assignmentId,
    leaseId: session.leaseId,
  });
try {
  check(
    (await view("forms.ing", "sit", new Map())).status === 401,
    "anonymous demonstration logging is denied",
  );
  check(
    (
      await request(
        "/learning/tense-comparison/view",
        { reference: "past", version: 1 },
        new Map(),
      )
    ).status === 401,
    "anonymous tense comparison disclosure is denied",
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
  child = (await request("/children", { nickname: "互动示范验证", grade: 6 }))
    .data.id;
  assert.ok(child);
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  check(
    (await view("unknown.lab", "sit")).status === 404,
    "unknown lab cannot stamp arbitrary teaching records",
  );
  for (const body of [
    null,
    [],
    {},
    { caseId: 5 },
    { caseId: "__proto__" },
    { caseId: "not-in-this-lab" },
  ])
    assert.equal(
      (await request("/learning/concepts/forms.ing/view", body)).status,
      422,
    );
  check(
    true,
    "malformed and cross-lab selections are rejected before saving exposure",
  );
  check(
    (
      await view("forms.ing", "sit", jar, {
        Origin: "https://unrelated.example",
      })
    ).status === 403,
    "foreign origin cannot reveal or stamp a concept demonstration",
  );
  const started = await single("sample.be.1");
  const comparisonCount = () =>
    sql(
      `SELECT COUNT(*) AS n FROM teaching_exposures WHERE child_id=${quote(child)}`,
    )[0].n;
  for (const body of [
    null,
    [],
    {},
    { reference: "yesterday", version: 1 },
    { reference: "past", version: 0 },
  ])
    assert.equal(
      (await request("/learning/tense-comparison/view", body)).status,
      422,
    );
  check(
    comparisonCount() === 0,
    "invalid comparison references and stale versions write no exposure",
  );
  check(
    (
      await request(
        "/learning/tense-comparison/view",
        { reference: "past", version: 1 },
        jar,
        { Origin: "https://unrelated.example" },
      )
    ).status === 403,
    "foreign origin cannot disclose tense comparison",
  );
  for (const [reference, expected] of [
    ["past", 4],
    ["present", 8],
    ["future", 12],
    ["all", 12],
  ]) {
    const result = await request("/learning/tense-comparison/view", {
      reference,
      version: 1,
      keys: ["family:invented"],
      sentence: "invented",
    });
    check(
      result.status === 200 &&
        result.data.saved &&
        result.data.reference === reference &&
        result.data.version === 1 &&
        comparisonCount() === expected,
      `comparison ${reference} records only its authoritative examples without rewards`,
    );
  }
  check(
    (
      await request("/learning/tense-comparison/view", {
        reference: "past",
        version: 1,
      })
    ).status === 200 && comparisonCount() === 12,
    "reopening comparison does not duplicate teaching records",
  );
  let viewed = 0;
  for (const lab of source.labs)
    for (const example of lab.cases) {
      const result = await view(lab.id, example.id);
      assert.equal(result.status, 200, `${lab.id}/${example.id}`);
      assert.equal(result.data.saved, true);
      assert.deepEqual(result.data.example, example);
      assert.ok(!JSON.stringify(result.data).includes('"answers":'));
      viewed++;
    }
  check(
    viewed === 54,
    "all seventeen labs reveal all fifty-four authoritative demonstrations after acknowledgement",
  );
  const snapshot = (await request("/sessions/current")).data.session;
  check(
    snapshot.assignmentId === started.assignmentId &&
      snapshot.id === started.id,
    "watching demonstrations does not replace an active exercise or move its cursor",
  );
  const progress = (await request("/progress")).data,
    summary = (await request("/learning/summary")).data;
  check(
    progress.answered === 0 &&
      progress.stars === 0 &&
      progress.cards.length === 0 &&
      summary.completedLessons.length === 0,
    "demonstrations alone add no answer rewards review cards or course completions",
  );
  const proof = () =>
    sql(
      `SELECT COUNT(*) AS count,SUM(shown_at) AS total FROM teaching_exposures WHERE child_id=${quote(child)}`,
    )[0];
  const before = proof();
  assert.equal((await view()).status, 200);
  const after = proof();
  check(
    before.count === after.count && before.total === after.total,
    "same-day replay reuses teaching evidence without rewriting its timestamp",
  );
  const rows = sql(
    `SELECT evidence_key FROM teaching_exposures WHERE child_id=${quote(child)}`,
  );
  check(
    rows.length >= 54 &&
      rows.every((row) => /^sha256:[a-f0-9]{64}$/.test(row.evidence_key)),
    "persistent demonstration evidence contains hashes instead of raw examples",
  );
  const injected = await request("/learning/concepts/forms.ing/view", {
    caseId: "sit",
    example: "invented",
    keys: ["family:other"],
  });
  check(
    injected.status === 200 && injected.data.example.result === "sitting",
    "client text and evidence keys cannot replace the authored case",
  );
  const sitting = topic.items.find(
    (item) =>
      item.topicId === "forms.ing" &&
      item.type === "choice" &&
      item.answers[0] === "sitting",
  );
  assert.ok(sitting);
  const sittingSession = await single(sitting.id),
    event = crypto.randomUUID(),
    saved = await submit(sittingSession, sitting, event);
  check(
    saved.status === 201 &&
      saved.data.support === "example" &&
      saved.data.outcome === "hinted" &&
      !saved.data.independentEvidence,
    "a demonstrated spelling remains assisted in a later topic choice",
  );
  check(
    JSON.stringify((await submit(sittingSession, sitting, event)).data) ===
      JSON.stringify(saved.data),
    "retrying a demonstration-assisted answer returns the same receipt",
  );
  const input = topic.items.find(
      (item) => item.family === sitting.family && item.type === "input",
    ),
    inputSession = await single(input.id);
  check(
    (await submit(inputSession, input)).data.support === "example",
    "changing from choice to spelling cannot bypass the disclosed word form",
  );
  const sorting = workshops.items.find(
    (item) =>
      item.type === "sort" &&
      item.skill === "morphology.verb.ing" &&
      item.sorting.cards.some((card) => card.text === "sit"),
  );
  assert.ok(sorting);
  const sortingSession = await single(sorting.id),
    grouped = await request("/attempts", {
      sessionId: sortingSession.id,
      assignmentId: sortingSession.assignmentId,
      leaseId: sortingSession.leaseId,
      eventId: crypto.randomUUID(),
      answer: Object.entries(sorting.placements).map(
        ([id, group]) => `${id}=${group}`,
      ),
    });
  check(
    grouped.status === 201 &&
      grouped.data.support === "example" &&
      !grouped.data.independentEvidence,
    "the same demonstrated lemma is protected inside a classification set",
  );
  const walking = topic.items.find(
    (item) =>
      item.topicId === "forms.ing" &&
      item.type === "choice" &&
      item.answers[0] === "walking",
  );
  assert.ok(walking);
  const walkingSession = await single(walking.id),
    walk = await submit(walkingSession, walking);
  check(
    walk.status === 201 && walk.data.independentEvidence,
    "a different unseen word can still supply independent retrieval evidence",
  );
  assert.equal((await finish(walkingSession)).status, 200);
  sibling = (
    await request("/children", { nickname: "互动示范隔离验证", grade: 3 })
  ).data.id;
  assert.ok(sibling);
  assert.equal((await request(`/children/${sibling}/select`, {})).status, 200);
  const siblingSession = await single(sitting.id),
    siblingEvent = crypto.randomUUID(),
    siblingSaved = await submit(siblingSession, sitting, siblingEvent);
  check(
    siblingSaved.data.independentEvidence,
    "one child's demonstration does not mark a sibling's first answer as assisted",
  );
  assert.equal((await view()).status, 200);
  check(
    JSON.stringify(
      (await submit(siblingSession, sitting, siblingEvent)).data,
    ) === JSON.stringify(siblingSaved.data),
    "viewing a demonstration later cannot rewrite a previously saved receipt",
  );
  check(
    [401, 409].includes(
      (await view("forms.ing", "sit", jar, { "X-EQ-Child-ID": child })).status,
    ),
    "stale child context cannot disclose a demonstration under the new profile",
  );
  assert.equal((await finish(siblingSession)).status, 200);
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  sql(
    `UPDATE teaching_exposures SET shown_day='2000-01-01' WHERE child_id=${quote(child)}`,
  );
  const delayedSession = await single(sitting.id);
  check(
    (await submit(delayedSession, sitting)).data.independentEvidence,
    "past-day demonstration does not permanently block independent retrieval (simulated date)",
  );
  check(
    (await fetch("http://127.0.0.1:5173/content/concept-exposure-map.json"))
      .status === 403,
    "private demonstration-to-assessment mapping is blocked by the dev server",
  );
  measuredChild = (
    await request("/children", { nickname: "实物比较示范验证", grade: 4 })
  ).data.id;
  assert.ok(measuredChild);
  assert.equal(
    (await request(`/children/${measuredChild}/select`, {})).status,
    200,
  );
  for (const [caseId, itemId] of [
    ["tower-pair", "P4A-U05-L1.p3.choice"],
    ["bridge-group", "P5A-U05-L2.p8.input"],
    ["book-pair", "P4A-U05-L3.p6.repair"],
  ]) {
    const expected = source.labs
      .find((lab) => lab.id === "forms.comparison")
      .cases.find((row) => row.id === caseId);
    const shown = await request("/learning/concepts/forms.comparison/view", {
      caseId,
      measurement: { items: [{ id: "fake", value: 999 }] },
    });
    check(
      shown.status === 200 &&
        shown.data.saved &&
        JSON.stringify(shown.data.example.measurement) ===
          JSON.stringify(expected.measurement),
      `authoritative ${caseId} measurements ignore client replacement data`,
    );
    const item = discovery.items.find((item) => item.id === itemId),
      session = await single(itemId);
    const response = await request("/attempts", {
      sessionId: session.id,
      assignmentId: session.assignmentId,
      leaseId: session.leaseId,
      eventId: crypto.randomUUID(),
      answer:
        item.type === "repair" ? JSON.parse(item.answers[0]) : item.answers[0],
    });
    check(
      response.status === 201 &&
        response.data.support === "example" &&
        response.data.outcome === "hinted" &&
        !response.data.independentEvidence,
      `${caseId} protects later ${item.type} practice as guided evidence`,
    );
  }
  console.log(
    `${checks} concept demonstration checks passed on local workerd/D1; 54 cases viewed, no browser animation or provider test.`,
  );
} finally {
  for (const id of [measuredChild, sibling, child].filter(Boolean))
    if (jar.has("eq_account"))
      assert.equal(
        (await request(`/children/${id}/remove`, {})).status,
        200,
        "remove disposable concept profile",
      );
  if (jar.has("eq_account")) await request("/logout", {});
}
