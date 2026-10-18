import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { run } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  web = "http://127.0.0.1:5173";
const jar = new Map(),
  device = new Map(),
  other = new Map();
const release = JSON.parse(
  await readFile("content/phonics-release.v1.json", "utf8"),
);
const vocabulary = JSON.parse(
  await readFile("content/vocabulary-release.v1.json", "utf8"),
);
const bank = new Map(release.items.map((i) => [i.id, i]));
let player = "4",
  child,
  sibling,
  checks = 0,
  persisted = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
const sql = (command) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
async function request(path, body, cookies = jar, extra = {}) {
  const r = await fetch(base + "/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": player,
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const h of r.headers.getSetCookie()) {
    const p = h.split(";")[0],
      at = p.indexOf("=");
    if (p.slice(at + 1)) cookies.set(p.slice(0, at), p.slice(at + 1));
    else cookies.delete(p.slice(0, at));
  }
  return {
    status: r.status,
    data: await r.json(),
    cache: r.headers.get("Cache-Control"),
  };
}
const login = (cookies) =>
  request(
    "/auth/login",
    {
      username: "admin",
      password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
    },
    cookies,
  );
const open = (body) =>
  request("/sessions", { ...body, clientRequestId: crypto.randomUUID() });
const answer = (i) => (i.graphemeTokens ? i.orderedTokens : i.answers[0]);
const submit = (
  s,
  value = answer(bank.get(s.exercise.id)),
  cookies = jar,
  event = crypto.randomUUID(),
  extra = {},
) =>
  request(
    "/attempts",
    {
      sessionId: s.id,
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
      eventId: event,
      answer: value,
      ...extra,
    },
    cookies,
  );
const advance = (s, cookies = jar) =>
  request(
    `/sessions/${s.id}/next`,
    { assignmentId: s.assignmentId, leaseId: s.leaseId },
    cookies,
  );
const listen = (s, mode = "heard", cookies = jar) =>
  request(
    `/sessions/${s.id}/listening`,
    { assignmentId: s.assignmentId, leaseId: s.leaseId, mode },
    cookies,
  );
