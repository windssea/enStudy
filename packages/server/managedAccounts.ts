import { Hono, type Context } from "hono";
import { deleteCookie } from "hono/cookie";
import {
  equalHash,
  passwordHash,
  readAdult,
  tokenHash,
  type AdultSession,
  type AuthEnv,
} from "./auth";

type Bindings = { Bindings: AuthEnv; Variables: { adult: AdultSession } };
type Ctx = Context<Bindings>;
const fault = (code: string, message: string) => ({ error: { code, message } });
export const managedAccountRoutes = new Hono<Bindings>();
export const validUsername = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z][a-z0-9_.-]{2,39}$/.test(value);
export const validPassword = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length >= 12 &&
  value.length <= 128 &&
  value.trim().length > 0 &&
  !/[\u0000-\u001f\u007f]/.test(value);
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

interface Credential {
  password_hash: string;
  salt: string;
  iterations: number;
  credential_version: number;
}
async function verify(
  c: Ctx,
  adult: AdultSession,
  value: unknown,
): Promise<{ credential: Credential } | { response: Response }> {
  if (typeof value !== "string" || !value.length || value.length > 256)
    return {
      response: c.json(
        fault("PASSWORD_REQUIRED", "请填写当前登录账号的密码。"),
        422,
      ),
    };
  const now = Date.now(),
    start = Math.floor(now / 300000) * 300000;
  const bucket = await tokenHash(
    `reauth:${adult.adultId}:${c.req.header("CF-Connecting-IP") ?? "local"}`,
  );
  const quota = await c.env.DB.prepare(
    "INSERT INTO login_limits(bucket,window_start,attempts) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempts",
  )
    .bind(bucket, start)
    .first<{ attempts: number }>();
  if (!quota || quota.attempts > 15) {
    c.header("Retry-After", String(Math.ceil((start + 300000 - now) / 1000)));
    return {
      response: c.json(
        fault("REAUTH_LIMIT", "验证次数较多，请稍后再试。"),
        429,
      ),
    };
  }
  const credential = await c.env.DB.prepare(
    "SELECT password_hash,salt,iterations,credential_version FROM account_credentials WHERE adult_id=? AND disabled_at IS NULL",
  )
    .bind(adult.adultId)
    .first<Credential>();
  const computed = await passwordHash(
    value,
    credential?.salt ?? "inactive-account-padding",
    credential?.iterations ?? 100000,
  );
  if (!credential || !equalHash(computed, credential.password_hash))
    return {
      response: c.json(
        fault("REAUTH_FAILED", "当前密码不正确，请重新确认。"),
        401,
      ),
    };
  return { credential };
}

// The audit insert is also a transaction-local authorization gate. Every following
// write requires this random ID; revocation or a concurrent password reset makes
// the whole operation a no-op, rather than leaving orphan households/credentials.
function gate(
  c: Ctx,
  adult: AdultSession,
  credential: Credential,
  operation: string,
  targetId: string,
  version?: number,
) {
  const id = crypto.randomUUID(),
    now = Date.now();
  const administrator = operation !== "change_password";
  const target =
    version === undefined
      ? ""
      : " AND EXISTS(SELECT 1 FROM account_credentials t WHERE t.adult_id=? AND t.credential_version=? AND NOT EXISTS(SELECT 1 FROM site_admins sa WHERE sa.adult_id=t.adult_id))";
  const statement = c.env.DB.prepare(
    `INSERT INTO account_audit(id,actor_id,target_id,operation,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM account_sessions s JOIN account_credentials a ON a.adult_id=s.adult_id WHERE s.id=? AND s.adult_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.disabled_at IS NULL AND a.password_hash=? AND a.credential_version=? ${administrator ? "AND a.must_change_password=0 AND EXISTS(SELECT 1 FROM site_admins sa WHERE sa.adult_id=a.adult_id)" : ""})${target}`,
  ).bind(
    id,
    adult.adultId,
    targetId,
    operation,
    now,
    adult.id,
    adult.adultId,
    now,
    credential.password_hash,
    credential.credential_version,
    ...(version === undefined ? [] : [targetId, version]),
  );
  return { id, statement, now };
}
const allowed = "EXISTS(SELECT 1 FROM account_audit WHERE id=?)";
function revoke(c: Ctx, target: string, gateId: string, now: number) {
  return [
    c.env.DB.prepare(
      `UPDATE account_sessions SET revoked_at=? WHERE adult_id=? AND revoked_at IS NULL AND ${allowed}`,
    ).bind(now, target, gateId),
    c.env.DB.prepare(
      `UPDATE child_grants SET revoked_at=? WHERE parent_session_id IN(SELECT id FROM account_sessions WHERE adult_id=?) AND revoked_at IS NULL AND ${allowed}`,
    ).bind(now, target, gateId),
  ];
}
const stale = (c: Ctx) =>
  c.json(
    fault("ACCOUNT_CHANGED", "账号状态已变化，请重新登录或刷新列表后再操作。"),
    409,
  );

