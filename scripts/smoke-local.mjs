import assert from "node:assert/strict";
const base = "http://127.0.0.1:8788";
const checks = [];
const checked = (name, fn) => {
  fn();
  checks.push(name);
};
async function request(path, { method = "GET", body, cookie, raw } = {}) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      ...(method !== "GET"
        ? { "Content-Type": "application/json", Origin: base }
        : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json();
  return {
    status: response.status,
    data,
    cookie: response.headers
      .getSetCookie()
      .find((value) => value.startsWith("eq_dev_session="))
      ?.split(";")[0],
  };
}
const health = await request("/health");
checked("local-runtime-ready", () => assert.equal(health.data.status, "ok"));
checked("explicit-local-identity-only", () =>
  assert.equal(health.data.developmentIdentityAvailable, true),
);
const page = await fetch("http://127.0.0.1:5173", {
  signal: AbortSignal.timeout(5000),
});
checked("vite-app-http-200", () => assert.equal(page.status, 200));
for (const path of [
  "/content/exercises.json",
  "/content/workshop-release.v1.json",
  "/content/workshop-release.latest.json",
  "/content/workshops-v1.mjs",
  "/content/story-course-release.v1.json",
  "/content/story-courses-v1.mjs",
  "/content/word-listening-release.v1.json",
  "/packages/server/app.ts",
  "/.dev.vars",
  "/migrations/0003_pilot_content.sql",
  "/tests/auth.test.ts",
  "/content/course-release.v1.json",
  "/content/courses-v1.mjs",
  "/content/course-expansion.v1.json",
  "/content/course-expansion.latest.json",
  "/content/courses-expansion-v1.mjs",
  "/content/topic-release.v1.json",
  "/content/training-reserved-release.v1.json",
  "/content/training-reserved-release.latest.json",
  "/content/training-reserved-release.catalog.json",
  "/content/training-reserved-release.forms.v1.json",
  "/content/training-reserved-release.forms.latest.json",
  "/scripts/build-reserved-forms-review.mjs",
  "/migrations/0047_reserved_word_forms_child_cues.sql",
  "/content/training-reserved-forms-v1.mjs",
  "/scripts/build-reserved-training-review.mjs",
  "/migrations/0044_reserved_training_review_v2.sql",
  "/content/training-reserved-v1.mjs",
  "/migrations/0043_reserved_training_content_v1.sql",
  "/content/topics-v1.mjs",
  "/content/pattern-release.v1.json",
  "/content/patterns-v1.mjs",
  "/content/vocabulary-release.v1.json",
  "/content/vocabulary-v1.mjs",
]) {
  const privateFile = await fetch(`http://127.0.0.1:5173${path}`, {
    signal: AbortSignal.timeout(5000),
  });
  checked(`private-vite-file-blocked:${path}`, () =>
    assert.equal(privateFile.status, 403),
  );
}
const catalog = await (
  await fetch("http://127.0.0.1:5173/content/catalog.json")
).json();
checked("full-catalog-coverage", () =>
  assert.deepEqual(
    [catalog.units.length, catalog.topics.length, catalog.patterns.length],
    [72, 60, 72],
  ),
);
const samples = await request("/exercises");
checked("sample-answers-not-public", () => {
  assert.equal(samples.data.items.length, 8);
  for (const item of samples.data.items) {
    assert.equal("answers" in item, false);
    assert.equal("explanation" in item, false);
  }
});
const unauth = await request("/progress");
checked("unauthenticated-progress-rejected", () =>
  assert.equal(unauth.status, 401),
);
const malformed = await request("/dev/session", { method: "POST", raw: "{" });
checked("malformed-json-rejected", () => assert.equal(malformed.status, 400));
const nullProfile = await request("/dev/session", {
  method: "POST",
  body: null,
});
checked("null-profile-payload-rejected", () =>
  assert.equal(nullProfile.status, 422),
);
const a = await request("/dev/session", {
  method: "POST",
  body: { family: "a", child: 2 },
});
assert.ok(a.cookie);
assert.equal(a.status, 200);
const b = await request("/dev/session", {
  method: "POST",
  body: { family: "b", child: 2 },
});
assert.ok(b.cookie);
assert.equal(b.status, 200);
const before = (await request("/progress", { cookie: a.cookie })).data;
const resumable = (await request("/sessions/current", { cookie: a.cookie }))
  .data.session;
