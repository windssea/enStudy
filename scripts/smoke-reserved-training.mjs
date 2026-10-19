import assert from "node:assert/strict";
import { readFile, mkdir, unlink } from "node:fs/promises";
import { build } from "esbuild";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";
import { createServer } from "node:http";
import { resolve, sep, extname } from "node:path";
import { createHash } from "node:crypto";
const browserMode = process.argv.includes("--browser"),
  worker = `.wrangler/reserved-${browserMode ? "browser" : "smoke"}-worker.mjs`;
await mkdir(".wrangler", { recursive: true });
await build({
  stdin: {
    contents:
      'import {app} from "./packages/server/app"; export default {fetch:app.fetch};',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: worker,
  logLevel: "silent",
});
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    scriptPath: worker,
    compatibilityDate: "2026-10-17",
    d1Databases: ["DB"],
    bindings: { APP_STAGE: "local", ALLOW_DEV_AUTH: "true" },
    log: new Log(LogLevel.ERROR),
  }),
);
const bank = JSON.parse(
    await readFile("content/training-reserved-release.catalog.json", "utf8"),
  ),
  old = JSON.parse(await readFile("content/topic-release.v1.json", "utf8"));
const contrast = JSON.parse(
  await readFile("content/be-action-release.v1.json", "utf8"),
);
const items = new Map(
    [...old.items, ...bank.items, ...contrast.items].map((i) => [i.id, i]),
  ),
  jar = new Map();
let checks = 0,
  gateway;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log("PASS " + label);
};
async function request(path, body, cookies = jar) {
  const r = await mf.dispatchFetch("http://127.0.0.2/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": "4",
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: "http://127.0.0.2", "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const h of r.headers.getSetCookie()) {
    const p = h.split(";")[0],
      i = p.indexOf("=");
    if (p.slice(i + 1)) cookies.set(p.slice(0, i), p.slice(i + 1));
    else cookies.delete(p.slice(0, i));
  }
  return { status: r.status, data: await r.json() };
}
function statements(sql) {
  let part = "",
    quote = "";
  const rows = [];
  sql = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    part += ch;
    if (quote) {
      if (ch === quote) {
        if (sql[i + 1] === quote) part += sql[++i];
        else quote = "";
      }
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === ";") {
      rows.push(part);
      part = "";
    }
  }
  if (part.trim()) rows.push(part);
  return rows;
}
const create = async (topic) =>
  (
    await request("/training/cycles", {
      topicId: topic,
      clientRequestId: crypto.randomUUID(),
    })
  ).data;
const read = async (id) => (await request(`/training/cycles/${id}`)).data;
const open = (cycle) =>
  request("/sessions", {
    topicId: cycle.topicId,
    trainingCycleId: cycle.id,
    trainingVersion: cycle.version,
    clientRequestId: crypto.randomUUID(),
  });
const adopt = (cycle) =>
  request(`/training/cycles/${cycle.id}/materials`, {
    expectedVersion: cycle.version,
  });
