import assert from "node:assert/strict";
import { readFile, mkdir, unlink } from "node:fs/promises";
import { build } from "esbuild";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";
import { createServer } from "node:http";
import { resolve, sep, extname } from "node:path";
const browserMode = process.argv.includes("--browser"),
  worker = `.wrangler/picture-${browserMode ? "browser" : "smoke"}-worker.mjs`;
await mkdir(".wrangler", { recursive: true });
await build({
  stdin: {
    contents:
      'import {app} from "./packages/server/app";export default {fetch:app.fetch};',
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
const picture = JSON.parse(
    await readFile("content/picture-word-release.v1.json", "utf8"),
  ),
  original = JSON.parse(
    await readFile("content/vocabulary-release.v1.json", "utf8"),
  ),
  listening = JSON.parse(
    await readFile("content/word-listening-release.v1.json", "utf8"),
  );
const bank = new Map(
    [...picture.items, ...original.items, ...listening.items].map((i) => [
      i.id,
      i,
    ]),
  ),
  jar = new Map();
let checks = 0,
  gateway,
  version = "5";
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log("PASS " + label);
};
async function request(path, body, cookies = jar, extra = {}) {
  const r = await mf.dispatchFetch("http://127.0.0.3/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "X-EQ-Player-Version": version,
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      ...extra,
      ...(body === undefined
        ? {}
        : { Origin: "http://127.0.0.3", "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const h of r.headers.getSetCookie()) {
    const p = h.split(";")[0],
      n = p.indexOf("=");
    if (p.slice(n + 1)) cookies.set(p.slice(0, n), p.slice(n + 1));
    else cookies.delete(p.slice(0, n));
  }
  return { status: r.status, data: await r.json() };
}
function statements(sql) {
  let part = "",
    quote = "";
  const out = [];
  sql = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    part += c;
    if (quote) {
      if (c === quote) {
        if (sql[i + 1] === quote) part += sql[++i];
        else quote = "";
      }
    } else if (c === "'" || c === '"') quote = c;
    else if (c === ";") {
      out.push(part);
      part = "";
    }
  }
  if (part.trim()) out.push(part);
  return out;
}
const open = (body) =>
  request("/sessions", { ...body, clientRequestId: crypto.randomUUID() });
const heard = (s) =>
  request(`/sessions/${s.id}/listening`, {
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
    mode: "heard",
  });
const submit = (s, answer, eventId = crypto.randomUUID()) =>
  request("/attempts", {
    eventId,
    sessionId: s.id,
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
    answer,
  });
try {
  const db = await mf.getD1Database("DB");
  for (const file of [
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
    "0042_reserved_training_materials.sql",
  ])
    for (const sql of statements(await readFile("migrations/" + file, "utf8")))
      await db.prepare(sql).run();
  for (const i of picture.items)
    await db
      .prepare("INSERT OR IGNORE INTO skills VALUES(?,'vocabulary',?)")
      .bind(i.skill, i.wordId)
      .run();
  for (const sql of statements(
    await readFile("migrations/0045_picture_words_v1.sql", "utf8"),
  ))
    await db.prepare(sql).run();
  // Old mixed mode remains a real separate pool, rather than being silently replaced.
  for (const release of [original, listening]) {
    await db
      .prepare("INSERT INTO content_releases VALUES(?,'published',?,?)")
      .bind(release.id, release.manifestHash, Date.now())
      .run();
    const lesson = "fixture." + release.id;
    await db
      .prepare("INSERT INTO lessons VALUES(?,1,?,1,'A',1,'原有单词核验','{}')")
      .bind(lesson, release.id)
      .run();
    for (const i of release.items.filter((i) => i.wordThemeId === "animals")) {
      const { answers, hint, explanation, ...data } = i;
      await db
        .prepare("INSERT INTO items VALUES(?,1,?,1,?,?,?,?,?,'published')")
        .bind(
          i.id,
          lesson,
          i.skill,
          i.modality,
          i.type,
          JSON.stringify(data),
          JSON.stringify({ answers, hint, explanation }),
        )
        .run();
      await db
        .prepare("INSERT INTO release_items VALUES(?,?,1)")
        .bind(release.id, i.id)
        .run();
    }
  }
  check(
    (await open({ wordThemeId: "animals", wordMode: "picture", roundSize: 5 }))
      .status === 401,
    "anonymous children cannot start or write a picture round",
  );
  const catalog = (await request("/lessons")).data;
  check(
    catalog.vocabulary.themes.filter((t) => t.modes.includes("picture"))
      .length === 3 && !JSON.stringify(catalog).includes('"answers"'),
    "three real picture themes are advertised without answer keys",
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
    household = me.adult.householdId;
  const child = (
    await request("/children", { nickname: "图片流程核验", grade: 1 })
  ).data.id;
  assert.ok(child);
  await request(`/children/${child}/select`, {});
  check(
    (await open({ wordThemeId: "food", wordMode: "picture", roundSize: 5 }))
      .status === 404,
    "unillustrated themes never pretend to offer picture listening",
  );
  version = "4";
  const old = await open({
    wordThemeId: "animals",
    wordMode: "picture",
    roundSize: 5,
  });
  check(
    old.status === 409 && old.data.error.code === "PLAYER_UPDATE_REQUIRED",
    "old players get an explicit update response instead of technical picture IDs",
  );
  version = "5";
  let round = await open({
    wordThemeId: "animals",
    wordMode: "picture",
    roundSize: 5,
  });
  assert.equal(round.status, 201);
  let s = round.data;
  check(
    s.exercise.type === "listen" &&
      s.exercise.pictureChoices.length === 3 &&
      s.exercise.audioUrl.startsWith("/audio/words/"),
    "new picture session delivers images and real local English recording",
  );
  const snap = (await request("/sessions/current")).data;
  check(
    JSON.stringify(snap.session.exercise) === JSON.stringify(s.exercise),
    "refresh freezes the same image choices and audio address",
  );
  check(
    (await submit(s, bank.get(s.exercise.id).answers[0])).data.error.code ===
      "LISTENING_INPUT_REQUIRED",
    "picture answers cannot bypass the hearing or explicit text-support gate",
  );
  check(
    (await heard(s)).status === 200,
    "explicit hearing confirmation is saved through the existing guarded endpoint",
  );
  const wrong = s.exercise.choices.find(
      (v) => !bank.get(s.exercise.id).answers.includes(v),
    ),
    eventId = crypto.randomUUID(),
    saved = await submit(s, wrong, eventId);
  check(
    saved.status === 201 && saved.data.outcome === "incorrect",
    "an incorrect picture choice is saved as incorrect without fabricated success",
  );
  check(
    saved.data.correctedPicture?.wordId === bank.get(s.exercise.id).wordId,
    "only the accepted receipt reveals the actual correct word picture",
  );
  const restored = (await request("/sessions/current")).data;
  check(
    restored.submittedAnswer === wrong && restored.receipt.eventId === eventId,
    "refresh restores the exact wrong image and original receipt",
  );
  check(
    (await submit(s, wrong, eventId)).data.eventId === eventId,
    "replayed image save returns the original receipt",
  );
  const firstItem = bank.get(s.exercise.id),
    afterFeedback = (await open({ exerciseId: firstItem.id })).data;
  await heard(afterFeedback);
  const repeated = await submit(afterFeedback, firstItem.answers[0]);
  check(
    repeated.data.support === "example" && !repeated.data.independentEvidence,
    "fresh picture feedback is atomically recorded as teaching before same-day variants can claim independent recall",
  );
  check(
    (
      await request(
        "/attempts",
        {
          eventId: crypto.randomUUID(),
          sessionId: s.id,
          assignmentId: s.assignmentId,
          leaseId: s.leaseId,
          answer: wrong,
        },
        new Map(),
        {},
      )
    ).status === 401,
    "foreign authority cannot reuse the image assignment",
  );
  // All published variants go through actual workerd/D1 grading, not just a pure-function oracle.
  const visited = new Set();
  for (const theme of ["animals", "school", "colours-shapes"]) {
    s = (await open({ wordThemeId: theme, wordMode: "picture", roundSize: 20 }))
      .data;
    const families = new Set();
    for (let n = 0; n < 20; n++) {
      const i = bank.get(s.exercise.id);
      assert.equal(i.wordThemeId, theme);
      assert.equal(i.modality, "listening-picture");
      assert.ok(!families.has(i.family));
      families.add(i.family);
      assert.equal((await heard(s)).status, 200);
      const r = await submit(s, i.answers[0]);
      assert.equal(r.status, 201);
      assert.notEqual(r.data.outcome, "incorrect");
      visited.add(i.id);
      const next = await request(`/sessions/${s.id}/next`, {
        assignmentId: s.assignmentId,
        leaseId: s.leaseId,
      });
      assert.equal(next.status, 200);
      if (n === 19) assert.equal(next.data.completed, true);
      else s = next.data.session;
    }
    check(
      families.size === 20,
      `${theme}: a twenty-question round draws twenty distinct word senses and persists every image choice`,
    );
  }
  for (const i of picture.items.filter((i) => !visited.has(i.id))) {
    s = (await open({ exerciseId: i.id })).data;
    assert.equal((await heard(s)).status, 200);
    const r = await submit(s, i.answers[0]);
    assert.equal(r.status, 201);
    assert.notEqual(r.data.outcome, "incorrect");
    visited.add(i.id);
  }
  check(
    visited.size === 180,
    "all 180 authored picture variants are genuinely assigned and graded on D1",
  );
  const counts = await db
    .prepare("SELECT count(*) AS n FROM items WHERE id LIKE ?")
    .bind("word.%.picture.%")
    .first();
  check(
    counts.n === 180,
    "the immutable migration publishes all variants, with no placeholder records",
  );
  s = (await open({ wordThemeId: "animals", wordMode: "mixed", roundSize: 20 }))
    .data;
  check(
    !s.exercise.pictureChoices &&
      bank.get(s.exercise.id).wordMode !== "picture",
    "the original mixed entry keeps its original text/listening scope",
  );
  const cat = picture.items.find((i) => i.wordId === "animals.cat");
  await request("/learning/vocabulary/animals.cat/view", {});
  s = (await open({ exerciseId: cat.id })).data;
  await heard(s);
  const assisted = await submit(s, cat.answers[0]);
  check(
    assisted.data.outcome === "hinted" &&
      assisted.data.support === "example" &&
      !assisted.data.independentEvidence,
    "opening a word card prevents same-day picture recognition from being mislabeled as independent recall",
  );
  const food = picture.items.find((i) => i.wordId === "school.glue");
  s = (await open({ exerciseId: food.id })).data;
  await request(`/sessions/${s.id}/listening`, {
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
    mode: "text",
  });
  const text = await submit(s, food.answers[0]);
  check(
    !text.data.independentEvidence && text.data.support === "transcript",
    "explicit text support remains separately assisted in picture mode",
  );
  await db
    .prepare("UPDATE review_cards SET due_at=? WHERE child_id=? AND modality=?")
    .bind(Date.now() - 86400000, child, "listening-picture")
    .run();
  const review = (await open({ mode: "review" })).data;
  check(
    bank.get(review.exercise.id)?.wordMode === "picture" &&
      review.exercise.pictureChoices.length === 3,
    "real due picture evidence returns through the shared spaced-review selector",
  );
  const sibling = (
    await request("/children", { nickname: "图片隔离核验", grade: 1 })
  ).data.id;
  await request(`/children/${sibling}/select`, {});
  check(
    (await request(`/sessions/${review.id}/snapshot`)).status === 404,
    "a sibling cannot retrieve another child’s picture answers",
  );
  await request(`/children/${child}/select`, {});
  assert.equal(
    (
      await request(`/sessions/${review.id}/takeover`, {
        clientRequestId: crypto.randomUUID(),
        expectedLeaseVersion: review.leaseVersion,
      })
    ).status,
    200,
  );
  const offlineStart = await open({
    wordThemeId: "school",
    wordMode: "picture",
    roundSize: 5,
  });
  assert.equal(
    offlineStart.status,
    201,
    JSON.stringify(offlineStart.data.error),
  );
  s = offlineStart.data;
  assert.ok(
    s.assignmentId && s.leaseId,
    JSON.stringify({
      access: s.access,
      assignmentId: s.assignmentId,
      leaseId: s.leaseId,
    }),
  );
  const pack = await request(`/sessions/${s.id}/offline-pack`, {
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
  });
  assert.equal(pack.status, 200, JSON.stringify(pack.data.error));
  check(
    pack.status === 200 &&
      pack.data.items.every(
        (i) =>
          i.exercise.pictureChoices?.length === 3 && !("answers" in i.exercise),
      ),
    "offline picture packs carry frozen public images and no grading keys",
  );
  if (browserMode) {
    await db
      .prepare("DELETE FROM children WHERE household_id=?")
      .bind(household)
      .run();
    const demo = (
      await request("/children", { nickname: "看图演示", grade: 1 })
    ).data.id;
    await request(`/children/${demo}/select`, {});
    const root = resolve("dist"),
      host = "127.0.0.3",
      port = 5185,
      mime = {
        ".html": "text/html;charset=utf-8",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".glb": "model/gltf-binary",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".png": "image/png",
        ".svg": "image/svg+xml",
      };
    gateway = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${host}:${port}`);
        if (url.pathname === "/__layout") {
          res.setHeader("Content-Type", "text/html;charset=utf-8");
          res.end(
            `<!doctype html><meta charset="utf-8"><title>图片词汇布局</title><style>body{font:18px system-ui;background:#ddd}button{padding:12px;margin:8px}iframe{border:0;transform-origin:top left}#wrap{overflow:hidden}</style><button onclick="size(768,1024,.58)">平板竖屏</button><button onclick="size(1024,768,.75)">平板横屏</button><button onclick="size(375,812,.72)">窄屏</button><div id="wrap"><iframe title="图片词汇布局" src="/#words"></iframe></div><script>function size(w,h,s){const f=document.querySelector('iframe');f.style.cssText='width:'+w+'px;height:'+h+'px;transform:scale('+s+')';document.querySelector('#wrap').style.cssText='width:'+w*s+'px;height:'+h*s+'px'}size(768,1024,.58)</script>`,
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
        if (!path.startsWith(root + sep)) throw Error();
        res.setHeader(
          "Content-Type",
          mime[extname(path)] ?? "application/octet-stream",
        );
        res.end(await readFile(path));
      } catch {
        res.writeHead(404);
        res.end("Picture fixture unavailable");
      }
    });
    await new Promise((r) => gateway.listen(port, host, r));
    console.log(
      `Picture fixture ready: http://${host}:${port}/#words . Type stop to dispose (20 minute limit).`,
    );
    await new Promise((r) => {
      const timer = setTimeout(r, 20 * 60000);
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
    (await submit(s, food.answers[0])).status === 401,
    "revoked login cannot write a retained picture session",
  );
  console.log(
    `${checks} isolated picture-word checks passed; 180 real variant saves. Hearing was simulated; no real child, cloud write or acoustic approval.`,
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
