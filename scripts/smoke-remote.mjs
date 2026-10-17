import assert from "node:assert/strict";

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
const lessonResponse = await request("/api/v1/lessons");
const course = await lessonResponse.json();
check(
  lessonResponse.status === 200 &&
    course.lessons?.length === 24 &&
    Object.values(course.topicAvailability ?? {}).filter(Boolean).length >=
      15 &&
    !JSON.stringify(course).includes('"answers":'),
  "published lesson metadata and real topic availability delivered without answer keys",
);
console.log(`${checks} remote checks passed on ${base.origin}`);
