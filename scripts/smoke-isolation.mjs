import assert from "node:assert/strict";

const preview = "https://development.english-quest-dev.pages.dev";
const production = "https://english-quest-dev.pages.dev";
const jars = new Map([
  [preview, new Map()],
  [production, new Map()],
]);
let created;
let checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function request(base, path, body, cookies = jars.get(base)) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: base }),
      Cookie: Array.from(cookies, ([key, value]) => `${key}=${value}`).join(
        "; ",
      ),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0],
      at = pair.indexOf("="),
      name = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  return { status: response.status, data: await response.json() };
}
try {
  const pages = await Promise.all(
    [preview, production].map(async (base) => {
      const response = await fetch(base, {
        signal: AbortSignal.timeout(20000),
      });
      assert.equal(response.status, 200);
      return (await response.text()).match(
        /src="(\/assets\/index-[^"]+\.js)"/,
      )?.[1];
    }),
  );
  check(
    pages[0] && pages[0] === pages[1],
    "preview and production serve the same application build",
  );
  for (const base of [preview, production]) {
    const login = await request(base, "/auth/login", {
      username: "admin",
      password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
    });
    check(
      login.status === 200,
      `administrator login works on ${new URL(base).hostname}`,
    );
  }
  const cross = await request(
    preview,
    "/me",
    undefined,
    new Map(jars.get(production)),
  );
  check(
    cross.data.authenticated === false && !cross.data.adult,
    "production tokens are not valid in preview",
  );
  const made = await request(production, "/children", {
    nickname: `隔离验证${crypto.randomUUID().slice(0, 6)}`,
    grade: 3,
  });
  assert.equal(made.status, 201);
  created = made.data.id;
  const productionChildren = await request(production, "/children"),
    previewChildren = await request(preview, "/children");
  check(
    productionChildren.data.items.some((child) => child.id === created),
    "production write is visible in production",
  );
  check(
    !previewChildren.data.items.some((child) => child.id === created),
    "production write is absent from preview",
  );
  console.log(`${checks} deployment isolation checks passed`);
} finally {
  if (created) {
    const removed = await request(
      production,
      `/children/${created}/remove`,
      {},
    );
    assert.equal(
      removed.status,
      200,
      "remove the synthetic isolation test profile",
    );
  }
  for (const base of [preview, production])
    if (jars.get(base).has("eq_account")) await request(base, "/logout", {});
}
