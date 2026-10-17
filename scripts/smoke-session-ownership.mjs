import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { wrangler } from "./runtime.mjs";

const base = process.argv[2] ?? "http://127.0.0.1:8788";
const local = ["127.0.0.1", "localhost", "[::1]"].includes(
  new URL(base).hostname,
);
const course = JSON.parse(
  await readFile("content/course-release.v1.json", "utf8"),
);
const a = new Map(),
  b = new Map(),
  c = new Map(),
  other = new Map();
const jars = [a, b, c, other];
const ip = `198.19.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
let checks = 0,
  child;
function check(ok, label) {
  assert.ok(ok, label);
  console.log(`PASS ${label}`);
  checks++;
}
async function request(path, body, jar = a, expectedChild = null) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(expectedChild ? { "X-EQ-Child-ID": expectedChild } : {}),
      ...(local ? { "CF-Connecting-IP": ip } : {}),
      Cookie: Array.from(jar, ([k, v]) => `${k}=${v}`).join("; "),
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: new URL(base).origin }),
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
const read = async (jar = a) =>
  (await request("/sessions/current", undefined, jar)).data;
const claim = (session, jar, id = crypto.randomUUID()) =>
  request(
    `/sessions/${session.id}/takeover`,
    { clientRequestId: id, expectedLeaseVersion: session.leaseVersion },
    jar,
  );
const next = (session, jar) =>
  request(
    `/sessions/${session.id}/next`,
    { leaseId: session.leaseId, assignmentId: session.assignmentId },
    jar,
  );
const hint = (session, jar) =>
  request(
    `/sessions/${session.id}/hint`,
    { leaseId: session.leaseId, assignmentId: session.assignmentId },
    jar,
  );
const attempt = (session, jar, id = crypto.randomUUID()) => {
  const item = course.items.find((item) => item.id === session.exercise.id);
  const answer =
    item.type === "order" ? item.answers[0].split(" ") : item.answers[0];
  return request(
    "/attempts",
    {
      eventId: id,
      sessionId: session.id,
      assignmentId: session.assignmentId,
      leaseId: session.leaseId,
      answer,
    },
    jar,
  );
};
try {
  check(
    (await request(`/sessions/${crypto.randomUUID()}/takeover`, {}, new Map()))
      .status === 401,
    "anonymous takeover denied",
  );
  for (const jar of jars)
    assert.equal(
      (
        await request(
          "/auth/login",
          {
            username: "admin",
            password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
          },
          jar,
        )
      ).status,
      200,
    );
  const made = await request("/children", {
    nickname: "换设备续学验证",
    grade: 3,
  });
  assert.equal(made.status, 201);
  child = made.data.id;
  for (const jar of [a, b, c])
    assert.equal(
      (await request(`/children/${child}/select`, {}, jar)).status,
      200,
    );
  let s = (
    await request("/sessions", {
      lessonId: "P3A-U01-L1",
      clientRequestId: crypto.randomUUID(),
    })
  ).data;
  check(
    s.access === "owner" &&
      s.leaseVersion === 0 &&
      typeof s.leaseId === "string",
    "new round belongs to the creating device",
  );
  const staleChild = (await request("/me", undefined, other)).data.child.id;
  check(
    (await request("/progress", undefined, a, staleChild)).data.error.code ===
      "IDENTITY_CHANGED" &&
      (
        await request(
          "/sessions",
          { lessonId: "P3A-U01-L2", clientRequestId: crypto.randomUUID() },
          a,
          staleChild,
        )
      ).status === 409,
    "stale page child context cannot read progress or start a task for the newly selected child",
  );
  check(
    (await request("/sessions/current", undefined, a, child)).data.session
      .id === s.id,
    "matching child context continues to read the intended round",
  );
  const reload = await read();
  check(
    reload.childId === child &&
      reload.session.leaseId === s.leaseId &&
      reload.session.assignmentId === s.assignmentId,
    "same device reload preserves ownership and assignment",
  );
  const foreign = await read(b);
  check(
    foreign.session.access === "takeover-required" &&
      foreign.session.leaseId === null &&
      !JSON.stringify(foreign).includes(s.leaseId),
    "other device reads progress without receiving owner credential",
  );
  check(
    (await request(`/sessions/${s.id}`, undefined, b)).data.leaseId === null,
    "direct session read also conceals foreign credential",
  );
  check(
    (await attempt(s, b)).status === 409 &&
      (await hint(s, b)).status === 409 &&
      (await next(s, b)).status === 409,
    "copying another device lease cannot answer request hints or advance",
  );
  const rejectedId = crypto.randomUUID();
  check(
    (
      await request(
        "/sessions",
        { lessonId: "P3A-U01-L2", clientRequestId: rejectedId },
        b,
      )
    ).data.error.code === "TAKEOVER_REQUIRED",
    "new task cannot silently pause a foreign device round",
  );
  check(
    (await read()).session.id === s.id &&
      (await request(`/sessions/${rejectedId}`, undefined, b)).status === 404 &&
      (await request("/progress")).data.answered === 0,
    "blocked replacement leaves active task and progress unchanged",
  );
  check(
    (await request(`/sessions/${s.id}/takeover`, null, b)).status === 422 &&
      (
        await request(
          `/sessions/${s.id}/takeover`,
          { clientRequestId: crypto.randomUUID(), expectedLeaseVersion: -1 },
          b,
        )
      ).status === 422,
    "malformed claim and negative version rejected",
  );
  check(
    (await claim(s, other)).status === 404,
    "another child cannot take over the round",
  );
  await hint(s, a);
  const first = await attempt(s, a);
  check(
    first.status === 201 && first.data.outcome === "hinted",
    "hint and receipt are stored before device handover",
  );
  const nonce = crypto.randomUUID();
  const owned = await claim(foreign.session, b, nonce);
  check(
    owned.status === 200 &&
      owned.data.session.access === "owner" &&
      owned.data.session.leaseVersion === 1 &&
      owned.data.session.leaseId !== s.leaseId,
    "explicit takeover changes owner lease and version",
  );
  check(
    owned.data.session.assignmentId === s.assignmentId &&
      JSON.stringify(owned.data.session.exercise) ===
        JSON.stringify(s.exercise) &&
      owned.data.hint &&
      owned.data.receipt.eventId === first.data.eventId,
    "takeover preserves cursor presentation hints and exact stored receipt",
  );
  const duplicate = await claim(foreign.session, b, nonce);
  check(
    duplicate.status === 200 &&
      duplicate.data.session.leaseId === owned.data.session.leaseId &&
      duplicate.data.session.leaseVersion === 1,
    "claim response retry does not rotate lease twice",
  );
  check(
    (
      await request(
        `/sessions/${s.id}/takeover`,
        { clientRequestId: nonce, expectedLeaseVersion: 1 },
        b,
      )
    ).status === 409 && (await claim(foreign.session, c, nonce)).status === 409,
    "request identifier cannot change its version or claiming device",
  );
  check(
    (await next(s, a)).status === 409,
    "previous device cannot advance a saved answer after takeover",
  );
  const replay = await attempt(s, a);
  check(
    replay.status === 200 &&
      replay.data.eventId === first.data.eventId &&
      (await request("/progress")).data.stars === 1,
    "historical answer replay returns saved receipt without a second reward",
  );
  let current = (await next(owned.data.session, b)).data.session;
  check(
    current.position === 2 && current.access === "owner",
    "new owner continues the next unanswered step",
  );
  check(
    (await hint({ ...current, leaseId: s.leaseId }, a)).status === 409 &&
      (await attempt({ ...current, leaseId: s.leaseId }, a)).status === 409,
    "old page cannot hint or submit the new assignment",
  );
  const snapA = (await read()).session,
    snapC = (await read(c)).session;
  const competing = await Promise.all([claim(snapA, a), claim(snapC, c)]);
  check(
    competing.filter((r) => r.status === 200).length === 1 &&
      competing.filter((r) => r.status === 409).length === 1,
    "simultaneous devices commit only one claim version",
  );
  const winner = competing[0].status === 200 ? a : c,
    loser = winner === a ? c : a;
  current = competing.find((r) => r.status === 200).data.session;
  check(
    current.leaseVersion === 2 &&
      (await read(loser)).session.access === "takeover-required" &&
      (await read(b)).session.leaseId === null,
    "all losing devices become read only",
  );
  check(
    (await claim(foreign.session, b, nonce)).status === 409 &&
      (await read(winner)).session.leaseVersion === 2,
    "old successful claim retry cannot reclaim a later owner",
  );
  const answerId = crypto.randomUUID();
  const races = await Promise.all([
    attempt(current, winner, answerId),
    attempt(current, winner, answerId),
  ]);
  check(
    races.every((r) => [200, 201].includes(r.status)) &&
      races[0].data.eventId === races[1].data.eventId &&
      (await request("/progress", undefined, winner)).data.stars === 2,
    "new owner duplicate submissions still give one reward",
  );
  const n = (await next(current, winner)).data.session;
  const beforeRace = (await request("/progress", undefined, winner)).data
    .answered;
  const watching = (await read(loser)).session;
  const answerAndClaim = await Promise.all([
    attempt(n, winner),
    claim(watching, loser),
  ]);
  check(
    [200, 201, 409].includes(answerAndClaim[0].status) &&
      answerAndClaim[1].status === 200,
    "answer and takeover race resolves without an unhandled error",
  );
  let resumed = answerAndClaim[1].data.session;
  const actual = await read(loser);
  const savedCount = (await request("/progress", undefined, loser)).data
    .answered;
  check(
    savedCount === beforeRace || savedCount === beforeRace + 1,
    "answer racing takeover writes at most one evidence event",
  );
  if (!actual.receipt)
    assert.equal((await attempt(resumed, loser)).status, 201);
  resumed = (await next(resumed, loser)).data.session;
  while (resumed) {
    assert.equal((await attempt(resumed, loser)).status, 201);
    const advanced = await next(resumed, loser);
    assert.equal(advanced.status, 200);
    if (advanced.data.completed) {
      check(
        advanced.data.result.total === 9,
        "takeover round completes all original nine assignments",
      );
      resumed = null;
    } else resumed = advanced.data.session;
  }
  check(
    (
      await claim(
        (await request(`/sessions/${s.id}`, undefined, loser)).data,
        loser,
      )
    ).status === 409,
    "completed round cannot be taken over",
  );
  check(
    (await read(loser)).session === null &&
      (await request("/progress", undefined, loser)).data.answered === 9,
    "completed handover saves exactly nine attempts",
  );
  const starts = await Promise.all([
    request(
      "/sessions",
      { lessonId: "P3A-U01-L1", clientRequestId: crypto.randomUUID() },
      a,
    ),
    request(
      "/sessions",
      { lessonId: "P3A-U01-L1", clientRequestId: crypto.randomUUID() },
      b,
    ),
  ]);
  check(
    starts.filter((r) => r.status === 201).length === 1 &&
      starts.filter((r) => r.status === 409).length === 1,
    "different devices cannot create competing active rounds",
  );
  const maker = starts[0].status === 201 ? a : b,
    taker = maker === a ? b : a;
  let second = starts.find((r) => r.status === 201).data;
  await attempt(second, maker);
  const beforeNext = (await read(taker)).session;
  const switching = await Promise.all([
    next(second, maker),
    claim(beforeNext, taker),
  ]);
  check(
    [200, 409].includes(switching[0].status) && switching[1].status === 200,
    "next-step and device-claim race resolves with one owner",
  );
  const afterSwitch = await read(taker);
  check(
    [1, 2].includes(afterSwitch.session.position) &&
      afterSwitch.session.access === "owner" &&
      (await next(second, maker)).status === 409,
    "handover racing next cannot skip an unanswered assignment",
  );
  second = afterSwitch.session;
  if (afterSwitch.receipt) second = (await next(second, taker)).data.session;
  while (second.position < second.total) {
    assert.equal((await attempt(second, taker)).status, 201);
    second = (await next(second, taker)).data.session;
  }
  assert.equal((await attempt(second, taker)).status, 201);
  const observed = (await read(maker)).session;
  const completionRace = await Promise.all([
    next(second, taker),
    claim(observed, maker),
  ]);
  check(
    (completionRace[0].status === 200 &&
      completionRace[0].data.completed &&
      completionRace[1].status === 409) ||
      (completionRace[0].status === 409 && completionRace[1].status === 200),
    "completion and takeover race has a single valid final state",
  );
  if (completionRace[1].status === 200)
    assert.equal(
      (await next(completionRace[1].data.session, maker)).data.completed,
      true,
    );
  const totals = (await request("/learning/summary", undefined, maker)).data;
  check(
    (await request("/progress", undefined, maker)).data.answered === 18 &&
      totals.completedLessons[0].runs === 2,
    "two handover rounds save eighteen attempts and exactly two completions",
  );
  if (local) {
    const legacy = (
      await request(
        "/sessions",
        { lessonId: "P3A-U01-L1", clientRequestId: crypto.randomUUID() },
        a,
      )
    ).data;
    assert.match(legacy.id, /^[a-f0-9-]{36}$/);
    assert.match(child, /^[a-f0-9-]{36}$/);
    const fixture = spawnSync(
      process.execPath,
      [
        wrangler,
        "d1",
        "execute",
        "DB",
        "--local",
        "--command",
        `UPDATE learning_sessions SET lease_grant_id=NULL WHERE id='${legacy.id}' AND child_id='${child}'`,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      },
    );
    assert.equal(
      fixture.status,
      0,
      "prepare a pre-ownership session fixture on local D1 only",
    );
    const unclaimed = (await read(a)).session;
    const oldHint = await hint(legacy, a);
    const adopted = await claim(unclaimed, a);
    check(
      unclaimed.access === "takeover-required" &&
        unclaimed.leaseId === null &&
        oldHint.status === 409 &&
        adopted.status === 200 &&
        adopted.data.session.leaseId !== legacy.leaseId &&
        adopted.data.session.assignmentId === legacy.assignmentId,
      "legacy session needs an explicit fresh claim without losing its assignment",
    );
  }
  console.log(`${checks} ownership checks passed on ${base}`);
} finally {
  if (child) {
    const removed = await request(`/children/${child}/remove`, {}, a);
    assert.equal(
      removed.status,
      200,
      "remove synthetic handover child and records",
    );
  }
  for (const jar of jars)
    if (jar.has("eq_account")) await request("/logout", {}, jar);
}
