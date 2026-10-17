import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { run } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  admin = new Map(),
  family = new Map(),
  childOnly = new Map();
const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12),
  username = `report.${runId}`,
  temporary = `temporary-${crypto.randomUUID()}`,
  password = `family-${crypto.randomUUID()}`;
const adminPassword = process.env.EQ_ADMIN_PASSWORD ?? "admin123123456";
const filenames = [
  "course-release.v1.json",
  "course-expansion.latest.json",
  "topic-release.v1.json",
  "pattern-release.v1.json",
  "vocabulary-release.v1.json",
  "workshop-release.latest.json",
  "story-course-release.v1.json",
  "word-listening-release.v1.json",
  "action-course-release.latest.json",
];
const raw = JSON.parse(await readFile("content/exercises.json", "utf8"));
const releases = await Promise.all(
  filenames.map(async (name) =>
    JSON.parse(await readFile(`content/${name}`, "utf8")),
  ),
);
const byId = new Map(
  [...raw, ...releases.flatMap((r) => r.items)].map((item) => [item.id, item]),
);
const records = [];
let child,
  sibling,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = (command) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
async function fixture(command) {
  const path = `.wrangler/report-fixture-${runId}.sql`;
  await writeFile(path, command);
  try {
    run(["d1", "execute", "DB", "--local", "--file", path], { capture: true });
  } finally {
    await unlink(path);
  }
}
async function request(path, body, cookies = family) {
  const r = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": "3",
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const h of r.headers.getSetCookie()) {
    const pair = h.split(";")[0],
      at = pair.indexOf("=");
    if (pair.slice(at + 1)) cookies.set(pair.slice(0, at), pair.slice(at + 1));
    else cookies.delete(pair.slice(0, at));
  }
  return {
    status: r.status,
    data: await r.json(),
    cache: r.headers.get("Cache-Control"),
  };
}
const login = (user, key, cookies) =>
  request("/auth/login", { username: user, password: key }, cookies);
const report = (id = child, days = "7", cookies = family) =>
  request(
    `/family/children/${encodeURIComponent(id)}/report?days=${days}`,
    undefined,
    cookies,
  );
async function open(body) {
  const r = await request("/sessions", {
    ...body,
    clientRequestId: crypto.randomUUID(),
  });
  assert.equal(r.status, 201, r.data.error?.message);
  return r.data;
}
const correct = (item) =>
  item.type === "sort"
    ? Object.entries(item.placements).map(([k, v]) => `${k}=${v}`)
    : ["repair", "evidence"].includes(item.type)
      ? JSON.parse(item.answers[0])
      : item.type === "order"
        ? item.answers[0]
            .replace(item.punctuationTokens ? /([.!?,])/g : /$^/g, " $1")
            .trim()
            .split(/\s+/)
        : item.answers[0];
async function submit(
  s,
  { wrong = false, hint = false, transcript = false } = {},
) {
  const item = byId.get(s.exercise.id);
  assert.ok(item, item?.id);
  if (s.exercise.type === "listen")
    assert.equal(
      (
        await request(`/sessions/${s.id}/listening`, {
          assignmentId: s.assignmentId,
          leaseId: s.leaseId,
          mode: transcript ? "text" : "heard",
        })
      ).status,
      200,
    );
  if (hint)
    assert.equal(
      (
        await request(`/sessions/${s.id}/hint`, {
          assignmentId: s.assignmentId,
          leaseId: s.leaseId,
        })
      ).status,
      200,
    );
  const body = {
    eventId: crypto.randomUUID(),
    sessionId: s.id,
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
    answer: wrong ? "definitely wrong" : correct(item),
  };
  const saved = await request("/attempts", body);
  assert.equal(saved.status, 201, JSON.stringify(saved.data));
  const foundation =
    s.source === "lesson" &&
    releases[0].lessons.some((lesson) => lesson.id === item.lessonId);
  const bucket =
    saved.data.outcome === "incorrect"
      ? "incorrect"
      : saved.data.independentEvidence && !foundation
        ? "independent"
        : "assisted";
  records.push({
    id: item.id,
    eventId: body.eventId,
    bucket,
    source: s.source,
    type: item.type,
    family: item.family ?? item.id,
  });
  return { saved, body };
}
const advance = (s) =>
  request(`/sessions/${s.id}/next`, {
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
  });