if (resumable?.access === "takeover-required") {
  const claimed = await request(`/sessions/${resumable.id}/takeover`, {
    method: "POST",
    cookie: a.cookie,
    body: {
      clientRequestId: crypto.randomUUID(),
      expectedLeaseVersion: resumable.leaseVersion,
    },
  });
  assert.equal(claimed.status, 200);
}
const creation = await request("/sessions", {
  method: "POST",
  cookie: a.cookie,
  body: { exerciseId: "sample.be.1", clientRequestId: crypto.randomUUID() },
});
checked("session-created-in-D1", () => assert.equal(creation.status, 201));
const session = creation.data;
const getOther = await request(`/sessions/${session.id}`, { cookie: b.cookie });
checked("cross-household-session-isolation", () =>
  assert.equal(getOther.status, 404),
);
const attempt = {
  eventId: crypto.randomUUID(),
  sessionId: session.id,
  assignmentId: session.assignmentId,
  leaseId: session.leaseId,
  answer: "are",
};
const outsider = await request("/attempts", {
  method: "POST",
  cookie: b.cookie,
  body: attempt,
});
checked("cross-household-write-rejected", () =>
  assert.equal(outsider.status, 404),
);
const [one, two] = await Promise.all([
  request("/attempts", { method: "POST", cookie: a.cookie, body: attempt }),
  request("/attempts", { method: "POST", cookie: a.cookie, body: attempt }),
]);
checked("concurrent-retry-returns-one-receipt", () => {
  assert.ok([200, 201].includes(one.status));
  assert.ok([200, 201].includes(two.status));
  assert.equal(one.data.eventId, two.data.eventId);
  assert.equal(one.data.serverSequence, two.data.serverSequence);
});
checked("server-graded-and-scheduled", () => {
  assert.ok(
    (one.data.outcome === "correct" && one.data.independentEvidence) ||
      (one.data.outcome === "hinted" &&
        one.data.support === "example" &&
        !one.data.independentEvidence),
    "correct grading distinguishes fresh material from examples already shown to this reusable local profile",
  );
  assert.match(one.data.nextReviewDay, /^\d{4}-\d{2}-\d{2}$/);
});
const after = (await request("/progress", { cookie: a.cookie })).data;
checked("duplicate-event-does-not-double-count", () => {
  assert.equal(after.answered - before.answered, 1);
  assert.equal(after.stars - before.stars, 1);
});
const mismatch = await request("/attempts", {
  method: "POST",
  cookie: a.cookie,
  body: { ...attempt, answer: "is" },
});
checked("idempotency-payload-mismatch-rejected", () =>
  assert.equal(mismatch.status, 409),
);
const secondId = await request("/attempts", {
  method: "POST",
  cookie: a.cookie,
  body: { ...attempt, eventId: crypto.randomUUID() },
});
checked("assignment-replay-deduplicated", () =>
  assert.equal(secondId.data.eventId, attempt.eventId),
);
const hintedSession = (
  await request("/sessions", {
    method: "POST",
    cookie: a.cookie,
    body: {
      exerciseId: "sample.form.go",
      clientRequestId: crypto.randomUUID(),
    },
  })
).data;
const hint = await request(`/sessions/${hintedSession.id}/hint`, {
  method: "POST",
  cookie: a.cookie,
  body: {},
});
assert.equal(hint.status, 200);
const hinted = await request("/attempts", {
  method: "POST",
  cookie: a.cookie,
  body: {
    eventId: crypto.randomUUID(),
    sessionId: hintedSession.id,
    assignmentId: hintedSession.assignmentId,
    leaseId: hintedSession.leaseId,
    answer: "went",
  },
});
checked("hint-use-recorded-server-side", () => {
  assert.equal(hinted.data.outcome, "hinted");
  assert.equal(hinted.data.independentEvidence, false);
});
const evil = await fetch(`${base}/api/v1/dev/session`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://untrusted.example",
  },
  body: JSON.stringify({ family: "a", child: 1 }),
});
checked("foreign-origin-rejected", () => assert.equal(evil.status, 403));
const afterReload = (await request("/progress", { cookie: a.cookie })).data;
checked("progress-persists-across-http-requests", () =>
  assert.equal(afterReload.answered - before.answered, 2),
);
await request("/logout", { method: "POST", cookie: a.cookie, body: {} });
const revoked = await request("/progress", { cookie: a.cookie });
checked("revoked-session-rejected", () => assert.equal(revoked.status, 401));
await request("/logout", { method: "POST", cookie: b.cookie, body: {} });
console.log(
  JSON.stringify(
    {
      status: "passed",
      runtime: "Wrangler local workerd + D1",
      checks: checks.length,
      details: checks,
      remoteCloudflare: false,
    },
    null,
    2,
  ),
);
