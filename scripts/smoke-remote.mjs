import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sameLessonRelease } from "./remote-release.mjs";
import { responseCookieHeader } from "./response-cookies.mjs";
const expectedCourse = JSON.parse(
  await readFile(
    new URL("../public/content/lessons.json", import.meta.url),
    "utf8",
  ),
);
const expectedShell = JSON.parse(
  await readFile(
    new URL("../dist/offline-shell.json", import.meta.url),
    "utf8",
  ),
);
const expectedFeatures = JSON.parse(
  await readFile(
    new URL("../packages/domain/platformFeatures.json", import.meta.url),
    "utf8",
  ),
);

const base = new URL(
  process.argv[2] ?? "https://development.english-quest-dev.pages.dev",
);
assert.equal(base.protocol, "https:");
const stage = process.argv[3] ?? "preview";
assert.ok(["preview", "production"].includes(stage), "known deployment stage");
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks += 1;
  console.log(`PASS ${message}`);
};
const request = (path, options = {}) =>
  fetch(new URL(path, base), {
    ...options,
    signal: AbortSignal.timeout(20000),
  });
const page = await request("/");
check(
  page.status === 200 && (await page.text()).includes('id="root"'),
  "React entry responds",
);
check(Boolean(page.headers.get("content-security-policy")), "CSP delivered");
const healthResponse = await request("/api/v1/health");
const health = await healthResponse.json();
check(
  healthResponse.status === 200 &&
    health.status === "ok" &&
    health.stage === stage,
  `${stage} Functions healthy`,
);
check(
  health.developmentIdentityAvailable === false && health.aiEnabled === false,
  "development identity and AI disabled",
);
check(health.databaseBinding === true, "DB binding present");
check(
  health.registrationOpen === false && health.accountLoginAvailable === true,
  "account login available and registration closed",
);
const dev = await request("/api/v1/dev/session", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base.origin },
  body: JSON.stringify({ family: "a", child: 1 }),
});
check(dev.status === 403, "remote development login forbidden");
const progress = await request("/api/v1/progress");
check(progress.status === 401, "anonymous progress rejected");
const catalogResponse = await request("/content/catalog.json");
const catalog = await catalogResponse.json();
check(
  catalogResponse.status === 200 &&
    catalog.units?.length === 72 &&
    catalog.topics?.length === 60 &&
    catalog.patterns?.length === 72,
  "draft curriculum catalog available",
);
let lessonResponse = await request("/api/v1/lessons");
let course = await lessonResponse.json();
let featureHealth = await (await request("/api/v1/health")).json();
const courseReady = () =>
  featureHealth.companionProtocol === 1 &&
  featureHealth.householdProtocol === 1 &&
  featureHealth.householdSharingEnabled ===
    expectedFeatures.householdSharingEnabled &&
  lessonResponse.status === 200 &&
  sameLessonRelease(course, expectedCourse) &&
  Object.keys(course.topicStats ?? {}).length === 60 &&
  Object.values(course.topicStats ?? {}).every(
    (stats) => stats.items >= 120 && stats.families >= 60,
  ) &&
  Object.keys(course.patternStats ?? {}).length === 72 &&
  Object.values(course.patternStats ?? {}).every(
    (stats) =>
      stats.items >= 120 && stats.contexts >= 40 && stats.families >= 20,
  ) &&
  course.vocabulary?.totalWords === 360 &&
  course.vocabulary?.themes?.length === 18 &&
  course.vocabulary?.themes?.every(
    (theme) =>
      theme.modes?.includes("listening") && theme.modes?.includes("spelling"),
  ) &&
  !JSON.stringify(course).includes('"answers":');
