import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { wrangler } from "./runtime.mjs";

// This verifier creates disposable accounts and cleans them via LOCAL D1 only.
const base = "http://127.0.0.1:8788",
  runId = crypto.randomUUID().replaceAll("-", "").slice(0, 14);
const names = [`check.a.${runId}`, `check.b.${runId}`];
const admin = new Map(),
  a = new Map(),
  b = new Map();
const temporary = `temp-${crypto.randomUUID()}`,
  passwordA = `a-${crypto.randomUUID()}`,
  passwordB = `b-${crypto.randomUUID()}`,
  rotated = `rotated-${crypto.randomUUID()}`,
  reset = `reset-${crypto.randomUUID()}`,
  finalPassword = `final-${crypto.randomUUID()}`;
const adminPassword = process.env.EQ_ADMIN_PASSWORD ?? "admin123123456";
let checks = 0;
function check(ok, label) {
  assert.ok(ok, label);
  console.log(`PASS ${label}`);
  checks++;
}
const ip = () =>
  `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
async function request(path, body, jar = admin, testIp = ip()) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "CF-Connecting-IP": testIp,
      Cookie: Array.from(jar, ([key, value]) => `${key}=${value}`).join("; "),
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: base }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const at = pair.indexOf("="),
      key = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) jar.set(key, value);
    else jar.delete(key);
  }
  return {
    status: response.status,
    data: await response.json(),
    retry: response.headers.get("Retry-After"),
  };
}
const login = (username, password, jar) =>
  request("/auth/login", { username, password }, jar);
const list = async () => {
  let cursor = null,
    all = [];
  do {
    const page = await request(
      `/admin/accounts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    assert.equal(page.status, 200);
    all.push(...page.data.items);
    cursor = page.data.cursor;
  } while (cursor);
  return all;
};
const find = async (id) => (await list()).find((row) => row.id === id);
const create = (username, extra = {}) =>
  request("/admin/accounts", {
    username,
    householdName: "自动验证家庭",
    temporaryPassword: temporary,
    currentPassword: adminPassword,
    ...extra,
  });
const action = (account, operation, extra = {}) =>
  request(`/admin/accounts/${account.id}`, {
    operation,
    version: account.version,
    currentPassword: adminPassword,
    ...extra,
  });
const change = (currentPassword, newPassword, jar) =>
  request("/auth/password", { currentPassword, newPassword }, jar);