managedAccountRoutes.use("/admin/*", async (c, next) => {
  const adult = await readAdult(c);
  if (!adult) return c.json(fault("ADULT_REQUIRED", "请先登录家长账号。"), 401);
  if (!adult.isAdmin || adult.mustChangePassword)
    return c.json(
      fault("ADMIN_REQUIRED", "只有站点管理员可以管理家庭账号。"),
      403,
    );
  c.set("adult", adult);
  await next();
});

managedAccountRoutes.get("/admin/accounts", async (c) => {
  const cursor = c.req.query("cursor");
  let time = -1,
    after = "";
  if (cursor) {
    const parts = cursor.split(":");
    time = Number(parts[0]);
    after = parts[1];
    if (
      parts.length !== 2 ||
      !Number.isSafeInteger(time) ||
      time < 0 ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(after ?? "")
    )
      return c.json(fault("INVALID_CURSOR", "列表页码无效，请刷新列表。"), 422);
  }
  const rows = await c.env.DB.prepare(
    `SELECT a.adult_id AS id,a.username,a.disabled_at IS NOT NULL AS disabled,a.must_change_password AS mustChangePassword,a.credential_version AS version,ad.created_at AS createdAt,EXISTS(SELECT 1 FROM site_admins sa WHERE sa.adult_id=a.adult_id) AS isAdmin,COALESCE((SELECT h.name FROM household_members m JOIN households h ON h.id=m.household_id WHERE m.adult_id=a.adult_id ORDER BY h.id LIMIT 1),'') AS householdName,(SELECT count(*) FROM children ch JOIN household_members m ON m.household_id=ch.household_id WHERE m.adult_id=a.adult_id) AS childCount FROM account_credentials a JOIN adults ad ON ad.id=a.adult_id WHERE ad.created_at>? OR(ad.created_at=? AND ad.id>?) ORDER BY ad.created_at,ad.id LIMIT 51`,
  )
    .bind(time, time, after)
    .all();
  const page = rows.results.slice(0, 50),
    last = page.at(-1);
  return c.json({
    items: page.map((row) => ({
      ...row,
      disabled: Boolean(row.disabled),
      mustChangePassword: Boolean(row.mustChangePassword),
      isAdmin: Boolean(row.isAdmin),
    })),
    cursor:
      rows.results.length > 50 && last ? `${last.createdAt}:${last.id}` : null,
  });
});

managedAccountRoutes.post("/admin/accounts", async (c) => {
  const body: unknown = await c.req.json();
  if (!object(body))
    return c.json(fault("INVALID_ACCOUNT", "请填写家庭账号信息。"), 422);
  const username =
    typeof body.username === "string"
      ? body.username.trim().toLowerCase()
      : body.username;
  if (
    !validUsername(username) ||
    !validPassword(body.temporaryPassword) ||
    typeof body.householdName !== "string" ||
    !body.householdName.trim() ||
    body.householdName.trim().length > 40 ||
    /[\u0000-\u001f<>]/.test(body.householdName)
  )
    return c.json(
      fault(
        "INVALID_ACCOUNT",
        "账号需为3～40位英文小写字母、数字或._-，以字母开头；密码12～128位，家庭名称1～40字。",
      ),
      422,
    );
  const adult = c.get("adult"),
    verified = await verify(c, adult, body.currentPassword);
  if ("response" in verified) return verified.response;
  const target = crypto.randomUUID(),
    household = crypto.randomUUID(),
    salt = crypto.randomUUID();
  const hash = await passwordHash(body.temporaryPassword, salt);
  const permit = gate(c, adult, verified.credential, "create", target);
  try {
    const result = await c.env.DB.batch([
      permit.statement,
      c.env.DB.prepare(
        `INSERT INTO adults(id,auth_subject,created_at) SELECT ?,?,? WHERE ${allowed}`,
      ).bind(target, `managed:${target}`, permit.now, permit.id),
      c.env.DB.prepare(
        `INSERT INTO households(id,name,created_at) SELECT ?,?,? WHERE ${allowed}`,
      ).bind(household, body.householdName.trim(), permit.now, permit.id),
      c.env.DB.prepare(
        `INSERT INTO household_members(household_id,adult_id,role) SELECT ?,?,'owner' WHERE ${allowed}`,
      ).bind(household, target, permit.id),
      c.env.DB.prepare(
        `INSERT INTO account_credentials(adult_id,username,password_hash,salt,iterations,must_change_password) SELECT ?,?,?,?,100000,1 WHERE ${allowed}`,
      ).bind(target, username, hash, salt, permit.id),
    ]);
    if (!result[0].meta.changes) return stale(c);
    return c.json({ id: target, username, saved: true }, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      /UNIQUE constraint failed: account_credentials.username/.test(
        error.message,
      )
    )
      return c.json(
        fault("USERNAME_TAKEN", "这个账号已存在，请换一个账号名。"),
        409,
      );
    throw error;
  }
});

