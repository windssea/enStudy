import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { run } from "./runtime.mjs";
const url = new URL(process.argv[2] ?? "http://127.0.0.1:8788");
const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
assert.ok(local || url.protocol === "https:");
const bank = JSON.parse(
  await readFile("content/pattern-release.v1.json", "utf8"),
);
const catalog = JSON.parse(
  await readFile("public/content/catalog.json", "utf8"),
);
const byId = new Map(bank.items.map((item) => [item.id, item]));
const jar = new Map(),
  ip = `198.19.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
let child,
  sibling,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(path, body, extraHeaders = {}) {
  const response = await fetch(`${url.origin}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(local ? { "CF-Connecting-IP": ip } : {}),
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: url.origin }),
      Cookie: Array.from(jar, ([key, value]) => `${key}=${value}`).join("; "),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0],
      index = pair.indexOf("="),
      key = pair.slice(0, index),
      value = pair.slice(index + 1);
    if (value) jar.set(key, value);
    else jar.delete(key);
  }
  return { status: response.status, data: await response.json() };
}
const open = (patternId = "pattern.suggestions.02", roundSize = 5) =>
  request("/sessions", {
    patternId,
    roundSize,
    clientRequestId: crypto.randomUUID(),
  });
async function finish(session) {
  const families = [];
  for (let step = 0; step < 5; step++) {
    const item = byId.get(session.exercise.id);
    assert.ok(item && !Object.hasOwn(session.exercise, "answers"));
    families.push(item.family);
    const saved = await request("/attempts", {
      eventId: crypto.randomUUID(),
      sessionId: session.id,
      assignmentId: session.assignmentId,
      leaseId: session.leaseId,
      answer:
        item.type === "order" ? item.answers[0].split(" ") : item.answers[0],
    });
    assert.equal(saved.status, 201);
    const next = await request(`/sessions/${session.id}/next`, {
      assignmentId: session.assignmentId,
      leaseId: session.leaseId,
    });
    assert.equal(next.status, 200);
    if (step < 4) session = next.data.session;
    else assert.equal(next.data.result.independent, 5);
  }
  assert.equal(new Set(families).size, 5);
  return families;
}
try {
  check(
    (await request("/learning/patterns/pattern.greetings.01/view", {}))
      .status === 401,
    "anonymous example reveal denied",
  );
  const metadata = await request("/lessons");
  check(
    Object.keys(metadata.data.patternStats).length === 72 &&
      Object.values(metadata.data.patternStats).every(
        (stats) =>
          stats.items === 120 && stats.contexts === 40 && stats.families >= 20,
      ),
    "72 frame banks expose actual variant, context and sentence counts",
  );
  check(
    !JSON.stringify(metadata.data).includes('"answers":'),
    "public frame metadata contains no keys",
  );
  check((await open()).status === 401, "anonymous pattern practice denied");
  assert.equal(
    (
      await request("/auth/login", {
        username: "admin",
        password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
      })
    ).status,
    200,
  );
  const made = await request("/children", {
    nickname: "句式随机验证",
    grade: 5,
  });
  assert.equal(made.status, 201);
  child = made.data.id;
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  check(
    (await open("unknown.frame")).status === 404,
    "unknown pattern cannot fall back to the old suggestion sample",
  );
  check(
    (
      await request("/sessions", {
        patternId: "pattern.suggestions.02",
        topicId: "grammar.be",
        clientRequestId: crypto.randomUUID(),
      })
    ).status === 422,
    "pattern and topic selectors cannot be combined",
  );
  for (const size of [0, 100, "10"])
    assert.equal((await open("pattern.suggestions.02", size)).status, 422);
  check(true, "invalid pattern round sizes rejected");
  const body = {
    patternId: "pattern.suggestions.02",
    clientRequestId: crypto.randomUUID(),
  };
  const first = await request("/sessions", body);
  check(
    first.status === 201 &&
      first.data.total === 10 &&
      first.data.source === "pattern",
    "default pattern draw creates ten assignments",
  );
  const replay = await request("/sessions", body),
    restored = await request("/sessions/current");
  check(
    replay.status === 200 &&
      JSON.stringify(replay.data) === JSON.stringify(first.data) &&
      JSON.stringify(restored.data.session) === JSON.stringify(first.data),
    "refresh and replay freeze question, choices and tokens",
  );
  check(
    (
      await request("/sessions", {
        ...body,
        patternId: "pattern.suggestions.01",
      })
    ).status === 409 &&
      (await request("/sessions", { ...body, roundSize: 20 })).status === 409,
    "request ID cannot change frame or question count",
  );
  const a = await finish((await open()).data),
    b = await finish((await open()).data);
  check(
    b.every((family) => !a.includes(family)),
    "two completed rounds avoid recently assigned sentences and variants",
  );
  const summary = await request("/learning/summary");
  check(
    summary.data.recent.length === 2 &&
      summary.data.completedLessons.length === 0,
    "pattern completion is saved separately from course completion",
  );
  const large = await open("pattern.complements.05", 20);
  check(
    large.status === 201 && large.data.total === 20,
    "twenty-question round works for a single exact frame",
  );
  for (const id of [
    "pattern.greetings.03",
    "pattern.introductions.02",
    "pattern.descriptions.05",
    "pattern.preferences.03",
    "pattern.modals.04",
    "pattern.requests.05",
    "pattern.suggestions.06",
    "pattern.complements.06",
    "pattern.collocations.03",
    "pattern.time.01",
    "pattern.comparison.05",
    "pattern.connections.03",
  ]) {
    const round = await open(id);
    assert.equal(round.status, 201);
    assert.equal(round.data.total, 5);
    assert.equal(byId.get(round.data.exercise.id).patternId, id);
  }
  check(true, "all twelve frame themes start the requested exact frame bank");
  check(
    (await request("/learning/patterns/unknown/view", {})).status === 404,
    "unknown example cannot invent a teaching exposure",
  );
  const previewPattern = catalog.patterns.find(
    (row) => row.pattern_id === "pattern.greetings.01",
  );
  const preview = await request(
    `/learning/patterns/${previewPattern.pattern_id}/view`,
    {},
  );
  check(
    preview.status === 200 &&
      preview.data.saved &&
      preview.data.example === previewPattern.example,
    "example is acknowledged only after the child's teaching record is saved",
  );
  check(
    (await request(`/learning/patterns/${previewPattern.pattern_id}/view`, {}))
      .data.example === previewPattern.example,
    "same-day example reveal can be retried",
  );
  const single = async (id) => {
    const made = await request("/sessions", {
      exerciseId: id,
      clientRequestId: crypto.randomUUID(),
    });
    assert.equal(made.status, 201);
    return made.data;
  };
  const submit = (session, item, eventId = crypto.randomUUID()) =>
    request("/attempts", {
      eventId,
      sessionId: session.id,
      assignmentId: session.assignmentId,
      leaseId: session.leaseId,
      answer:
        item.type === "order" ? item.answers[0].split(" ") : item.answers[0],
    });
  for (const type of ["choice", "input", "order"]) {
    const item = byId.get(`frame.pattern.greetings.01.1.${type}`),
      session = await single(item.id),
      event = crypto.randomUUID();
    const saved = await submit(session, item, event);
    check(
      saved.status === 201 &&
        saved.data.support === "example" &&
        saved.data.outcome === "hinted" &&
        !saved.data.independentEvidence,
      `viewed example does not advance independent evidence for ${type}`,
    );
    const replay = await submit(session, item, event);
    check(
      replay.status === 200 &&
        JSON.stringify(replay.data) === JSON.stringify(saved.data),
      `assisted ${type} receipt remains idempotent`,
    );
  }
  await request("/learning/patterns/pattern.greetings.04/view", {});
  const dialogue = byId.get("frame.pattern.greetings.04.1.order"),
    dialogueSession = await single(dialogue.id);
  check(
    (await submit(dialogueSession, dialogue)).data.support === "example",
    "a teaching dialogue dash cannot make the same answer appear unseen",
  );
  const untouched = byId.get("frame.pattern.greetings.02.3.choice"),
    untouchedSession = await single(untouched.id),
    untouchedEvent = crypto.randomUUID();
  const independent = await submit(untouchedSession, untouched, untouchedEvent);
  check(
    independent.status === 201 && independent.data.independentEvidence,
    "a different unseen sentence can still count as independent",
  );
  await request("/learning/patterns/pattern.greetings.02/view", {});
  check(
    JSON.stringify(
      (await submit(untouchedSession, untouched, untouchedEvent)).data,
    ) === JSON.stringify(independent.data),
    "later example view cannot rewrite an already saved receipt",
  );
  assert.equal(
    (
      await request(`/sessions/${untouchedSession.id}/next`, {
        assignmentId: untouchedSession.assignmentId,
        leaseId: untouchedSession.leaseId,
      })
    ).status,
    200,
  );
  sibling = (
    await request("/children", { nickname: "句式示范隔离验证", grade: 3 })
  ).data.id;
  assert.ok(sibling);
  assert.equal((await request(`/children/${sibling}/select`, {})).status, 200);
  const firstItem = byId.get("frame.pattern.greetings.01.1.choice"),
    siblingSession = await single(firstItem.id);
  check(
    (await submit(siblingSession, firstItem)).data.independentEvidence,
    "one child's preview does not mark a sibling's answer as assisted",
  );
  check(
    [401, 409].includes(
      (
        await request(
          "/learning/patterns/pattern.greetings.01/view",
          {},
          { "X-EQ-Child-ID": child },
        )
      ).status,
    ),
    "stale child context cannot reveal and stamp another child's example",
  );
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  if (local) {
    const exposures = JSON.parse(
      run(
        [
          "d1",
          "execute",
          "DB",
          "--local",
          "--json",
          "--command",
          `SELECT evidence_key FROM teaching_exposures WHERE child_id='${child}'`,
        ],
        { capture: true },
      ),
    )[0].results;
    check(
      exposures.length > 0 &&
        exposures.every((row) =>
          /^sha256:[a-f0-9]{64}$/.test(row.evidence_key),
        ),
      "example evidence stores hashes instead of raw sentences",
    );
    run(
      [
        "d1",
        "execute",
        "DB",
        "--local",
        "--command",
        `UPDATE teaching_exposures SET shown_day='2000-01-01' WHERE child_id='${child}'`,
      ],
      { capture: true },
    );
    const delayed = await single(firstItem.id);
    check(
      (await submit(delayed, firstItem)).data.independentEvidence,
      "old-day preview does not block a later independent retrieval (simulated date)",
    );
    assert.match(child, /^[a-f0-9-]{36}$/);
    run(
      [
        "d1",
        "execute",
        "DB",
        "--local",
        "--command",
        `UPDATE review_cards SET due_at=${Date.now() - 86400000} WHERE child_id='${child}'`,
      ],
      { capture: true },
    );
    const review = await request("/sessions", {
      mode: "review",
      clientRequestId: crypto.randomUUID(),
    });
    check(
      review.status === 201 &&
        review.data.source === "review" &&
        byId.has(review.data.exercise.id),
      "pattern-specific review evidence opens a due-review task from its published release",
    );
  }
  console.log(`${checks} random-pattern checks passed on ${url.origin}`);
} finally {
  if (sibling && jar.has("eq_account"))
    assert.equal(
      (await request(`/children/${sibling}/remove`, {})).status,
      200,
      "clean synthetic preview sibling",
    );
  if (child && jar.has("eq_account"))
    assert.equal(
      (await request(`/children/${child}/remove`, {})).status,
      200,
      "clean synthetic frame records",
    );
  if (jar.has("eq_account")) await request("/logout", {});
}
