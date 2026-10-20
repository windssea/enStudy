import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sameLessonRelease } from "./remote-release.mjs";
import { responseCookieHeader } from "./response-cookies.mjs";
import { releasedAsset, releasedJson } from "./remote-asset.mjs";
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
const fetchOnce = (path, options = {}) =>
  fetch(new URL(path, base), {
    cache: "no-store",
    ...options,
    signal: AbortSignal.timeout(20000),
  });
const request = async (path, options = {}) => {
  if (
    /^\/assets\/[a-zA-Z0-9_-]+\.js$/.test(path) &&
    (!options.method || options.method === "GET")
  ) {
    const expected = await readFile(new URL("../dist" + path, import.meta.url));
    return releasedAsset(() => fetchOnce(path, options), expected);
  }
  if (
    (!options.method || options.method === "GET") &&
    /^(?:\/content\/[a-zA-Z0-9._-]+|\/offline-shell)\.json$/.test(path)
  ) {
    let expected;
    try {
      expected = JSON.parse(
        await readFile(new URL("../dist" + path, import.meta.url), "utf8"),
      );
    } catch (error) {
      // Missing private files must still reach their original access-denial check.
      if (error.code === "ENOENT") return fetchOnce(path, options);
      throw error;
    }
    try {
      return await releasedJson(() => fetchOnce(path, options), expected);
    } catch {
      throw Error(
        `Published static JSON failed its exact release check: ${path}`,
      );
    }
  }
  return fetchOnce(path, options);
};
const expectedGuides = JSON.parse(
  await readFile(
    new URL("../public/content/child-guides.v3.json", import.meta.url),
    "utf8",
  ),
);
const guideManifestResponse = await request("/content/child-guides.v3.json");
check(
  guideManifestResponse.status === 200 &&
    JSON.stringify(await guideManifestResponse.json()) ===
      JSON.stringify(expectedGuides),
  "published child guide manifest matches the build",
);
const guideResults = await Promise.all(
  expectedGuides.items.map(async (clip) => {
    const response = await request(clip.url);
    const bytes = Buffer.from(await response.arrayBuffer());
    return (
      response.status === 200 &&
      /audio\/(mpeg|mp3)/i.test(response.headers.get("content-type") ?? "") &&
      bytes.length === clip.bytes &&
      createHash("sha256").update(bytes).digest("hex") === clip.sha256
    );
  }),
);
check(
  guideResults.length === 23 && guideResults.every(Boolean),
  "all twenty-three child guide MP3 assets have expected MIME, size and SHA256",
);
const expectedPictures = JSON.parse(
  await readFile(
    new URL("../public/content/picture-words.v1.json", import.meta.url),
    "utf8",
  ),
);
const pm = await request("/content/picture-words.v1.json");
check(
  pm.status === 200 &&
    JSON.stringify(await pm.json()) === JSON.stringify(expectedPictures),
  "picture word media manifest matches the published build",
);
const mediaAssets = [
  ...expectedPictures.words.map((w) => ({
    url: w.audioUrl,
    sha256: w.audioSha256,
    bytes: w.audioBytes,
    mime: "audio/mpeg",
  })),
  ...expectedPictures.atlases.map((a) => ({ ...a, mime: "image/png" })),
];
async function verifiedStaticMedia(a) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await delay(attempt === 1 ? 1000 : 3000);
    try {
      const r = await request(a.url),
        b = Buffer.from(await r.arrayBuffer());
      last = {
        status: r.status,
        mime: r.headers.get("content-type"),
        bytes: b.length,
        hashMatch: createHash("sha256").update(b).digest("hex") === a.sha256,
      };
      if (
        r.ok &&
        (last.mime ?? "").includes(a.mime) &&
        last.bytes === a.bytes &&
        last.hashMatch
      )
        return true;
    } catch (error) {
      last = {
        error: error instanceof Error ? error.message : "request failed",
      };
    }
  }
  console.error(
    "Static media did not match after three public reads",
    a.url,
    last,
  );
  return false;
}
let pictureAssetsValid = true;
for (let offset = 0; offset < mediaAssets.length; offset += 6) {
  const results = await Promise.all(
    mediaAssets.slice(offset, offset + 6).map(verifiedStaticMedia),
  );
  pictureAssetsValid &&= results.every(Boolean);
}
check(
  pictureAssetsValid && mediaAssets.length === 62,
  "all sixty English word recordings and two illustration atlases match MIME, size and SHA256",
);
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
  "development identity disabled and AI defaults to no automatic calls",
);
check(
  health.aiConfigurationProtocol === 1 &&
    typeof health.aiKeyStoreAvailable === "boolean" &&
    (process.env.CLOUDFLARE_AI_KEYSTORES_REQUIRED !== "true" ||
      health.aiKeyStoreAvailable === true),
  "AI deployment readiness protocol matches the required key-store state",
);
const anonymousStorage = await request(
  "/api/v1/ai/connections/verification/storage",
  {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base.origin },
    body: JSON.stringify({ version: 0 }),
  },
);
check(
  anonymousStorage.status === 401,
  "anonymous AI storage verification rejected",
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
  featureHealth.pictureWordProtocol === 1 &&
  course.vocabulary?.themes?.filter((t) => t.modes?.includes("picture"))
    .length === 3 &&
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
const homeLessons = course.lessons.filter((lesson) =>
  /^P[1-6]B-U06-L[1-4]$/.test(lesson.id),
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
  currentHealth.offlineProtocol === 1 &&
    currentHealth.companionProtocol === 1 &&
    currentHealth.writingProtocol === 1 &&
    currentHealth.writingReviewProtocol === 1 &&
    currentHealth.phonicsProtocol === 1 &&
    currentHealth.exportProtocol === 1 &&
    currentHealth.mistakeProtocol === 1 &&
    currentHealth.trainingMaterialProtocol === 1,
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
  /\/(?:WordObjectScene|ConceptLab)-.*\.js$/.test(path),
);
assert.equal(
  sceneAssets.length,
  2,
  "both illustrated learning modules are present in this build",
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
    `illustrated learning module matches build: ${path.split("/").pop()}`,
  );
}
const writingAssets = expectedShell.assets.filter((path) =>
  /\/WritingWorkshop-.*\.js$/.test(path),
);
assert.equal(
  writingAssets.length,
  1,
  "writing studio has one lazy editor module",
);
for (const path of writingAssets) {
  const r = await request(path);
  const actual = Buffer.from(await r.arrayBuffer()),
    expected = await readFile(new URL("../dist" + path, import.meta.url));
  check(
    r.status === 200 &&
      /javascript/.test(r.headers.get("content-type") ?? "") &&
      createHash("sha256").update(actual).digest("hex") ===
        createHash("sha256").update(expected).digest("hex"),
    "writing editor module matches this build",
  );
}
const models = expectedShell.assets.filter((path) => path.endsWith(".glb"));
const exportModules = expectedShell.assets.filter((path) =>
  /\/DataExportPanel-.*\.js$/.test(path),
);
const writingReviewModules = expectedShell.assets.filter((path) =>
  /\/WritingAiReview-.*\.js$/.test(path),
);
const mistakeModules = expectedShell.assets.filter((path) =>
  /\/MistakeNotebook-.*\.js$/.test(path),
);
assert.equal(mistakeModules.length, 1);
for (const path of mistakeModules) {
  const r = await request(path),
    actual = Buffer.from(await r.arrayBuffer()),
    expected = await readFile(new URL("../dist" + path, import.meta.url));
  check(
    r.status === 200 &&
      /javascript/.test(r.headers.get("content-type") ?? "") &&
      createHash("sha256").update(actual).digest("hex") ===
        createHash("sha256").update(expected).digest("hex"),
    "private mistake notebook interface matches this build",
  );
}
check(
  (await request("/api/v1/learning/mistakes")).status === 401,
  "anonymous mistake notebooks rejected",
);
assert.equal(writingReviewModules.length, 1);
for (const path of writingReviewModules) {
  const r = await request(path),
    actual = Buffer.from(await r.arrayBuffer()),
    expected = await readFile(new URL("../dist" + path, import.meta.url));
  check(
    r.status === 200 &&
      /javascript/.test(r.headers.get("content-type") ?? "") &&
      createHash("sha256").update(actual).digest("hex") ===
        createHash("sha256").update(expected).digest("hex"),
    "writing review interface matches this build",
  );
}
assert.equal(exportModules.length, 1);
for (const path of exportModules) {
  const r = await request(path),
    actual = Buffer.from(await r.arrayBuffer()),
    expected = await readFile(new URL("../dist" + path, import.meta.url));
  check(
    r.status === 200 &&
      /javascript/.test(r.headers.get("content-type") ?? "") &&
      createHash("sha256").update(actual).digest("hex") ===
        createHash("sha256").update(expected).digest("hex"),
    "private export interface module matches this build",
  );
}
check(
  (await request("/api/v1/family/exports/list")).status === 401,
  "anonymous private exports rejected",
);
const phonicsModules = expectedShell.assets.filter((path) =>
  /\/PhonicsCentre-.*\.js$/.test(path),
);
assert.equal(phonicsModules.length, 1);
for (const path of phonicsModules) {
  const r = await request(path),
    actual = Buffer.from(await r.arrayBuffer()),
    expected = await readFile(new URL("../dist" + path, import.meta.url));
  check(
    r.status === 200 &&
      /javascript/.test(r.headers.get("content-type") ?? "") &&
      createHash("sha256").update(actual).digest("hex") ===
        createHash("sha256").update(expected).digest("hex"),
    `phonics module matches build: ${path.split("/").pop()}`,
  );
}
const expectedAudio = await readFile(
    new URL("../public/content/phonics-audio.v1.json", import.meta.url),
  ),
  audioResponse = await request("/content/phonics-audio.v1.json");