async function finish(s, mixed = false, options = {}) {
  let receipt;
  for (let n = 0; n < s.total; n++) {
    const item = items.get(s.exercise.id);
    assert.ok(item);
    if (mixed && n === 1)
      assert.equal(
        (
          await request(`/sessions/${s.id}/hint`, {
            assignmentId: s.assignmentId,
            leaseId: s.leaseId,
          })
        ).status,
        200,
      );
    const value = options.answerFor
      ? options.answerFor(item, n)
      : mixed && n === 0
        ? "not-an-answer"
        : item.answers[0];
    const saved = await request("/attempts", {
      eventId: crypto.randomUUID(),
      sessionId: s.id,
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
      answer: value,
    });
    assert.equal(saved.status, 201);
    receipt ??= saved.data;
    if (options.onSaved) await options.onSaved(s, item, saved.data, value);
    const next = await request(`/sessions/${s.id}/next`, {
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
    });
    assert.equal(next.status, 200);
    if (next.data.completed) return { receipt, result: next.data.result };
    s = next.data.session;
  }
  throw Error("phase incomplete");
}
try {
  const db = await mf.getD1Database("DB");
  const migrate = async (name) => {
    for (const sql of statements(await readFile("migrations/" + name, "utf8")))
      await db.prepare(sql).run();
  };
  for (const name of [
    "0001_core.sql",
    "0002_accounts.sql",
    "0004_learning_flow.sql",
    "0006_random_topic_assignments.sql",
    "0010_managed_accounts.sql",
    "0011_session_ownership.sql",
    "0012_ai_connections.sql",
    "0013_training_cycles.sql",
    "0015_teaching_exposure.sql",
    "0017_ai_voice.sql",
    "0021_listening_inputs.sql",
    "0025_offline_preparation.sql",
    "0030_child_companions.sql",
    "0032_household_membership.sql",
    "0033_household_member_lookup.sql",
  ])
    await migrate(name);
  check(
    (await request("/training/materials/grammar.be", undefined, new Map()))
      .status === 401,
    "anonymous material outlines require a child grant",
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
  const me = (await request("/me")).data,
    child = me.child.id,
    household = me.adult.householdId,
    legacyId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO training_cycles(id,household_id,child_id,topic_id,created_at) VALUES(?,?,?,'grammar.articles',?)",
    )
    .bind(legacyId, household, child, Date.now())
    .run();
  await migrate("0042_reserved_training_materials.sql");
  const legacyRow = await db
    .prepare("SELECT * FROM training_cycles WHERE id=?")
    .bind(legacyId)
    .first();
  check(
    legacyRow.plan_version === 1 &&
      legacyRow.version === 0 &&
      legacyRow.material_release_id === null,
    "appending material columns preserves existing workflow and allocation",
  );
  for (const item of new Map(bank.items.map((i) => [i.skill, i])).values())
    await db
      .prepare("INSERT OR IGNORE INTO skills VALUES(?,'grammar',?)")
      .bind(item.skill, item.title)
      .run();
  await migrate("0043_reserved_training_content_v1.sql");
  await migrate("0044_reserved_training_review_v2.sql");
  await db
    .prepare(
      "INSERT INTO content_releases VALUES('topic-bank-v1','published','old-fixture',?)",
    )
    .bind(Date.now())
    .run();
  for (const topic of [
    "grammar.be",
    "grammar.articles",
    "grammar.countability",
  ]) {
    await db
      .prepare("INSERT INTO lessons VALUES(?,1,'topic-bank-v1',1,'A',1,?,'{}')")
      .bind(`bank.${topic}`, topic)
      .run();
    for (const item of old.items.filter((i) => i.topicId === topic)) {
      const { answers, hint, explanation, ...data } = item;
      await db
        .prepare("INSERT INTO items VALUES(?,1,?,1,?,?,?,?,?,'published')")
        .bind(
          item.id,
          `bank.${topic}`,
          item.skill,
          item.modality,
          item.type,
          JSON.stringify(data),
          JSON.stringify({ answers, hint, explanation }),
        )
        .run();
      await db
        .prepare("INSERT INTO release_items VALUES('topic-bank-v1',?,1)")
        .bind(item.id)
        .run();
    }
  }
  const outline = await request("/training/materials/grammar.be");
  const labs = JSON.parse(
    await readFile("content/concept-labs.v1.json", "utf8"),
  );
  const painted = labs.labs
    .find((l) => l.id === "forms.regular-past")
    .cases.find((c) => c.targetForms.includes("painted"));
  const canonical =
    "sentence:" +
    painted.sentence
      .normalize("NFKC")
      .replace(/[‘’]/g, "'")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.!?]+$/g, "")
      .toLowerCase();
  await db
    .prepare("INSERT INTO teaching_exposures VALUES(?,?,?,'2000-01-01',?)")
    .bind(
      household,
      child,
      "sha256:" + createHash("sha256").update(canonical).digest("hex"),
      Date.now(),
    )
    .run();
  const historicalTeachingCycle = await create("tense.past-simple"),
    historicalTeachingPhase = await open(historicalTeachingCycle);
  assert.equal(historicalTeachingPhase.status, 201);
  check(
    (
      await db
        .prepare("SELECT item_id FROM session_items WHERE session_id=?")
        .bind(historicalTeachingPhase.data.id)
        .all()
    ).results.every((r) => !items.get(r.item_id).answers.includes("painted")),
    "an old canonical concept demonstration excludes its new word target even without newly generated family keys",
  );
  check(
    outline.status === 200 &&
      outline.data.available &&
      outline.data.revisionId === bank.revisionId &&
      outline.data.dimensions.length === 5 &&
      !JSON.stringify(outline.data).includes("answers"),
    "published outlines disclose only five observable dimensions",
  );
  check(
    !(await request("/training/materials/forms.ing")).data.available,
    "the other topics retain honest legacy coverage rather than fabricated reserved content",
  );
  const cycle = await create("grammar.be");
  check(
    cycle.planVersion === 1 &&
      cycle.materials.kind === "reserved" &&
      cycle.scope === "controlled-context",
    "new supported cycles explicitly bind the dedicated material edition",
  );
  check(
    (await create("grammar.be")).id === cycle.id,
    "a new creation nonce cannot reset the reserved plan",
  );
  for (let n = 0; n < 3; n++) {
    const ordinary = await request("/sessions", {
      topicId: "grammar.be",
      roundSize: 20,
      clientRequestId: crypto.randomUUID(),
    });
    assert.equal(ordinary.status, 201);
    const ids = (
      await db
        .prepare("SELECT item_id FROM session_items WHERE session_id=?")
        .bind(ordinary.data.id)
        .all()
    ).results;
    assert.ok(ids.every((r) => !items.get(r.item_id).trainingPhase));
  }
  check(
    true,
    "all sixty ordinary families can be assigned without consuming reserved slots",
  );
  check(
    (
      await request("/sessions", {
        exerciseId: bank.items[0].id,
        clientRequestId: crypto.randomUUID(),
      })
    ).status === 404,
    "direct single-question entry cannot consume a reserved assessment item",
  );
  const seen = new Set();
  async function verifyPhase(s, phase) {
    const rows = (
      await db
        .prepare("SELECT item_id FROM session_items WHERE session_id=?")
        .bind(s.id)
        .all()
    ).results.map((r) => items.get(r.item_id));
    assert.ok(
      rows.every((i) => i.trainingPhase === phase && !seen.has(i.family)),
    );
    rows.forEach((i) => seen.add(i.family));
    if (phase !== "practice")
      assert.equal(new Set(rows.map((i) => i.trainingDimension)).size, 5);
    check(
      rows.length === (phase === "practice" ? 10 : 5),
      `${phase} assigns only its reserved slots, without repeated families`,
    );
  }
  const diagnostic = await open(cycle);
  assert.equal(diagnostic.status, 201);
  await verifyPhase(diagnostic.data, "diagnostic");
  const first = await finish(diagnostic.data, true),
    after = await read(cycle.id);
  check(
    first.result.independent === 3 &&
      first.result.correct === 4 &&
      after.coaching.length === 2,
    "balanced small attempts distinguish independent, hinted and incorrect work",
  );
  const beforeExposure = (
    await db.prepare("SELECT count(*) n FROM teaching_exposures").first()
  ).n;
  const metadata = await read(cycle.id),
    encoded = JSON.stringify(metadata.coaching);
  check(
    !encoded.includes('"rule"') &&
      !encoded.includes('"example"') &&
      metadata.coaching.every((c) => c.eventId) &&
      (await db.prepare("SELECT count(*) n FROM teaching_exposures").first())
        .n === beforeExposure,
    "coaching GET returns only private observation metadata without silently disclosing explanations",
  );
  await db
    .prepare("UPDATE teaching_exposures SET shown_day='2000-01-01'")
    .run();
  const disclosed = await request(
    `/learning/mistakes/${metadata.coaching[0].eventId}/open`,
    {},
  );
  check(
    disclosed.status === 200 &&
      disclosed.data.feedback &&
      (
        await db
          .prepare(
            "SELECT count(*) n FROM teaching_exposures WHERE shown_day<>'2000-01-01'",
          )
          .first()
      ).n > 0,
    "explicit coaching opening uses the guarded answer disclosure and teaching evidence path",
  );
  for (const phase of ["practice", "transfer"]) {
    const s = await open(await read(cycle.id));
    assert.equal(s.status, 201);
    await verifyPhase(s.data, phase);
    await finish(s.data);
  }
  check(
    (await open(await read(cycle.id))).status === 409,
    "reserved materials do not remove the same-day delayed-retrieval gate",
  );
  const transfer = (await read(cycle.id)).results.find(
    (r) => r.phase === "transfer",
  );
  for (const day of [1, 3, 7]) {
    const current = await read(cycle.id),
      anchor = Date.now() - day * 86400000;
    await db
      .prepare("UPDATE session_results SET completed_at=? WHERE session_id=?")
      .bind(anchor, transfer.sessionId)
      .run();
    for (const r of current.results.filter((r) => r.phase === "retest"))
      await db
        .prepare("UPDATE session_results SET completed_at=? WHERE session_id=?")
        .bind(anchor + r.checkpoint * 86400000, r.sessionId)
        .run();
    const due = await read(cycle.id),
      s = await open(due);
    assert.equal(s.status, 201);
    assert.equal(due.next.checkpoint, day);
    await verifyPhase(s.data, "retest");
    await finish(s.data);
  }
  check(
    seen.size === 35 && (await read(cycle.id)).finished,
    "a complete reserved plan uses thirty-five families and all three actual delayed visits",
  );
  const oldCycle = await read(legacyId),
    oldSession = await open(oldCycle);
  assert.equal(oldSession.status, 201);
  check(
    (await adopt(await read(legacyId))).status === 409,
    "material adoption cannot replace an unfinished legacy phase",
  );
  await finish(oldSession.data, true);
  const oldView = await read(legacyId),
    oldReceipts = (
      await db
        .prepare(
          "SELECT a.receipt_json FROM attempts a JOIN session_items i ON i.id=a.assignment_id WHERE i.session_id=? ORDER BY i.position",
        )
        .bind(oldSession.data.id)
        .all()
    ).results;
  check(
    (await adopt({ ...oldView, version: 99 })).status === 409,
    "material adoption rejects stale workflow versions",
  );
  const changed = await adopt(oldView);
  assert.equal(changed.status, 200);
  check(
    changed.data.version === oldView.version + 1 &&
      changed.data.materials.kind === "reserved" &&
      JSON.stringify(changed.data.results) === JSON.stringify(oldView.results),
    "explicit adoption advances only the material version and preserves finished phase results",
  );
  check(
    (await adopt(oldView)).data.version === changed.data.version,
    "a lost adoption response can be retried without incrementing twice",
  );
  check(
    JSON.stringify(
      (
        await db
          .prepare(
            "SELECT a.receipt_json FROM attempts a JOIN session_items i ON i.id=a.assignment_id WHERE i.session_id=? ORDER BY i.position",
          )
          .bind(oldSession.data.id)
          .all()
      ).results,
    ) === JSON.stringify(oldReceipts),
    "switching future material never rewrites historical answer receipts",
  );
  const next = await open(changed.data);
  assert.equal(next.status, 201);
  check(
    (
      await db
        .prepare("SELECT item_id FROM session_items WHERE session_id=?")
        .bind(next.data.id)
        .all()
    ).results.every((r) => items.get(r.item_id).trainingPhase === "practice"),
    "the next unstarted phase uses the adopted edition rather than resetting diagnosis",
  );
  const raceCycle = await create("grammar.countability");
  await db
    .prepare(
      "UPDATE training_cycles SET material_release_id=NULL,material_adopted_at=NULL WHERE id=?",
    )
    .bind(raceCycle.id)
    .run();
  const legacyRace = await read(raceCycle.id),
    race = await Promise.all([adopt(legacyRace), open(legacyRace)]);
  check(
    race.filter((r) => r.status === 200 || r.status === 201).length === 1 &&
      race.some((r) => r.status === 409),
    "starting a legacy phase and adopting material cannot both win the same version",
  );
  const revisionProbe = await create("tense.future");
  await db
    .prepare("UPDATE content_releases SET status='withdrawn' WHERE id=?")
    .bind(bank.revisionId)
    .run();
  const unavailableCreation = await request("/training/cycles", {
    topicId: "grammar.possession",
    clientRequestId: crypto.randomUUID(),
  });
  check(
    !(await request("/training/materials/grammar.be")).data.available &&
      (await open(revisionProbe)).status === 409 &&
      unavailableCreation.status === 409,
    "a withdrawn current revision cannot fall back to original material or allocate a new supported plan",
  );
  await db
    .prepare("UPDATE content_releases SET status='published' WHERE id=?")
    .bind(bank.revisionId)
    .run();
  const modalCycle = await create("grammar.modals"),
    modalDiagnostic = await open(modalCycle);
  assert.equal(modalDiagnostic.status, 201);
  await finish(modalDiagnostic.data, false, {
    answerFor: (item) =>
      item.trainingDimension === "ability" ? "not-an-answer" : item.answers[0],
  });
  const modalPractice = await open(await read(modalCycle.id));
  assert.equal(modalPractice.status, 201);
  let restoredAliases = 0;
  await finish(modalPractice.data, false, {
    answerFor: (item) =>
      item.trainingDimension === "ability" ? "is able to" : item.answers[0],
    onSaved: async (s, item, receipt, value) => {
      if (item.trainingDimension === "ability" && item.type === "input") {
        assert.equal(receipt.outcome, "correct");
        const snapshot = await request(`/sessions/${s.id}/snapshot`);
        assert.equal(snapshot.data.submittedAnswer, value);
        restoredAliases++;
      }
    },
  });
  check(
    restoredAliases === 2,
    "accepted ability variants are graded correctly and restored as the child's own typed response",
  );
  assert.equal(
    (
      await request("/sessions", {
        topicId: "grammar.be",
        roundSize: 5,
        clientRequestId: crypto.randomUUID(),
      })
    ).status,
    201,
  );
  const withdraw = await read(modalCycle.id),
    active = (
      await db
        .prepare(
          "SELECT id FROM learning_sessions WHERE child_id=? AND state='active'",
        )
        .bind(child)
        .first()
    ).id;
  await db
    .prepare(
      `CREATE TRIGGER fixture_training_withdraw AFTER UPDATE OF state ON learning_sessions WHEN NEW.id='${active}' AND NEW.state='paused' BEGIN UPDATE content_releases SET status='withdrawn' WHERE id='reserved-training-v1'; END`,
    )
    .run();
  const rejected = await open(withdraw);
  check(
    rejected.status === 409 &&
      (
        await db
          .prepare("SELECT state FROM learning_sessions WHERE id=?")
          .bind(active)
          .first()
      ).state === "active" &&
      (
        await db
          .prepare(
            "SELECT status FROM content_releases WHERE id='reserved-training-v1'",
          )
          .first()
      ).status === "published",
    "withdrawal during phase activation rolls back both the new claim and the old session pause",
  );
  await db.prepare("DROP TRIGGER fixture_training_withdraw").run();
  // The new edition is deliberately absent above: old plans must keep working
  // before its migration is published, and supported new topics must fail closed.
  check(
    (
      await request("/training/cycles", {
        topicId: "forms.ing",
        clientRequestId: crypto.randomUUID(),
      })
    ).status === 409,
    "a known but unpublished word-form edition never falls back to ordinary questions",
  );
  const originalCompleted = await read(cycle.id);
  const oldFormId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO training_cycles(id,household_id,child_id,topic_id,created_at) VALUES(?,?,?,'forms.ing',?)",
    )
    .bind(oldFormId, household, child, Date.now())
    .run();
  await migrate("0046_reserved_word_forms_v1.sql");
  check(
    !(await request("/training/materials/forms.ing")).data.available &&
      (
        await request("/training/cycles", {
          topicId: "forms.regular-past",
          clientRequestId: crypto.randomUUID(),
        })
      ).status === 409,
    "publishing original word rows cannot bypass the required current child-cue revision",
  );
  await migrate("0047_reserved_word_forms_child_cues.sql");
  const formTopics = Object.keys(bank.blueprints).filter((id) =>
    id.startsWith("forms."),
  );
  check(
    formTopics.length === 8 &&
      (await request("/training/materials/forms.ing")).data.revisionId ===
        "reserved-forms-v2",
    "all eight published morphology outlines identify their own edition",
  );
  await db
    .prepare("UPDATE content_releases SET status='withdrawn' WHERE id=?")
    .bind(bank.revisionId)
    .run();
  const isolatedForm = await create("forms.noun-plural");
  check(
    isolatedForm.materials.releaseId === "reserved-forms-v1" &&
      (await request("/training/materials/forms.noun-plural")).data.available &&
      !(await request("/training/materials/grammar.be")).data.available,
    "withdrawing an older grammar revision does not disable the independently published forms edition",
  );
  await db
    .prepare("UPDATE content_releases SET status='published' WHERE id=?")
    .bind(bank.revisionId)
    .run();
  await db
    .prepare(
      "UPDATE content_releases SET status='withdrawn' WHERE id='reserved-forms-v2'",
    )
    .run();
  const oldStillWorks = await open(await read(revisionProbe.id));
  check(
    (await open(isolatedForm)).status === 409 &&
      !(await request("/training/materials/forms.noun-plural")).data
        .available &&
      (await request("/training/materials/grammar.be")).data.available &&
      oldStillWorks.status === 201,
    "withdrawing the new forms edition stops only forms plans while an old-edition phase still opens",
  );
  await finish(oldStillWorks.data);
  await db
    .prepare(
      "UPDATE content_releases SET status='published' WHERE id='reserved-forms-v2'",
    )
    .run();
  const oldFormView = await read(oldFormId);
  check(
    oldFormView.materials.kind === "shared" && oldFormView.materials.canAdopt,
    "publishing word forms does not silently rebind an existing ordinary plan",
  );
  check(
    (await adopt({ ...oldFormView, version: oldFormView.version + 1 }))
      .status === 409,
    "stale word-form adoption preserves the existing version",
  );
  const adoptedForm = await adopt(oldFormView);
  check(
    adoptedForm.status === 200 &&
      adoptedForm.data.materials.releaseId === "reserved-forms-v1" &&
      adoptedForm.data.version === oldFormView.version + 1 &&
      (await adopt(oldFormView)).data.version === adoptedForm.data.version,
    "explicit word-form adoption selects the topic edition once and retries do not increment it again",
  );
  for (const topic of formTopics) {
    const c = await create(topic),
      used = new Set();
    async function assertFormPhase(session, phase) {
      const rows = (
        await db
          .prepare(
            "SELECT item_id FROM session_items WHERE session_id=? ORDER BY position",
          )
          .bind(session.id)
          .all()
      ).results.map((r) => items.get(r.item_id));
      assert.equal(rows.length, phase === "practice" ? 10 : 5);
      assert.ok(
        rows.every(
          (i) =>
            i.topicId === topic &&
            i.trainingPhase === phase &&
            !used.has(i.family),
        ),
      );
      if (phase !== "practice")
        assert.equal(new Set(rows.map((i) => i.trainingDimension)).size, 5);
      rows.forEach((i) => used.add(i.family));
    }
    assert.equal(c.materials.releaseId, "reserved-forms-v1");
    for (const phase of ["diagnostic", "practice", "transfer"]) {
      const opened = await open(await read(c.id));
      assert.equal(opened.status, 201, topic + " " + phase);
      await assertFormPhase(opened.data, phase);
      const result = await finish(opened.data);
      assert.equal(result.result.independent, phase === "practice" ? 10 : 5);
    }
    check(
      (await open(await read(c.id))).status === 409,
      topic + " keeps the same-day delayed check closed",
    );
    const transfer = (await read(c.id)).results.find(
      (r) => r.phase === "transfer",
    );
    for (const day of [1, 3, 7]) {
      const current = await read(c.id),
        anchor = Date.now() - day * 86400000;
      await db
        .prepare("UPDATE session_results SET completed_at=? WHERE session_id=?")
        .bind(anchor, transfer.sessionId)
        .run();
      for (const r of current.results.filter((r) => r.phase === "retest"))
        await db
          .prepare(
            "UPDATE session_results SET completed_at=? WHERE session_id=?",
          )
          .bind(anchor + r.checkpoint * 86400000, r.sessionId)
          .run();
      const due = await read(c.id),
        opened = await open(due);
      assert.equal(due.next.checkpoint, day);
      assert.equal(opened.status, 201);
      await assertFormPhase(opened.data, "retest");
      await finish(opened.data);
    }
    const completed = await read(c.id);
    check(
      used.size === 35 &&
        completed.finished &&
        completed.results.every(
          (r) =>
            r.materialKind === "reserved" &&
            r.materialReleaseId === "reserved-forms-v2",
        ),
      topic +
        " completes thirty-five distinct families across three actual delayed visits",
    );
  }
  const preservedCompleted = await read(cycle.id);
  check(
    preservedCompleted.version === originalCompleted.version &&
      JSON.stringify(preservedCompleted.results) ===
        JSON.stringify(originalCompleted.results) &&
      preservedCompleted.materials.releaseId ===
        originalCompleted.materials.releaseId,
    "extending and completing forms leaves the old completed grammar plan and receipts unchanged",
  );
  const sibling = (
    await request("/children", { nickname: "专题兄弟姐妹", grade: 3 })
  ).data.id;
  await request(`/children/${sibling}/select`, {});
  check(
    (await adopt(oldView)).status === 404 &&
      (await request(`/training/cycles/${legacyId}`)).status === 404,
    "siblings cannot read or change each other's material editions",
  );
  await request(`/children/${child}/select`, {});
  await migrate("0048_be_action_contrast.sql");
  const contrastOpened = await request("/sessions", {
    workshopId: "be-action-contrast",
    roundSize: 20,
    clientRequestId: crypto.randomUUID(),
  });
  check(
    contrastOpened.status === 201 && contrastOpened.data.total === 12,
    "contrast selection caps at twelve distinct authored cases instead of repeating to fill twenty",
  );
  const contrastTypes = new Set();
  await finish(contrastOpened.data, false, {
    answerFor: (item) =>
      item.type === "repair" || item.type === "evidence"
        ? JSON.parse(item.answers[0])
        : item.type === "order"
          ? ["Is", "your", "sister", "in", "the", "library", "?"]
          : item.answers[0],
    onSaved: (session, item, receipt) => {
      contrastTypes.add(item.type);
      check(
        receipt.outcome === "correct" && Boolean(receipt.feedback),
        `contrast ${item.id} saves a correct result with contextual explanation`,
      );
      assert.equal(
        JSON.stringify(session.exercise).includes('"answers"'),
        false,
      );
    },
  });
  check(
    contrastTypes.size === 5,
    "contrast player completes choice, input, repair, order and evidence through actual save/next APIs",
  );
  check(
    (await read(cycle.id)).finished,
    "new contrast practice preserves the finished historical training plan",
  );
  if (browserMode) {
    // Disposable UI fixture only: one real course allows picture-home → cards → player.
    const course = JSON.parse(
      await readFile("content/course-release.v1.json", "utf8"),
    );
    const lesson = course.lessons.find((row) => row.id === "P3A-U01-L1");
    await db
      .prepare("INSERT INTO content_releases VALUES(?,'published',?,?)")
      .bind(course.id, course.manifestHash, Date.now())
      .run();
    await db
      .prepare("INSERT INTO lessons VALUES(?,1,?,3,'A',1,?,?)")
      .bind(lesson.id, course.id, lesson.title, JSON.stringify(lesson))
      .run();
    for (const item of course.items.filter(
      (row) => row.lessonId === lesson.id,
    )) {
      const { answers, hint, explanation, ...data } = item;
      await db
        .prepare("INSERT OR IGNORE INTO skills VALUES(?,'grammar',?)")
        .bind(item.skill, item.title)
        .run();
      await db
        .prepare("INSERT INTO items VALUES(?,1,?,1,?,?,?,?,?,'published')")
        .bind(
          item.id,
          lesson.id,
          item.skill,
          item.modality,
          item.type,
          JSON.stringify(data),
          JSON.stringify({ answers, hint, explanation }),
        )
        .run();
      await db
        .prepare("INSERT INTO release_items VALUES(?,?,1)")
        .bind(course.id, item.id)
        .run();
    }
    await db
      .prepare("DELETE FROM children WHERE household_id=?")
      .bind(household)
      .run();
    const demo = (
      await request("/children", { nickname: "专题材料演示", grade: 3 })
    ).data.id;
    await request(`/children/${demo}/select`, {});
    const c = await create("grammar.be");
    await db
      .prepare(
        "UPDATE training_cycles SET material_release_id=NULL,material_adopted_at=NULL WHERE id=?",
      )
      .bind(c.id)
      .run();
    const s = await open(await read(c.id));
    assert.equal(s.status, 201);
    await finish(s.data, true);
    const root = resolve("dist"),
      host = "127.0.0.2",
      port = 5184,
      mime = {
        ".html": "text/html;charset=utf-8",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".glb": "model/gltf-binary",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
    gateway = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${host}:${port}`);
        if (url.pathname === "/__layout") {
          res.setHeader("Content-Type", "text/html;charset=utf-8");
          res.end(
            `<!doctype html><html lang="zh"><meta charset="utf-8"><title>儿童布局验收</title><style>body{margin:12px;font:18px system-ui;background:#ddd}button{padding:12px;margin:0 12px 12px 0}iframe{border:0;transform-origin:top left}#frame{overflow:hidden;background:white}</style><button onclick="size(768,1024,.58)">平板竖屏</button><button onclick="size(1024,768,.75)">平板横屏</button><button onclick="size(375,812,.72)">手机窄屏</button><div id="frame"><iframe title="儿童首页布局" src="/#home"></iframe></div><script>function size(w,h,s){const f=document.querySelector('iframe');f.style.width=w+'px';f.style.height=h+'px';f.style.transform='scale('+s+')';document.querySelector('#frame').style.cssText='width:'+w*s+'px;height:'+h*s+'px'}size(768,1024,.58)</script></html>`,
          );
          return;
        }
        if (url.pathname.startsWith("/api/")) {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const r = await mf.dispatchFetch(url.href, {
            method: req.method,
            headers: req.headers,
            body: ["GET", "HEAD"].includes(req.method)
              ? undefined
              : Buffer.concat(chunks),
          });
          res.statusCode = r.status;
          for (const [k, v] of r.headers)
            if (k.toLowerCase() !== "set-cookie") res.setHeader(k, v);
          if (r.headers.getSetCookie().length)
            res.setHeader("Set-Cookie", r.headers.getSetCookie());
          res.end(Buffer.from(await r.arrayBuffer()));
          return;
        }
        const path = resolve(
          root,
          "." +
            decodeURIComponent(
              url.pathname === "/" ? "/index.html" : url.pathname,
            ),
        );
        if (!path.startsWith(root + sep)) throw Error("outside fixture");
        res.setHeader(
          "Content-Type",
          mime[extname(path)] ?? "application/octet-stream",
        );
        res.end(await readFile(path));
      } catch {
        res.writeHead(404);
        res.end("Fixture unavailable");
      }
    });
    await new Promise((r) => gateway.listen(port, host, r));
    console.log(
      `Reserved training fixture ready: http://${host}:${port}/#training=grammar.be . Type stop to dispose (15 minute limit).`,
    );
    await new Promise((r) => {
      const timer = setTimeout(r, 15 * 60000);
      process.stdin.on("data", (v) => {
        if (v.toString().trim() === "stop") {
          clearTimeout(timer);
          r();
        }
      });
    });
    process.stdin.removeAllListeners("data");
    process.stdin.pause();
  }
  await request("/logout", {});
  check(
    (await adopt(oldView)).status === 401,
    "revoked adult login cannot adopt old material",
  );
  console.log(
    `${checks} isolated reserved-training checks passed; in-memory D1, no real family or cloud writes.`,
  );
} finally {
  if (gateway)
    await new Promise((r) => {
      gateway.close(r);
      gateway.closeAllConnections();
    });
  await mf.dispose();
  await unlink(worker).catch(() => {});
}
