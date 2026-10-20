import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.argv[2] ?? "http://127.0.0.1:8788";
const url = new URL(base);
const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
assert.ok(local || url.protocol === "https:");
const bank = JSON.parse(
  await readFile("content/topic-release.v1.json", "utf8"),
);
const byId = new Map(bank.items.map((i) => [i.id, i]));
const jar = new Map();
const ip = `198.19.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
let child,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(path, body) {
  const response = await fetch(`${url.origin}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(local ? { "CF-Connecting-IP": ip } : {}),
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: url.origin }),
      Cookie: Array.from(jar, ([key, value]) => `${key}=${value}`).join("; "),
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
const open = (topicId = "grammar.be", roundSize = 5) =>
  request("/sessions", {
    topicId,
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
      answer: item.answers[0],
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
  const metadata = await request("/lessons");
  check(
    Object.keys(metadata.data.topicStats).length === 64 &&
      Object.values(metadata.data.topicStats).every(
        (s) => s.items >= 120 && s.families >= 60,
      ),
    "all 64 topics expose honest bank counts",
  );
  check(
    !JSON.stringify(metadata.data.topicStats).includes('"answers":'),
    "public topic counts contain no answers",
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
  const created = await request("/children", {
    nickname: "随机题库验证",
    grade: 4,
  });
  assert.equal(created.status, 201);
  child = created.data.id;
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  check(
    (await open("unknown.topic")).status === 404,
    "unknown topic does not fall back to unrelated questions",
  );
  for (const size of [0, 500, "10", 20.5])
    assert.equal((await open("grammar.be", size)).status, 422);
  check(true, "invalid round sizes and types rejected");
  const body = {
    topicId: "grammar.be",
    roundSize: 5,
    clientRequestId: crypto.randomUUID(),
  };
  const first = await request("/sessions", body);
  assert.equal(first.status, 201);
  check(first.data.total === 5, "five-question round created from topic bank");
  const replay = await request("/sessions", body),
    restored = await request("/sessions/current");
  check(
    replay.status === 200 &&
      JSON.stringify(replay.data) === JSON.stringify(first.data) &&
      JSON.stringify(restored.data.session) === JSON.stringify(first.data),
    "request retry and refresh preserve exact item and option order",
  );
  check(
    (await request("/sessions", { ...body, roundSize: 20 })).status === 409,
    "request ID cannot change its round size",
  );
  for (const size of [10, 20]) {
    const round = await open("grammar.be", size);
    check(
      round.status === 201 && round.data.total === size,
      `${size}-question round freezes the requested number of assignments`,
    );
  }
  const a = await finish((await open()).data);
  const b = await finish((await open()).data);
  check(
    b.every((f) => !a.includes(f)),
    "two full rounds use ten different families when unseen items remain",
  );
  const summary = await request("/learning/summary");
  check(
    summary.data.recent.length === 2 &&
      summary.data.completedLessons.length === 0,
    "topic completion saves results without pretending to finish a course lesson",
  );
  for (const topic of [
    "tense.present-perfect",
    "forms.ing",
    "sentence.order",
    "sentence.patterns.requests",
    "vocabulary.context",
    "phonics.cvc",
    "reading.integrating",
    "expression.speaking",
  ]) {
    const round = await open(topic);
    assert.equal(round.status, 201);
    assert.equal(byId.get(round.data.exercise.id).topicId, topic);
    assert.equal(round.data.total, 5);
    if (topic.startsWith("reading.")) assert.ok(round.data.exercise.reading);
  }
  check(
    true,
    "all eight subject categories start the intended bank, including reading passages and text preparation",
  );
  console.log(`${checks} random-topic checks passed on ${url.origin}`);
} finally {
  if (child && jar.has("eq_account"))
    assert.equal(
      (await request(`/children/${child}/remove`, {})).status,
      200,
      "clean synthetic topic records",
    );
  if (jar.has("eq_account")) await request("/logout", {});
}
