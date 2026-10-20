import assert from "node:assert/strict";
import { run } from "./runtime.mjs";
// Query time is ephemeral; every learning value and review-policy field remains compared.
function progressEvidence(progress) {
  if (!progress.reviewPlan) return progress;
  const { generatedAt, ...reviewPlan } = progress.reviewPlan;
  assert.ok(Number.isSafeInteger(generatedAt));
  return { ...progress, reviewPlan };
}
const base = "http://127.0.0.1:8788",
  a = new Map(),
  b = new Map(),
  foreign = new Map();
let child,
  sibling,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(path, body, cookies = a, headers = {}) {
  const response = await fetch(base + "/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      "X-EQ-Player-Version": "3",
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0],
      index = pair.indexOf("="),
      key = pair.slice(0, index),
      value = pair.slice(index + 1);
    if (value) cookies.set(key, value);
    else cookies.delete(key);
  }
  return { status: response.status, data: await response.json() };
}
const login = (jar) =>
  request(
    "/auth/login",
    {
      username: "admin",
      password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
    },
    jar,
  );
const command = (
  companionId,
  version,
  childId = child,
  requestId = crypto.randomUUID(),
) => ({ childId, companionId, expectedVersion: version, requestId });
const save = (body, jar = a, headers = {}) =>
  request("/learning/companion", body, jar, headers);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = (command) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
