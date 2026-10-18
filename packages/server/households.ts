import { Hono, type Context } from "hono";
import { deleteCookie } from "hono/cookie";
import {
  readAdult,
  tokenHash,
  sessionHouseholdSql,
  type AdultSession,
  type AuthEnv,
} from "./auth";
import { verifyAdultPassword, type Credential } from "./adultVerification";
import { validUsername } from "./managedAccounts";
import features from "../domain/platformFeatures.json";
import {
  validAccessVersion,
  validHouseholdRole,
  validInviteToken,
  validRequestId,
} from "../domain/households";
type B = { Bindings: AuthEnv; Variables: { adult: AdultSession } };
type Ctx = Context<B>;
export const householdRoutes = new Hono<B>();
const fault = (code: string, message: string) => ({ error: { code, message } });
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const stale = (c: Ctx) =>
  c.json(
    fault("HOUSEHOLD_CHANGED", "家庭状态已变化，请刷新列表并重新确认。"),
    409,
  );
const invalidInvite = (c: Ctx) =>
  c.json(
    fault(
      "INVITE_UNAVAILABLE",
      "邀请码不适用于此账号、已过期或已被撤销，请向邀请人核对。",
    ),
    404,
  );
const protectedMembership = (household: string, target: string) =>
  household === "admin-household" && target === "admin-adult";
const effectiveHousehold = sessionHouseholdSql;
const authorization = `EXISTS(SELECT 1 FROM account_sessions s JOIN account_credentials a ON a.adult_id=s.adult_id WHERE s.id=? AND s.adult_id=? AND COALESCE(${effectiveHousehold},'')=? AND s.context_version=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.disabled_at IS NULL AND a.must_change_password=0 AND a.password_hash=? AND a.credential_version=?`;
const authorizedArgs = (
  adult: AdultSession,
  credential: Credential,
  now: number,
) => [
  adult.id,
  adult.adultId,
  adult.householdId,
  adult.contextVersion,
  now,
  credential.password_hash,
  credential.credential_version,
];
const permitted =
  "EXISTS(SELECT 1 FROM household_access WHERE household_id=? AND operation_id=?)";
