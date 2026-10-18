import { Hono } from "hono";
import type { Actor, Env } from "./app";
import { phonicsRelease } from "./exercises";
import { exposureStatements } from "./exposure";
import { sessionHouseholdSql } from "./auth";
import { sentenceKey } from "../domain/exposure";
import { hashedExposureKeys } from "./exposure";
import { localDay } from "../domain/review";
type Bindings = { Bindings: Env; Variables: { actor: Actor } };
export const phonicsRoutes = new Hono<Bindings>();
const authority = `EXISTS(SELECT 1 FROM child_grants g WHERE g.id=? AND g.household_id=? AND g.child_id=? AND g.revoked_at IS NULL AND g.expires_at>? AND (g.parent_session_id IS NULL OR EXISTS(SELECT 1 FROM account_sessions s JOIN account_credentials a ON a.adult_id=s.adult_id JOIN household_members m ON m.adult_id=s.adult_id AND m.household_id=g.household_id WHERE s.id=g.parent_session_id AND s.revoked_at IS NULL AND s.expires_at>? AND a.disabled_at IS NULL AND a.must_change_password=0 AND g.household_id=${sessionHouseholdSql})))`;
const auth = (a: Actor, now: number) => [
  a.grantId,
  a.householdId,
  a.childId,
  now,
  now,
];
phonicsRoutes.get("/learning/phonics", async (c) => {
  const a = c.get("actor");
  const rows = await c.env.DB.prepare(
    "SELECT s.source_ref,COUNT(*) AS rounds,SUM(r.total) AS answers,SUM(r.independent) AS independent FROM session_results r JOIN learning_sessions s ON s.id=r.session_id WHERE r.household_id=? AND r.child_id=? AND s.source='phonics' GROUP BY s.source_ref",
  )
    .bind(a.householdId, a.childId)
    .all<{
      source_ref: string;
      rounds: number;
      answers: number;
      independent: number;
    }>();
  return c.json({
    stages: phonicsRelease.stages.map((s) => {
      const r = rows.results.filter(
        (r) => r.source_ref?.split(":")[1] === s.id,
      );
      return {
        ...s,
        progress: {
          rounds: r.reduce((n, x) => n + x.rounds, 0),
          answers: r.reduce((n, x) => n + x.answers, 0),
          independent: r.reduce((n, x) => n + x.independent, 0),
        },
      };
    }),
  });
});
phonicsRoutes.post("/learning/phonics/:stageId/view", async (c) => {
  const b = await c.req.json().catch(() => null),
    stage = phonicsRelease.stages.find((s) => s.id === c.req.param("stageId")),
    word = stage?.demos.find((w) => w.id === b?.wordId);
  if (!stage || !word)
    return c.json(
      {
        error: {
          code: "PHONICS_CASE_NOT_FOUND",
          message: "请从本组示范词中选择一个。",
        },
      },
      404,
    );
  const shown = stage.rule + " " + stage.focus;
  const names = new Set([
    ...phonicsRelease.stages.flatMap((s) => s.demos.map((w) => w.word)),
    ...phonicsRelease.items.map((i) => i.phonicsWordId!).filter(Boolean),
  ]);
  const keys = [
    sentenceKey(word.word),
    ...[...names]
      .filter((w) => new RegExp("\\b" + w + "\\b", "i").test(shown))
      .map(sentenceKey),
  ];
  const actor = c.get("actor"),
    now = Date.now();
  await c.env.DB.batch(
    await exposureStatements(c.env.DB, actor, keys, now, {
      sql: authority,
      params: auth(actor, now),
    }),
  );
  const [key] = await hashedExposureKeys(keys);
  const saved = await c.env.DB.prepare(
    `SELECT 1 FROM teaching_exposures e WHERE e.household_id=? AND e.child_id=? AND e.evidence_key=? AND e.shown_day=? AND ${authority}`,
  )
    .bind(
      actor.householdId,
      actor.childId,
      key,
      localDay(Date.now(), actor.timezone),
      ...auth(actor, Date.now()),
    )
    .first();
  if (!saved)
    return c.json(
      {
        error: {
          code: "IDENTITY_CHANGED",
          message: "示范还没有确认记录，请重新核对档案后再打开。",
        },
      },
      409,
    );
  return c.json({ saved: true, stageId: stage.id, word });
});
