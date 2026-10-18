import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { wrangler } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  jar = new Map();
let playerVersion = "3";
const release = JSON.parse(
  await readFile("content/story-course-release.v1.json", "utf8"),
);
const wordAudio = JSON.parse(
  await readFile("content/word-listening-release.v1.json", "utf8"),
);
const byId = new Map(
  [...release.items, ...wordAudio.items].map((i) => [i.id, i]),
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
      "X-EQ-Player-Version": playerVersion,
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
const open = (body, cookies = jar) =>
  request(
    "/sessions",
    { ...body, clientRequestId: crypto.randomUUID() },
    cookies,
  );
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
    if (item.type === "listen")
      assert.equal((await acknowledge(s, "heard")).status, 200);
    last = await submit(s, correctAnswer(item));
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
function correctAnswer(item) {
  return item.type === "evidence"
    ? JSON.parse(item.answers[0])
    : item.type === "order"
      ? item.answers[0].replace(/([.!?,])/g, " $1").split(/\s+/)
      : item.answers[0];
}
const acknowledge = (s, mode, cookies = jar) =>
  request(
    "/sessions/" + s.id + "/listening",
    { assignmentId: s.assignmentId, leaseId: s.leaseId, mode },
    cookies,
  );
let courseChild;
try {
  const catalog = (await request("/lessons")).data;
  check(
    catalog.lessons.length === 288 &&
      release.lessons.every((l) => catalog.lessons.some((c) => c.id === l.id)),
    "public catalog exposes all twenty-four third-unit lessons alongside earlier courses",
  );
  check(
    catalog.vocabulary.totalItems === 1440 &&
      catalog.vocabulary.themes.every((t) => t.modes.includes("listening")),
    "all eighteen word themes advertise actual listening mode and counts",
  );
  assert.equal(
    (
      await request("/auth/login", {
        username: "admin",
        password: "admin123123456",
      })
    ).status,
    200,
  );
  child = (await request("/children", { nickname: "听读临时验证", grade: 5 }))
    .data.id;
  assert.ok(child);
  await request(`/children/${child}/select`, {});
  playerVersion = "2";
  check(
    (await open({ lessonId: release.lessons[0].id })).data.error?.code ===
      "PLAYER_UPDATE_REQUIRED" &&
      (await request("/sessions/current")).data.session === null,
    "version two cannot create a lesson containing unsupported audio or evidence tasks",
  );
  playerVersion = "3";
  let s = (await open({ lessonId: release.lessons[0].id })).data;
  check(
    s.total === 9 &&
      s.exercise.type === "listen" &&
      !s.listening.heard &&
      !s.listening.textSupport,
    "new lesson begins with a real listening assignment and no claimed input",
  );
  check(
    (await submit(s, byId.get(s.exercise.id).answers[0])).data.error?.code ===
      "LISTENING_INPUT_REQUIRED",
    "answering before playback confirmation or text support creates no listening credit",
  );
  check(
    (
      await request(`/sessions/${s.id}/listening`, {
        assignmentId: { toString: null },
        leaseId: s.leaseId,
        mode: "heard",
      })
    ).status === 422,
    "malformed listening identifiers are rejected rather than coerced",
  );
  check(
    (
      await request(`/sessions/${s.id}/listening`, {
        assignmentId: s.assignmentId,
        leaseId: s.leaseId,
        mode: "clear",
      })
    ).status === 422,
    "client cannot clear or invent listening input flags",
  );
  const heard = await acknowledge(s, "heard");
  check(
    heard.status === 200 && heard.data.heard && !heard.data.textSupport,
    "explicit learner confirmation persists separately from transcript help",
  );
  const commits = sql(
    `SELECT COUNT(*) AS n FROM listening_commits WHERE child_id=${quote(child)}`,
  )[0].n;
  await acknowledge(s, "heard");
  check(
    sql(
      `SELECT COUNT(*) AS n FROM listening_commits WHERE child_id=${quote(child)}`,
    )[0].n === commits,
    "repeating a saved listening choice does not add writes or rewards",
  );
  const received = await submit(s, correctAnswer(byId.get(s.exercise.id)));
  check(
    received.status === 201 &&
      received.data.outcome === "correct" &&
      received.data.independentEvidence,
    "correct answer with confirmed audio is separate listening practice evidence",
  );
  const restored = (await request(`/sessions/${s.id}/snapshot`)).data;
  check(
    restored.session.listening.heard &&
      JSON.stringify(restored.receipt) === JSON.stringify(received.data),
    "reload restores the listening state and exact saved receipt",
  );
  check(
    (await acknowledge(s, "text")).status === 409 &&
      !(await request(`/sessions/${s.id}/snapshot`)).data.session.listening
        .textSupport,
    "text cannot be retroactively attached to an already saved answer",
  );
  s = (
    await request(`/sessions/${s.id}/next`, {
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
    })
  ).data.session;
  const evidence = byId.get(s.exercise.id),
    pair = correctAnswer(evidence);
  check(
    s.exercise.type === "evidence" && (await submit(s, pair[1])).status === 422,
    "reading requires both selected source sentence and answer",
  );
  check(
    (await submit(s, ["unknown", pair[1]])).status === 422,
    "invented evidence sentence is rejected before grading",
  );
  const wrongLine = evidence.passage.find((l) => l.id !== pair[0]).id;
  const wrong = await submit(s, [wrongLine, pair[1]]);
  check(
    wrong.data.outcome === "incorrect" &&
      !wrong.data.details[0].correct &&
      wrong.data.details[1].correct,
    "a correct guess with wrong evidence stays incorrect with precise separate feedback",
  );
  s = (
    await request(`/sessions/${s.id}/next`, {
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
    })
  ).data.session;
  const firstResult = await finish(s);
  check(
    firstResult.total === 9 && firstResult.correct === 8,
    "mixed lesson finishes every remaining step without regrading the saved reading error",
  );
  const word = wordAudio.items[0];
  s = (await open({ exerciseId: word.id })).data;
  const assisted = await acknowledge(s, "text");
  await acknowledge(s, "heard");
  check(
    assisted.status === 200 &&
      assisted.data.textSupport &&
      (await request(`/sessions/${s.id}/snapshot`)).data.session.listening
        .textSupport,
    "text support is durable and cannot be undone by later hearing confirmation",
  );
  const aided = await submit(s, word.answers[0]);
  check(
    aided.status === 201 &&
      aided.data.outcome === "hinted" &&
      aided.data.support === "transcript" &&
      !aided.data.independentEvidence,
    "text-assisted listening answer does not masquerade as independent hearing",
  );
  check(
    sql(
      `SELECT independent_successes AS n FROM review_cards WHERE child_id=${quote(child)} AND skill_id=${quote(word.skill)} AND modality='listening-choice'`,
    )[0].n === 0,
    "assisted word listening starts no independent mastery count",
  );
  const second = new Map();
  await request(
    "/auth/login",
    { username: "admin", password: "admin123123456" },
    second,
  );
  await request(`/children/${child}/select`, {}, second);
  s = (await open({ exerciseId: wordAudio.items[1].id })).data;
  check(
    (await acknowledge(s, "text", second)).status === 409,
    "another device cannot reveal transcript using a copied owner lease",
  );
  const readonly = (
    await request(`/sessions/${s.id}/snapshot`, undefined, second)
  ).data.session;
  const claimed = (
    await request(
      `/sessions/${s.id}/takeover`,
      {
        clientRequestId: crypto.randomUUID(),
        expectedLeaseVersion: readonly.leaseVersion,
      },
      second,
    )
  ).data.session;
  check(
    claimed.exercise.audioText === s.exercise.audioText &&
      claimed.listening.heard === false,
    "handover preserves the same audio script and input state",
  );
  check(
    (await acknowledge(claimed, "text", second)).status === 200 &&
      (await acknowledge(s, "heard")).status === 409,
    "new owner can choose support and old device cannot change hearing state",
  );
  const latest = (await request("/sessions/current")).data.session;
  await request(`/sessions/${s.id}/takeover`, {
    clientRequestId: crypto.randomUUID(),
    expectedLeaseVersion: latest.leaseVersion,
  });
  for (let index = 2; index < 5; index++) {
    const item = wordAudio.items[index],
      round = (await open({ exerciseId: item.id })).data;
    await acknowledge(round, "heard");
    const race = await Promise.all([
      acknowledge(round, "text"),
      submit(round, item.answers[0]),
    ]);
    assert.equal(race[1].status, 201);
    const state = sql(
      `SELECT li.transcript_at,a.independent_evidence FROM listening_inputs li JOIN attempts a ON a.assignment_id=li.assignment_id WHERE li.assignment_id=${quote(round.assignmentId)}`,
    )[0];
    check(
      !(state.transcript_at && state.independent_evidence),
      "concurrent text reveal and answer cannot create unsupported independent credit",
    );
  }
  courseChild = (
    await request("/children", { nickname: "第三单元临时验证", grade: 6 })
  ).data.id;
  assert.ok(courseChild);
  await request(`/children/${courseChild}/select`, {});
  let independent = 0,
    total = 0;
  for (const lesson of release.lessons) {
    const made = await open({ lessonId: lesson.id });
    assert.equal(made.status, 201);
    const result = await finish(made.data);
    assert.equal(result.correct, 9);
    total += result.total;
    independent += result.independent;
  }
  check(
    total === 216 && independent === 216,
    "all twenty-four new lessons complete all 216 distinct listening reading and grammar facts on fresh real D1 records",
  );
  const report = (await request("/learning/summary")).data;
  check(
    report.completedLessons.length === 24 &&
      report.completedLessons.every((l) => l.total === 9),
    "actual completed third-unit lessons appear once in saved curriculum progress",
  );
  sql(
    `UPDATE review_cards SET due_at=0 WHERE child_id=${quote(courseChild)} AND modality IN('listening-choice','reading-evidence')`,
  );
  playerVersion = "2";
  check(
    (await open({ mode: "review" })).data.error?.code ===
      "PLAYER_UPDATE_REQUIRED",
    "old player cannot create an unrenderable listening or reading review",
  );
  playerVersion = "3";
  const review = (await open({ mode: "review" })).data;
  check(
    ["listen", "evidence"].includes(review.exercise.type),
    "due listening and reading skills re-enter the unified review player",
  );
  check(
    (await request(`/sessions/${review.id}/snapshot`, undefined, second))
      .status === 404,
    "a sibling profile cannot read another child listening or evidence assignment",
  );
  await request("/logout", {}, second);
  const foreign = new Map();
  assert.equal(
    (await request("/dev/session", { family: "b", child: 2 }, foreign)).status,
    200,
  );
  check(
    (await acknowledge(review, "text", foreign)).status === 404,
    "another household cannot write audio support flags",
  );
  await request("/logout", {}, foreign);
  for (const path of [
    "/content/story-course-release.v1.json",
    "/content/story-courses-v1.mjs",
    "/content/word-listening-release.v1.json",
  ])
    check(
      (await fetch(`http://127.0.0.1:5173${path}`)).status === 403,
      `private listen/read source blocked ${path}`,
    );
  console.log(
    `${checks} listening/reading checks passed; playback is simulated self-report, not an acoustic/device test.`,
  );
} finally {
  if (jar.has("eq_account")) {
    for (const id of [child, courseChild].filter(Boolean))
      assert.equal((await request(`/children/${id}/remove`, {})).status, 200);
    await request("/logout", {});
  }
}
