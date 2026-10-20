import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { wrangler } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  jar = new Map();
let playerVersion = "2";
const release = JSON.parse(
  await readFile("content/workshop-release.latest.json", "utf8"),
);
const contrast = JSON.parse(
  await readFile("content/be-action-release.latest.json", "utf8"),
);
const byId = new Map(
  [...release.items, ...contrast.items].map((i) => [i.id, i]),
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
  if (item.type === "sort")
    return Object.entries(item.placements).map(
      ([id, group]) => id + "=" + group,
    );
  if (item.type === "repair" || item.type === "evidence")
    return JSON.parse(item.answers[0]);
  if (item.type === "order") {
    const answer = item.answers[0].match(/[a-z]+(?:'[a-z]+)?|\d+|[.,!?;:]/gi);
    assert.deepEqual([...answer].sort(), [...item.tokens].sort());
    return answer;
  }
  return item.answers[0];
}
try {
  const metadata = (await request("/lessons")).data.workshops;
  assert.deepEqual(
    [...metadata].sort((a, b) => a.id.localeCompare(b.id)),
    [contrast.workshop, ...release.workshops].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  );
  check(
    metadata.length === 13 &&
      metadata.reduce((n, w) => n + w.items, 0) === 396 &&
      metadata
        .filter((w) => w.id !== contrast.workshop.id)
        .reduce((n, w) => n + w.items, 0) === 384,
    "public metadata preserves 12 legacy banks / 384 tasks and adds 12 contextual judgments",
  );
  check(
    !JSON.stringify(metadata).includes("placements") &&
      !JSON.stringify(metadata).includes("repairs"),
    "public metadata carries no correct mappings",
  );
  check(
    (await open({ workshopId: "articles" }, new Map())).status !== 201,
    "anonymous child cannot start workshop",
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
  const created = await request("/children", {
    nickname: "互动工坊临时验证",
    grade: 4,
  });
  assert.equal(created.status, 201);
  child = created.data.id;
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  playerVersion = "1";
  const original = (await open({ exerciseId: "sample.be.1" })).data;
  check(
    (await open({ workshopId: "articles", roundSize: 5 })).data.error?.code ===
      "PLAYER_UPDATE_REQUIRED" &&
      (await request("/sessions/current")).data.session.id === original.id,
    "old player cannot replace its current task with unsupported interactions",
  );
  playerVersion = "2";
  check(
    (await open({ workshopId: "unknown" })).status === 404,
    "unknown workshop cannot fall back to unrelated practice",
  );
  check(
    (await open({ workshopId: "articles", topicId: "grammar.be" })).status ===
      422,
    "mixed task selectors are rejected",
  );
  check(
    (await open({ workshopId: "articles", roundSize: 7 })).status === 422,
    "invalid workshop round size is rejected",
  );
  const sort = release.items.find(
    (i) => i.type === "sort" && i.workshopId === "articles",
  );
  const fresh = (await open({ exerciseId: sort.id })).data,
    right = correctAnswer(sort);
  check(
    fresh.exercise.type === "sort" &&
      !JSON.stringify(fresh).includes("placements"),
    "session exposes interactive cards without answer mapping",
  );
  check(
    JSON.stringify(
      (await request(`/sessions/${fresh.id}/snapshot`)).data.session.exercise,
    ) === JSON.stringify(fresh.exercise),
    "frozen cards and basket order survive snapshot reload",
  );
  playerVersion = "1";
  check(
    (await request(`/sessions/${fresh.id}/snapshot`)).data.error?.code ===
      "PLAYER_UPDATE_REQUIRED" &&
      (await request("/sessions/current")).data.error?.code ===
        "PLAYER_UPDATE_REQUIRED",
    "old tabs receive an explicit update error instead of an unrenderable question",
  );
  playerVersion = "2";
  check(
    JSON.stringify(
      (await request(`/sessions/${fresh.id}/snapshot`)).data.session.exercise,
    ) === JSON.stringify(fresh.exercise),
    "updated player restores the exact frozen question after an old-tab update error",
  );
  for (const invalid of [
    right.slice(1),
    [right[0], right[0], ...right.slice(2)],
    right.map((v, i) => (i ? v : "unknown=g0")),
    right.map((v, i) => (i ? v : v.split("=")[0] + "=unknown")),
  ]) {
    check(
      (await submit(fresh, invalid)).status === 422,
      "malformed or incomplete grouping creates no attempt",
    );
  }
  check(
    sql(`SELECT COUNT(*) AS n FROM attempts WHERE child_id=${quote(child)}`)[0]
      .n === 0,
    "invalid grouping cannot spend a reward or create evidence",
  );
  const eventId = crypto.randomUUID(),
    body = {
      eventId,
      sessionId: fresh.id,
      assignmentId: fresh.assignmentId,
      leaseId: fresh.leaseId,
      answer: right,
    };
  const first = await request("/attempts", body);
  check(
    first.status === 201 &&
      first.data.outcome === "correct" &&
      first.data.details.every((d) => d.correct),
    "whole correct group receives one persisted result and per-card feedback",
  );
  const replay = await request("/attempts", {
    ...body,
    eventId: crypto.randomUUID(),
    answer: [...right].reverse(),
  });
  check(
    replay.status === 200 &&
      JSON.stringify(replay.data) === JSON.stringify(first.data),
    "reordered equivalent placements replay the exact receipt",
  );
  check(
    sql(
      `SELECT COUNT(*) AS n FROM reward_ledger WHERE child_id=${quote(child)}`,
    )[0].n === 1,
    "reordered retry cannot double count reward",
  );
  const wrong = [...right],
    [card, group] = wrong[0].split("=");
  wrong[0] = `${card}=${sort.sorting.groups.find((g) => g.id !== group).id}`;
  check(
    (await request("/attempts", { ...body, answer: wrong })).status === 409,
    "different grouping cannot overwrite a saved assignment",
  );
  const nextSort = release.items.find(
      (i) => i.type === "sort" && i.workshopId === "there-be",
    ),
    incorrect = (await open({ exerciseId: nextSort.id })).data,
    incorrectAnswer = correctAnswer(nextSort),
    [cid, gid] = incorrectAnswer[0].split("=");
  incorrectAnswer[0] = `${cid}=${nextSort.sorting.groups.find((g) => g.id !== gid).id}`;
  const failed = await submit(incorrect, incorrectAnswer);
  check(
    failed.data.outcome === "incorrect" &&
      failed.data.details.filter((d) => !d.correct).length === 1 &&
      !failed.data.independentEvidence,
    "one wrong card keeps the entire task from independent promotion",
  );
  const repair = release.items.find(
      (i) => i.id === "workshop.plurals.repair.4",
    ),
    edit = (await open({ exerciseId: repair.id })).data,
    correct = correctAnswer(repair);
  check(
    (await submit(edit, "Two buses are outside.")).status === 422,
    "editing requires a selected part rather than arbitrary whole-sentence submission",
  );
  check(
    (await submit(edit, [correct[0], ""])).status === 422,
    "empty replacement cannot create an attempt",
  );
  const repaired = await submit(edit, [correct[0], " BUSSES "]);
  check(
    repaired.status === 201 &&
      repaired.data.correctedSentence === "Two buses are outside." &&
      repaired.data.details[0].correct,
    "reviewed spelling variant is accepted with complete corrected sentence",
  );
  const v2 = sql(
    `SELECT item_version,content_release_id FROM session_items WHERE id=${quote(edit.assignmentId)}`,
  )[0];
  check(
    v2.item_version === 2 && v2.content_release_id === "workshop-spelling-v2",
    "new assignments freeze reviewed version and actual release origin",
  );
  const legacy = (await open({ exerciseId: repair.id })).data;
  sql(
    `UPDATE session_items SET item_version=1,content_release_id='interactive-workshops-v1' WHERE id=${quote(legacy.assignmentId)} AND child_id=${quote(child)}`,
  );
  const oldReceipt = await submit(legacy, correct);
  check(
    oldReceipt.status === 201 && !oldReceipt.data.feedback.includes("美式变体"),
    "historical v1 task restores its original explanation and target",
  );
  const target = release.items.find(
      (i) => i.id === "workshop.plurals.repair.1",
    ),
    related = release.items.find(
      (i) =>
        i.workshopId === "plurals" &&
        i.type === "sort" &&
        i.evidenceTargets.includes(target.evidenceTargets[0]),
    );
  const seen = (await open({ exerciseId: related.id })).data;
  await submit(seen, correctAnswer(related));
  const later = (await open({ exerciseId: target.id })).data,
    supported = await submit(later, correctAnswer(target));
  check(
    supported.data.outcome === "hinted" &&
      supported.data.support === "example" &&
      !supported.data.independentEvidence,
    "a target seen in grouping cannot become fresh independent editing evidence the same day",
  );
  const hintedItem = release.items.find(
      (i) => i.id === "workshop.perfect-or-past.repair.1",
    ),
    hinted = (await open({ exerciseId: hintedItem.id })).data;
  assert.equal(
    (
      await request(`/sessions/${hinted.id}/hint`, {
        assignmentId: hinted.assignmentId,
        leaseId: hinted.leaseId,
      })
    ).status,
    200,
  );
  check(
    (await submit(hinted, correctAnswer(hintedItem))).data.outcome === "hinted",
    "structured correction retains normal hint evidence rules",
  );
  let rounds = 0;
  playerVersion = "5";
  for (const bank of metadata) {
    const opened = await open({ workshopId: bank.id, roundSize: 5 });
    assert.equal(
      opened.status,
      201,
      `${bank.id}: ${JSON.stringify(opened.data)}`,
    );
    const s = opened.data,
      result = await finish(s);
    check(
      result.total === 5 && result.correct === 5 && result.lessonId === null,
      `${bank.id} completes a real mixed five-task workshop without pretending to finish a course lesson`,
    );
    rounds++;
    const types = sql(
      `SELECT DISTINCT i.type FROM session_items si JOIN items i ON i.id=si.item_id AND i.version=si.item_version WHERE si.session_id=${quote(s.id)}`,
    ).map((r) => r.type);
    assert.deepEqual(
      types.sort(),
      bank.id === contrast.workshop.id
        ? ["choice", "evidence", "input", "order", "repair"]
        : ["repair", "sort"],
    );
  }
  check(
    rounds === 13,
    "all thirteen banks complete with their actual response types on real D1/workerd",
  );
  const second = new Map();
  await request(
    "/auth/login",
    { username: "admin", password: "admin123123456" },
    second,
  );
  await request(`/children/${child}/select`, {}, second);
  const owner = (await open({ workshopId: "be", roundSize: 5 })).data;
  const readonly = await request(
    `/sessions/${owner.id}/snapshot`,
    undefined,
    second,
  );
  check(
    readonly.data.session.access === "takeover-required" &&
      readonly.data.session.leaseId === null,
    "another device sees grouping progress without owner credential",
  );
  const claimed = await request(
    `/sessions/${owner.id}/takeover`,
    {
      clientRequestId: crypto.randomUUID(),
      expectedLeaseVersion: readonly.data.session.leaseVersion,
    },
    second,
  );
  const handed = claimed.data.session;
  check(
    claimed.status === 200 &&
      JSON.stringify(handed.exercise) === JSON.stringify(owner.exercise),
    "explicit handover preserves cards and selected content version",
  );
  check(
    (await submit(owner, correctAnswer(byId.get(owner.exercise.id)))).status ===
      409,
    "previous device cannot submit structured answer after takeover",
  );
  const saved = await request(
    "/attempts",
    {
      eventId: crypto.randomUUID(),
      sessionId: handed.id,
      assignmentId: handed.assignmentId,
      leaseId: handed.leaseId,
      answer: correctAnswer(byId.get(handed.exercise.id)),
    },
    second,
  );
  check(saved.status === 201, "new owning device can save structured answer");
  sql(
    `UPDATE review_cards SET due_at=0 WHERE child_id=${quote(child)} AND modality IN('rule-classification','sentence-editing')`,
  );
  // Old owner requests a new review only after explicitly taking over the active session.
  const current = await request("/sessions/current");
  await request(`/sessions/${owner.id}/takeover`, {
    clientRequestId: crypto.randomUUID(),
    expectedLeaseVersion: current.data.session.leaseVersion,
  });
  playerVersion = "1";
  check(
    (await open({ mode: "review" })).data.error?.code ===
      "PLAYER_UPDATE_REQUIRED",
    "old player review cannot silently receive or assign structured tasks",
  );
  playerVersion = "2";
  const review = await open({ mode: "review" });
  check(
    review.status === 201 &&
      ["sort", "repair"].includes(review.data.exercise.type),
    "due classification and editing cards return through shared review selection",
  );
  check(
    (await request("/learning/summary")).data.completedLessons.length === 0,
    "workshop completion does not inflate curriculum lesson progress",
  );
  const progress = (await request("/progress")).data;
  check(
    progress.cards.some(
      (c) =>
        c.skillId === "grammar.articles" &&
        c.modality === "rule-classification",
    ) &&
      progress.cards.some(
        (c) =>
          c.skillId === "grammar.articles" && c.modality === "sentence-editing",
      ),
    "review summary distinguishes classification from editing for the same skill",
  );
  const foreign = new Map();
  assert.equal(
    (await request("/dev/session", { family: "b", child: 2 }, foreign)).status,
    200,
  );
  check(
    (await request(`/sessions/${review.data.id}/snapshot`, undefined, foreign))
      .status === 404,
    "another household cannot read structured session or result",
  );
  await request("/logout", {}, foreign);
  for (const path of [
    "/content/workshop-release.v1.json",
    "/content/workshop-release.latest.json",
    "/content/workshops-v1.mjs",
  ])
    check(
      (await fetch(`http://127.0.0.1:5173${path}`)).status === 403,
      `private workshop source blocked ${path}`,
    );
  console.log(`${checks} interactive workshop checks passed (local only).`);
} finally {
  if (child)
    assert.equal((await request(`/children/${child}/remove`, {})).status, 200);
  if (jar.has("eq_account")) await request("/logout", {});
}
