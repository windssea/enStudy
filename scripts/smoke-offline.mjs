import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { run } from "./runtime.mjs";
import { fetchLocalRead } from "./local-read.mjs";
await build({
  entryPoints: ["src/offlineModel.ts"],
  outfile: ".wrangler/offline-verifier-model.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { freshOffline, queueOffline, syncOffline } =
  await import("../.wrangler/offline-verifier-model.mjs");
const base = "http://127.0.0.1:8788",
  jar = new Map(),
  device = new Map(),
  foreign = new Map();
const release = JSON.parse(
    await readFile("content/action-course-release.latest.json", "utf8"),
  ),
  byId = new Map(release.items.map((i) => [i.id, i]));
const samples = JSON.parse(await readFile("content/exercises.json", "utf8"));
let child,
  sibling,
  checks = 0,
  player = "3";
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
const quote = (s) => `'${String(s).replaceAll("'", "''")}'`;
const sql = (command) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
async function request(path, body, cookies = jar) {
  const r = await fetchLocalRead(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": player,
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const h of r.headers.getSetCookie()) {
    const p = h.split(";")[0],
      i = p.indexOf("=");
    if (p.slice(i + 1)) cookies.set(p.slice(0, i), p.slice(i + 1));
    else cookies.delete(p.slice(0, i));
  }
  return {
    status: r.status,
    data: await r.json(),
    cache: r.headers.get("Cache-Control"),
  };
}
const api = async (path, body) => {
  const r = await request(path, body);
  if (r.status >= 400)
    throw Object.assign(Error(r.data.error?.message), {
      code: r.data.error?.code,
      status: r.status,
    });
  return r.data;
};
const open = (body) =>
  api("/sessions", { ...body, clientRequestId: crypto.randomUUID() });
const prepare = (s, cookies = jar) =>
  request(
    `/sessions/${s.id}/offline-pack`,
    { assignmentId: s.assignmentId, leaseId: s.leaseId },
    cookies,
  );
const payload = (pack, entry) => ({
  eventId: entry.eventId,
  sessionId: pack.sessionId,
  assignmentId: entry.assignmentId,
  leaseId: pack.leaseId,
  answer: entry.answer,
  evidenceSource: "offline_unverified",
  clientOccurredAt: entry.clientOccurredAt,
});
const answer = (item) =>
  item.type === "sort"
    ? Object.entries(item.placements).map(([c, g]) => `${c}=${g}`)
    : ["repair", "evidence"].includes(item.type)
      ? JSON.parse(item.answers[0])
      : item.type === "order"
        ? item.answers[0]
            .replace(/([.!?,])/g, " $1")
            .trim()
            .split(/\s+/)
        : item.answers[0];
try {
  check(
    (await request("/sessions/any/offline-pack", {})).status === 401,
    "anonymous user cannot prepare offline questions",
  );
  for (const cookies of [jar, device])
    assert.equal(
      (
        await request(
          "/auth/login",
          {
            username: "admin",
            password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
          },
          cookies,
        )
      ).status,
      200,
    );
  child = (await api("/children", { nickname: "离线验证小星", grade: 3 })).id;
  sibling = (await api("/children", { nickname: "离线验证小月", grade: 3 })).id;
  await api(`/children/${child}/select`, {});
  await request(`/children/${child}/select`, {}, device);
  const s = await open({ lessonId: "P3A-U04-L3" });
  check(
    (await prepare(s, device)).status === 409,
    "another device cannot download an owner pack without taking over",
  );
  player = "2";
  check(
    (await prepare(s)).data.error?.code === "PLAYER_UPDATE_REQUIRED",
    "old player cannot prepare task types it cannot render",
  );
  player = "3";
  const prepared = await prepare(s);
  assert.equal(prepared.status, 200, JSON.stringify(prepared.data));
  const pack = prepared.data;
  check(
    pack.items.length === 9 &&
      new Set(pack.items.map((i) => i.exercise.type)).size === 7,
    "mixed course offline pack includes all nine frozen public assignments and seven player types",
  );
  check(
    pack.items
      .find((i) => i.exercise.id === "P3A-U04-L3.p3.choice")
      .exercise.prompt.includes("looking for"),
    "offline questions use the saved reviewed content version",
  );
  check(
    ![
      "answers",
      "hint",
      "explanation",
      "placements",
      "repairs",
      "evidenceSolutions",
    ].some((k) => JSON.stringify(pack).includes(`"${k}"`)) &&
      prepared.cache === "private, no-store",
    "offline pack contains no answer key and is never a shared cached API response",
  );
  const untouched = sql(
    `SELECT (SELECT count(*) FROM attempts WHERE child_id=${quote(child)}) AS attempts,(SELECT coalesce(sum(delta),0) FROM reward_ledger WHERE child_id=${quote(child)}) AS stars`,
  )[0];
  check(
    untouched.attempts === 0 && untouched.stars === 0,
    "preparing public questions does not award progress or stars",
  );
  check(
    sql(
      `SELECT count(*) AS n FROM session_items WHERE session_id=${quote(s.id)} AND offline_prepared_at IS NOT NULL`,
    )[0].n === 9,
    "server remembers offline preparation on every delivered assignment",
  );
  const future = pack.items[1];
  check(
    (
      await request("/attempts", {
        eventId: crypto.randomUUID(),
        sessionId: s.id,
        assignmentId: future.assignmentId,
        leaseId: s.leaseId,
        answer: answer(byId.get(future.exercise.id)),
        evidenceSource: "offline_unverified",
        clientOccurredAt: Date.now(),
      })
    ).status === 409,
    "future packed questions cannot skip the authoritative server cursor",
  );
  let state = freshOffline(pack);
  for (const item of pack.items) {
    state = {
      ...state,
      draft: {
        answer: answer(byId.get(item.exercise.id)),
        ...(item.exercise.type === "listen"
          ? { listening: { heard: true, textSupport: item.position === 1 } }
          : {}),
      },
    };
    state = queueOffline(
      state,
      Date.now(),
      crypto.randomUUID(),
      item.assignmentId,
    );
  }
  check(
    state.entries.length === 9 && state.entries.every((e) => !e.receipt),
    "all offline answers remain pending without a fabricated grade or receipt",
  );
  await assert.rejects(
    syncOffline(
      state,
      async (path, body) => {
        const data = await api(path, body);
        return path === "/me" ? { ...data, offlineProtocol: undefined } : data;
      },
      async () => {},
    ),
    /不支持/,
  );
  check(
    sql(`SELECT count(*) AS n FROM attempts WHERE child_id=${quote(child)}`)[0]
      .n === 0,
    "a simulated older service without offline capability receives no queued answers",
  );
  let durable = structuredClone(state),
    loseAnswer = true;
  const lostAnswer = async (path, body) => {
    const data = await api(path, body);
    if (path === "/attempts" && loseAnswer) {
      loseAnswer = false;
      throw Error("simulated response lost after server commit");
    }
    return data;
  };
  await assert.rejects(
    syncOffline(durable, lostAnswer, async (value) => {
      durable = structuredClone(value);
    }),
    /simulated response lost/,
  );
  check(
    sql(`SELECT count(*) AS n FROM attempts WHERE child_id=${quote(child)}`)[0]
      .n === 1 && !durable.entries[0].receipt,
    "lost answer response preserves one real commit and an unconfirmed local event",
  );
  let loseNext = true;
  const lostNext = async (path, body) => {
    const data = await api(path, body);
    if (path.endsWith("/next") && loseNext) {
      loseNext = false;
      throw Error("simulated response lost after cursor advance");
    }
    return data;
  };
  await assert.rejects(
    syncOffline(durable, lostNext, async (value) => {
      durable = structuredClone(value);
    }),
    /simulated response lost/,
  );
  check(
    !!durable.entries[0].receipt &&
      !durable.entries[0].advanced &&
      sql(`SELECT cursor FROM learning_sessions WHERE id=${quote(s.id)}`)[0]
        .cursor === 1,
    "receipt is persisted before an ambiguous cursor advance",
  );
  durable = await syncOffline(durable, api, async (value) => {
    durable = structuredClone(value);
  });
  check(
    durable.entries.every(
      (e) =>
        e.advanced &&
        e.receipt.support === "offline" &&
        !e.receipt.independentEvidence &&
        e.receipt.rewardDelta === 0,
    ),
    "retry completes all nine pending events using guided offline receipts with no independent credit",
  );
  const totals = sql(
    `SELECT count(*) AS n,sum(independent_evidence) AS independent,sum(evidence_source='offline_unverified') AS offline FROM attempts WHERE child_id=${quote(child)}`,
  )[0];
  check(
    totals.n === 9 && totals.independent === 0 && totals.offline === 9,
    "offline synchronization creates exactly nine durable observations despite two lost responses",
  );
  check(
    sql(
      `SELECT coalesce(sum(delta),0) AS stars FROM reward_ledger WHERE child_id=${quote(child)}`,
    )[0].stars === 0,
    "offline practice cannot increase star rewards",
  );
  check(
    sql(
      `SELECT max(stage) AS stage,sum(independent_successes) AS successes FROM review_cards WHERE child_id=${quote(child)}`,
    )[0].stage === 0 &&
      sql(
        `SELECT sum(independent_successes) AS successes FROM review_cards WHERE child_id=${quote(child)}`,
      )[0].successes === 0,
    "offline answers schedule later practice without advancing independent memory stages",
  );
  const result = (await api("/learning/summary")).recent[0];
  check(
    result.total === 9 && result.independent === 0,
    "completed offline course is a practice result, not a mastery result",
  );
  const report = await api(`/family/children/${child}/report?days=7`);
  check(
    report.totals.unscored === 9 && report.totals.independent === 0,
    "guardian report keeps offline observations outside independent scores",
  );
  const first = payload(pack, durable.entries[0]);
  check(
    (await request("/attempts", first)).status === 200,
    "same offline event replays the original saved receipt",
  );
  const online = { ...first };
  delete online.evidenceSource;
  delete online.clientOccurredAt;
  check(
    (await request("/attempts", online)).status === 409,
    "an offline event cannot be upgraded by replaying it as online",
  );
  check(
    (
      await request("/attempts", {
        ...first,
        clientOccurredAt: first.clientOccurredAt - 1,
      })
    ).status === 409,
    "offline occurrence time remains immutable on retry",
  );
  check(
    (await request("/attempts", { ...first, evidenceSource: "online" }))
      .status === 422,
    "client cannot declare trusted evidence source",
  );
  check(
    (
      await request("/attempts", {
        ...first,
        clientOccurredAt: Date.now() + 86400000,
      })
    ).status === 422,
    "future client timestamps are rejected before writing",
  );
  const sample = samples.find((i) => i.id === "sample.be.1");
  const direct = await open({ exerciseId: sample.id });
  assert.equal((await prepare(direct)).status, 200);
  const omitted = await request("/attempts", {
    eventId: crypto.randomUUID(),
    sessionId: direct.id,
    assignmentId: direct.assignmentId,
    leaseId: direct.leaseId,
    answer: sample.answers[0],
  });
  check(
    omitted.status === 201 &&
      omitted.data.support === "offline" &&
      !omitted.data.independentEvidence &&
      omitted.data.rewardDelta === 0,
    "omitting the offline client flag cannot restore online credit after a pack was prepared",
  );
  let raced = 0;
  for (let trial = 0; trial < 3; trial++) {
    const r = await open({ exerciseId: sample.id });
    const [p, a] = await Promise.all([
      prepare(r),
      request("/attempts", {
        eventId: crypto.randomUUID(),
        sessionId: r.id,
        assignmentId: r.assignmentId,
        leaseId: r.leaseId,
        answer: sample.answers[0],
      }),
    ]);
    assert.equal(a.status, 201, JSON.stringify(a.data));
    if (p.status === 200) {
      assert.equal(a.data.support, "offline");
      assert.equal(a.data.rewardDelta, 0);
      assert.equal(a.data.independentEvidence, false);
    } else assert.equal(p.status, 409);
    raced++;
  }
  check(
    raced === 3,
    "concurrent online grading and offline preparation cannot award independent credit after a successful preparation",
  );
  const vocabulary = await open({
      wordThemeId: "animals",
      wordMode: "meaning",
      roundSize: 5,
    }),
    secondPack = (await prepare(vocabulary)).data;
  let pending = freshOffline(secondPack);
  pending = queueOffline(
    { ...pending, draft: { answer: secondPack.items[0].exercise.choices[0] } },
    Date.now(),
    crypto.randomUUID(),
    secondPack.items[0].assignmentId,
  );
  const snap = (
    await request(`/sessions/${vocabulary.id}/snapshot`, undefined, device)
  ).data.session;
  assert.equal(
    (
      await request(
        `/sessions/${vocabulary.id}/takeover`,
        {
          clientRequestId: crypto.randomUUID(),
          expectedLeaseVersion: snap.leaseVersion,
        },
        device,
      )
    ).status,
    200,
  );
  await assert.rejects(
    syncOffline(pending, api, async () => {}),
    /换设备|替换/,
  );
  check(
    sql(
      `SELECT lease_version FROM learning_sessions WHERE id=${quote(vocabulary.id)}`,
    )[0].lease_version === 1 && pending.entries.length === 1,
    "takeover conflict retains the pending local answer without automatically reclaiming the device",
  );
  check(
    (await request("/attempts", payload(secondPack, pending.entries[0])))
      .status === 409,
    "old offline lease cannot append after another device takes over",
  );
  const reconnectState = (await api(`/sessions/${vocabulary.id}/snapshot`))
    .session;
  const reconnected = await api(`/sessions/${vocabulary.id}/takeover`, {
    clientRequestId: crypto.randomUUID(),
    expectedLeaseVersion: reconnectState.leaseVersion,
  });
  pending.pack.leaseId = reconnected.session.leaseId;
  pending.pack.leaseVersion = reconnected.session.leaseVersion;
  pending = await syncOffline(pending, api, async (value) => {
    pending = structuredClone(value);
  });
  check(
    pending.entries[0].advanced && pending.pack.leaseVersion === 2,
    "explicitly reauthorized device may sync its original offline event without changing its answer or event id",
  );
  await api(`/children/${sibling}/select`, {});
  check(
    (await prepare(vocabulary)).status === 404,
    "a sibling profile cannot retrieve another child offline questions",
  );
  await assert.rejects(
    syncOffline(pending, api, async () => {}),
    /原来的家庭和儿童档案/,
  );
  check(
    pending.entries.length === 1,
    "profile mismatch retains pending answers without transferring them to the sibling",
  );
  await request("/dev/session", { family: "b", child: 1 }, foreign);
  check(
    (await prepare(vocabulary, foreign)).status === 404,
    "another household cannot retrieve an offline pack",
  );
  await api(`/children/${child}/select`, {});
  const recovered = structuredClone(durable);
  recovered.entries.at(-1).advanced = false;
  const restored = await syncOffline(recovered, api, async () => {});
  check(
    restored.entries.every((e) => e.advanced),
    "completed cloud result can confirm a lost final advance after a fresh child grant without reclaiming a completed session",
  );
  await api(`/children/${sibling}/select`, {});
  const cycle = await api("/training/cycles", {
    topicId: "grammar.be",
    clientRequestId: crypto.randomUUID(),
  });
  const training = await open({
    topicId: cycle.topicId,
    trainingCycleId: cycle.id,
    trainingVersion: cycle.version,
  });
  check(
    (await prepare(training)).data.error?.code === "TRAINING_REQUIRES_ONLINE",
    "diagnostic and delayed training phases remain explicit online assessments",
  );
  check(
    (
      await request("/attempts", {
        eventId: crypto.randomUUID(),
        sessionId: training.id,
        assignmentId: training.assignmentId,
        leaseId: training.leaseId,
        answer: training.exercise.choices?.[0] ?? "am",
        evidenceSource: "offline_unverified",
        clientOccurredAt: Date.now(),
      })
    ).data.error?.code === "TRAINING_REQUIRES_ONLINE",
    "manual offline flags cannot consume a reserved training assessment",
  );
  const shell = await fetchLocalRead(`${base}/offline-shell.json`);
  assert.equal(shell.status, 200);
  const manifest = await shell.json();
  check(
    manifest.schema === 1 &&
      manifest.assets.some((p) => p.includes("OfflinePractice")) &&
      manifest.assets.every(
        (p) =>
          p === "/index.html" ||
          /^\/assets\/[\w.-]+\.(js|css|glb)$/.test(p) ||
          /^\/audio\/guides\/[a-f0-9]{24}\.mp3$/.test(p),
      ),
    "built offline manifest contains its player modules and only public shell assets",
  );
  for (const path of manifest.assets) {
    const r = await fetchLocalRead(base + path);
    assert.equal(r.status, 200, path);
    if (path.endsWith(".glb")) {
      assert.match(
        r.headers.get("content-type") ?? "",
        /model\/gltf-binary|application\/octet-stream/,
      );
      const bytes = Buffer.from(await r.arrayBuffer());
      assert.ok(bytes.length < 1_700_000 && bytes.length > 20);
      assert.equal(bytes.readUInt32LE(0), 0x46546c67);
      assert.equal(bytes.readUInt32LE(8), bytes.length);
    }
  }
  check(
    (await fetchLocalRead(base + "/offline-sw.js")).status === 200,
    "public worker and every declared shell asset are served by the local preview",
  );
  console.log(
    `${checks} offline checks passed on local workerd/D1; real browser installation, disk retention, airplane mode and audio remain unverified.`,
  );
} finally {
  for (const id of [sibling, child].filter(Boolean))
    if (jar.has("eq_account"))
      assert.equal((await request(`/children/${id}/remove`, {})).status, 200);
  for (const cookies of [foreign, device, jar])
    if (cookies.has("eq_account") || cookies.has("eq_dev_session"))
      await request("/logout", {}, cookies);
}