try {
  check(
    (await request("/learning/phonics", undefined, new Map())).status === 401,
    "phonics progress requires a child grant",
  );
  assert.equal((await login(jar)).status, 200);
  child = (await request("/children", { nickname: "拼读核验", grade: 2 })).data
    .id;
  sibling = (await request("/children", { nickname: "另一拼读档案", grade: 1 }))
    .data.id;
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  assert.equal((await login(device)).status, 200);
  assert.equal(
    (await request(`/children/${child}/select`, {}, device)).status,
    200,
  );
  const meta = await request("/learning/phonics");
  check(
    meta.status === 200 &&
      meta.data.stages.length === 6 &&
      meta.data.stages.every(
        (s) => s.progress.answers === 0 && s.items === 40 && s.families === 20,
      ),
    "six real banks have zero fresh progress and forty tasks each",
  );
  check(
    meta.cache === "private, no-store" &&
      meta.data.stages.every(
        (s) =>
          !s.demos.some(
            (w) =>
              Object.hasOwn(w, "answers") || Object.hasOwn(w, "orderedTokens"),
          ) && typeof s.items === "number",
      ),
    "child phonics metadata is private and has no exercise answer key",
  );
  check(
    (await open({ phonicsStageId: "missing" })).status === 404 &&
      (await open({ phonicsStageId: "short-vowels", roundSize: 7 })).status ===
        422,
    "unknown stage and invalid round size cannot assign invented content",
  );
  const old = (await open({ exerciseId: "sample.form.go" })).data;
  player = "3";
  const gate = await open({ phonicsStageId: "short-vowels", roundSize: 5 });
  check(
    gate.status === 409 &&
      gate.data.error.code === "PLAYER_UPDATE_REQUIRED" &&
      (await request("/sessions/current")).data.session.id === old.id,
    "old player is rejected before replacing the existing assignment",
  );
  player = "4";
  check(
    (await request("/learning/phonics/short-vowels/view", { wordId: "cat" }))
      .status === 404,
    "practice words cannot be requested as untracked demonstrations",
  );
  check(
    (
      await request(
        "/learning/phonics/short-vowels/view",
        { wordId: "mat" },
        jar,
        { "X-EQ-Child-ID": sibling },
      )
    ).status === 409,
    "stale displayed-child identity cannot record a demonstration",
  );
  const before = (await request("/progress")).data;
  const demo = await request("/learning/phonics/split-vowels/view", {
    wordId: "late",
  });
  check(
    demo.status === 200 &&
      demo.data.saved &&
      JSON.stringify(demo.data.word.groups) === "[[0],[1,3],[2]]",
    "confirmed split-vowel demonstration preserves the a_e bridge",
  );
  await request("/learning/phonics/meaning-parts/view", {
    wordId: "sunflower",
  });
  const after = (await request("/progress")).data;
  check(
    before.answered === after.answered && before.stars === after.stars,
    "viewing clay examples adds no answer or star",
  );
  const sun = (await open({ exerciseId: "phonics.short-vowels.sun.listen" }))
    .data;
  await listen(sun);
  const sunResult = await submit(sun);
  check(
    sunResult.status === 201 &&
      sunResult.data.support === "example" &&
      !sunResult.data.independentEvidence,
    "sun shown inside the compound rule protects short-word evidence",
  );
  const cat = vocabulary.themes
    .flatMap((t) => t.words)
    .find((w) => w.word === "cat");
  assert.ok(cat);
  await request(`/learning/vocabulary/${cat.id}/view`, {});
  let s = (await open({ exerciseId: "phonics.short-vowels.cat.build" })).data;
  const noAttempt = await submit(s, ["c", "a"]);
  check(
    noAttempt.status === 422 &&
      (await request("/sessions/current")).data.receipt === null,
    "an incomplete letter bag does not consume the attempt",
  );
  check(
    (await submit(s, ["c", "a", "a"])).status === 422 &&
      (await submit(s, "cat")).status === 422,
    "duplicate tiles and plain strings cannot bypass token assembly",
  );
  player = "3";
  check(
    (await request("/sessions/current")).data.error?.code ===
      "PLAYER_UPDATE_REQUIRED" &&
      (await submit(s, ["c", "a", "t"])).data.error?.code ===
        "PLAYER_UPDATE_REQUIRED",
    "an old client cannot resume or submit the new letter payload",
  );
  check(
    (
      await request(`/sessions/${s.id}/hint`, {
        assignmentId: s.assignmentId,
        leaseId: s.leaseId,
      })
    ).data.error?.code === "PLAYER_UPDATE_REQUIRED" &&
      (await advance(s)).data.error?.code === "PLAYER_UPDATE_REQUIRED",
    "old players cannot alter hints or advance a new phonics assignment",
  );
  check(
    (
      await request(
        `/sessions/${s.id}/takeover`,
        {
          clientRequestId: crypto.randomUUID(),
          expectedLeaseVersion: s.leaseVersion,
        },
        device,
      )
    ).data.error?.code === "PLAYER_UPDATE_REQUIRED",
    "an incompatible device cannot steal the new assignment lease",
  );
  check(
    (
      await request(`/sessions/${s.id}/offline-pack`, {
        assignmentId: s.assignmentId,
        leaseId: s.leaseId,
      })
    ).data.error?.code === "PLAYER_UPDATE_REQUIRED",
    "an old client cannot freeze an incompatible offline pack",
  );
  player = "4";
  const event = crypto.randomUUID(),
    catSaved = await submit(s, ["c", "a", "t"], jar, event);
  check(
    catSaved.status === 201 &&
      catSaved.data.outcome === "hinted" &&
      catSaved.data.support === "example",
    "a historical vocabulary card also protects new phonics spelling evidence",
  );
  check(
    JSON.stringify((await submit(s, ["c", "a", "t"], jar, event)).data) ===
      JSON.stringify(catSaved.data),
    "a repeated letter answer restores the immutable receipt",
  );
  check(
    (await submit(s, ["t", "a", "c"], jar, event)).status === 409,
    "a changed answer cannot reuse the saved event",
  );
  const snap = (await request(`/sessions/${s.id}/snapshot`, undefined, device))
    .data.session;
  const takeover = await request(
    `/sessions/${s.id}/takeover`,
    {
      clientRequestId: crypto.randomUUID(),
      expectedLeaseVersion: snap.leaseVersion,
    },
    device,
  );
  check(
    takeover.status === 200 &&
      takeover.data.receipt.eventId === event &&
      takeover.data.session.assignmentId === s.assignmentId,
    "another device recovers the same phonics task and receipt",
  );
  check(
    (await advance(s)).status === 409,
    "the previous device cannot advance after explicit takeover",
  );
  assert.equal((await advance(takeover.data.session, device)).status, 200);
  // Re-select creates a fresh valid grant after the handover; no content is reset.
  await request(`/children/${child}/select`, {});
  const cap = (await open({ exerciseId: "phonics.short-vowels.cap.listen" }))
    .data;
  check(
    (await submit(cap)).data.error?.code === "LISTENING_INPUT_REQUIRED",
    "listening still requires heard confirmation or text support",
  );
  await listen(cap, "text");
  const assisted = await submit(cap);
  check(
    assisted.status === 201 &&
      !assisted.data.independentEvidence &&
      assisted.data.support === "transcript",
    "text support remains assisted listening evidence",
  );
  const pin = (await open({ exerciseId: "phonics.short-vowels.pin.listen" }))
    .data;
  await listen(pin);
  const independent = await submit(pin);
  check(
    independent.status === 201 && independent.data.independentEvidence,
    "an undisclosed word can still produce an independent heard-confirmation record",
  );
  const pinVocab = vocabulary.items.find(
    (i) =>
      i.wordId &&
      vocabulary.themes.flatMap((t) => t.words).find((w) => w.id === i.wordId)
        ?.word === "sun" &&
      i.wordMode === "spelling",
  );
  if (pinVocab) {
    const v = (await open({ exerciseId: pinVocab.id })).data;
    check(
      (await submit(v, pinVocab.answers[0])).data.support === "example",
      "compound-rule word disclosure also protects existing vocabulary spelling",
    );
  }
  for (const stage of release.stages) {
    const first = (await open({ phonicsStageId: stage.id, roundSize: 5 })).data;
    const rows = sql(
      `SELECT item_id,presentation_json FROM session_items WHERE session_id=${quote(first.id)} ORDER BY position`,
    );
    const families = new Set(rows.map((r) => bank.get(r.item_id).family));
    check(
      first.source === "phonics" &&
        first.phonicsStageId === stage.id &&
        families.size === 5,
      `${stage.id}: saved five-word draw has distinct families and stable stage identity`,
    );
    const replay = (await request(`/sessions/${first.id}/snapshot`)).data
      .session;
    assert.deepEqual(replay.exercise, first.exercise);
    let current = first,
      done;
    for (let n = 0; n < 5; n++) {
      if (current.exercise.type === "listen") await listen(current);
      assert.equal((await submit(current)).status, 201);
      const next = await advance(current);
      assert.equal(next.status, 200);
      if (n === 4) done = next.data;
      else current = next.data.session;
    }
    check(
      done.completed && done.result.total === 5 && done.result.correct === 5,
      `${stage.id}: mixed word tasks persist and complete the round`,
    );
    const ten = (await open({ phonicsStageId: stage.id, roundSize: 10 })).data;
    const fresh = sql(
      `SELECT item_id FROM session_items WHERE session_id=${quote(ten.id)}`,
    );
    check(
      ten.total === 10 &&
        fresh.every((r) => !families.has(bank.get(r.item_id).family)),
      `${stage.id}: the next draw avoids all five recent words`,
    );
    const twenty = (await open({ phonicsStageId: stage.id, roundSize: 20 }))
      .data;
    const all = sql(
      `SELECT item_id FROM session_items WHERE session_id=${quote(twenty.id)}`,
    );
    check(
      twenty.total === 20 &&
        new Set(all.map((r) => bank.get(r.item_id).family)).size === 20,
      `${stage.id}: a twenty-question round has no repeated word family`,
    );
  }
  check(
    (await request("/learning/phonics")).data.stages.every(
      (s) => s.progress.rounds === 1 && s.progress.answers === 5,
    ),
    "stage progress counts completed phonics rounds without claiming core-course completion",
  );
  // Exercise all 240 published tasks through the real grader, not just source checks.
  for (const item of release.items) {
    const opened = await open({ exerciseId: item.id });
    assert.equal(opened.status, 201, item.id);
    s = opened.data;
    assert.ok(
      !JSON.stringify(s.exercise).includes('"orderedTokens"') &&
        !JSON.stringify(s.exercise).includes('"answers"'),
      item.id,
    );
    if (item.type === "listen") await listen(s);
    const result = await submit(s);
    assert.equal(result.status, 201, item.id);
    assert.ok(["correct", "hinted"].includes(result.data.outcome), item.id);
    assert.equal((await advance(s)).status, 200, item.id);
    persisted++;
    if (persisted % 40 === 0)
      console.log(`Persisted ${persisted}/240 published phonics tasks.`);
  }
  check(
    persisted === 240,
    "all 240 new listening, fill, grouping and grapheme tasks are accepted and persisted by workerd/D1",
  );
  const offline = (await open({ exerciseId: "phonics.vowel-teams.moon.build" }))
    .data;
  const prepared = await request(`/sessions/${offline.id}/offline-pack`, {
    assignmentId: offline.assignmentId,
    leaseId: offline.leaseId,
  });
  check(
    prepared.status === 200 &&
      prepared.data.items[0].exercise.graphemeTokens &&
      prepared.data.items[0].exercise.audioUrl,
    "new offline packs retain grapheme semantics and the on-demand audio reference",
  );
  const off = await submit(
    offline,
    ["m", "oo", "n"],
    jar,
    crypto.randomUUID(),
    { evidenceSource: "offline_unverified", clientOccurredAt: Date.now() },
  );
  check(
    off.status === 201 &&
      off.data.support === "offline" &&
      !off.data.independentEvidence &&
      off.data.rewardDelta === 0,
    "offline word assembly cannot create an independent or rewarded attempt",
  );
  sql(`UPDATE review_cards SET due_at=0 WHERE child_id=${quote(child)}`);
  const review = await open({ mode: "review" });
  const reviewRows =
    review.status === 201
      ? sql(
          `SELECT item_id FROM session_items WHERE session_id=${quote(review.data.id)}`,
        )
      : [];
  check(
    review.status === 201 && reviewRows.some((r) => bank.has(r.item_id)),
    "new phonics skills enter the shared due-review queue",
  );
  await request(`/children/${sibling}/select`, {});
  check(
    (await request("/learning/phonics")).data.stages.every(
      (s) => s.progress.answers === 0,
    ),
    "a sibling sees no copied phonics progress",
  );
  check(
    (await request(`/sessions/${offline.id}/snapshot`)).status === 404,
    "a sibling cannot load another child's phonics pack session",
  );
  assert.equal(
    (await request("/dev/session", { family: "b", child: 1 }, other)).status,
    200,
  );
  check(
    (await request(`/sessions/${offline.id}/snapshot`, undefined, other))
      .status === 404,
    "another household cannot load phonics assignments",
  );
  const audio = JSON.parse(
    await readFile("public/content/phonics-audio.v1.json", "utf8"),
  );
  for (const item of [
    audio.items[0],
    audio.items.find((i) => i.word === "sunflower"),
  ]) {
    const bytes = Buffer.from(
      await (await fetch(web + item.url)).arrayBuffer(),
    );
    check(
      createHash("sha256").update(bytes).digest("hex") === item.sha256 &&
        bytes.toString("ascii", 0, 4) === "RIFF",
      `${item.word}: the real static whole-word WAV matches its published hash`,
    );
  }
  for (const path of [
    "/content/phonics-v1.mjs",
    "/content/phonics-release.v1.json",
  ])
    check(
      (await fetch(web + path)).status === 403,
      `private phonics source is not served ${path}`,
    );
  console.log(
    `${checks} phonics checks passed; ${persisted} tasks persisted. Audio confirmation is simulated; no acoustic, browser GPU or cloud deployment acceptance.`,
  );
} finally {
  for (const id of [sibling, child].filter(Boolean))
    if (jar.has("eq_account"))
      assert.equal((await request(`/children/${id}/remove`, {})).status, 200);
  for (const cookies of [jar, device])
    if (cookies.has("eq_account")) await request("/logout", {}, cookies);
}