check(
  audioResponse.status === 200 &&
    createHash("sha256")
      .update(await audioResponse.text())
      .digest("hex") ===
      createHash("sha256").update(expectedAudio).digest("hex"),
  "whole-word audio manifest matches the published provenance",
);
const clip = JSON.parse(expectedAudio).items.find((i) => i.word === "cat"),
  clipResponse = await request(clip.url),
  clipBytes = Buffer.from(await clipResponse.arrayBuffer());
check(
  clipResponse.status === 200 &&
    /^audio\/(?:x-)?wav(?:e)?\b/i.test(
      clipResponse.headers.get("content-type") ?? "",
    ) &&
    clipBytes.toString("ascii", 0, 4) === "RIFF" &&
    createHash("sha256").update(clipBytes).digest("hex") === clip.sha256,
  "static whole-word audio matches its source hash",
);
check(
  (await request("/api/v1/learning/phonics")).status === 401,
  "anonymous phonics progress rejected",
);
check(
  models.length === 0 &&
    !expectedShell.assets.some((path) =>
      /\/(?:SceneCanvas|CourseMapCanvas|ConceptCanvas|WordObjectCanvas|PhonicsCanvas|SceneRuntime)-/.test(
        path,
      ),
    ),
  "illustrated release ships no legacy WebGL runtime or GLB models",
);
const expectedArt = JSON.parse(
  await readFile(
    new URL("../public/content/clay-art.v1.json", import.meta.url),
    "utf8",
  ),
);
const artResponse = await request("/content/clay-art.v1.json");
check(
  artResponse.ok &&
    JSON.stringify(await artResponse.json()) === JSON.stringify(expectedArt),
  "illustrated clay manifest matches this build",
);
let validArt = true;
for (const asset of Object.values(expectedArt.assets)) {
  const valid = await verifiedStaticMedia({ ...asset, mime: "image/png" });
  validArt = validArt && valid;
}
check(validArt, "all generated clay PNG assets have exact bytes and MIME");
const teachingArt = JSON.parse(
  await readFile(
    new URL("../public/content/learning-art.v1.json", import.meta.url),
    "utf8",
  ),
);
const teachingResponse = await request("/content/learning-art.v1.json");
check(
  teachingResponse.ok &&
    JSON.stringify(await teachingResponse.json()) ===
      JSON.stringify(teachingArt),
  "unified sports 3D teaching-art manifest matches this release",
);
let validTeachingArt = true;
for (const asset of Object.values(teachingArt.assets)) {
  const valid = await verifiedStaticMedia({ ...asset, mime: "image/webp" });
  validTeachingArt = validTeachingArt && valid;
}
check(
  validTeachingArt,
  "both transparent teaching illustrations have exact bytes and MIME",
);
check(
  (await request("/api/v1/admin/accounts")).status === 401,
  "anonymous account administration rejected",
);
check(
  (await request("/api/v1/learning/writing/drafts")).status === 401,
  "anonymous writing work is protected",
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
      "X-EQ-Player-Version": "4",
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
  const aiSettings = await authenticated("/ai/connections");
  check(
    aiSettings.status === 200 &&
      aiSettings.data.available === health.aiKeyStoreAvailable &&
      Array.isArray(aiSettings.data.items) &&
      aiSettings.data.items.every(
        (item) =>
          !Object.keys(item).some((name) =>
            /^(apiKey|key_ciphertext|key_iv|key_id)$/.test(name),
          ),
      ),
    "owner AI readiness agrees with health and lists masked connection metadata only",
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
  const exportsList = await authenticated("/family/exports/list");
  check(
    exportsList.status === 200 &&
      Array.isArray(exportsList.data.items) &&
      exportsList.data.lifetimeMs === 600000,
    "private export schema is readable without copying real household records",
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
  const writing = await authenticated("/learning/writing/drafts", {
    childId: temporaryChild,
    promptId: "writing.p6.project",
    requestId: crypto.randomUUID(),
  });
  check(
    writing.status === 201 && writing.data.revision === 1,
    "private writing draft can be created on the deployed schema",
  );
  const writingSaved = await authenticated(
    "/learning/writing/drafts/" + writing.data.draftId + "/save",
    {
      childId: temporaryChild,
      requestId: crypto.randomUUID(),
      expectedRevision: 1,
      content: {
        title: "Release writing check",
        plan: "虚构发布检查",
        paragraphs: [
          "This is a paper project.",
          "It has two model bridges.",
          "We could check the labels.",
        ],
        checks: [],
      },
    },
  );
  check(
    writingSaved.status === 200 && writingSaved.data.revision === 2,
    "authored text saves independently of graded practice",
  );
  check(
    (
      await authenticated(
        "/learning/writing/drafts/" + writing.data.draftId + "/remove",
        { childId: temporaryChild, expectedRevision: 2 },
      )
    ).status === 200,
    "temporary writing and receipts are removed",
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
    lessonId: "P6B-U06-L1",
    clientRequestId: crypto.randomUUID(),
  });
  check(
    courseStart.status === 201 &&
      courseStart.data.exercise?.id === "P6B-U06-L1.p1.listen" &&
      courseStart.data.total === 9,
    "latest B-term unit six is assignable from remote D1",
  );
  const phonicsStart = await authenticated("/sessions", {
    phonicsStageId: "split-vowels",
    roundSize: 5,
    clientRequestId: crypto.randomUUID(),
  });
  check(
    phonicsStart.status === 201 &&
      phonicsStart.data.source === "phonics" &&
      phonicsStart.data.total === 5 &&
      phonicsStart.data.exercise.audioUrl,
    "phonics stage is assignable from the remote publication",
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
  for (const topic of [
    "forms.noun-plural",
    "forms.third-person",
    "forms.ing",
    "forms.regular-past",
    "forms.irregular-past",
    "forms.past-participle",
    "forms.comparison",
    "forms.derivation",
  ]) {
    const outline = await authenticated(`/training/materials/${topic}`);
    const cycle = await authenticated("/training/cycles", {
      topicId: topic,
      clientRequestId: crypto.randomUUID(),
    });
    check(
      outline.status === 200 &&
        outline.data.available === true &&
        outline.data.revisionId === "reserved-forms-v2" &&
        outline.data.dimensions?.length === 5 &&
        !JSON.stringify(outline.data).includes('"answers"') &&
        cycle.status === 201 &&
        cycle.data.materials?.releaseId === "reserved-forms-v1",
      `${topic} outline and temporary plan bind the independent forms edition`,
    );
    const started = await authenticated("/sessions", {
      topicId: topic,
      trainingCycleId: cycle.data.id,
      trainingVersion: cycle.data.version,
      clientRequestId: crypto.randomUUID(),
    });
    check(
      started.status === 201 &&
        started.data.total === 5 &&
        started.data.exercise?.id?.startsWith(`reserved.${topic}.`) &&
        /^[a-z]+$/.test(started.data.exercise?.wordFormCue?.word ?? "") &&
        !Object.hasOwn(started.data.exercise, "answers"),
      `${topic} assigns five reserved tasks from remote D1 without answer leakage`,
    );
  }
  const contrastBank = JSON.parse(
    await readFile("content/be-action-release.latest.json", "utf8"),
  );
  const contrast = await authenticated("/sessions", {
    workshopId: "be-action-contrast",
    roundSize: 5,
    clientRequestId: crypto.randomUUID(),
  });
  check(
    contrast.status === 201 && contrast.data.total === 5,
    "authored contrast bank assigns from remote D1",
  );
  let contrastSession = contrast.data;
  const contrastTypes = new Set();
  for (let index = 0; index < 5; index++) {
    const item = contrastBank.items.find(
      (i) => i.id === contrastSession.exercise.id,
    );
    assert.ok(item);
    contrastTypes.add(item.type);
    const answer = ["repair", "evidence"].includes(item.type)
      ? JSON.parse(item.answers[0])
      : item.type === "order"
        ? ["Is", "your", "sister", "in", "the", "library", "?"]
        : item.answers[0];
    const receipt = await authenticated("/attempts", {
      sessionId: contrastSession.id,
      assignmentId: contrastSession.assignmentId,
      leaseId: contrastSession.leaseId,
      eventId: crypto.randomUUID(),
      answer,
    });
    check(
      receipt.status === 201 &&
        receipt.data.outcome === "correct" &&
        Boolean(receipt.data.feedback),
      `remote contrast ${item.type} saves and explains`,
    );
    const next = await authenticated(`/sessions/${contrastSession.id}/next`, {
      assignmentId: contrastSession.assignmentId,
      leaseId: contrastSession.leaseId,
    });
    assert.equal(next.status, 200);
    if (index === 4) assert.equal(next.data.completed, true);
    else contrastSession = next.data.session;
  }
  check(
    contrastTypes.size === 5,
    "five distinct contrast response types complete without duplicate families",
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
