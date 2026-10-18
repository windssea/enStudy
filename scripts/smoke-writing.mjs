import assert from "node:assert/strict";
import { run } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  owner = new Map(),
  second = new Map(),
  foreign = new Map();
let child,
  sibling,
  checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log("PASS " + label);
};
async function request(path, body, jar = owner, headers = {}) {
  const r = await fetch(base + "/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      "CF-Connecting-IP": `198.19.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const h of r.headers.getSetCookie()) {
    const pair = h.split(";")[0],
      at = pair.indexOf("="),
      key = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) jar.set(key, value);
    else jar.delete(key);
  }
  return { status: r.status, data: await r.json() };
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
const root = "/learning/writing/drafts";
const create = (
  promptId = "writing.p6.project",
  requestId = crypto.randomUUID(),
  jar = owner,
) => request(root, { childId: child, promptId, requestId }, jar);
const load = (id, jar = owner) => request(`${root}/${id}`, undefined, jar);
const save = (
  id,
  revision,
  content,
  jar = owner,
  requestId = crypto.randomUUID(),
) =>
  request(
    `${root}/${id}/save`,
    { childId: child, expectedRevision: revision, content, requestId },
    jar,
  );
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`;
const sql = (command) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
try {
  check(
    (await request("/learning/writing/prompts")).status === 401,
    "writing metadata requires a selected authorized child",
  );
  check(
    (
      await request(root, {
        childId: "none",
        promptId: "writing.p6.project",
        requestId: crypto.randomUUID(),
      })
    ).status === 401,
    "anonymous callers cannot create work",
  );
  assert.equal((await login(owner)).status, 200);
  child = (
    await request("/children", {
      nickname: "写作验证" + crypto.randomUUID().slice(0, 6),
      grade: 6,
    })
  ).data.id;
  assert.ok(child);
  assert.equal((await request(`/children/${child}/select`, {})).status, 200);
  assert.equal((await login(second)).status, 200);
  assert.equal(
    (await request(`/children/${child}/select`, {}, second)).status,
    200,
  );
  assert.equal(
    (await request("/dev/session", { family: "b", child: 1 }, foreign)).status,
    200,
  );
  const meta = (await request("/learning/writing/prompts")).data;
  check(
    meta.prompts.length === 6 &&
      meta.prompts.every((p) => p.sections.length === 3 && p.version === 1),
    "all six grades publish three-section authored prompts",
  );
  check(
    (await create("unknown")).status === 422,
    "unknown prompt cannot invent a saved prompt contract",
  );
  check(
    (
      await request(root, {
        childId: "another-child",
        promptId: meta.prompts[0].id,
        requestId: crypto.randomUUID(),
      })
    ).data.error?.code === "IDENTITY_CHANGED",
    "a stale child command cannot save into the newly selected child",
  );
  const before = (await request("/progress")).data;
  const requestId = crypto.randomUUID(),
    made = await create("writing.p6.project", requestId);
  check(
    made.status === 201 && made.data.revision === 1,
    "a real empty draft is created in local D1",
  );
  const id = made.data.draftId,
    initial = (await load(id)).data.draft;
  check(
    initial.childId === child &&
      initial.prompt.id === "writing.p6.project" &&
      initial.paragraphs.join("") === "",
    "saved draft freezes its prompt structure without inserting model answers",
  );
  check(
    (await create("writing.p6.project", requestId)).data.draftId === id,
    "repeating new-draft command returns the same work",
  );
  check(
    (await create("writing.p5.opinion", requestId)).data.error?.code ===
      "COMMAND_CHANGED",
    "reusing a create command for another prompt is rejected",
  );
  const content = {
    title: "<img src=x onerror=alert(1)> My paper project",
    plan: "先写主题\n再写两条依据，最后写计划。",
    paragraphs: [
      "My project is about a paper town.",
      "The notes show two card bridges and one model station.",
      "Next, we could check the paper labels.",
    ],
    checks: [],
  };
  const invalid = await save(id, 1, { ...content, paragraphs: ["only one"] });
  check(
    invalid.status === 422 && (await load(id)).data.draft.revision === 1,
    "invalid section shape does not consume a draft revision",
  );
  check(
    (await save(id, 1, { ...content, plan: "中".repeat(meta.limits.plan + 1) }))
      .status === 422,
    "oversize planning is rejected before any save",
  );
  check(
    (await save(id, 1, { ...content, title: "bad\0title" })).status === 422,
    "control characters cannot enter authored work",
  );
  const savedRequest = crypto.randomUUID(),
    written = await save(
      id,
      1,
      { ...content, checks: ["structure"] },
      owner,
      savedRequest,
    );
  check(
    written.status === 200 &&
      written.data.revision === 2 &&
      written.data.checks.length === 0,
    "text edits clear self-check claims even if a client sends old checks",
  );
  const restored = (await load(id, second)).data.draft;
  check(
    restored.title === content.title &&
      restored.plan === content.plan &&
      JSON.stringify(restored.paragraphs) ===
        JSON.stringify(content.paragraphs),
    "another authorized device restores actual title, Chinese plan and all paragraphs",
  );
  const withChecks = {
    ...content,
    checks: ["structure", "revision", "evidence"],
  };
  const checked = await save(id, 2, withChecks, second);
  check(
    checked.status === 200 &&
      checked.data.revision === 3 &&
      checked.data.checks.length === 3,
    "manual self-check is stored separately after text was saved",
  );
  const left = { ...withChecks, title: "Device A version", checks: [] },
    right = { ...withChecks, title: "Device B version", checks: [] };
  const race = await Promise.all([
    save(id, 3, left, owner),
    save(id, 3, right, second),
  ]);
  check(
    race.filter((r) => r.status === 200).length === 1 &&
      race.filter((r) => r.data.error?.code === "WRITING_CHANGED").length === 1,
    "two devices editing the same revision yield one save and one explicit conflict",
  );
  const latest = (await load(id)).data.draft;
  const cloned = await create();
  const cloneId = cloned.data.draftId;
  assert.equal((await save(cloneId, 1, left)).status, 200);
  check(
    (await load(cloneId)).data.draft.title === left.title &&
      (await load(id)).data.draft.revision === 4,
    "a retained local version can be saved as separate work without overwriting the conflicting original",
  );
  assert.equal(
    (
      await request(`${root}/${cloneId}/remove`, {
        childId: child,
        expectedRevision: 2,
      })
    ).status,
    200,
  );
  check(
    latest.revision === 4 &&
      [left.title, right.title].includes(latest.title) &&
      latest.checks.length === 0,
    "the winning text revision is intact and invalidates earlier self-checks",
  );
  const replay = await save(
    id,
    1,
    {
      checks: ["structure"],
      paragraphs: content.paragraphs,
      plan: content.plan,
      title: content.title,
    },
    owner,
    savedRequest,
  );
  check(
    replay.status === 200 &&
      replay.data.revision === 2 &&
      (await load(id)).data.draft.revision === 4,
    "a lost old receipt replays without reverting newer text and ignores JSON property order",
  );
  check(
    (
      await save(
        id,
        1,
        { ...content, title: "changed replay", checks: ["structure"] },
        owner,
        savedRequest,
      )
    ).data.error?.code === "COMMAND_CHANGED",
    "a changed replay body cannot reuse an earlier saved command",
  );
  const sameRequest = crypto.randomUUID(),
    next = {
      title: latest.title,
      plan: latest.plan,
      paragraphs: latest.paragraphs,
      checks: [],
    };
  const repeated = await Promise.all([
    save(id, 4, next, owner, sameRequest),
    save(id, 4, next, second, sameRequest),
  ]);
  check(
    repeated.every((r) => r.status === 200 && r.data.revision === 5) &&
      sql(
        `SELECT count(*) AS n FROM writing_commands WHERE child_id=${quote(child)} AND request_id=${quote(sameRequest)}`,
      )[0].n === 1,
    "concurrent retries of one save commit exactly one revision and receipt",
  );
  check(
    (await load(id, foreign)).status === 404,
    "another household cannot read a draft by identifier",
  );
  check(
    (await request(root, undefined, foreign)).data.items.length === 0,
    "another household cannot enumerate these drafts",
  );
  check(
    (await save(id, 5, next, foreign)).status === 409 &&
      (
        await request(
          `${root}/${id}/save`,
          {
            childId: (await request("/me", undefined, foreign)).data.child.id,
            requestId: crypto.randomUUID(),
            expectedRevision: 5,
            content: next,
          },
          foreign,
        )
      ).status === 404,
    "foreign child identity cannot mutate this draft",
  );
  check(
    (
      await request(
        `${root}/${id}/remove`,
        { childId: child, expectedRevision: 5 },
        foreign,
      )
    ).status === 409 &&
      (
        await request(
          `${root}/${id}/remove`,
          {
            childId: (await request("/me", undefined, foreign)).data.child.id,
            expectedRevision: 5,
          },
          foreign,
        )
      ).status === 404,
    "foreign child identity cannot delete this draft",
  );
  sibling = (
    await request("/children", {
      nickname: "写作隔离" + crypto.randomUUID().slice(0, 6),
      grade: 3,
    })
  ).data.id;
  assert.ok(sibling);
  await request(`/children/${sibling}/select`, {});
  check(
    (await load(id)).status === 404 &&
      (await request(root)).data.items.length === 0,
    "a sibling's selected profile cannot read or list another child's work",
  );
  check(
    (await save(id, 5, next)).data.error?.code === "IDENTITY_CHANGED" &&
      (
        await request(`${root}/${id}/save`, {
          childId: sibling,
          requestId: crypto.randomUUID(),
          expectedRevision: 5,
          content: next,
        })
      ).status === 404,
    "a queued command from a previous child is rejected after profile switch",
  );
  await request(`/children/${child}/select`, {});
  const unchanged = (await request("/progress")).data;
  check(
    before.answered === unchanged.answered &&
      before.stars === unchanged.stars &&
      before.cards.length === unchanged.cards.length,
    "writing and self-check do not add scored answers, stars or review evidence",
  );
  check(
    (await request("/sessions/current")).data.session === null,
    "writing does not create or finish an exercise session",
  );
  const expired = new Map(second);
  assert.equal((await request("/logout", {}, second)).status, 200);
  check(
    (await save(id, 5, next, expired)).status === 401,
    "revoked parent session cannot use an old child token to save work",
  );
  check(
    (
      await request(`${root}/${id}/remove`, {
        childId: child,
        expectedRevision: 3,
      })
    ).data.error?.code === "WRITING_CHANGED",
    "removal cannot silently delete a newer revision",
  );
  check(
    (
      await request(`${root}/${id}/remove`, {
        childId: child,
        expectedRevision: 5,
      })
    ).status === 200 && (await load(id)).status === 404,
    "the selected child can explicitly remove the saved revision",
  );
  check(
    sql(
      `SELECT count(*) AS n FROM writing_commands WHERE draft_id=${quote(id)}`,
    )[0].n === 0,
    "removal cascades private command receipts as well as work",
  );
  for (const p of meta.prompts) {
    const created = await create(p.id);
    assert.equal(created.status, 201);
    const d = (await load(created.data.draftId)).data.draft;
    const c = {
      title: `P${p.grade} authored trial`,
      plan: "中文提纲",
      paragraphs: p.sections.map(
        (_, i) => `My own sentence ${i + 1} for grade ${p.grade}.`,
      ),
      checks: [],
    };
    assert.equal((await save(d.id, d.revision, c)).status, 200);
  }
  check(
    (await request(root)).data.items.length === 6,
    "each grade's prompt can save its own authored content",
  );
  for (let n = 6; n < meta.limits.drafts; n++)
    assert.equal((await create()).status, 201);
  check(
    (await create()).data.error?.code === "WRITING_NOT_CREATED" &&
      (await request(root)).data.items.length === meta.limits.drafts,
    "per-child draft cap prevents unbounded creation without deleting existing work",
  );
  assert.equal((await request(`/children/${child}/remove`, {})).status, 200);
  check(
    sql(
      `SELECT (SELECT count(*) FROM writing_drafts WHERE child_id=${quote(child)}) AS drafts,(SELECT count(*) FROM writing_commands WHERE child_id=${quote(child)}) AS commands`,
    )[0].drafts === 0 &&
      sql(
        `SELECT count(*) AS n FROM writing_commands WHERE child_id=${quote(child)}`,
      )[0].n === 0,
    "removing the disposable child cascades all authored work and receipts",
  );
  child = null;
  console.log(
    `${checks} writing checks passed on local workerd/D1; no automatic grades, AI calls or cloud deployment.`,
  );
} finally {
  for (const id of [child, sibling].filter(Boolean))
    if (owner.has("eq_account"))
      assert.equal(
        (await request(`/children/${id}/remove`, {})).status,
        200,
        "clean disposable writing child",
      );
  for (const jar of [owner, second, foreign])
    if (jar.size) await request("/logout", {}, jar);
}
