import type { Context } from "hono";
import {
  equalHash,
  passwordHash,
  tokenHash,
  type AdultSession,
  type AuthEnv,
} from "./auth";
const fault = (code: string, message: string) => ({ error: { code, message } });
export interface Credential {
  password_hash: string;
  salt: string;
  iterations: number;
  credential_version: number;
}
export async function verifyAdultPassword<E extends { Bindings: AuthEnv }>(
  c: Context<E>,
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