async function complete(lessonId) {
  let s = await open({ lessonId });
  for (let n = 0; n < 9; n++) {
    await submit(s, { transcript: lessonId === "P3A-U04-L3" && n === 0 });
    const next = await advance(s);
    assert.equal(next.status, 200);
    if (n < 8) s = next.data.session;
    else assert.equal(next.data.result.total, 9);
  }
}
const counts = (rows) =>
  rows.reduce(
    (sum, row) => {
      sum.attempts++;
      sum[row.bucket]++;
      return sum;
    },
    { attempts: 0, independent: 0, assisted: 0, incorrect: 0, unscored: 0 },
  );
try {
  check(
    (await report("any", "7", new Map())).status === 401,
    "anonymous report read is rejected",
  );
  assert.equal((await login("admin", adminPassword, admin)).status, 200);
  const created = await request(
    "/admin/accounts",
    {
      username,
      householdName: "学习报告验证家庭",
      temporaryPassword: temporary,
      currentPassword: adminPassword,
    },
    admin,
  );
  assert.equal(created.status, 201);
  assert.equal((await login(username, temporary, family)).status, 200);
  check(
    (await report("any")).status === 403,
    "temporary-password account cannot open child reports",
  );
  assert.equal(
    (
      await request("/auth/password", {
        currentPassword: temporary,
        newPassword: password,
      })
    ).status,
    200,
  );
  assert.equal((await login(username, password, family)).status, 200);
  for (const nickname of ["报告验证小星", "报告验证小月"]) {
    const r = await request("/children", { nickname, grade: 3 });
    assert.equal(r.status, 201);
    if (!child) child = r.data.id;
    else sibling = r.data.id;
  }
  await request(`/children/${child}/select`, {});
  childOnly.set("eq_child", family.get("eq_child"));
  check(
    (await report(child, "7", childOnly)).status === 401,
    "a valid child learning grant alone cannot read guardian reports",
  );
  check(
    (await report(child, "7", admin)).status === 404,
    "site administrator does not bypass another family report scope",
  );
  check(
    (await report("not-a-child")).status === 404,
    "missing profile has the same not-found behavior",
  );
  check(
    (await report("' OR 1=1 --")).status === 404,
    "profile input stays a bound SQL value",
  );
  const empty = await report();
  assert.equal(empty.status, 200, JSON.stringify(empty.data));
  check(
    empty.data.days.length === 7 &&
      empty.data.days.every((d) => d.attempts === 0) &&
      empty.data.totals.attempts === 0 &&
      empty.data.review.dueNow === 0,
    "a new child receives seven explicit zero days and no fabricated progress",
  );
  check(
    empty.cache === "private, no-store",
    "guardian report must not enter shared browser or edge cache",
  );
  const month = await report(child, "30");
  check(
    month.status === 200 && month.data.days.length === 30,
    "thirty-day report runs on actual D1 within its bound-parameter limit",
  );
  for (const invalid of ["0", "-7", "365", "7.0", "abc", "7&days=30"])
    check(
      (await report(child, invalid)).status === 422,
      `invalid or ambiguous day range rejected ${invalid}`,
    );
  const one = await open({ exerciseId: "sample.be.1" }),
    saved = await submit(one),
    replayed = await request("/attempts", saved.body);
  check(
    replayed.status === 200 &&
      JSON.stringify(replayed.data) === JSON.stringify(saved.saved.data),
    "saved answer replay keeps the same receipt",
  );
  check(
    (await report()).data.totals.attempts === 1,
    "replay and an unfinished round produce exactly one saved observation",
  );
  assert.equal((await advance(one)).status, 200);
  await submit(await open({ topicId: "grammar.be", roundSize: 5 }), {
    wrong: true,
  });
  await submit(
    await open({ patternId: releases[3].items[0].patternId, roundSize: 5 }),
  );
  await submit(
    await open({ wordThemeId: "animals", wordMode: "meaning", roundSize: 5 }),
    { hint: true },
  );
  await submit(await open({ workshopId: "be", roundSize: 5 }));
  await complete("P1A-U01-L1");
  await complete("P3A-U04-L3");
  sql(`UPDATE review_cards SET due_at=0 WHERE child_id=${quote(child)}`);
  await submit(await open({ mode: "review" }));
  const mixed = await report();
  assert.equal(mixed.status, 200);
  const expected = counts(records);
  check(
    Object.entries(expected).every(
      ([key, value]) => mixed.data.totals[key] === value,
    ),
    "report categories match independently tracked receipts with conservative foundation evidence",
  );
  check(
    mixed.data.totals.completedRounds === 3 &&
      mixed.data.totals.completedLessons === 2,
    "finished rounds and distinct completed lessons exclude partially answered banks",
  );
  check(
    mixed.data.totals.taskFamilies ===
      new Set(records.map((r) => r.family)).size &&
      mixed.data.totals.independentTaskFamilies ===
        new Set(
          records
            .filter((r) => r.bucket === "independent")
            .map((r) => r.family),
        ).size,
    "same materials deduplicate independently from number of saved answers",
  );
  check(
    mixed.data.sources.length === 7,
    "all seven real learning entry types contribute to the same report",
  );
  check(
    mixed.data.interactions.length === 7,
    "all seven actual player types retain separate report evidence",
  );
  check(
    mixed.data.practice.some((row) => row.incorrect > 0) &&
      mixed.data.practice.some((row) => row.assisted > 0) &&
      mixed.data.practice.every((row) => row.incorrect + row.assisted > 0),
    "practice suggestions contain actual retry or support records, not inferred mastery ranks",
  );
  for (const key of ["sources", "interactions"])
    check(
      Object.entries(expected).every(
        ([k, v]) => mixed.data[key].reduce((sum, row) => sum + row[k], 0) === v,
      ),
      `${key} totals reconcile with daily observations`,
    );
  const start = Date.parse(`${mixed.data.window.from}T00:00:00+08:00`),
    today = Date.parse(`${mixed.data.window.through}T00:00:00+08:00`);
  const pattern = records.find((r) => r.source === "pattern"),
    vocab = records.find((r) => r.source === "vocabulary"),
    workshop = records.find((r) => r.source === "workshop");
  await fixture(
    `UPDATE attempts SET received_at=${start} WHERE event_id=${quote(records[0].eventId)};UPDATE attempts SET received_at=${start - 1} WHERE event_id=${quote(pattern.eventId)};UPDATE attempts SET received_at=${today - 1} WHERE event_id=${quote(vocab.eventId)};UPDATE attempts SET received_at=${today + 1} WHERE event_id=${quote(workshop.eventId)};`,
  );
  const week = await report(),
    older = await report(child, "30");
  check(
    week.data.totals.attempts === records.length - 1 &&
      older.data.totals.attempts === records.length,
    "seven-day boundary includes exact midnight and excludes the preceding millisecond",
  );
  check(
    week.data.days[0].attempts === 1 &&
      week.data.days.at(-2).attempts === 1 &&
      week.data.days.at(-1).attempts === records.length - 3,
    "China midnight separates yesterday and today without losing partial work",
  );
  for (const source of ["offline_unverified", "ai_unscored", "online"]) {
    const s = await open({ exerciseId: "sample.be.1" });
    await submit(s);
    sql(
      `UPDATE attempts SET evidence_source=${quote(source)},outcome=${quote(source === "online" ? "unscored" : "correct")},independent_evidence=1 WHERE event_id=${quote(records.at(-1).eventId)}`,
    );
  }
  const unscored = await report();
  check(
    unscored.data.totals.unscored === 3 &&
      unscored.data.totals.independent === week.data.totals.independent,
    "simulated offline, AI and unscored records never become independent successes",
  );
  const now = Date.now();
  await fixture(
    `INSERT INTO review_cards(household_id,child_id,skill_id,modality,due_at) SELECT household_id,children.id,s.id,'report-fixture',${now + 9 * 86400000} FROM children CROSS JOIN skills s WHERE children.id=${quote(child)} LIMIT 35;`,
  );
  await fixture(
    `UPDATE review_cards SET due_at=${now + 9 * 86400000} WHERE child_id=${quote(child)};UPDATE review_cards SET due_at=${now - 1} WHERE child_id=${quote(child)} AND rowid IN(SELECT rowid FROM review_cards WHERE child_id=${quote(child)} ORDER BY skill_id,modality LIMIT 1);UPDATE review_cards SET due_at=${now + 86400000} WHERE child_id=${quote(child)} AND rowid IN(SELECT rowid FROM review_cards WHERE child_id=${quote(child)} AND due_at>${now} ORDER BY skill_id,modality LIMIT 1);`,
  );
  const due = await report();
  check(
    due.data.review.dueNow === 1 &&
      due.data.review.dueNext7Days === 1 &&
      due.data.review.total > 30,
    "current due and next seven-day reminders do not overlap or truncate at thirty cards",
  );
  const siblingReport = await report(sibling);
  check(
    siblingReport.data.child.id === sibling &&
      siblingReport.data.totals.attempts === 0,
    "guardian may read a sibling report without mixing its evidence or changing learning profile",
  );
  check(
    (await request("/me")).data.child.id === child,
    "report browsing does not replace the active learning child or assignment",
  );
  const serialized = JSON.stringify(due.data);
  check(
    ![
      "answer_json",
      "private_answer_json",
      "receipt_json",
      "assignmentId",
      "leaseId",
      "password_hash",
      "answers",
      "explanationChinese",
    ].some((key) => serialized.includes(`"${key}"`)),
    "aggregate report exposes no raw answers, private keys or session permissions",
  );
  const state = () =>
    sql(
      `SELECT (SELECT count(*) FROM attempts WHERE child_id=${quote(child)}) AS attempts,(SELECT count(*) FROM reward_ledger WHERE child_id=${quote(child)}) AS rewards,(SELECT sum(version) FROM review_cards WHERE child_id=${quote(child)}) AS cardVersions`,
    )[0];
  const before = state();
  await report();
  await report(child, "30");
  check(
    JSON.stringify(state()) === JSON.stringify(before),
    "repeated report reads add no learning events or rewards",
  );
  sql(
    `UPDATE attempts SET received_at=${Date.now() + 86400000} WHERE event_id=${quote(records.at(-1).eventId)}`,
  );
  check(
    (await report()).data.totals.attempts === unscored.data.totals.attempts - 1,
    "future-dated observations stay outside the generated report cutoff",
  );
  sql(`UPDATE children SET timezone='invalid-zone' WHERE id=${quote(child)}`);
  const fallback = await report();
  check(
    fallback.data.window.timezone === "Asia/Shanghai" &&
      fallback.data.window.timezoneFallback,
    "invalid stored timezone falls back explicitly instead of returning a broken report",
  );
  await request("/logout", {});
  check(
    (await report(child, "7", childOnly)).status === 401,
    "revoked learning grants cannot recover guardian access",
  );
  check(
    (await report()).status === 401,
    "logout removes report authorization immediately",
  );
  console.log(
    `${checks} guardian report checks passed on local workerd/D1. Synthetic date/unverified fixtures are disposable; no cloud or AI provider calls.`,
  );
} finally {
  if (family.has("eq_account")) await request("/logout", {}).catch(() => {});
  if (admin.has("eq_account"))
    await request("/logout", {}, admin).catch(() => {});
  const target = `SELECT adult_id FROM account_credentials WHERE username=${quote(username)}`;
  await fixture(
    `DELETE FROM account_audit WHERE actor_id IN(${target}) OR target_id IN(${target});DELETE FROM households WHERE id IN(SELECT household_id FROM household_members WHERE adult_id IN(${target}));DELETE FROM adults WHERE id IN(${target});`,
  );
  assert.equal(
    sql(
      `SELECT count(*) AS n FROM account_credentials WHERE username=${quote(username)}`,
    )[0].n,
    0,
    "report fixtures cleaned up",
  );
}