// Pages may report completion before the branch alias serves the new Functions
// on every edge. Wait only for release propagation; all security checks above
// still fail immediately. A persistently wrong release must fail the job.
for (let attempt = 0; !courseReady() && attempt < 12; attempt++) {
  await delay(2500);
  lessonResponse = await request("/api/v1/lessons");
  course = await lessonResponse.json();
  featureHealth = await (await request("/api/v1/health")).json();
}
check(
  courseReady(),
  "published lesson metadata and real topic availability delivered without answer keys",
);
const homeLessons = course.lessons.filter(
  (lesson) => lesson.releaseId === "term-b-cooperation-v1",
);
check(
  homeLessons.length === 24 &&
    homeLessons.every(
      (lesson) =>
        lesson.homeActivity ===
        expectedCourse.lessons.find((row) => row.id === lesson.id)
          ?.homeActivity,
    ),
  "all twenty-four optional Chinese home activities match the current release",
);
const shellResponse = await request("/offline-shell.json");
const currentHealth = await (await request("/api/v1/health")).json();
check(
  currentHealth.offlineProtocol === 1 && currentHealth.companionProtocol === 1,
  "current offline confirmation and companion protocols delivered",
);
const shell = await shellResponse.json();
check(
  shellResponse.status === 200 &&
    shell.cacheKey === expectedShell.cacheKey &&
    JSON.stringify(shell.assets) === JSON.stringify(expectedShell.assets),
  "static shell matches this exact build",
);
const sceneAssets = expectedShell.assets.filter((path) =>
  /\/(?:World|SceneRuntime|SceneCanvas|ConceptCanvas|WordObjectScene|WordObjectCanvas)-.*\.js$/.test(
    path,
  ),
);
assert.equal(
  sceneAssets.length,
  6,
  "all six scene modules including word study are present in this build",
);
for (const path of sceneAssets) {
  const response = await request(path);
  const actual = Buffer.from(await response.arrayBuffer());
  const expected = await readFile(new URL(`../dist${path}`, import.meta.url));
  check(
    response.status === 200 &&
      /javascript/.test(response.headers.get("content-type") ?? "") &&
      createHash("sha256").update(actual).digest("hex") ===
        createHash("sha256").update(expected).digest("hex"),
    `3D module matches build: ${path.split("/").pop()}`,
  );
}
const models = expectedShell.assets.filter((path) => path.endsWith(".glb"));
assert.equal(
  models.length,
  2,
  "this release includes both Blender-authored clay partners",
);
for (const path of models) {
  const response = await request(path),
    actual = Buffer.from(await response.arrayBuffer());
  const expected = await readFile(new URL(`../dist${path}`, import.meta.url));
  check(
    response.status === 200 &&
      actual.length > 20 &&
      actual.length < 1_700_000 &&
      actual.readUInt32LE(0) === 0x46546c67 &&
      createHash("sha256").update(actual).digest("hex") ===
        createHash("sha256").update(expected).digest("hex"),
    "Blender clay model matches this exact build",
  );
}
check(
  (await request("/api/v1/admin/accounts")).status === 401,
  "anonymous account administration rejected",
);
const login = await request("/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base.origin },
  body: JSON.stringify({
    username: "admin",
    password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
  }),
});
let cookie = responseCookieHeader(login.headers.getSetCookie());
let temporaryChild;
async function authenticated(path, body, extraHeaders = {}) {
  const response = await request(`/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: cookie,
      "X-EQ-Player-Version": "3",
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: base.origin }),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  cookie = responseCookieHeader([
    ...cookie.split(/;\s*/).filter(Boolean),
    ...response.headers.getSetCookie(),
  ]);
  return { status: response.status, data: await response.json() };
}
try {
  check(
    login.status === 200 && cookie.includes("eq_account="),
    "administrator login accepted",
  );
  const response = await request("/api/v1/admin/accounts", {
    headers: { Cookie: cookie },
  });
  const data = await response.json();
  const identity = await (
    await request("/api/v1/me", { headers: { Cookie: cookie } })
  ).json();
  check(
    response.status === 200 &&
      Array.isArray(data.items) &&
      data.items.every(
        (row) =>
          Number.isSafeInteger(row.householdCount) && row.householdCount >= 0,
      ) &&
      identity.adult?.username === "admin" &&
      identity.adult?.isAdmin === true,
    "administrator account listing available",
  );
  const household = await authenticated("/households/current");
  check(
    household.status === 200 &&
      household.data.current?.id === identity.adult.householdId &&
      household.data.current?.role === identity.adult.role &&
      Number.isSafeInteger(household.data.contextVersion) &&
      household.data.sharingEnabled ===
        expectedFeatures.householdSharingEnabled &&
      !JSON.stringify(household.data).includes("token_hash"),
    "household membership protocol and release feature state are available",
  );
  check(
    (
      await authenticated("/children", undefined, {
        "X-EQ-Household-ID": "stale-release-family",
        "X-EQ-Household-Version": "0",
      })
    ).data.error?.code === "HOUSEHOLD_CONTEXT_CHANGED",
    "a stale family context cannot read the current family",
  );
  const dummyPreview = await authenticated("/households/invitations/preview", {
    token: "0".repeat(64),
  });
  check(
    dummyPreview.status ===
      (expectedFeatures.householdSharingEnabled ? 404 : 503),
    "invitation availability follows the release gate without creating accounts",
  );
  const made = await authenticated("/children", {
    nickname: `伙伴发布核验${crypto.randomUUID().slice(0, 6)}`,
    grade: 3,
  });
  temporaryChild = made.data.id;
  assert.ok(temporaryChild, "temporary child returned for cleanup");
  const selected = await authenticated(
    `/children/${temporaryChild}/select`,
    {},
  );
  check(
    made.status === 201 && selected.status === 200,
    "disposable release profile selected",
  );
  const initial = await authenticated("/learning/companion");
  check(
    initial.status === 200 &&
      initial.data.childId === temporaryChild &&
      initial.data.companionId === "fox" &&
      initial.data.version === 0,
    "new profile has the default partner and version",
  );
  const command = {
    childId: temporaryChild,
    companionId: "pikachu",
    expectedVersion: 0,
    requestId: crypto.randomUUID(),
  };
  const saved = await authenticated("/learning/companion", command),
    restored = await authenticated("/me");
  check(
    saved.status === 200 &&
      saved.data.version === 1 &&
      restored.data.child?.companionId === "pikachu" &&
      restored.data.child?.companionVersion === 1,
    "remote D1 saves and restores the Pikachu preference",
  );
  const replay = await authenticated("/learning/companion", command),
    stale = await authenticated("/learning/companion", {
      ...command,
      requestId: crypto.randomUUID(),
      companionId: "fox",
    });
  check(
    replay.status === 200 &&
      replay.data.replayed &&
      replay.data.version === 1 &&
      stale.status === 409,
    "preference retry is idempotent and a stale version cannot overwrite it",
  );
  const unchangedProgress = await authenticated("/progress"),
    unchangedSession = await authenticated("/sessions/current");
  check(
    unchangedProgress.data.answered === 0 &&
      unchangedProgress.data.stars === 0 &&
      unchangedSession.data.session === null,
    "choosing a partner does not create learning progress or a session",
  );
  const positionDemo = await authenticated(
      "/learning/concepts/grammar.prepositions/view",
      { caseId: "in-box" },
    ),
    afterDemo = await authenticated("/progress");
  check(
    positionDemo.status === 200 &&
      positionDemo.data.saved &&
      positionDemo.data.example?.spatial?.relation === "in" &&
      afterDemo.data.answered === 0 &&
      afterDemo.data.stars === 0,
    "position lab returns its authored scene without creating a score",
  );
  const courseStart = await authenticated("/sessions", {
    lessonId: "P6B-U04-L1",
    clientRequestId: crypto.randomUUID(),
  });
  check(
    courseStart.status === 201 &&
      courseStart.data.exercise?.id === "P6B-U04-L1.p1.listen" &&
      courseStart.data.total === 9,
    "latest B-term unit four is assignable from remote D1",
  );
  const positionTask = await authenticated("/sessions", {
    exerciseId: "P1B-U03-L1.p8.input",
    clientRequestId: crypto.randomUUID(),
  });
  assert.equal(positionTask.status, 201);
  const positionReceipt = await authenticated("/attempts", {
    sessionId: positionTask.data.id,
    assignmentId: positionTask.data.assignmentId,
    leaseId: positionTask.data.leaseId,
    eventId: crypto.randomUUID(),
    answer: "in",
  });
  check(
    positionReceipt.status === 201 &&
      positionReceipt.data.support === "example" &&
      !positionReceipt.data.independentEvidence,
    "position demonstration protects matching assessment evidence in remote D1",
  );
} finally {
  try {
    if (temporaryChild) {
      const removed = await authenticated(
          `/children/${temporaryChild}/remove`,
          {},
        ),
        children = await authenticated("/children");
      check(
        removed.status === 200 &&
          !children.data.items?.some((child) => child.id === temporaryChild),
        "disposable partner verification profile removed",
      );
    }
  } finally {
    if (cookie)
      check(
        (await authenticated("/logout", {})).status === 200,
        "verification login revoked",
      );
  }
}
console.log(`${checks} remote checks passed on ${base.origin}`);
