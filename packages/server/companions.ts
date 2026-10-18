import { Hono } from "hono";
import type { Actor, Env } from "./app";
import {
  companionCommand,
  companionInfo,
  type CompanionChoice,
} from "../domain/companions";
type Bindings = { Bindings: Env; Variables: { actor: Actor } };
export const companionRoutes = new Hono<Bindings>();
export async function readCompanion(
  db: D1Database,
  actor: Pick<Actor, "childId" | "householdId">,
): Promise<CompanionChoice> {
  const row = await db
    .prepare(
      "SELECT companion_id,version FROM child_companions WHERE household_id=? AND child_id=?",
    )
    .bind(actor.householdId, actor.childId)
    .first<{ companion_id: string; version: number }>();
  return {
    childId: actor.childId,
    companionId: companionInfo(row?.companion_id).id,
    version: row?.version ?? 0,
  };
}
const authority =
  "EXISTS(SELECT 1 FROM child_grants g LEFT JOIN account_sessions p ON p.id=g.parent_session_id WHERE g.id=? AND g.household_id=? AND g.child_id=? AND g.revoked_at IS NULL AND g.expires_at>? AND(g.parent_session_id IS NULL OR(p.revoked_at IS NULL AND p.expires_at>?)))";
const authArgs = (actor: Actor, now: number) => [
  actor.grantId,
  actor.householdId,
  actor.childId,
  now,
  now,
];
const fault = (code: string, message: string) => ({ error: { code, message } });
companionRoutes.get("/learning/companion", async (c) =>
  c.json(await readCompanion(c.env.DB, c.get("actor"))),
);
companionRoutes.post("/learning/companion", async (c) => {
  const body = companionCommand(await c.req.json());
  if (!body)
    return c.json(fault("INVALID_COMPANION", "请选择一个伙伴，再保存。"), 422);
  const actor = c.get("actor"),
    now = Date.now();
  if (body.childId !== actor.childId)
    return c.json(
      fault("IDENTITY_CHANGED", "探险档案已变化，请重新打开伙伴选择。"),
      409,
    );
  const current = () =>
    c.env.DB.prepare(
      `SELECT companion_id,version,command_id FROM child_companions WHERE household_id=? AND child_id=? AND ${authority}`,
    )
      .bind(actor.householdId, actor.childId, ...authArgs(actor, Date.now()))
      .first<{ companion_id: string; version: number; command_id: string }>();
  const before = await current();
  if (before?.command_id === body.requestId) {
    if (
      before.companion_id !== body.companionId ||
      before.version !== body.expectedVersion + 1
    )
      return c.json(
        fault("COMMAND_CHANGED", "这次保存的信息有变化，请重新选择。"),
        409,
      );
    return c.json({
      childId: actor.childId,
      companionId: before.companion_id,
      version: before.version,
      replayed: true,
    });
  }
  await c.env.DB.prepare(
    `INSERT INTO child_companions(child_id,household_id,companion_id,version,command_id,updated_at)
     SELECT ?,?,?,?,?,? WHERE ${authority} AND (?=0 OR EXISTS(SELECT 1 FROM child_companions WHERE child_id=? AND household_id=? AND version=?))
     ON CONFLICT(child_id) DO UPDATE SET companion_id=excluded.companion_id,version=excluded.version,command_id=excluded.command_id,updated_at=excluded.updated_at
     WHERE child_companions.household_id=excluded.household_id AND child_companions.version=? AND ${authority}`,
  )
    .bind(
      actor.childId,
      actor.householdId,
      body.companionId,
      body.expectedVersion + 1,
      body.requestId,
      now,
      ...authArgs(actor, now),
      body.expectedVersion,
      actor.childId,
      actor.householdId,
      body.expectedVersion,
      body.expectedVersion,
      ...authArgs(actor, now),
    )
    .run();
  const after = await current();
  if (
    after?.command_id === body.requestId &&
    after.companion_id === body.companionId &&
    after.version === body.expectedVersion + 1
  )
    return c.json({
      childId: actor.childId,
      companionId: after.companion_id,
      version: after.version,
    });
  return c.json(
    fault("COMPANION_CHANGED", "伙伴选择已变化，请读取最新选择后再试。"),
    409,
  );
});
