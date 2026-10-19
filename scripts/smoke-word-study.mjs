import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { run } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  jar = new Map();
const original = JSON.parse(
    await readFile("content/vocabulary-release.v1.json", "utf8"),
  ),
  listening = JSON.parse(
    await readFile("content/word-listening-release.v1.json", "utf8"),
  );
const bank = new Map(
  [...original.items, ...listening.items].map((item) => [item.id, item]),
);
let child,
  sibling,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(path, body, cookies = jar, extra = {}) {
  const response = await fetch(base + "/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      // Fixture SQL runs synchronously in a separate Wrangler process. Do not
      // reuse a socket that the local server may close while that CLI is busy;
      // in particular, do not retry the following non-idempotent POST.
      Connection: "close",
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": "3",
      ...extra,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0],
      at = pair.indexOf("="),
      key = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) cookies.set(key, value);
    else cookies.delete(key);
  }
  return { status: response.status, data: await response.json() };
}
const open = (body) =>
  request("/sessions", { ...body, clientRequestId: crypto.randomUUID() });
const submit = (s) =>
  request("/attempts", {
    sessionId: s.id,
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
    eventId: crypto.randomUUID(),
    answer: bank.get(s.exercise.id).answers[0],
  });
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = (command) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
try {
  check(
    (await request("/learning/vocabulary/food.apple/view", {}, new Map()))
      .status === 401,
    "word study requires the selected child's authority",
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
  child = (await request("/children", { nickname: "词卡示范核验", grade: 2 }))
    .data.id;
  assert.ok(child);
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  check(
    (await request("/learning/vocabulary/missing.word/view", {})).status ===
      404,
    "unknown word views do not create teaching evidence",
  );
  check(
    (
      await request("/learning/vocabulary/food.apple/view", {}, jar, {
        "X-EQ-Child-ID": "another-child",
      })
    ).status === 409,
    "stale child context cannot record a view for the current child",
  );
  const before = (await request("/progress")).data.answered;
  const seen = await request("/learning/vocabulary/food.apple/view", {});
  check(
    seen.status === 200 &&
      seen.data.saved &&
      seen.data.word.meaning === "苹果" &&
      !JSON.stringify(seen.data).includes('"answers"'),
    "a saved view returns only the correct public word card",
  );
  const count = sql(
    `SELECT COUNT(*) AS total FROM teaching_exposures WHERE child_id=${quote(child)}`,
  )[0].total;
  await request("/learning/vocabulary/food.apple/view", {});
  check(
    sql(
      `SELECT COUNT(*) AS total FROM teaching_exposures WHERE child_id=${quote(child)}`,
    )[0].total === count,
    "reopening a word on the same day is idempotent",
  );
  check(
    (await request("/progress")).data.answered === before &&
      (await request("/learning/vocabulary")).data.practisedWords === 0,
    "viewing a card creates no answer, reward or practised-word total",
  );
  for (const mode of ["meaning", "spelling", "context", "listening"]) {
    const started = await open({
      wordThemeId: "food",
      wordMode: mode,
      roundSize: 5,
    });
    assert.equal(started.status, 201);
    const s = started.data,
      wordId = bank.get(s.exercise.id).wordId;
    const viewed = await request(
      `/learning/vocabulary/${encodeURIComponent(wordId)}/view`,
      {},
    );
    assert.equal(viewed.status, 200);
    if (mode === "listening")
      assert.equal(
        (
          await request(`/sessions/${s.id}/listening`, {
            assignmentId: s.assignmentId,
            leaseId: s.leaseId,
            mode: "heard",
          })
        ).status,
        200,
      );
    const result = await submit(s);
    check(
      result.status === 201 &&
        result.data.outcome === "hinted" &&
        result.data.support === "example" &&
        !result.data.independentEvidence,
      `${mode}: the same day's viewed word cannot be counted as independent recall`,
    );
    check(
      (await request("/sessions/current")).data.receipt.eventId ===
        result.data.eventId,
      `${mode}: assisted receipt persists after reloading`,
    );
  }
  // Simulate an earlier day only for this disposable child's teaching markers.
  sql(
    `UPDATE teaching_exposures SET shown_day='2000-01-01' WHERE child_id=${quote(child)}`,
  );
  const apple = original.items.find(
    (item) => item.wordId === "food.apple" && item.wordMode === "spelling",
  );
  const next = (await open({ exerciseId: apple.id })).data;
  const recalled = await submit(next);
  check(
    recalled.status === 201 &&
      recalled.data.outcome === "correct" &&
      recalled.data.independentEvidence,
    "an earlier day's word view does not permanently disqualify later independent recall",
  );
  const markerSnapshot = () =>
    sql(
      `SELECT evidence_key,shown_day,shown_at FROM teaching_exposures WHERE child_id=${quote(child)} ORDER BY evidence_key`,
    );
  const beforeSiblingView = markerSnapshot();
  sibling = (await request("/children", { nickname: "词卡隔离核验", grade: 1 }))
    .data.id;
  assert.ok(sibling);
  await request(`/children/${sibling}/select`, {});
  await request("/learning/vocabulary/food.apple/view", {});
  check(
    JSON.stringify(markerSnapshot()) === JSON.stringify(beforeSiblingView),
    "a sibling's view cannot rewrite the original child's teaching markers",
  );
  console.log(
    `${checks} word-study checks passed on local workerd/D1; no real browser or voice claim.`,
  );
} finally {
  for (const id of [sibling, child].filter(Boolean))
    if (jar.has("eq_account"))
      assert.equal((await request(`/children/${id}/remove`, {})).status, 200);
  if (jar.has("eq_account")) await request("/logout", {});
}
