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
const courseReady = () =>
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
}
check(
  courseReady(),
  "published lesson metadata and real topic availability delivered without answer keys",
);
const shellResponse = await request("/offline-shell.json");
const currentHealth = await (await request("/api/v1/health")).json();
check(
  currentHealth.offlineProtocol === 1,
  "current offline confirmation protocol delivered",
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
  1,
  "this release includes one Blender-authored clay guide",
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
const cookie = responseCookieHeader(login.headers.getSetCookie());
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
      identity.adult?.username === "admin" &&
      identity.adult?.isAdmin === true,
    "administrator account listing available",
  );
} finally {
  if (cookie)
    check(
      (
        await request("/api/v1/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: base.origin,
            Cookie: cookie,
          },
          body: "{}",
        })
      ).status === 200,
      "verification login revoked",
    );
}
console.log(`${checks} remote checks passed on ${base.origin}`);
