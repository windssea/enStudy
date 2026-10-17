import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

interface AuthEnv {
  DB: D1Database;
}
type AuthContext = Context<{ Bindings: AuthEnv }>;
export const authRoutes = new Hono<{ Bindings: AuthEnv }>();
const fault = (code: string, message: string) => ({ error: { code, message } });
const hours = 7 * 24 * 3600;
export const tokenHash = async (token: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
export async function passwordHash(
  password: string,
  salt: string,
  iterations = 100000,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function equalHash(a: string, b: string) {
  let different = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    different |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return different === 0;
}
export interface AdultSession {
  id: string;
  adultId: string;
  username: string;
  householdId: string;
}
export async function readAdult<E extends { Bindings: AuthEnv }>(
  c: Context<E>,
): Promise<AdultSession | null> {
  const token = getCookie(c, "eq_account");
  if (!token || token.length > 160) return null;
  return c.env.DB.prepare(
    `SELECT s.id,s.adult_id AS adultId,a.username,m.household_id AS householdId FROM account_sessions s JOIN account_credentials a ON a.adult_id=s.adult_id JOIN household_members m ON m.adult_id=s.adult_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? ORDER BY m.household_id LIMIT 1`,
  )
    .bind(await tokenHash(token), Date.now())
    .first<AdultSession>();
}
export async function readAccountActor<E extends { Bindings: AuthEnv }>(
  c: Context<E>,
) {
  const token = getCookie(c, "eq_child");
  if (!token || token.length > 160) return null;
  return c.env.DB.prepare(
    `SELECT g.id AS grantId,g.child_id AS childId,g.household_id AS householdId,ch.nickname,ch.grade,ch.timezone FROM child_grants g JOIN children ch ON ch.id=g.child_id AND ch.household_id=g.household_id JOIN account_sessions s ON s.id=g.parent_session_id JOIN household_members m ON m.adult_id=s.adult_id AND m.household_id=g.household_id WHERE g.token_hash=? AND g.revoked_at IS NULL AND g.expires_at>? AND s.revoked_at IS NULL AND s.expires_at>?`,
  )
    .bind(await tokenHash(token), Date.now(), Date.now())
    .first<{
      grantId: string;
      childId: string;
      householdId: string;
      nickname: string;
      grade: number;
      timezone: string;
    }>();
}
const cookie = (c: AuthContext, name: string, token: string) =>
  setCookie(c, name, token, {
    httpOnly: true,
    sameSite: "Strict",
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge: hours,
  });
async function selectChild(
  c: AuthContext,
  adult: AdultSession,
  childId: string,
) {
  const child = await c.env.DB.prepare(
    "SELECT id FROM children WHERE id=? AND household_id=?",
  )
    .bind(childId, adult.householdId)
    .first();
  if (!child) return false;
  const token = crypto.randomUUID() + crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE child_grants SET revoked_at=? WHERE parent_session_id=? AND revoked_at IS NULL",
    ).bind(Date.now(), adult.id),
    c.env.DB.prepare(
      "INSERT INTO child_grants(id,household_id,child_id,token_hash,created_by,expires_at,parent_session_id) VALUES(?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      adult.householdId,
      childId,
      await tokenHash(token),
      adult.adultId,
      Date.now() + hours * 1000,
      adult.id,
    ),
  ]);
  cookie(c, "eq_child", token);
  return true;
}
export async function logoutAccount<E extends { Bindings: AuthEnv }>(
  c: Context<E>,
) {
  const token = getCookie(c, "eq_account");
  if (token)
    await c.env.DB.prepare(
      "UPDATE account_sessions SET revoked_at=? WHERE token_hash=?",
    )
      .bind(Date.now(), await tokenHash(token))
      .run();
  deleteCookie(c, "eq_account", { path: "/" });
  deleteCookie(c, "eq_child", { path: "/" });
}
authRoutes.post("/auth/register", (c) =>
  c.json(
    fault("REGISTRATION_CLOSED", "暂不开放注册，请使用管理员提供的账号。"),
    403,
  ),
);
authRoutes.post("/auth/login", async (c) => {
  const body = await c.req.json();
  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    body.username.length > 80 ||
    body.password.length > 256
  )
    return c.json(fault("INVALID_LOGIN", "请填写账号和密码。"), 422);
  const username = body.username.trim().toLowerCase();
  // The edge supplies CF-Connecting-IP; never accept a client-supplied forwarding chain.
  const key = await tokenHash(
    `login:${c.req.header("CF-Connecting-IP") ?? "local"}`,
  );
  const now = Date.now(),
    windowStart = Math.floor(now / 300000) * 300000;
  const quota = await c.env.DB.prepare(
    `INSERT INTO login_limits(bucket,window_start,attempts) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempts`,
  )
    .bind(key, windowStart)
    .first<{ attempts: number }>();
  if (!quota || quota.attempts > 15) {
    c.header(
      "Retry-After",
      String(Math.ceil((windowStart + 300000 - now) / 1000)),
    );
    return c.json(fault("LOGIN_LIMIT", "尝试次数有些多，请稍后再试。"), 429);
  }
  const credentials = await c.env.DB.prepare(
    "SELECT adult_id,salt,password_hash,iterations FROM account_credentials WHERE username=?",
  )
    .bind(username)
    .first<{
      adult_id: string;
      salt: string;
      password_hash: string;
      iterations: number;
    }>();
  const calculated = await passwordHash(
    body.password,
    credentials?.salt ?? "unrecognised-account-padding",
    credentials?.iterations ?? 100000,
  );
  if (!credentials || !equalHash(calculated, credentials.password_hash))
    return c.json(
      fault("LOGIN_FAILED", "账号或密码不正确，再检查一下吧。"),
      401,
    );
  await logoutAccount(c);
  const token = crypto.randomUUID() + crypto.randomUUID(),
    id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO account_sessions(id,adult_id,token_hash,created_at,expires_at) VALUES(?,?,?,?,?)",
  )
    .bind(
      id,
      credentials.adult_id,
      await tokenHash(token),
      now,
      now + hours * 1000,
    )
    .run();
  cookie(c, "eq_account", token);
  // Read the membership from the verified adult instead of trusting a household ID from the client.
  const membership = await c.env.DB.prepare(
    "SELECT household_id FROM household_members WHERE adult_id=? ORDER BY household_id LIMIT 1",
  )
    .bind(credentials.adult_id)
    .first<{ household_id: string }>();
  if (membership) {
    const child = await c.env.DB.prepare(
      "SELECT id FROM children WHERE household_id=? ORDER BY created_at,id LIMIT 1",
    )
      .bind(membership.household_id)
      .first<{ id: string }>();
    if (child)
      await selectChild(
        c,
        {
          id,
          adultId: credentials.adult_id,
          householdId: membership.household_id,
          username,
        },
        child.id,
      );
  }
  await c.env.DB.prepare("DELETE FROM login_limits WHERE window_start<?")
    .bind(now - 86400000)
    .run();
  return c.json({ saved: true });
});
authRoutes.use("/children", async (c, next) => {
  if (!(await readAdult(c)))
    return c.json(fault("ADULT_REQUIRED", "请先登录家长账号。"), 401);
  await next();
});
authRoutes.use("/children/*", async (c, next) => {
  if (!(await readAdult(c)))
    return c.json(fault("ADULT_REQUIRED", "请先登录家长账号。"), 401);
  await next();
});
authRoutes.get("/children", async (c) => {
  const adult = (await readAdult(c))!;
  const rows = await c.env.DB.prepare(
    "SELECT id,nickname,grade FROM children WHERE household_id=? ORDER BY created_at,id",
  )
    .bind(adult.householdId)
    .all();
  return c.json({ items: rows.results });
});
function validProfile(
  body: unknown,
): body is { nickname: string; grade: number } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.nickname === "string" &&
    b.nickname.trim().length >= 1 &&
    b.nickname.trim().length <= 24 &&
    !/[\u0000-\u001f<>]/.test(b.nickname) &&
    typeof b.grade === "number" &&
    Number.isInteger(b.grade) &&
    b.grade >= 1 &&
    b.grade <= 6
  );
}
authRoutes.post("/children", async (c) => {
  const adult = (await readAdult(c))!,
    body = await c.req.json();
  if (!validProfile(body))
    return c.json(
      fault("INVALID_CHILD", "昵称需为1～24个字，年级为一至六年级。"),
      422,
    );
  const child = await c.env.DB.prepare(
    `INSERT INTO children(id,household_id,nickname,grade,created_at) SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM children WHERE household_id=?)<12 RETURNING id,nickname,grade`,
  )
    .bind(
      crypto.randomUUID(),
      adult.householdId,
      body.nickname.trim(),
      body.grade,
      Date.now(),
      adult.householdId,
    )
    .first();
  return child
    ? c.json(child, 201)
    : c.json(fault("CHILD_LIMIT", "一个家庭最多可保存12个儿童档案。"), 409);
});
authRoutes.post("/children/:id", async (c) => {
  const adult = (await readAdult(c))!,
    body = await c.req.json();
  if (!validProfile(body))
    return c.json(fault("INVALID_CHILD", "请填写有效昵称与年级。"), 422);
  const row = await c.env.DB.prepare(
    "UPDATE children SET nickname=?,grade=? WHERE id=? AND household_id=? RETURNING id,nickname,grade",
  )
    .bind(
      body.nickname.trim(),
      body.grade,
      c.req.param("id"),
      adult.householdId,
    )
    .first();
  return row
    ? c.json(row)
    : c.json(fault("NOT_FOUND", "找不到这个档案。"), 404);
});
authRoutes.post("/children/:id/select", async (c) => {
  const adult = (await readAdult(c))!;
  return (await selectChild(c, adult, c.req.param("id")))
    ? c.json({ saved: true })
    : c.json(fault("NOT_FOUND", "找不到这个档案。"), 404);
});
authRoutes.post("/children/:id/remove", async (c) => {
  const adult = (await readAdult(c))!;
  const result = await c.env.DB.prepare(
    "DELETE FROM children WHERE id=? AND household_id=? AND (SELECT count(*) FROM children WHERE household_id=?)>1 RETURNING id",
  )
    .bind(c.req.param("id"), adult.householdId, adult.householdId)
    .first();
  return result
    ? c.json({ saved: true })
    : c.json(
        fault(
          "CHILD_NOT_REMOVABLE",
          "请保留至少一位探险家，并确认档案属于当前家庭。",
        ),
        409,
      );
});