function query(sql) {
  const output = spawnSync(
    process.execPath,
    [wrangler, "d1", "execute", "DB", "--local", "--json", "--command", sql],
    {
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  if (output.status !== 0)
    throw new Error("Local D1 verification query failed.");
  return JSON.parse(output.stdout)[0].results;
}
async function executeFixture(sql) {
  const file = `.wrangler/managed-fixture-${runId}.sql`;
  await writeFile(file, sql);
  try {
    const result = spawnSync(
      process.execPath,
      [wrangler, "d1", "execute", "DB", "--local", "--file", file],
      {
        encoding: "utf8",
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      },
    );
    if (result.status !== 0)
      throw new Error("Local pagination fixture failed.");
  } finally {
    await unlink(file);
  }
}
const counts = () =>
  query(
    "SELECT (SELECT count(*) FROM adults) AS adults,(SELECT count(*) FROM households) AS households,(SELECT count(*) FROM household_members) AS members,(SELECT count(*) FROM account_credentials) AS credentials,(SELECT count(*) FROM account_audit) AS audit",
  )[0];
try {
  check(
    (await request("/admin/accounts")).status === 401,
    "anonymous administration rejected",
  );
  check(
    (await request("/admin/accounts", {})).status === 401,
    "anonymous creation rejected",
  );
  check(
    (await request("/auth/register", {})).status === 403,
    "public registration still closed",
  );
  check(
    (await change("wrong", passwordA, new Map())).status === 401,
    "anonymous password update rejected",
  );
  check(
    (await login("admin", adminPassword, admin)).status === 200,
    "bootstrap administrator unchanged",
  );
  const me = await request("/me");
  check(
    me.data.adult.isAdmin && !me.data.adult.mustChangePassword,
    "explicit administrator capability returned",
  );
  const initial = await list();
  check(
    initial.every(
      (row) =>
        Object.keys(row).sort().join(",") ===
        "childCount,createdAt,disabled,householdName,id,isAdmin,mustChangePassword,username,version",
    ),
    "list exposes only intended account metadata",
  );
  check(
    (await request("/admin/accounts?cursor=invalid")).status === 422,
    "invalid pagination rejected",
  );
  check(
    (await request("/admin/accounts", null)).status === 422,
    "null account payload rejected",
  );
  check(
    (await create(names[0], { temporaryPassword: "short" })).status === 422,
    "short temporary password rejected",
  );
  check(
    (await create(names[0], { currentPassword: "incorrect" })).status === 401 &&
      !(await list()).some((row) => row.username === names[0]),
    "wrong administrator password cannot create family",
  );
  const createdA = await create(names[0], { isAdmin: true, role: "admin" }),
    createdB = await create(names[1]);
  check(
    createdA.status === 201 && createdB.status === 201,
    "two independent family accounts created",
  );
  const idA = createdA.data.id,
    idB = createdB.data.id;
  const before = counts();
  check(
    (await create(names[0])).status === 409,
    "duplicate username returns conflict",
  );
  check(
    JSON.stringify(counts()) === JSON.stringify(before),
    "duplicate transaction leaves no orphan household adult membership or audit",
  );
  check(
    (await find(idA)).mustChangePassword && !(await find(idA)).isAdmin,
    "client role fields cannot grant site administration",
  );
  check(
    (
      await action(
        initial.find((row) => row.isAdmin),
        "disable",
      )
    ).status === 403,
    "bootstrap administrator protected from account disable",
  );
  a.set("eq_dev_session", "stale-development-cookie");
  check(
    (await login(names[0], temporary, a)).status === 200 &&
      !a.has("eq_child") &&
      !a.has("eq_dev_session"),
    "temporary password signs in without a learning grant",
  );
  check(
    (await request("/children", undefined, a)).status === 403 &&
      (await request("/children", { nickname: "验证小星", grade: 2 }, a))
        .status === 403,
    "temporary credential cannot read or create child profiles",
  );
  check(
    (
      await request(
        "/sessions",
        { exerciseId: "sample.be.1", clientRequestId: crypto.randomUUID() },
        a,
      )
    ).status === 401 &&
      (await request("/progress", undefined, a)).status === 401,
    "temporary credential cannot bypass gate through learning APIs",
  );
  check(
    (await request("/admin/accounts", undefined, a)).status === 403,
    "ordinary account cannot enumerate families",
  );
  check(
    (await change("wrong", passwordA, a)).status === 401 &&
      (await change(temporary, temporary, a)).status === 422,
    "password update requires current secret and a different new secret",
  );
  const oldTemporary = new Map(a);
  check(
    (await change(temporary, passwordA, a)).status === 200 &&
      !a.has("eq_account"),
    "first change clears current login cookies",
  );
  check(
    (await request("/children", undefined, oldTemporary)).status === 401,
    "first change revokes old server session",
  );
  check(
    (await login(names[0], temporary, new Map())).status === 401 &&
      (await login(names[0], passwordA, a)).status === 200,
    "only new password can log in",
  );
  const meA = (await request("/me", undefined, a)).data;
  check(
    !meA.adult.isAdmin && !meA.adult.mustChangePassword,
    "new family is a normal account after first change",
  );
  const childA = await request(
    "/children",
    { nickname: "验证小星", grade: 2 },
    a,
  );
  check(
    childA.status === 201 &&
      (await request(`/children/${childA.data.id}/select`, {}, a)).status ===
        200,
    "new parent adds and selects their first child",
  );
  const session = await request(
    "/sessions",
    { exerciseId: "sample.be.1", clientRequestId: crypto.randomUUID() },
    a,
  );
  const saved = await request(
    "/attempts",
    {
      eventId: crypto.randomUUID(),
      sessionId: session.data.id,
      assignmentId: session.data.assignmentId,
      leaseId: session.data.leaseId,
      answer: "are",
    },
    a,
  );
  check(
    session.status === 201 &&
      saved.status === 201 &&
      (await request("/progress", undefined, a)).data.answered === 1,
    "new family can save real learning progress",
  );
  await login(names[1], temporary, b);
  await change(temporary, passwordB, b);
  await login(names[1], passwordB, b);
  const childB = await request(
    "/children",
    { nickname: "验证小河", grade: 4 },
    b,
  );
  await request(`/children/${childB.data.id}/select`, {}, b);
  check(
    (await request("/me", undefined, b)).data.adult.householdId !==
      meA.adult.householdId &&
      (await request("/progress", undefined, b)).data.answered === 0,
    "new families have distinct households and isolated progress",
  );
  check(
    (await request(`/sessions/${session.data.id}`, undefined, b)).status ===
      404 &&
      (await request(`/children/${childA.data.id}/select`, {}, b)).status ===
        404,
    "second family cannot select foreign child or recover foreign lesson",
  );
  check(
    (
      await request(
        `/children/${childA.data.id}`,
        { nickname: "越权", grade: 3 },
        b,
      )
    ).status === 404 &&
      (await request(`/children/${childA.data.id}/select`, {})).status === 404,
    "family writes and administrator learning APIs retain household scope",
  );
  const sibling = new Map();
  await login(names[0], passwordA, sibling);
  const oldA = new Map(a),
    oldSibling = new Map(sibling);
  check(
    (await change(passwordA, rotated, a)).status === 200,
    "ordinary parent can rotate own password",
  );
  check(
    (await request("/children", undefined, oldA)).status === 401 &&
      (await request("/progress", undefined, oldSibling)).status === 401,
    "self rotation revokes all devices and child grants",
  );
  await login(names[0], rotated, a);
  check(
    (await request("/progress", undefined, a)).data.answered === 1,
    "password rotation preserves child learning data",
  );
  const accountA = await find(idA),
    beforeReset = new Map(a);
  check(
    (await action(accountA, "reset_password", { temporaryPassword: reset }))
      .status === 200,
    "administrator sets a fresh temporary password",
  );
  check(
    (await request("/progress", undefined, beforeReset)).status === 401 &&
      (await request("/children", undefined, beforeReset)).status === 401,
    "administrator reset immediately revokes parent and child access",
  );
  check(
    (await login(names[0], rotated, new Map())).status === 401 &&
      (await login(names[0], reset, a)).status === 200 &&
      (await request("/children", undefined, a)).status === 403,
    "reset removes old password and reinstates first change requirement",
  );
  await change(reset, finalPassword, a);
  await login(names[0], finalPassword, a);
  check(
    (await action(accountA, "reset_password", { temporaryPassword: reset }))
      .status === 409 &&
      (await request("/progress", undefined, a)).data.answered === 1,
    "stale administrator snapshot cannot overwrite a newer credential",
  );
  const currentA = await find(idA),
    beforeDisable = new Map(a);
  const competing = await Promise.all([
    action(currentA, "disable"),
    action(currentA, "disable"),
  ]);
  check(
    competing
      .map((r) => r.status)
      .sort()
      .join(",") === "200,409",
    "concurrent state changes commit exactly one version",
  );
  check(
    (await request("/progress", undefined, beforeDisable)).status === 401 &&
      (await login(names[0], finalPassword, new Map())).status === 401,
    "disabled account loses old access and cannot log in",
  );
  check(
    (await action(await find(idA), "enable")).status === 200,
    "administrator can restore a disabled family",
  );
  check(
    (await request("/progress", undefined, beforeDisable)).status === 401,
    "restoration cannot resurrect old bearer tokens",
  );
  await login(names[0], finalPassword, a);
  check(
    (await request("/progress", undefined, a)).data.answered === 1,
    "restored family retains its learning history",
  );
  check(
    (
      await request(
        `/admin/accounts/${idA}`,
        {
          operation: "disable",
          version: (await find(idA)).version,
          currentPassword: passwordB,
        },
        b,
      )
    ).status === 403,
    "ordinary parent cannot invoke administrator mutation",
  );
  const rateIp = ip();
  let limited;
  for (let i = 0; i < 16; i++)
    limited = await request(
      "/auth/password",
      { currentPassword: "wrong", newPassword: `rate-${crypto.randomUUID()}` },
      b,
      rateIp,
    );
  check(
    limited.status === 429 && Number(limited.retry) > 0,
    "password verification is server throttled with retry time",
  );
  const time = Date.now();
  const fixtureNames = Array.from(
    { length: 51 },
    (_, i) => `page.${runId}.${i}`,
  );
  names.push(...fixtureNames);
  await executeFixture(
    fixtureNames
      .map((name) => {
        const id = crypto.randomUUID(),
          family = crypto.randomUUID();
        return `INSERT INTO adults(id,auth_subject,created_at) VALUES('${id}','fixture:${id}',${time}); INSERT INTO households(id,name,created_at) VALUES('${family}','分页测试',${time}); INSERT INTO household_members VALUES('${family}','${id}','owner'); INSERT INTO account_credentials(adult_id,username,password_hash,salt,iterations,must_change_password) VALUES('${id}','${name}','${"0".repeat(64)}','fixture-${id}',100000,1);`;
      })
      .join("\n"),
  );
  const firstPage = await request("/admin/accounts");
  const every = await list();
  check(
    firstPage.data.items.length === 50 &&
      firstPage.data.cursor &&
      fixtureNames.every(
        (name) => every.filter((row) => row.username === name).length === 1,
      ) &&
      new Set(every.map((row) => row.id)).size === every.length,
    "pagination crosses equal timestamps without missing or duplicate families",
  );
  const freshAdmin = new Map();
  check(
    (await login("admin", adminPassword, freshAdmin)).status === 200,
    "bootstrap credential remains unchanged after managed operations",
  );
  await request("/logout", {}, freshAdmin);
  console.log(
    `${checks} managed account checks passed on local workerd + D1. No remote accounts created.`,
  );
} finally {
  try {
    if (admin.has("eq_account")) await request("/logout", {});
  } catch {
    console.error(
      "Local verification logout failed; continuing disposable account cleanup.",
    );
  }
  const literals = names.map((name) => `'${name}'`).join(",");
  const target = `SELECT adult_id FROM account_credentials WHERE username IN(${literals})`;
  const file = `.wrangler/managed-smoke-${runId}.sql`;
  await writeFile(
    file,
    `DELETE FROM account_audit WHERE actor_id IN(${target}) OR target_id IN(${target});\nDELETE FROM households WHERE id IN(SELECT household_id FROM household_members WHERE adult_id IN(${target}));\nDELETE FROM adults WHERE id IN(${target});`,
  );
  try {
    const result = spawnSync(
      process.execPath,
      [wrangler, "d1", "execute", "DB", "--local", "--file", file],
      {
        encoding: "utf8",
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      },
    );
    if (result.status !== 0)
      throw new Error(
        "Disposable account cleanup failed; inspect local D1 before retrying.",
      );
    assert.equal(
      query(
        `SELECT count(*) AS n FROM account_credentials WHERE username IN(${literals})`,
      )[0].n,
      0,
    );
    console.log(
      "Disposable family accounts and learning records removed from local D1.",
    );
  } finally {
    await unlink(file);
  }
}
