import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { run } from "./runtime.mjs";
const url = new URL(process.argv[2] ?? "http://127.0.0.1:8788"),
  local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
assert.ok(local || url.protocol === "https:");
const bank = JSON.parse(
    await readFile("content/vocabulary-release.v1.json", "utf8"),
  ),
  byId = new Map(bank.items.map((item) => [item.id, item]));
const jar = new Map(),
  ip = `198.19.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
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
      at = pair.indexOf("="),
      key = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) jar.set(key, value);
    else jar.delete(key);
  }
  return { status: response.status, data: await response.json() };
}
const open = (wordThemeId = "animals", wordMode = "mixed", roundSize = 5) =>
  request("/sessions", {
    wordThemeId,
    wordMode,
    roundSize,
    clientRequestId: crypto.randomUUID(),
  });
async function finish(session) {
  const words = [];
  for (let index = 0; index < 5; index++) {
    const item = byId.get(session.exercise.id);
    assert.ok(item && !Object.hasOwn(session.exercise, "answers"));
    words.push(item.wordId);
    const receipt = await request("/attempts", {
      sessionId: session.id,
      assignmentId: session.assignmentId,
      leaseId: session.leaseId,
      eventId: crypto.randomUUID(),
      answer: item.answers[0],
    });
    assert.equal(receipt.status, 201);
    const result = await request(`/sessions/${session.id}/next`, {
      assignmentId: session.assignmentId,
      leaseId: session.leaseId,
    });
    assert.equal(result.status, 200);
    if (index < 4) session = result.data.session;
    else assert.equal(result.data.result.independent, 5);
  }
  assert.equal(new Set(words).size, 5);
  return words;
}
try {
  const metadata = (await request("/lessons")).data.vocabulary;
  check(
    metadata.totalWords === 360 &&
      metadata.totalItems === 1080 &&
      metadata.themes.length === 18,
    "vocabulary catalog contains 360 entries and eighteen graded themes",
  );
  const cards = await request("/vocabulary/animals");
  check(
    cards.status === 200 &&
      cards.data.words.length === 20 &&
      !JSON.stringify(cards.data).includes('"answers":') &&
      !JSON.stringify(cards.data).includes('"cloze":'),
    "public study cards expose teaching examples, not private quiz records",
  );
  check(
    (await request("/learning/vocabulary")).status === 401 &&
      (await open()).status === 401,
    "anonymous vocabulary records and practice denied",
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
  const made = await request("/children", {
    nickname: "单词特训验证",
    grade: 3,
  });
  assert.equal(made.status, 201);
  child = made.data.id;
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  const empty = await request("/learning/vocabulary");
  check(
    empty.data.practisedWords === 0 && empty.data.dueWords === 0,
    "new child has no practised or due word entries",
  );
  check(
    (await open("unknown.theme")).status === 404 &&
      (await request("/vocabulary/unknown.theme")).status === 404,
    "unknown vocabulary theme does not open unrelated content",
  );
  check(
    (
      await request("/sessions", {
        wordThemeId: "animals",
        patternId: "pattern.greetings.01",
        clientRequestId: crypto.randomUUID(),
      })
    ).status === 422,
    "word and frame selectors cannot be combined",
  );
  check(
    (await open("animals", "unknown")).status === 422 &&
      (await open("animals", "mixed", 100)).status === 422,
    "invalid vocabulary mode and round size rejected",
  );
  for (const mode of ["mixed", "meaning", "spelling", "context"]) {
    const round = await open("animals", mode, 10);
    assert.equal(round.status, 201);
    assert.equal(round.data.source, "vocabulary");
    assert.equal(round.data.total, 10);
    const item = byId.get(round.data.exercise.id);
    assert.equal(item.wordThemeId, "animals");
    if (mode !== "mixed") assert.equal(item.wordMode, mode);
  }
  check(
    true,
    "all four word training modes use the intended theme and task type",
  );
  const body = {
      wordThemeId: "animals",
      wordMode: "spelling",
      roundSize: 5,
      clientRequestId: crypto.randomUUID(),
    },
    first = await request("/sessions", body),
    replay = await request("/sessions", body),
    restored = await request("/sessions/current");
  check(
    first.status === 201 &&
      JSON.stringify(first.data) === JSON.stringify(replay.data) &&
      JSON.stringify(first.data) === JSON.stringify(restored.data.session),
    "word session refresh and retries preserve assignments",
  );
  check(
    (await request("/sessions", { ...body, wordMode: "meaning" })).status ===
      409,
    "word mode is part of the idempotent request fingerprint",
  );
  const a = await finish((await open("animals", "meaning")).data),
    b = await finish((await open("animals", "spelling")).data);
  check(
    b.every((word) => !a.includes(word)),
    "consecutive word modes prioritize different recently assigned word senses",
  );
  const summary = (await request("/learning/vocabulary")).data;
  check(
    summary.practisedWords === 10 && summary.dueWords === 0,
    "word counts reflect submitted evidence instead of merely assigned tasks",
  );
  check(
    (await request("/learning/summary")).data.completedLessons.length === 0,
    "vocabulary rounds do not count as completed course lessons",
  );
  const large = await open("describing", "context", 20);
  check(
    large.status === 201 && large.data.total === 20,
    "twenty-question context round freezes twenty different word entries",
  );
  for (const theme of [
    "animals",
    "family",
    "home",
    "places",
    "feelings",
    "environment",
  ]) {
    const round = await open(theme, "mixed", 5);
    assert.equal(round.status, 201);
    assert.equal(byId.get(round.data.exercise.id).wordThemeId, theme);
  }
  check(true, "all six grade bands start real vocabulary themes");
  if (local) {
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
    const due = (await request("/learning/vocabulary")).data,
      review = await request("/sessions", {
        mode: "review",
        clientRequestId: crypto.randomUUID(),
      });
    check(
      due.dueWords === 10 &&
        review.status === 201 &&
        byId.has(review.data.exercise.id),
      "real due word evidence feeds the shared review selector",
    );
  }
  console.log(`${checks} vocabulary checks passed on ${url.origin}`);
} finally {
  if (child && jar.has("eq_account"))
    assert.equal(
      (await request(`/children/${child}/remove`, {})).status,
      200,
      "clean synthetic vocabulary records",
    );
  if (jar.has("eq_account")) await request("/logout", {});
}
