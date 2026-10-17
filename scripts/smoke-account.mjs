import assert from "node:assert/strict";
const base = process.argv[2] ?? "http://127.0.0.1:8788";
const remote = new URL(base).protocol === "https:";
const localTestIp = `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
const jar = new Map();
let checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log(`PASS ${label}`);
  checks++;
};
async function request(path, body, cookies = jar) {
  const r = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(!remote ? { "CF-Connecting-IP": localTestIp } : {}),
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: new URL(base).origin }),
      Cookie: Array.from(cookies, ([k, v]) => `${k}=${v}`).join("; "),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of r.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const at = pair.indexOf("=");
    const name = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  return { status: r.status, data: await r.json(), headers: r.headers };
}
let testChild;
const initialChildren = [];
try {
  check(
    (await request("/auth/register", {})).status === 403,
    "registration closed",
  );
  check(
    (await request("/children")).status === 401,
    "anonymous family access denied",
  );
  check(
    (await request("/auth/login", null)).status === 422,
    "null login rejected",
  );
  check(
    (
      await request("/auth/login", {
        username: "admin",
        password: "wrong-password",
      })
    ).status === 401,
    "wrong password rejected",
  );
  const signed = await request("/auth/login", {
    username: "admin",
    password: process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
  });
  check(
    signed.status === 200 && jar.has("eq_account") && jar.has("eq_child"),
    "administrator login with separate account and child cookies",
  );
  const cookies = signed.headers.getSetCookie().join(";");
  check(
    cookies.includes("HttpOnly") &&
      cookies.includes("SameSite=Strict") &&
      (!remote || cookies.includes("Secure")),
    "cookie protections delivered",
  );
  const me = await request("/me");
  check(
    me.data.authenticated &&
      me.data.adult.username === "admin" &&
      me.data.registrationOpen === false,
    "account identity restored from cookies",
  );
  const profiles = await request("/children");
  initialChildren.push(...profiles.data.items);
  check(
    profiles.status === 200 && profiles.data.items.length > 0,
    "family profiles persisted",
  );
  check(
    (await request("/children", { nickname: "", grade: 7 })).status === 422,
    "invalid profile rejected",
  );
  const created = await request("/children", {
    nickname: "自动验证探险家",
    grade: 2,
  });
  check(created.status === 201, "new child profile created");
  testChild = created.data.id;
  check(
    (
      await request(`/children/${testChild}`, {
        nickname: "验证小星星",
        grade: 3,
      })
    ).status === 200,
    "child nickname and grade editable",
  );
  check(
    (await request(`/children/${testChild}/select`, {})).status === 200,
    "child selection persisted",
  );
  check(
    (await request("/children/dev-child-b1/select", {})).status === 404,
    "foreign household child denied",
  );
  const active = await request("/sessions", {
    exerciseId: "sample.be.1",
    clientRequestId: crypto.randomUUID(),
  });
  check(active.status === 201, "account creates a learning session in D1");
  const restored = await request("/sessions/current");
  check(
    restored.data.session.id === active.data.id &&
      restored.data.receipt === null,
    "unfinished session recovered after reload",
  );
  await request(`/sessions/${active.data.id}/hint`, {});
  check(
    (await request("/sessions/current")).data.hint?.includes("They"),
    "hint state survives reload",
  );
  const answer = await request("/attempts", {
    eventId: crypto.randomUUID(),
    sessionId: active.data.id,
    assignmentId: active.data.assignmentId,
    leaseId: active.data.leaseId,
    answer: "are",
  });
  check(
    answer.status === 201 && answer.data.outcome === "hinted",
    "account answer graded and saved without hint promotion",
  );
  check(
    (await request("/sessions/current")).data.receipt?.eventId ===
      answer.data.eventId,
    "saved receipt recovered after reload",
  );
  check(
    (await request("/progress")).data.answered === 1,
    "new child progress isolated",
  );
  const oldGrant = new Map(jar);
  await request(`/children/${initialChildren[0].id}/select`, {});
  check(
    (await request("/progress", undefined, oldGrant)).status === 401,
    "child switching revokes old learning token",
  );
  check(
    (await request(`/sessions/${active.data.id}`)).status === 404,
    "other child session remains isolated",
  );
  check(
    (await request(`/children/${testChild}/remove`, {})).status === 200,
    "test child and cascading learning data removed",
  );
  testChild = null;
  const previous = new Map(jar);
  await request("/logout", {});
  check(
    (await request("/children", undefined, previous)).status === 401 &&
      (await request("/progress", undefined, previous)).status === 401,
    "logout revokes parent and child access",
  );
  if (!remote) {
    let last;
    for (let i = 0; i < 16; i++)
      last = await request("/auth/login", {
        username: "not-an-account",
        password: "wrong",
      });
    check(last.status === 429, "login attempts throttled by server");
  }
  console.log(`${checks} account checks passed on ${base}`);
} finally {
  if (testChild && jar.has("eq_account"))
    await request(`/children/${testChild}/remove`, {});
  if (jar.has("eq_account")) await request("/logout", {});
}