managedAccountRoutes.post("/admin/accounts/:id", async (c) => {
  const body: unknown = await c.req.json();
  if (
    !object(body) ||
    typeof body.operation !== "string" ||
    !["disable", "enable", "reset_password"].includes(body.operation) ||
    !Number.isSafeInteger(body.version) ||
    Number(body.version) < 0 ||
    (body.operation === "reset_password" &&
      !validPassword(body.temporaryPassword))
  )
    return c.json(
      fault("INVALID_ACCOUNT_ACTION", "请选择有效操作；重设密码需12～128位。"),
      422,
    );
  const adult = c.get("adult"),
    target = c.req.param("id");
  const protectedAccount = await c.env.DB.prepare(
    "SELECT adult_id FROM site_admins WHERE adult_id=?",
  )
    .bind(target)
    .first();
  if (protectedAccount)
    return c.json(
      fault(
        "PROTECTED_ADMIN",
        "管理员账号不能在此停用或重设，请使用本人修改密码。",
      ),
      403,
    );
  const verified = await verify(c, adult, body.currentPassword);
  if ("response" in verified) return verified.response;
  const operation = String(body.operation),
    permit = gate(
      c,
      adult,
      verified.credential,
      operation,
      target,
      Number(body.version),
    );
  const salt = crypto.randomUUID();
  const update =
    operation === "reset_password"
      ? c.env.DB.prepare(
          `UPDATE account_credentials SET password_hash=?,salt=?,iterations=100000,must_change_password=1,credential_version=credential_version+1 WHERE adult_id=? AND ${allowed}`,
        ).bind(
          await passwordHash(body.temporaryPassword as string, salt),
          salt,
          target,
          permit.id,
        )
      : c.env.DB.prepare(
          `UPDATE account_credentials SET disabled_at=?,credential_version=credential_version+1 WHERE adult_id=? AND ${allowed}`,
        ).bind(operation === "disable" ? permit.now : null, target, permit.id);
  const result = await c.env.DB.batch([
    permit.statement,
    update,
    ...revoke(c, target, permit.id, permit.now),
  ]);
  return result[0].meta.changes ? c.json({ saved: true }) : stale(c);
});

managedAccountRoutes.post("/auth/password", async (c) => {
  const adult = await readAdult(c);
  if (!adult) return c.json(fault("ADULT_REQUIRED", "请先登录家长账号。"), 401);
  const body: unknown = await c.req.json();
  if (
    !object(body) ||
    !validPassword(body.newPassword) ||
    body.newPassword === body.currentPassword
  )
    return c.json(
      fault("INVALID_PASSWORD", "新密码需12～128位，且与当前密码不同。"),
      422,
    );
  const verified = await verify(c, adult, body.currentPassword);
  if ("response" in verified) return verified.response;
  const salt = crypto.randomUUID(),
    hash = await passwordHash(body.newPassword, salt);
  const permit = gate(
    c,
    adult,
    verified.credential,
    "change_password",
    adult.adultId,
  );
  const result = await c.env.DB.batch([
    permit.statement,
    c.env.DB.prepare(
      `UPDATE account_credentials SET password_hash=?,salt=?,iterations=100000,must_change_password=0,credential_version=credential_version+1 WHERE adult_id=? AND ${allowed}`,
    ).bind(hash, salt, adult.adultId, permit.id),
    ...revoke(c, adult.adultId, permit.id, permit.now),
  ]);
  if (!result[0].meta.changes) return stale(c);
  deleteCookie(c, "eq_account", { path: "/" });
  deleteCookie(c, "eq_child", { path: "/" });
  deleteCookie(c, "eq_dev_session", { path: "/" });
  return c.json({ saved: true, relogin: true });
});
