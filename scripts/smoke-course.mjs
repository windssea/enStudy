import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { run } from "./runtime.mjs";
const base = process.argv[2] ?? "http://127.0.0.1:8788";
const local = ["localhost", "127.0.0.1", "[::1]"].includes(
  new URL(base).hostname,
);
const course = JSON.parse(
  await readFile("content/course-release.v1.json", "utf8"),
);
const jar = new Map();
const testIp = `198.19.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
let checks = 0,
  testChild;
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log(`PASS ${label}`);
  checks++;
};
async function request(path, body) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(local ? { "CF-Connecting-IP": testIp } : {}),
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: new URL(base).origin }),
      Cookie: Array.from(jar, ([k, v]) => `${k}=${v}`).join("; "),
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
const next = (session) =>
  request(`/sessions/${session.id}/next`, {
    assignmentId: session.assignmentId,
    leaseId: session.leaseId,
  });
const submit = (session, index = 2) => {
  const item = course.items.find((item) => item.id === session.exercise.id);
  const answer =
    index === 1
      ? "definitely wrong"
      : item.type === "order"
        ? item.answers[0].split(" ")
        : item.answers[0];
  return request("/attempts", {
    eventId: crypto.randomUUID(),
    sessionId: session.id,
    assignmentId: session.assignmentId,
    leaseId: session.leaseId,
    answer,
  });
};
try {
  const metadata = await request("/lessons");
  check(
    metadata.data.lessons.length === 168 &&
      !JSON.stringify(metadata.data).includes('"answers":'),
    "public metadata covers 168 lessons without answer keys",
  );
  check(
    Object.values(metadata.data.topicAvailability).filter(Boolean).length >= 15,
    "topic availability comes from actual assessable skills",
  );
  check(
    (await request("/learning/summary")).status === 401,
    "anonymous lesson progress denied",
  );
  check(
    (
      await request("/auth/login", {
        username: "admin",
        password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
      })
    ).status === 200,
    "administrator login ready",
  );
  const made = await request("/children", {
    nickname: "课程流程验证",
    grade: 3,
  });
  assert.equal(made.status, 201);
  testChild = made.data.id;
  await request(`/children/${testChild}/select`, {});
  check(
    (await request("/learning/summary")).data.completedLessons.length === 0,
    "new child starts with no completed lessons",
  );
  check(
    (
      await request("/sessions", {
        lessonId: "unknown",
        clientRequestId: crypto.randomUUID(),
      })
    ).status === 404,
    "unpublished lesson unavailable",
  );
  check(
    (
      await request("/sessions", {
        lessonId: "P3A-U01-L1",
        exerciseId: "sample.be.1",
        clientRequestId: crypto.randomUUID(),
      })
    ).status === 422,
    "ambiguous session selector rejected",
  );
  const body = { lessonId: "P3A-U01-L1", clientRequestId: crypto.randomUUID() };
  const concurrent = await Promise.all([
    request("/sessions", body),
    request("/sessions", body),
  ]);
  check(
    concurrent.every((row) => [200, 201].includes(row.status)) &&
      concurrent[0].data.assignmentId === concurrent[1].data.assignmentId,
    "concurrent lesson creation returns one immutable assignment",
  );
  let session = concurrent[0].data;
  check(
    session.total === 9 &&
      session.position === 1 &&
      session.source === "lesson",
    "lesson creates a nine-step session",
  );
  check(
    (await request("/sessions", { ...body, lessonId: "P3A-U01-L2" })).status ===
      409,
    "session request ID cannot change its lesson",
  );
  check(
    (await next(session)).status === 409,
    "cannot skip an unanswered assignment",
  );
  check(
    (await request(`/sessions/${session.id}/hint`, {})).status === 409,
    "multi-step hint requires its assignment ID",
  );
  await request(`/sessions/${session.id}/hint`, {
    assignmentId: session.assignmentId,
  });
  for (let index = 0; index < 9; index++) {
    assert.equal(session.position, index + 1);
    const answer = await submit(session, index);
    assert.equal(answer.status, 201);
    if (index === 0)
      check(
        answer.data.outcome === "hinted",
        "guided evidence cannot become independent success",
      );
    const restored = await request("/sessions/current");
    assert.equal(restored.data.session.assignmentId, session.assignmentId);
    assert.equal(restored.data.receipt.eventId, answer.data.eventId);
    if (index === 0)
      check(
        restored.data.hint && restored.data.receipt,
        "current step restores its hint and stored receipt",
      );
    const previous = session;
    const advancement =
      index === 0
        ? await Promise.all([next(session), next(session)])
        : [await next(session)];
    assert.ok(advancement.every((row) => row.status === 200));
    if (index === 0)
      check(
        advancement.every((row) => row.data.session.position === 2),
        "double next advances exactly one position",
      );
    if (index < 8) {
      session = advancement[0].data.session;
      if (index === 0) {
        const replay = await next(previous);
        check(
          replay.data.session.position === 2,
          "stale next retry does not skip another step",
        );
        check(
          (
            await request(`/sessions/${session.id}/hint`, {
              assignmentId: previous.assignmentId,
            })
          ).status === 409,
          "stale hint cannot reveal the new assignment",
        );
      }
    } else {
      const result = advancement[0].data.result;
      check(
        result.total === 9 && result.correct === 8 && result.independent === 0,
        "legacy demonstration repetitions count as guided rather than independent evidence",
      );
      const repeated = await next(previous);
      check(
        repeated.data.result.completedAt === result.completedAt,
        "completion retry returns the same result",
      );
    }
  }
  const summary = await request("/learning/summary");
  check(
    summary.data.completedLessons.length === 1 &&
      summary.data.completedLessons[0].runs === 1,
    "completed lesson is recorded exactly once",
  );
  check(
    (await request("/sessions/current")).data.session === null,
    "finished lesson no longer appears as unfinished",
  );
  check(
    (
      await request("/sessions", {
        mode: "review",
        clientRequestId: crypto.randomUUID(),
      })
    ).data.error.code === "NO_DUE_REVIEWS",
    "newly learned material is not immediately treated as due review",
  );
  const abandoned = (
    await request("/sessions", {
      lessonId: "P3A-U01-L2",
      clientRequestId: crypto.randomUUID(),
    })
  ).data;
  await request("/sessions", {
    lessonId: "P3A-U01-L3",
    clientRequestId: crypto.randomUUID(),
  });
  check(
    (await submit(abandoned)).status === 409,
    "replaced lesson lease cannot write a new answer",
  );
  const topic = await request("/sessions", {
    topicId: "grammar.be",
    clientRequestId: crypto.randomUUID(),
  });
  check(
    topic.status === 201 &&
      topic.data.source === "topic" &&
      topic.data.total > 1 &&
      topic.data.total === 10,
    "topic opens a bounded multi-step training round",
  );
  if (local) {
    assert.match(testChild, /^[a-f0-9-]{36}$/);
    run(
      [
        "d1",
        "execute",
        "DB",
        "--local",
        "--command",
        `UPDATE review_cards SET due_at=${Date.now() - 86400000} WHERE child_id='${testChild}'`,
      ],
      { capture: true },
    );
    const review = await request("/sessions", {
      mode: "review",
      clientRequestId: crypto.randomUUID(),
    });
    check(
      review.status === 201 &&
        review.data.source === "review" &&
        review.data.total >= 1 &&
        review.data.total <= 8,
      "due cards open a real bounded review session",
    );
  }
  console.log(`${checks} course-flow checks passed on ${base}`);
} finally {
  if (testChild && jar.has("eq_account")) {
    const removed = await request(`/children/${testChild}/remove`, {});
    assert.equal(removed.status, 200, "clean synthetic learning records");
  }
  if (jar.has("eq_account")) await request("/logout", {});
}
