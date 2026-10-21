import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.argv[2] ?? "http://127.0.0.1:8788";
assert.ok(
  ["127.0.0.1", "127.0.0.2", "localhost"].includes(new URL(base).hostname),
  "synthetic-profile checks are local only",
);
const release = JSON.parse(
    await readFile("content/grade4-tense-release.latest.json", "utf8"),
  ),
  languageReview = JSON.parse(
    await readFile("content/grade4-language-review.v1.json", "utf8"),
  ),
  byId = new Map(
    [...release.items, ...languageReview.items].map((i) => [i.id, i]),
  );
const jar = new Map(),
  children = [];
let checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log("PASS " + label);
};
async function request(path, body, origin = base) {
  const r = await fetch(base + "/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      "CF-Connecting-IP": "198.19.63.44",
      ...(body === undefined
        ? {}
        : { Origin: origin, "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const h of r.headers.getSetCookie()) {
    const [p] = h.split(";"),
      at = p.indexOf("="),
      k = p.slice(0, at),
      v = p.slice(at + 1);
    if (v) jar.set(k, v);
    else jar.delete(k);
  }
  return { status: r.status, data: await r.json() };
}
const open = (body) =>
  request("/sessions", { ...body, clientRequestId: crypto.randomUUID() });
async function answer(session) {
  const item = byId.get(session.exercise.id);
  assert.ok(item);
  const r = await request("/attempts", {
    eventId: crypto.randomUUID(),
    sessionId: session.id,
    assignmentId: session.assignmentId,
    leaseId: session.leaseId,
    answer: item.answers[0],
  });
  assert.equal(r.status, 201);
  return r.data;
}
async function create() {
  const r = await request("/children", {
    nickname: "四年级时态验证",
    grade: 4,
  });
  assert.equal(r.status, 201);
  children.push(r.data.id);
  assert.equal(
    (await request(`/children/${r.data.id}/select`, {})).status,
    200,
  );
  return r.data.id;
}
try {
  check(
    (
      await request("/learning/irregular-verbs/view", {
        version: 1,
        group: "all",
        page: 0,
      })
    ).status === 401,
    "anonymous table disclosure rejected",
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
  const child = await create();
  const metadata = (await request("/lessons")).data;
  check(
    metadata.lessons.filter((l) => l.grade === 4).length === 48 &&
      release.lessons.every(
        (expected) =>
          JSON.stringify(metadata.lessons.find((l) => l.id === expected.id)) ===
          JSON.stringify(expected),
      ) &&
      Object.keys(metadata.topicStats).length === 64,
    "P4 course enrichment and four topic banks are actually served",
  );
  check(
    languageReview.lessons.every(
      (l) =>
        JSON.stringify(metadata.lessons.find((m) => m.id === l.id)) ===
        JSON.stringify(l),
    ),
    "all reviewed P4 lesson examples are served exactly",
  );
  for (const exerciseId of [
    "g4.forms.irregular-past.did.keep.question.input",
    "g4.forms.irregular-past.participle.grow.participle.input",
    "g4.forms.irregular-past.participle.know.participle.input",
    "P4A-U04-L4.p8.input",
    "P4A-U01-L4.f2.input",
    "bank.tense.present-contrast.1.input",
  ]) {
    const row = byId.get(exerciseId);
    assert.ok(row);
    const assigned = await open({ exerciseId });
    check(
      assigned.status === 201 &&
        assigned.data.exercise.prompt === row.prompt &&
        !Object.hasOwn(assigned.data.exercise, "answers"),
      "reviewed question is assigned from its immutable D1 version",
    );
    const saved = await answer(assigned.data);
    check(
      saved.outcome !== "incorrect" &&
        saved.reviewAlgorithm === "ebbinghaus-v1",
      "reviewed answer saves and uses the existing review policy",
    );
  }
  for (const topic of Object.keys(release.stats)) {
    const cycle = await request("/training/cycles", {
      topicId: topic,
      clientRequestId: crypto.randomUUID(),
    });
    assert.equal(cycle.status, 201);
    const phase = await open({
      topicId: topic,
      trainingCycleId: cycle.data.id,
      trainingVersion: cycle.data.version,
    });
    check(
      phase.status === 201 && phase.data.total === 5,
      "training continuation binds the actual immutable topic release",
    );
    let session = (await open({ topicId: topic, roundSize: 5 })).data;
    const families = new Set();
    for (let n = 0; n < 5; n++) {
      check(
        !Object.hasOwn(session.exercise, "answers") &&
          byId.get(session.exercise.id)?.topicId === topic,
        "new assignment has the intended scope without private answers",
      );
      families.add(byId.get(session.exercise.id).family);
      const receipt = await answer(session);
      assert.notEqual(receipt.outcome, "incorrect");
      assert.equal(receipt.reviewAlgorithm, "ebbinghaus-v1");
      const next = await request(`/sessions/${session.id}/next`, {
        assignmentId: session.assignmentId,
        leaseId: session.leaseId,
      });
      assert.equal(next.status, 200);
      if (n < 4) session = next.data.session;
      else assert.equal(next.data.result.total, 5);
    }
    check(
      families.size === 5,
      "one round has five distinct facts and feeds the shared review policy",
    );
  }
  const progress = (await request("/progress")).data;
  for (const body of [
    { version: 9, group: "all", page: 0 },
    { version: 1, group: "wrong", page: 0 },
    { version: 1, group: "AAA", page: 5 },
    { version: 1, group: "all", page: -1 },
    { version: 1, group: "all", page: "0" },
  ])
    assert.equal(
      (await request("/learning/irregular-verbs/view", body)).status,
      422,
    );
  check(true, "table version, group and page validated before disclosure");
  check(
    (
      await request(
        "/learning/irregular-verbs/view",
        { version: 1, group: "all", page: 0 },
        "https://invalid.example",
      )
    ).status === 403,
    "cross-origin table writes rejected",
  );
  const shown = await request("/learning/irregular-verbs/view", {
    version: 1,
    group: "all",
    page: 0,
    words: [{ base: "fake" }],
    keys: ["fake-key"],
  });
  check(
    shown.status === 200 &&
      shown.data.childId === child &&
      shown.data.words.length === 10 &&
      shown.data.words[0].base === "go" &&
      shown.data.words.every((w) => w.base !== "fake"),
    "server owns disclosed words and ignores client answer replacement",
  );
  const after = (await request("/progress")).data;
  const extended = await request("/learning/irregular-verbs/view", {
    version: 1,
    group: "all",
    page: 0,
    scope: "extended",
  });
  check(
    extended.status === 200 &&
      extended.data.total === 30 &&
      extended.data.words[0].base === "begin",
    "extended guide is scoped to its own thirty verbs",
  );
  check(
    after.stars === progress.stars &&
      JSON.stringify(after.cards) === JSON.stringify(progress.cards),
    "viewing forms adds no memory strength, rewards or course completion",
  );
  const assisted = await open({
    exerciseId: "g4.forms.irregular-past.core.go.form.input",
  });
  assert.equal(assisted.status, 201);
  const receipt = await answer(assisted.data);
  check(
    receipt.outcome === "hinted" && !receipt.independentEvidence,
    "a displayed verb form cannot count as independent recall",
  );
  await create();
  const fresh = await open({
    exerciseId: "g4.forms.irregular-past.core.go.form.input",
  });
  assert.equal(fresh.status, 201);
  const independent = await answer(fresh.data);
  check(
    independent.independentEvidence &&
      independent.nextReviewAt > Date.now() + 86300000 &&
      independent.nextReviewAt < Date.now() + 86500000,
    "another child has independent exposure and memory records",
  );
  const did = await open({
    exerciseId: "g4.forms.irregular-past.did.go.question.input",
  });
  check(
    did.status === 201 &&
      did.data.exercise.wordFormCue?.word === "went" &&
      !did.data.exercise.prompt.includes("（go）") &&
      (await answer(did.data)).outcome === "correct",
    "revised did task recalls go from went and grades the persisted v2 assignment",
  );
  console.log(`${checks} P4 tense runtime checks passed`);
} finally {
  for (const id of children)
    assert.equal(
      (await request(`/children/${id}/remove`, {})).status,
      200,
      "remove only synthetic P4 records",
    );
  if (jar.has("eq_account")) await request("/logout", {});
}