try {
  check(
    (await request("/learning/companion", undefined, new Map())).status === 401,
    "partner preferences require a selected child's authority",
  );
  assert.equal((await login(a)).status, 200);
  child = (await request("/children", { nickname: "伙伴保存核验", grade: 3 }))
    .data.id;
  assert.ok(child);
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  assert.equal((await login(b)).status, 200);
  assert.equal((await request(`/children/${child}/select`, {}, b)).status, 200);
  const initial = await request("/learning/companion");
  check(
    initial.status === 200 &&
      initial.data.childId === child &&
      initial.data.companionId === "fox" &&
      initial.data.version === 0,
    "existing/default profiles use the fox without inventing a saved preference",
  );
  check(
    sql(
      `SELECT COUNT(*) AS total FROM child_companions WHERE child_id=${quote(child)}`,
    )[0].total === 0,
    "reading the default choice creates no database row",
  );
  for (const patch of [
    { companionId: "unknown" },
    { expectedVersion: -1 },
    { expectedVersion: 0.5 },
    { requestId: "bad" },
  ])
    check(
      (await save({ ...command("pikachu", 0), ...patch })).status === 422,
      "invalid partner command is rejected: " + Object.keys(patch)[0],
    );
  check(
    (await save(command("pikachu", 0, "another-child"))).status === 409,
    "a stale explicit child id cannot save against the newly selected child",
  );
  check(
    (await save(command("pikachu", 0), a, { "X-EQ-Child-ID": "another-child" }))
      .status === 409,
    "a stale child header cannot change partner preferences",
  );
  check(
    (
      await save(command("pikachu", 0), a, {
        Origin: "https://foreign.invalid",
      })
    ).status === 403,
    "foreign-origin preference writes are rejected",
  );
  const opened = await request("/sessions", {
    exerciseId: "sample.be.1",
    clientRequestId: crypto.randomUUID(),
  });
  assert.equal(opened.status, 201);
  const session = opened.data,
    beforeProgress = (await request("/progress")).data;
  const stream = sql(
    `SELECT stream_version FROM children WHERE id=${quote(child)}`,
  )[0].stream_version;
  const first = command("pikachu", 0),
    saved = await save(first);
  check(
    saved.status === 200 &&
      saved.data.companionId === "pikachu" &&
      saved.data.version === 1,
    "a Pikachu choice is saved with its first version",
  );
  const restored = (await request("/me")).data;
  check(
    restored.child.id === child &&
      restored.child.companionId === "pikachu" &&
      restored.child.companionVersion === 1,
    "identity reload restores this child's saved Pikachu",
  );
  const replay = await save(first);
  check(
    replay.status === 200 && replay.data.replayed && replay.data.version === 1,
    "a lost-response retry acknowledges the original command exactly once",
  );
  check(
    (await save({ ...first, companionId: "fox" })).status === 409,
    "reusing a saved command id with changed data cannot rewrite it",
  );
  check(
    (await save(command("fox", 0), b)).status === 409,
    "a stale second-device version cannot overwrite the first choice",
  );
  const second = (await request("/learning/companion", undefined, b)).data;
  check(
    second.companionId === "pikachu" && second.version === 1,
    "a second device can read the authoritative current choice",
  );
  const changed = await save(command("fox", second.version), b);
  check(
    changed.status === 200 &&
      changed.data.version === 2 &&
      changed.data.companionId === "fox",
    "after reading the current version a second device may explicitly choose the fox",
  );
  check(
    (await save(first)).status === 409 &&
      (await request("/learning/companion")).data.version === 2,
    "a delayed old command cannot resurrect an earlier choice",
  );
  const race = await Promise.all([
    save(command("pikachu", 2), a),
    save(command("fox", 2), b),
  ]);
  check(
    race.filter((row) => row.status === 200).length === 1 &&
      race.filter((row) => row.status === 409).length === 1,
    "concurrent different choices at one version have one winner",
  );
  const winner = race.find((row) => row.status === 200).data;
  check(
    (await request("/learning/companion")).data.companionId ===
      winner.companionId && winner.version === 3,
    "the stored third version matches the acknowledged race winner",
  );
  const identical = command("pikachu", 3),
    twice = await Promise.all([save(identical, a), save(identical, b)]);
  check(
    twice.every((row) => row.status === 200 && row.data.version === 4) &&
      (await request("/learning/companion")).data.version === 4,
    "concurrent retries of the same command do not increment the version twice",
  );
  check(
    sql(
      `SELECT COUNT(*) AS total FROM child_companions WHERE child_id=${quote(child)}`,
    )[0].total === 1,
    "all saves retain one preference row for this child",
  );
  const current = (await request("/sessions/current")).data.session;
  check(
    current.id === session.id &&
      current.assignmentId === session.assignmentId &&
      current.leaseId === session.leaseId &&
      current.access === "owner",
    "partner changes do not replace the learning assignment or its device lease",
  );
  check(
    JSON.stringify(progressEvidence((await request("/progress")).data)) ===
      JSON.stringify(progressEvidence(beforeProgress)),
    "choosing a partner grants no answer, star or review progress",
  );
  check(
    sql(`SELECT stream_version FROM children WHERE id=${quote(child)}`)[0]
      .stream_version === stream,
    "cosmetic preference saves do not advance the learning stream",
  );
  assert.equal(
    (await request("/dev/session", { family: "b", child: 1 }, foreign)).status,
    200,
  );
  const foreignChoice = (
    await request(
      `/learning/companion?childId=${encodeURIComponent(child)}`,
      undefined,
      foreign,
    )
  ).data;
  check(
    foreignChoice.childId !== child,
    "a different household cannot select a victim by query parameter",
  );
  check(
    (await save(command("fox", 4), foreign)).status === 409 &&
      (await request("/learning/companion")).data.version === 4,
    "a different household cannot write another child's preference",
  );
  sibling = (
    await request("/children", { nickname: "伙伴独立档案核验", grade: 1 })
  ).data.id;
  assert.ok(sibling);
  await request(`/children/${sibling}/select`, {});
  const siblingChoice = (await request("/learning/companion")).data;
  check(
    siblingChoice.companionId === "fox" &&
      siblingChoice.version === 0 &&
      siblingChoice.childId === sibling,
    "a sibling starts with an independent default choice",
  );
  const siblingSave = await save(command("pikachu", 0, sibling));
  assert.equal(siblingSave.status, 200);
  check(
    sql(
      `SELECT version FROM child_companions WHERE child_id=${quote(child)}`,
    )[0].version === 4,
    "a sibling's saved choice cannot alter the original child's version",
  );
  await request("/logout", {}, a);
  check(
    (await save(command("fox", 1, sibling), a)).status === 401,
    "revoking the adult session also revokes partner-write authority",
  );
} finally {
  if (child || sibling) {
    if (!a.has("eq_account")) assert.equal((await login(a)).status, 200);
    for (const id of [sibling, child].filter(Boolean))
      assert.equal(
        (await request(`/children/${id}/remove`, {}, a)).status,
        200,
      );
  }
  for (const jar of [a, b, foreign])
    if (jar.size) await request("/logout", {}, jar);
}
check(
  sql(
    `SELECT COUNT(*) AS total FROM child_companions WHERE child_id IN (${[sibling, child].filter(Boolean).map(quote).join(",")})`,
  )[0].total === 0,
  "removing disposable child profiles cascades their companion preferences",
);
console.log(
  `${checks} companion checks passed on local workerd/D1; model GPU and physical device tests are separate.`,
);