function gate(
  c: Ctx,
  adult: AdultSession,
  credential: Credential,
  household: string,
  version: number,
  owner: boolean,
  extra = "1",
  args: (string | number)[] = [],
) {
  const id = crypto.randomUUID(),
    now = Date.now();
  const auth =
    authorization +
    (owner
      ? ` AND EXISTS(SELECT 1 FROM household_members m WHERE m.adult_id=s.adult_id AND m.household_id=${effectiveHousehold} AND m.role='owner'))`
      : ")");
  return {
    id,
    now,
    household,
    statement: c.env.DB.prepare(
      `INSERT INTO household_access(household_id,version,operation_id) SELECT ?,1,? WHERE ${auth} AND (${extra}) AND (?=0 OR EXISTS(SELECT 1 FROM household_access WHERE household_id=? AND version=?)) ON CONFLICT(household_id) DO UPDATE SET version=household_access.version+1,operation_id=excluded.operation_id WHERE household_access.version=?`,
    ).bind(
      household,
      id,
      ...authorizedArgs(adult, credential, now),
      ...args,
      version,
      household,
      version,
      version,
    ),
  };
}
type Permit = ReturnType<typeof gate>;
function auditStatement(
  c: Ctx,
  adult: AdultSession,
  p: Permit,
  operation: string,
  target: string,
) {
  return c.env.DB.prepare(
    `INSERT INTO household_membership_audit(id,household_id,actor_ref,target_ref,operation,created_at) SELECT ?,?,?,?,?,? WHERE ${permitted}`,
  ).bind(
    p.id,
    p.household,
    adult.adultId,
    target,
    operation,
    p.now,
    p.household,
    p.id,
  );
}
function revokeAdult(c: Ctx, p: Permit, target: string) {
  return [
    c.env.DB.prepare(
      `UPDATE child_grants SET revoked_at=? WHERE revoked_at IS NULL AND parent_session_id IN(SELECT id FROM account_sessions WHERE adult_id=?) AND ${permitted}`,
    ).bind(p.now, target, p.household, p.id),
    c.env.DB.prepare(
      `UPDATE account_sessions SET revoked_at=? WHERE adult_id=? AND revoked_at IS NULL AND ${permitted}`,
    ).bind(p.now, target, p.household, p.id),
  ];
}
householdRoutes.use("/households/*", async (c, next) => {
  const adult = await readAdult(c);
  if (!adult) return c.json(fault("ADULT_REQUIRED", "请先登录家长账号。"), 401);
  if (adult.mustChangePassword)
    return c.json(fault("PASSWORD_CHANGE_REQUIRED", "请先修改临时密码。"), 403);
  c.set("adult", adult);
  if (
    c.req.method !== "GET" &&
    c.env.APP_STAGE !== "local" &&
    !features.householdSharingEnabled
  )
    return c.json(
      fault(
        "HOUSEHOLD_PREPARING",
        "共同陪伴正在准备，请稍后刷新页面。当前家庭的学习记录保留。",
      ),
      503,
    );
  await next();
});
householdRoutes.get("/households/current", async (c) => {
  const adult = c.get("adult");
  // Keep the list and its CAS version in one D1 snapshot.
  const [households, members, invitations, version] = await c.env.DB.batch<
    Record<string, unknown>
  >([
    c.env.DB.prepare(
      "SELECT h.id,h.name,m.role FROM household_members m JOIN households h ON h.id=m.household_id WHERE m.adult_id=? ORDER BY h.name,h.id",
    ).bind(adult.adultId),
    c.env.DB.prepare(
      "SELECT m.adult_id AS id,a.username,m.role,a.disabled_at IS NOT NULL AS disabled,a.must_change_password AS needsPasswordChange FROM household_members m JOIN account_credentials a ON a.adult_id=m.adult_id WHERE m.household_id=? ORDER BY m.role DESC,a.username",
    ).bind(adult.householdId),
    c.env.DB.prepare(
      "SELECT i.id,a.username,i.role,i.created_at AS createdAt,i.expires_at AS expiresAt FROM household_invitations i JOIN account_credentials a ON a.adult_id=i.recipient_id WHERE i.household_id=? AND ?=1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? ORDER BY i.created_at DESC LIMIT 12",
    ).bind(adult.householdId, adult.role === "owner" ? 1 : 0, Date.now()),
    c.env.DB.prepare(
      "SELECT version FROM household_access WHERE household_id=?",
    ).bind(adult.householdId),
  ]);
  return c.json({
    sharingEnabled:
      c.env.APP_STAGE === "local" || features.householdSharingEnabled,
    current: adult.householdId
      ? {
          id: adult.householdId,
          name: adult.householdName,
          role: adult.role,
        }
      : null,
    contextVersion: adult.contextVersion,
    version: Number(version.results[0]?.version ?? 0),
    households: households.results,
    members: members.results.map((m) => ({
      ...m,
      self: m.id === adult.adultId,
      disabled: Boolean(m.disabled),
      needsPasswordChange: Boolean(m.needsPasswordChange),
    })),
    invitations: invitations.results,
  });
});
householdRoutes.post("/households/switch", async (c) => {
  const adult = c.get("adult"),
    b: unknown = await c.req.json();
  if (
    !object(b) ||
    typeof b.householdId !== "string" ||
    b.householdId.length > 100 ||
    !validAccessVersion(b.expectedContextVersion) ||
    !validRequestId(b.requestId)
  )
    return c.json(fault("INVALID_HOUSEHOLD", "请重新选择家庭。"), 422);
  if (
    b.householdId === adult.householdId &&
    b.expectedContextVersion === adult.contextVersion
  )
    return c.json({ saved: true, contextVersion: adult.contextVersion });
  const now = Date.now();
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE account_sessions AS s SET active_household_id=?,context_version=context_version+1,context_command_id=? WHERE s.id=? AND s.adult_id=? AND s.context_version=? AND s.revoked_at IS NULL AND s.expires_at>? AND EXISTS(SELECT 1 FROM household_members m JOIN account_credentials a ON a.adult_id=m.adult_id WHERE m.adult_id=s.adult_id AND m.household_id=? AND a.disabled_at IS NULL AND a.must_change_password=0 AND a.credential_version=?)`,
    ).bind(
      b.householdId,
      b.requestId,
      adult.id,
      adult.adultId,
      b.expectedContextVersion,
      now,
      b.householdId,
      adult.credentialVersion,
    ),
    c.env.DB.prepare(
      "UPDATE child_grants SET revoked_at=? WHERE parent_session_id=? AND revoked_at IS NULL AND changes()=1",
    ).bind(now, adult.id),
  ]);
  if (result[0].meta.changes) {
    deleteCookie(c, "eq_child", { path: "/" });
    return c.json({
      saved: true,
      contextVersion: b.expectedContextVersion + 1,
    });
  }
  const replay = await c.env.DB.prepare(
    "SELECT context_version FROM account_sessions WHERE id=? AND context_command_id=? AND active_household_id=? AND revoked_at IS NULL",
  )
    .bind(adult.id, b.requestId, b.householdId)
    .first<{ context_version: number }>();
  return replay
    ? c.json({
        saved: true,
        replayed: true,
        contextVersion: replay.context_version,
      })
    : stale(c);
});
householdRoutes.post("/households/invitations", async (c) => {
  const adult = c.get("adult");
  if (adult.role !== "owner")
    return c.json(fault("OWNER_REQUIRED", "只有管理家长可以邀请成员。"), 403);
  const b: unknown = await c.req.json();
  if (
    !object(b) ||
    !validUsername(b.username) ||
    !validHouseholdRole(b.role) ||
    !validAccessVersion(b.expectedVersion) ||
    !validRequestId(b.requestId)
  )
    return c.json(
      fault("INVALID_INVITATION", "请填写已有家长账号并选择权限。"),
      422,
    );
  const verified = await verifyAdultPassword(c, adult, b.currentPassword);
  if ("response" in verified) return verified.response;
  const target = await c.env.DB.prepare(
    "SELECT adult_id FROM account_credentials WHERE username=? AND disabled_at IS NULL AND must_change_password=0",
  )
    .bind(b.username)
    .first<{ adult_id: string }>();
  if (!target || target.adult_id === adult.adultId)
    return c.json(
      fault(
        "RECIPIENT_UNAVAILABLE",
        "请使用由管理员创建、已修改临时密码且尚未加入本家庭的另一个家长账号。",
      ),
      422,
    );
  const existing = await c.env.DB.prepare(
    "SELECT id FROM household_invitations WHERE id=? AND household_id=?",
  )
    .bind(b.requestId, adult.householdId)
    .first();
  if (existing)
    return c.json(
      fault(
        "INVITE_ALREADY_CREATED",
        "此邀请已创建。邀请码仅显示一次；未取得时请撤销后重新创建。",
      ),
      409,
    );
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const p = gate(
    c,
    adult,
    verified.credential,
    adult.householdId,
    b.expectedVersion,
    true,
    "NOT EXISTS(SELECT 1 FROM household_members WHERE household_id=? AND adult_id=?) AND (SELECT count(*) FROM household_members WHERE household_id=?)<6 AND (SELECT count(*) FROM household_invitations WHERE household_id=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>?)<6 AND NOT EXISTS(SELECT 1 FROM household_invitations WHERE household_id=? AND recipient_id=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>?)",
    [
      adult.householdId,
      target.adult_id,
      adult.householdId,
      adult.householdId,
      Date.now(),
      adult.householdId,
      target.adult_id,
      Date.now(),
    ],
  );
  const expires = p.now + 24 * 3600000;
  const result = await c.env.DB.batch([
    p.statement,
    c.env.DB.prepare(
      `INSERT INTO household_invitations(id,household_id,recipient_id,invited_by,role,token_hash,created_at,expires_at) SELECT ?,?,?,?,?,?,?,? WHERE ${permitted}`,
    ).bind(
      b.requestId,
      adult.householdId,
      target.adult_id,
      adult.adultId,
      b.role,
      await tokenHash(token),
      p.now,
      expires,
      p.household,
      p.id,
    ),
    auditStatement(c, adult, p, "create_invite", target.adult_id),
  ]);
  return result[0].meta.changes
    ? c.json({ saved: true, id: b.requestId, token, expiresAt: expires }, 201)
    : stale(c);
});
householdRoutes.post("/households/invitations/:id/revoke", async (c) => {
  const adult = c.get("adult"),
    b: unknown = await c.req.json();
  if (adult.role !== "owner")
    return c.json(fault("OWNER_REQUIRED", "只有管理家长可以撤销邀请。"), 403);
  if (!object(b) || !validAccessVersion(b.expectedVersion))
    return c.json(fault("INVALID_INVITATION", "请刷新邀请列表。"), 422);
  const verified = await verifyAdultPassword(c, adult, b.currentPassword);
  if ("response" in verified) return verified.response;
  const p = gate(
    c,
    adult,
    verified.credential,
    adult.householdId,
    b.expectedVersion,
    true,
    "EXISTS(SELECT 1 FROM household_invitations WHERE id=? AND household_id=? AND accepted_at IS NULL AND revoked_at IS NULL)",
    [c.req.param("id"), adult.householdId],
  );
  const result = await c.env.DB.batch([
    p.statement,
    c.env.DB.prepare(
      `UPDATE household_invitations SET revoked_at=? WHERE id=? AND household_id=? AND ${permitted}`,
    ).bind(p.now, c.req.param("id"), adult.householdId, p.household, p.id),
    auditStatement(c, adult, p, "revoke_invite", c.req.param("id")),
  ]);
  return result[0].meta.changes ? c.json({ saved: true }) : stale(c);
});
const invitationSql =
  "SELECT i.*,a.username AS invitedBy,h.name AS householdName,COALESCE(v.version,0) AS version FROM household_invitations i JOIN households h ON h.id=i.household_id LEFT JOIN household_access v ON v.household_id=i.household_id JOIN household_members m ON m.household_id=i.household_id AND m.adult_id=i.invited_by AND m.role='owner' JOIN account_credentials a ON a.adult_id=i.invited_by WHERE i.token_hash=? AND i.recipient_id=? AND i.revoked_at IS NULL AND i.accepted_at IS NULL AND i.expires_at>? AND a.disabled_at IS NULL AND a.must_change_password=0";
const acceptedReplay = (
  c: Ctx,
  digest: string,
  adult: AdultSession,
  requestId: string,
) =>
  c.env.DB.prepare(
    "SELECT i.id FROM household_invitations i JOIN household_members m ON m.household_id=i.household_id AND m.adult_id=i.recipient_id WHERE i.token_hash=? AND i.recipient_id=? AND i.accept_command_id=? AND i.accepted_at IS NOT NULL AND i.revoked_at IS NULL",
  )
    .bind(digest, adult.adultId, requestId)
    .first();
householdRoutes.post("/households/invitations/preview", async (c) => {
  const adult = c.get("adult"),
    b: unknown = await c.req.json();
  if (!object(b) || !validInviteToken(b.token)) return invalidInvite(c);
  const row = await c.env.DB.prepare(invitationSql)
    .bind(await tokenHash(b.token), adult.adultId, Date.now())
    .first<{
      id: string;
      household_id: string;
      householdName: string;
      invitedBy: string;
      role: string;
      expires_at: number;
      version: number;
    }>();
  return row
    ? c.json({
        id: row.id,
        householdId: row.household_id,
        householdName: row.householdName,
        invitedBy: row.invitedBy,
        role: row.role,
        expiresAt: row.expires_at,
        version: row.version,
      })
    : invalidInvite(c);
});
householdRoutes.post("/households/invitations/accept", async (c) => {
  const adult = c.get("adult"),
    b: unknown = await c.req.json();
  if (
    !object(b) ||
    !validInviteToken(b.token) ||
    !validAccessVersion(b.expectedVersion) ||
    !validRequestId(b.requestId)
  )
    return invalidInvite(c);
  const verified = await verifyAdultPassword(c, adult, b.currentPassword);
  if ("response" in verified) return verified.response;
  const digest = await tokenHash(b.token);
  const row = await c.env.DB.prepare(invitationSql)
    .bind(digest, adult.adultId, Date.now())
    .first<{ id: string; household_id: string; role: string }>();
  if (!row) {
    const replay = await acceptedReplay(c, digest, adult, b.requestId);
    return replay ? c.json({ saved: true, replayed: true }) : invalidInvite(c);
  }
  const p = gate(
    c,
    adult,
    verified.credential,
    row.household_id,
    b.expectedVersion,
    false,
    "EXISTS(SELECT 1 FROM household_invitations i JOIN household_members m ON m.household_id=i.household_id AND m.adult_id=i.invited_by AND m.role='owner' JOIN account_credentials a ON a.adult_id=i.invited_by WHERE i.id=? AND i.token_hash=? AND i.recipient_id=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? AND a.disabled_at IS NULL AND a.must_change_password=0) AND NOT EXISTS(SELECT 1 FROM household_members WHERE household_id=? AND adult_id=?) AND (SELECT count(*) FROM household_members WHERE household_id=?)<6 AND (SELECT count(*) FROM household_members WHERE adult_id=?)<6",
    [
      row.id,
      digest,
      adult.adultId,
      Date.now(),
      row.household_id,
      adult.adultId,
      row.household_id,
      adult.adultId,
    ],
  );
  const result = await c.env.DB.batch([
    p.statement,
    c.env.DB.prepare(
      `INSERT INTO household_members(household_id,adult_id,role) SELECT ?,?,? WHERE ${permitted}`,
    ).bind(row.household_id, adult.adultId, row.role, p.household, p.id),
    c.env.DB.prepare(
      `UPDATE household_invitations SET accepted_at=?,accept_command_id=? WHERE id=? AND ${permitted}`,
    ).bind(p.now, b.requestId, row.id, p.household, p.id),
    auditStatement(c, adult, p, "accept_invite", row.id),
  ]);
  if (result[0].meta.changes) return c.json({ saved: true });
  return (await acceptedReplay(c, digest, adult, b.requestId))
    ? c.json({ saved: true, replayed: true })
    : stale(c);
});
householdRoutes.post("/households/members/:id", async (c) => {
  const adult = c.get("adult"),
    target = c.req.param("id"),
    b: unknown = await c.req.json();
  if (
    !object(b) ||
    !["change_role", "remove_member", "leave"].includes(String(b.operation)) ||
    !validAccessVersion(b.expectedVersion) ||
    (b.operation === "change_role" && !validHouseholdRole(b.role))
  )
    return c.json(
      fault("INVALID_MEMBER_ACTION", "请重新选择成员和操作。"),
      422,
    );
  if (
    b.operation === "leave" ? target !== adult.adultId : adult.role !== "owner"
  )
    return c.json(
      fault("OWNER_REQUIRED", "只有管理家长可以修改其他成员权限。"),
      403,
    );
  if (protectedMembership(adult.householdId, target))
    return c.json(
      fault("PROTECTED_ADMIN", "默认管理员在初始家庭的管理权限需要保留。"),
      403,
    );
  const verified = await verifyAdultPassword(c, adult, b.currentPassword);
  if ("response" in verified) return verified.response;
  const removing = b.operation !== "change_role";
  const p = gate(
    c,
    adult,
    verified.credential,
    adult.householdId,
    b.expectedVersion,
    b.operation !== "leave",
    `EXISTS(SELECT 1 FROM household_members t WHERE t.household_id=? AND t.adult_id=? AND (t.role<>'owner' OR ?='owner' OR EXISTS(SELECT 1 FROM household_members keep JOIN account_credentials a ON a.adult_id=keep.adult_id WHERE keep.household_id=? AND keep.role='owner' AND keep.adult_id<>? AND a.disabled_at IS NULL AND a.must_change_password=0)))`,
    [
      adult.householdId,
      target,
      removing ? "remove" : String(b.role),
      adult.householdId,
      target,
    ],
  );
  const mutation = removing
    ? c.env.DB.prepare(
        `DELETE FROM household_members WHERE household_id=? AND adult_id=? AND ${permitted}`,
      ).bind(adult.householdId, target, p.household, p.id)
    : c.env.DB.prepare(
        `UPDATE household_members SET role=? WHERE household_id=? AND adult_id=? AND ${permitted}`,
      ).bind(b.role, adult.householdId, target, p.household, p.id);
  const result = await c.env.DB.batch([
    p.statement,
    mutation,
    c.env.DB.prepare(
      `UPDATE household_invitations SET revoked_at=? WHERE household_id=? AND invited_by=? AND accepted_at IS NULL AND revoked_at IS NULL AND ${permitted}`,
    ).bind(p.now, adult.householdId, target, p.household, p.id),
    ...revokeAdult(c, p, target),
    auditStatement(c, adult, p, String(b.operation), target),
  ]);
  if (!result[0].meta.changes) return stale(c);
  if (target === adult.adultId) {
    deleteCookie(c, "eq_account", { path: "/" });
    deleteCookie(c, "eq_child", { path: "/" });
  }
  return c.json({ saved: true, signedOut: target === adult.adultId });
});
