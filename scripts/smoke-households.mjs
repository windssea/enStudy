import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { run } from "./runtime.mjs";
const base = "http://127.0.0.1:8788",
  stamp = crypto.randomUUID().replaceAll("-", "").slice(0, 12),
  admin = { jar: new Map() },
  people = ["a", "b", "c"].map((letter) => ({
    name: `family.${letter}.${stamp}`,
    password: `family-${crypto.randomUUID()}`,
    jar: new Map(),
    id: null,
    home: null,
    children: [],
  }));
const [a, b, c] = people,
  adminPassword = process.env.EQ_ADMIN_PASSWORD ?? "admin123123456",
  temporary = `temporary-${crypto.randomUUID()}`;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = (command) =>
  JSON.parse(
    run(["d1", "execute", "DB", "--local", "--json", "--command", command], {
      capture: true,
    }),
  )[0].results;
let checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log("PASS " + label);
  checks++;
};
async function request(actor, path, body, extra = {}) {
  const response = await fetch(base + "/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: [...actor.jar].map(([k, v]) => k + "=" + v).join("; "),
      "X-EQ-Player-Version": "3",
      ...(actor.context
        ? {
            "X-EQ-Household-ID": actor.context.id,
            "X-EQ-Household-Version": String(actor.context.version),
          }
        : {}),
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`,
      ...(body === undefined
        ? {}
        : { Origin: base, "Content-Type": "application/json" }),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const line of response.headers.getSetCookie()) {
    const p = line.split(";")[0],
      i = p.indexOf("="),
      key = p.slice(0, i),
      v = p.slice(i + 1);
    if (v) actor.jar.set(key, v);
    else actor.jar.delete(key);
  }
  const data = await response.json();
  if (response.ok && path === "/me")
    actor.context = data.adult
      ? { id: data.adult.householdId, version: data.adult.contextVersion }
      : null;
  if (response.ok && path === "/households/current")
    actor.context = {
      id: data.current?.id ?? "",
      version: data.contextVersion,
    };
  if (response.ok && path === "/households/switch")
    actor.context = { id: body.householdId, version: data.contextVersion };
  if (response.ok && path === "/logout") actor.context = null;
  return { status: response.status, data };
}
const me = async (actor) => (await request(actor, "/me")).data;
const access = async (actor) => {
  const r = await request(actor, "/households/current");
  assert.equal(r.status, 200, r.data.error?.message);
  return r.data;
};
const login = async (actor) => {
  assert.equal(
    (
      await request(actor, "/auth/login", {
        username: actor.name ?? "admin",
        password: actor.password ?? adminPassword,
      })
    ).status,
    200,
  );
  await me(actor);
};
async function enter(actor, id) {
  const info = await me(actor);
  const r = await request(actor, "/households/switch", {
    householdId: id,
    expectedContextVersion: info.adult.contextVersion,
    requestId: crypto.randomUUID(),
  });
  assert.equal(r.status, 200, r.data.error?.message);
  return (await me(actor)).adult;
}
async function invite(owner, recipient, role = "guardian") {
  const state = await access(owner),
    body = {
      username: recipient.name,
      role,
      currentPassword: owner.password,
      expectedVersion: state.version,
      requestId: crypto.randomUUID(),
    },
    r = await request(owner, "/households/invitations", body);
  assert.equal(r.status, 201, r.data.error?.message);
  return { ...r.data, body };
}
async function preview(recipient, inv) {
  const r = await request(recipient, "/households/invitations/preview", {
    token: inv.token,
  });
  assert.equal(r.status, 200, r.data.error?.message);
  return r.data;
}
const acceptBody = (recipient, inv, view) => ({
  token: inv.token,
  expectedVersion: view.version,
  currentPassword: recipient.password,
  requestId: crypto.randomUUID(),
});
async function change(owner, target, operation, role, version) {
  const state = await access(owner);
  return request(owner, `/households/members/${target.id}`, {
    operation,
    role,
    expectedVersion: version ?? state.version,
    currentPassword: owner.password,
  });
}
async function startAndSave(actor, child) {
  assert.equal(
    (await request(actor, `/children/${child}/select`, {})).status,
    200,
  );
  const item = JSON.parse(await readFile("content/exercises.json", "utf8"))[0],
    s = (
      await request(actor, "/sessions", {
        exerciseId: item.id,
        clientRequestId: crypto.randomUUID(),
      })
    ).data;
  const r = await request(actor, "/attempts", {
    sessionId: s.id,
    assignmentId: s.assignmentId,
    leaseId: s.leaseId,
    eventId: crypto.randomUUID(),
    answer: item.answers[0],
  });
  assert.equal(r.status, 201);
  return s;
}
try {
  check(
    (await request({ jar: new Map() }, "/households/current")).status === 401,
    "family membership requires an adult login",
  );
  check(
    (await request({ jar: new Map() }, "/auth/register", {})).status === 403,
    "public registration remains closed",
  );
  await login(admin);
  const root = await me(admin);
  check(
    root.adult.username === "admin" && root.adult.role === "owner",
    "default administrator retains its original family role",
  );
  check(
    (
      await request(admin, "/households/members/admin-adult", {
        operation: "leave",
        expectedVersion: 0,
        currentPassword: adminPassword,
      })
    ).status === 403,
    "bootstrap administrator membership cannot be removed",
  );
  for (const p of people) {
    const made = await request(admin, "/admin/accounts", {
      username: p.name,
      householdName: `验证家庭-${stamp}-${p.name[7]}`,
      temporaryPassword: temporary,
      currentPassword: adminPassword,
    });
    assert.equal(made.status, 201);
    p.id = made.data.id;
    await request(p, "/auth/login", { username: p.name, password: temporary });
    check(
      (await request(p, "/households/current")).status === 403,
      "temporary password cannot enter family membership settings",
    );
    assert.equal(
      (
        await request(p, "/auth/password", {
          currentPassword: temporary,
          newPassword: p.password,
        })
      ).status,
      200,
    );
    await login(p);
    p.home = (await me(p)).adult.householdId;
    const kid = await request(p, "/children", {
      nickname: "虚构探险家",
      grade: 3,
    });
    assert.equal(kid.status, 201);
    p.children.push(kid.data.id);
  }
  const second = await request(a, "/children", {
    nickname: "虚构同伴",
    grade: 1,
  });
  assert.equal(second.status, 201);
  a.children.push(second.data.id);
  const original = await startAndSave(a, a.children[0]);
  await startAndSave(b, b.children[0]);
  sql(
    `UPDATE account_sessions SET active_household_id=NULL,context_command_id=NULL WHERE adult_id=${quote(b.id)}`,
  );
  check(
    (await me(b)).adult.householdId === b.home &&
      sql(
        `SELECT active_household_id FROM account_sessions WHERE adult_id=${quote(b.id)} AND revoked_at IS NULL`,
      )[0].active_household_id === b.home,
    "legacy sessions pin their family before accepting any invitation",
  );
  const state = await access(a),
    invalid = {
      username: b.name,
      role: "guardian",
      expectedVersion: state.version,
      requestId: crypto.randomUUID(),
      currentPassword: "incorrect-password",
    };
  check(
    (await request(a, "/households/invitations", invalid)).status === 401,
    "creating an invitation rechecks the owner password",
  );
  check(
    (
      await request(a, "/households/invitations", {
        ...invalid,
        currentPassword: a.password,
        role: "administrator",
      })
    ).status === 422,
    "invitations cannot assign a site administrator role",
  );
  const inv = await invite(a, b);
  check(
    /^[a-f0-9]{64}$/.test(inv.token),
    "invitation secret is generated once as an opaque random code",
  );
  const stored = sql(
    `SELECT token_hash FROM household_invitations WHERE id=${quote(inv.id)}`,
  )[0];
  check(
    stored.token_hash !== inv.token && /^[a-f0-9]{64}$/.test(stored.token_hash),
    "D1 stores only the invitation digest",
  );
  const outgoing = await access(a);
  check(
    outgoing.invitations.some((i) => i.id === inv.id) &&
      !JSON.stringify(outgoing).includes(inv.token) &&
      !JSON.stringify(outgoing).includes(stored.token_hash),
    "family lists never return invitation secrets or token digests",
  );
  check(
    (await request(a, "/households/invitations", inv.body)).status === 409,
    "a lost create receipt cannot mint another invitation with the same command",
  );
  check(
    (await request(c, "/households/invitations/preview", { token: inv.token }))
      .status === 404,
    "a valid code is invisible to a different recipient",
  );
  check(
    (
      await request(c, "/households/invitations/accept", {
        token: inv.token,
        currentPassword: c.password,
        requestId: crypto.randomUUID(),
        expectedVersion: outgoing.version,
      })
    ).status === 404,
    "a different account cannot redeem another recipients code",
  );
  sql(
    `UPDATE household_invitations SET expires_at=${Date.now() - 1} WHERE id=${quote(inv.id)}`,
  );
  check(
    (await request(b, "/households/invitations/preview", { token: inv.token }))
      .status === 404,
    "expired invitations cannot be previewed",
  );
  sql(
    `UPDATE household_invitations SET expires_at=${inv.expiresAt} WHERE id=${quote(inv.id)}`,
  );
  const view = await preview(b, inv);
  check(
    view.householdId === a.home &&
      view.role === "guardian" &&
      !JSON.stringify(view).includes(a.children[0]),
    "recipient previews the household and role without child data",
  );
  const command = acceptBody(b, inv, view),
    joined = await Promise.all([
      request(b, "/households/invitations/accept", command),
      request(b, "/households/invitations/accept", command),
    ]);
  check(
    joined.every((r) => r.status === 200) &&
      joined.some((r) => r.data.replayed),
    "concurrent identical acceptance acknowledges one atomic membership",
  );
  check(
    sql(
      `SELECT count(*) AS n FROM household_members WHERE household_id=${quote(a.home)} AND adult_id=${quote(b.id)}`,
    )[0].n === 1,
    "accepting a code creates exactly one membership",
  );
  check(
    (await me(b)).adult.householdId === b.home &&
      (await access(b)).households.length === 2,
    "joining preserves the current family and exposes an explicit family choice",
  );
  check(
    (await request(b, "/progress")).data.answered === 1,
    "joining another family preserves the recipients own learning progress",
  );
  const before = (await me(b)).adult;
  const beforeJar = { jar: new Map(b.jar) };
  const current = await enter(b, a.home);
  check(
    current.role === "guardian" && !(await me(b)).child,
    "switching family clears the previous child authorization and exposes the invited role",
  );
  check(
    (await request(beforeJar, "/progress")).status === 401,
    "an old child grant cannot survive a family switch",
  );
  const oldHeader = {
    "X-EQ-Household-ID": before.householdId,
    "X-EQ-Household-Version": String(before.contextVersion),
  };
  check(
    (await request(b, "/children", undefined, oldHeader)).data.error?.code ===
      "HOUSEHOLD_CONTEXT_CHANGED",
    "stale family headers cannot read the newly selected family by accident",
  );
  check(
    (await request({ jar: new Map(b.jar) }, "/children")).data.error?.code ===
      "HOUSEHOLD_CONTEXT_CHANGED",
    "older pages without household context cannot act after a family switch",
  );
  check(
    (await request(b, "/children")).data.items.length === 2,
    "guardian can see the explicitly shared family profiles",
  );
  check(
    (await request(b, "/children", { nickname: "越权添加", grade: 1 }))
      .status === 403,
    "guardian cannot create profiles",
  );
  check(
    (
      await request(b, `/children/${a.children[0]}`, {
        nickname: "越权编辑",
        grade: 1,
      })
    ).status === 403,
    "guardian cannot edit profiles",
  );
  check(
    (await request(b, `/children/${a.children[1]}/remove`, {})).status === 403,
    "guardian cannot delete profiles",
  );
  check(
    (await request(b, "/ai/settings")).status === 403,
    "guardian cannot read household AI settings",
  );
  check(
    (
      await request(b, "/households/invitations", {
        ...inv.body,
        requestId: crypto.randomUUID(),
      })
    ).status === 403,
    "guardian cannot invite more adults",
  );
  check(
    (await change(b, a, "change_role", "guardian")).status === 403,
    "guardian cannot alter another adults role",
  );
  check(
    (await request(b, "/admin/accounts")).status === 403,
    "family invitations never inherit site administration",
  );
  assert.equal(
    (await request(b, `/children/${a.children[0]}/select`, {})).status,
    200,
  );
  const firstAContext = (await me(b)).adult,
    oldAGrant = { jar: new Map(b.jar) };
  const secondDevice = { name: b.name, password: b.password, jar: new Map() };
  await login(secondDevice);
  await enter(secondDevice, b.home);
  assert.equal(
    (await request(secondDevice, `/children/${b.children[0]}/select`, {}))
      .status,
    200,
  );
  check(
    (await me(b)).adult.householdId === a.home &&
      (await me(secondDevice)).adult.householdId === b.home,
    "separate device sessions choose households independently",
  );
  check(
    (await request(b, `/family/children/${a.children[0]}/report`)).status ===
      200,
    "guardian can view a shared childs learning report",
  );
  check(
    (await request(b, `/family/children/${c.children[0]}/report`)).status ===
      404,
    "joining one family grants no access to a third family",
  );
  check(
    (await request(b, "/sessions/current")).data.session.access ===
      "takeover-required",
    "shared learning keeps the existing device lease instead of silently taking over",
  );
  check(
    (
      await request(b, `/sessions/${original.id}/next`, {
        assignmentId: original.assignmentId,
        leaseId: original.leaseId,
      })
    ).status === 409,
    "another adults old learning lease cannot advance a child session",
  );
  await enter(b, b.home);
  await enter(b, a.home);
  check(
    (
      await request(b, "/children", undefined, {
        "X-EQ-Household-ID": a.home,
        "X-EQ-Household-Version": String(firstAContext.contextVersion),
      })
    ).status === 409,
    "switching away and back still invalidates an earlier page version",
  );
  check(
    (await request(oldAGrant, "/progress")).status === 401,
    "switching away and back cannot resurrect a previously revoked child grant",
  );
  const invC = await invite(c, b);
  const viewC = await preview(b, invC);
  assert.equal(
    (
      await request(
        b,
        "/households/invitations/accept",
        acceptBody(b, invC, viewC),
      )
    ).status,
    200,
  );
  await enter(b, c.home);
  const contextC = (await me(b)).adult;
  const switches = await Promise.all(
    [a.home, b.home].map((householdId) =>
      request(b, "/households/switch", {
        householdId,
        expectedContextVersion: contextC.contextVersion,
        requestId: crypto.randomUUID(),
      }),
    ),
  );
  check(
    switches
      .map((r) => r.status)
      .sort()
      .join(",") === "200,409",
    "two tabs sharing a parent session have one context winner",
  );
  await enter(b, a.home);
  const oldLogin = { jar: new Map(b.jar) };
  assert.equal((await change(a, b, "change_role", "owner")).status, 200);
  check(
    !(await me(oldLogin)).adult &&
      (await request(oldLogin, "/children")).status === 401 &&
      !(await me(secondDevice)).adult &&
      (await request(secondDevice, "/progress")).status === 401,
    "role changes revoke every previous login and child authorization",
  );
  await login(b);
  await enter(b, a.home);
  check(
    (await me(b)).adult.role === "owner",
    "promoted parent receives management only after a new login",
  );
  const pending = await invite(a, c);
  assert.equal((await change(b, a, "change_role", "guardian")).status, 200);
  check(
    (
      await request(c, "/households/invitations/preview", {
        token: pending.token,
      })
    ).status === 404,
    "demoting an inviter revokes their unaccepted invitations",
  );
  await login(a);
  await enter(a, a.home);
  assert.equal((await change(b, a, "change_role", "owner")).status, 200);
  await login(a);
  await enter(a, a.home);
  sql(
    `UPDATE account_credentials SET disabled_at=${Date.now()} WHERE adult_id=${quote(b.id)}`,
  );
  check(
    (await change(a, a, "leave")).status === 409,
    "an inactive co-owner cannot be left as the only usable manager",
  );
  sql(
    `UPDATE account_credentials SET disabled_at=NULL WHERE adult_id=${quote(b.id)}`,
  );
  const version = (await access(a)).version;
  const race = await Promise.all([
    change(a, a, "change_role", "guardian", version),
    change(b, b, "change_role", "guardian", version),
  ]);
  check(
    race
      .map((r) => r.status)
      .sort()
      .join(",") === "200,409",
    "simultaneous owner demotions cannot remove both managers",
  );
  const keeperId = sql(
    `SELECT adult_id FROM household_members WHERE household_id=${quote(a.home)} AND role='owner'`,
  )[0].adult_id;
  const keeper = people.find((p) => p.id === keeperId),
    other = keeper === a ? b : a;
  check(
    (await change(keeper, keeper, "leave")).status === 409,
    "the last usable owner cannot leave",
  );
  await login(other);
  await enter(other, a.home);
  check(
    (await change(other, other, "leave")).status === 200,
    "a guardian can explicitly leave without deleting child records",
  );
  check(
    (await request(keeper, "/children")).data.items.length === 2,
    "leaving a family does not delete its child profiles",
  );
  await login(other);
  if (other === a) {
    check(
      (await me(a)).adult?.householdId === "" &&
        (await access(a)).current === null,
      "an account with no memberships can still log in and manage its password",
    );
    const again = await invite(keeper, a);
    const againView = await preview(a, again);
    assert.equal(
      (
        await request(
          a,
          "/households/invitations/accept",
          acceptBody(a, again, againView),
        )
      ).status,
      200,
    );
    check(
      (await me(a)).adult.householdId === "" &&
        (await access(a)).households.length === 1,
      "accepting a first family from an empty context still requires explicit selection",
    );
    await enter(a, a.home);
  } else
    check(
      (await access(b)).households.some((h) => h.id === b.home),
      "leaving a shared family preserves the separate original family",
    );
  // Ensure the removal and subsequent re-invitation path is tested regardless of the race winner.
  if (!(await access(keeper)).members.some((m) => m.id === other.id)) {
    const back = await invite(keeper, other);
    const backView = await preview(other, back);
    assert.equal(
      (
        await request(
          other,
          "/households/invitations/accept",
          acceptBody(other, back, backView),
        )
      ).status,
      200,
    );
    await enter(other, a.home);
  }
  assert.equal(
    (await request(other, `/children/${a.children[0]}/select`, {})).status,
    200,
  );
  const removedLogin = { jar: new Map(other.jar) };
  check(
    (await change(keeper, other, "remove_member")).status === 200,
    "owner can remove a shared adult without deleting the account",
  );
  check(
    (await request(removedLogin, "/progress")).status === 401,
    "removal immediately revokes the removed adults child grant",
  );
  const oldCode = other === b ? inv : null;
  if (oldCode) {
    await login(other);
    check(
      (await request(other, "/households/invitations/accept", command))
        .status === 404,
      "an accepted old code cannot restore a removed membership",
    );
  }
  const fresh = await invite(keeper, c),
    freshView = await preview(c, fresh),
    freshCommand = acceptBody(c, fresh, freshView),
    freshState = await access(keeper);
  const revokeRace = await Promise.all([
    request(keeper, `/households/invitations/${fresh.id}/revoke`, {
      expectedVersion: freshState.version,
      currentPassword: keeper.password,
    }),
    request(c, "/households/invitations/accept", freshCommand),
  ]);
  const row = sql(
      `SELECT accepted_at,revoked_at FROM household_invitations WHERE id=${quote(fresh.id)}`,
    )[0],
    member = sql(
      `SELECT count(*) AS n FROM household_members WHERE household_id=${quote(a.home)} AND adult_id=${quote(c.id)}`,
    )[0].n;
  check(
    revokeRace.some((r) => r.status === 200) &&
      Boolean(row.accepted_at) !== Boolean(row.revoked_at) &&
      member === Number(Boolean(row.accepted_at)),
    "acceptance versus revocation commits exactly one complete outcome",
  );
  // Exercise the empty-account path independently of either concurrency winner.
  const cMember = (await access(keeper)).members.find((m) => m.id === c.id);
  if (!cMember) {
    const offered = await invite(keeper, c, "owner"),
      look = await preview(c, offered);
    assert.equal(
      (
        await request(
          c,
          "/households/invitations/accept",
          acceptBody(c, offered, look),
        )
      ).status,
      200,
    );
  } else if (cMember.role !== "owner")
    assert.equal((await change(keeper, c, "change_role", "owner")).status, 200);
  await login(c);
  await enter(c, a.home);
  if ((await access(c)).members.some((m) => m.id === a.id))
    assert.equal((await change(c, a, "remove_member")).status, 200);
  await login(a);
  check(
    (await me(a)).adult?.householdId === "" &&
      (await me(a)).adult.role === null &&
      (await access(a)).current === null,
    "a member removed from their only family still has a usable adult account",
  );
  check(
    (await request(a, "/children", { nickname: "无权限建档", grade: 1 }))
      .status === 403 && (await request(a, "/ai/settings")).status === 403,
    "an empty account receives no child management or AI privileges",
  );
  const rotated = `empty-${crypto.randomUUID()}`;
  assert.equal(
    (
      await request(a, "/auth/password", {
        currentPassword: a.password,
        newPassword: rotated,
      })
    ).status,
    200,
  );
  a.password = rotated;
  await login(a);
  check(
    (await me(a)).adult?.householdId === "",
    "an account without a household can rotate its password and log in again",
  );
  const recoveryInvite = await invite(c, a),
    recoveryView = await preview(a, recoveryInvite);
  assert.equal(
    (
      await request(
        a,
        "/households/invitations/accept",
        acceptBody(a, recoveryInvite, recoveryView),
      )
    ).status,
    200,
  );
  check(
    (await me(a)).adult.householdId === "" &&
      (await access(a)).households.length === 1,
    "accepting a first membership from an empty account does not silently select the family",
  );
  await enter(a, a.home);
  check(
    (await me(a)).adult.role === "guardian" &&
      (await request(a, "/children")).data.items.length === 2,
    "explicit family selection restores the newly granted teaching access",
  );
  check(
    sql(
      `SELECT count(*) AS n FROM attempts WHERE child_id=${quote(a.children[0])}`,
    )[0].n === 1,
    "membership and context operations preserve existing learning observations",
  );
  check(
    (await request(a, "/auth/register", {})).status === 403,
    "invitation support leaves public registration closed at the end",
  );
  console.log(
    `${checks} household membership checks passed on local workerd/D1; browser interaction and remote invitation acceptance are separate gates.`,
  );
} finally {
  for (const actor of [admin, ...people]) {
    try {
      if (actor.jar.has("eq_account")) await request(actor, "/logout", {});
    } catch {}
  }
  // Recover a committed create even if its HTTP response was lost. Only this
  // run's exact account names and labelled households can enter cleanup.
  const names = people.map((p) => quote(p.name)).join(",");
  const ids = sql(
      `SELECT adult_id FROM account_credentials WHERE username IN(${names})`,
    ).map((row) => row.adult_id),
    homes = sql(
      `SELECT DISTINCT h.id FROM households h JOIN household_members m ON m.household_id=h.id JOIN account_credentials a ON a.adult_id=m.adult_id WHERE a.username IN(${names}) AND h.name LIKE ${quote(`验证家庭-${stamp}-%`)}`,
    ).map((row) => row.id);
  if (ids.length) {
    const literals = ids.map(quote).join(","),
      households = homes.map(quote).join(",");
    const file = `.wrangler/households-smoke-${stamp}.sql`;
    await writeFile(
      file,
      `DELETE FROM account_audit WHERE actor_id IN(${literals}) OR target_id IN(${literals});\n${homes.length ? `DELETE FROM households WHERE id IN(${households});` : ""}\nDELETE FROM adults WHERE id IN(${literals});`,
    );
    try {
      run(["d1", "execute", "DB", "--local", "--file", file], {
        capture: true,
      });
      assert.equal(
        sql(
          `SELECT count(*) AS n FROM account_credentials WHERE adult_id IN(${literals})`,
        )[0].n,
        0,
      );
      console.log(
        "Disposable membership accounts, invitations and learning fixtures removed from local D1.",
      );
    } finally {
      await unlink(file);
    }
  }
}
