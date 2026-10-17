import { Hono } from "hono";
import type { Actor, Env } from "./app";
import { exerciseById, topicRelease, exercises } from "./exercises";
import {
  drawTraining,
  nextTrainingStep,
  trainingPools,
  trainingSizes,
  trainingLabels,
  type TrainingResult,
  trainingExposureKeys,
} from "../domain/training";
const exposureIndex = new Map<string, string[]>();
for (const item of exercises)
  for (const key of trainingExposureKeys(item)) {
    const group = exposureIndex.get(key) ?? [];
    group.push(item.id);
    exposureIndex.set(key, group);
  }
const topicItems = new Map(
  Object.keys(topicRelease.stats).map((id) => [
    id,
    topicRelease.items.filter((i) => i.topicId === id),
  ]),
);
const topicScopes = new Map(
  [...topicItems].map(([id, items]) => [id, trainingPools(items).scope]),
);
interface CoachingRow {
  item_id: string;
  outcome: string;
  cycle_id?: string;
}
export class TrainingFault extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
interface Cycle {
  id: string;
  household_id: string;
  child_id: string;
  topic_id: string;
  plan_version: number;
  version: number;
  created_at: number;
}
const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function readCycle(db: D1Database, actor: Actor, id: string) {
  return db
    .prepare(
      "SELECT * FROM training_cycles WHERE id=? AND household_id=? AND child_id=?",
    )
    .bind(id, actor.householdId, actor.childId)
    .first<Cycle>();
}
async function resultsFor(db: D1Database, cycle: string) {
  return (
    await db
      .prepare(
        "SELECT r.phase,r.checkpoint,r.session_id AS sessionId,s.state,x.total,x.independent,x.correct,x.completed_at AS completedAt FROM training_phase_runs r JOIN learning_sessions s ON s.id=r.session_id LEFT JOIN session_results x ON x.session_id=s.id WHERE r.cycle_id=? ORDER BY s.created_at,s.id",
      )
      .bind(cycle)
      .all<TrainingResult>()
  ).results;
}
export async function cycleView(db: D1Database, actor: Actor, cycle: Cycle) {
  const results = await resultsFor(db, cycle.id);
  const rows = (
    await db
      .prepare(
        "SELECT si.item_id,a.outcome FROM training_phase_runs r JOIN session_items si ON si.session_id=r.session_id JOIN attempts a ON a.assignment_id=si.id WHERE r.cycle_id=? AND r.phase='diagnostic' ORDER BY si.position",
      )
      .bind(cycle.id)
      .all<CoachingRow>()
  ).results;
  return formatCycle(actor, cycle, results, rows);
}
function formatCycle(
  actor: Actor,
  cycle: Cycle,
  results: TrainingResult[],
  rows: CoachingRow[],
) {
  const next = nextTrainingStep(results, actor.timezone);
  const coaching = rows
    .filter((r) => r.outcome !== "correct")
    .slice(0, 3)
    .map((r) => {
      const item = exerciseById.get(r.item_id)!;
      return {
        rule: item.explanation,
        example: item.prompt.replace("___", item.answers[0]),
        hinted: r.outcome === "hinted",
      };
    });
  const items = topicItems.get(cycle.topic_id) ?? [];
  return {
    id: cycle.id,
    topicId: cycle.topic_id,
    title: items[0]?.title ?? cycle.topic_id,
    version: cycle.version,
    planVersion: cycle.plan_version,
    scope: topicScopes.get(cycle.topic_id) ?? "new-lexeme",
    results,
    coaching,
    next: {
      phase: next.phase,
      label: trainingLabels[next.phase],
      checkpoint: next.checkpoint,
      readyAt: next.readyAt,
      size: trainingSizes[next.phase],
      sessionId: next.run?.sessionId ?? null,
      sessionState: next.run?.state ?? null,
    },
    finished: next.finished,
  };
}
export async function prepareTraining(
  db: D1Database,
  actor: Actor,
  id: string,
  version: unknown,
  topic: string,
) {
  const cycle = await readCycle(db, actor, id);
  if (!cycle || cycle.topic_id !== topic)
    throw new TrainingFault(
      "TRAINING_NOT_FOUND",
      "找不到这个专题计划，请重新打开。",
    );
  if (cycle.version !== version)
    throw new TrainingFault(
      "TRAINING_CHANGED",
      "计划已有新进度，请刷新后继续。",
    );
  const results = await resultsFor(db, id),
    step = nextTrainingStep(results, actor.timezone);
  if (step.finished || step.run)
    throw new TrainingFault(
      "TRAINING_CHANGED",
      "这一步已开始或完成，请继续原来的任务。",
    );
  if (step.readyAt > Date.now())
    throw new TrainingFault(
      "RETEST_NOT_DUE",
      "隔一段时间再试，才能看看是否记住。现在可以休息或做其他练习。",
    );
  const seen = (
    await db
      .prepare(
        "SELECT DISTINCT item_id FROM session_items WHERE household_id=? AND child_id=?",
      )
      .bind(actor.householdId, actor.childId)
      .all<{ item_id: string }>()
  ).results;
  const exposed = new Set(
    seen.flatMap((r) => {
      const item = exerciseById.get(r.item_id);
      return item ? trainingExposureKeys(item) : [r.item_id];
    }),
  );
  const weak = (
    await db
      .prepare(
        "SELECT si.item_id FROM training_phase_runs r JOIN session_items si ON si.session_id=r.session_id JOIN attempts a ON a.assignment_id=si.id WHERE r.cycle_id=? AND r.phase='diagnostic' AND a.outcome<>'correct'",
      )
      .bind(id)
      .all<{ item_id: string }>()
  ).results;
  const items = drawTraining(
    topicItems.get(topic) ?? [],
    step.phase,
    exposed,
    new Set(weak.map((r) => exerciseById.get(r.item_id)?.pattern ?? "default")),
  );
  if (items.length !== trainingSizes[step.phase])
    throw new TrainingFault(
      "TRAINING_CONTENT_EXPOSED",
      "这一步未见过的新材料不足。可以继续随机巩固；补充题库后再做评估，不把旧题当新测验。",
    );
  const guardedItems = [
    ...new Set(
      items.flatMap((item) =>
        trainingExposureKeys(item).flatMap(
          (key) => exposureIndex.get(key) ?? [],
        ),
      ),
    ),
  ];
  return { cycle, step, items, guardedItems };
}
export const trainingRoutes = new Hono<{
  Bindings: Env;
  Variables: { actor: Actor };
}>();
trainingRoutes.get("/training/cycles", async (c) => {
  const actor = c.get("actor");
  const rows = (
    await c.env.DB.prepare(
      "SELECT * FROM training_cycles WHERE household_id=? AND child_id=? ORDER BY created_at DESC",
    )
      .bind(actor.householdId, actor.childId)
      .all<Cycle>()
  ).results;
  if (!rows.length) return c.json({ items: [] });
  const results = (
    await c.env.DB.prepare(
      "SELECT r.cycle_id,r.phase,r.checkpoint,r.session_id AS sessionId,s.state,x.total,x.independent,x.correct,x.completed_at AS completedAt FROM training_cycles t JOIN training_phase_runs r ON r.cycle_id=t.id JOIN learning_sessions s ON s.id=r.session_id LEFT JOIN session_results x ON x.session_id=s.id WHERE t.household_id=? AND t.child_id=? ORDER BY s.created_at,s.id",
    )
      .bind(actor.householdId, actor.childId)
      .all<TrainingResult & { cycle_id: string }>()
  ).results;
  const coaching = (
    await c.env.DB.prepare(
      "SELECT r.cycle_id,si.item_id,a.outcome FROM training_cycles t JOIN training_phase_runs r ON r.cycle_id=t.id JOIN session_items si ON si.session_id=r.session_id JOIN attempts a ON a.assignment_id=si.id WHERE t.household_id=? AND t.child_id=? AND r.phase='diagnostic' AND a.outcome<>'correct' ORDER BY si.position",
    )
      .bind(actor.householdId, actor.childId)
      .all<CoachingRow>()
  ).results;
  return c.json({
    items: rows.map((row) =>
      formatCycle(
        actor,
        row,
        results
          .filter((r) => r.cycle_id === row.id)
          .map(({ cycle_id, ...result }) => result),
        coaching.filter((r) => r.cycle_id === row.id),
      ),
    ),
  });
});
trainingRoutes.get("/training/cycles/:id", async (c) => {
  const actor = c.get("actor"),
    cycle = await readCycle(c.env.DB, actor, c.req.param("id"));
  return cycle
    ? c.json(await cycleView(c.env.DB, actor, cycle))
    : c.json(
        { error: { code: "NOT_FOUND", message: "找不到这个专题计划。" } },
        404,
      );
});
trainingRoutes.post("/training/cycles", async (c) => {
  const actor = c.get("actor"),
    body = await c.req.json();
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.clientRequestId !== "string" ||
    !idPattern.test(body.clientRequestId) ||
    typeof body.topicId !== "string" ||
    !Object.hasOwn(topicRelease.stats, body.topicId)
  )
    return c.json(
      { error: { code: "INVALID_TRAINING", message: "请选择有效的专题。" } },
      422,
    );
  const prior = await readCycle(c.env.DB, actor, body.clientRequestId);
  if (prior && prior.topic_id !== body.topicId)
    return c.json(
      {
        error: {
          code: "IDEMPOTENCY_MISMATCH",
          message: "这个编号已用于另一专题。",
        },
      },
      409,
    );
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO training_cycles(id,household_id,child_id,topic_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM child_grants g LEFT JOIN account_sessions p ON p.id=g.parent_session_id WHERE g.id=? AND g.revoked_at IS NULL AND g.expires_at>? AND(g.parent_session_id IS NULL OR(p.revoked_at IS NULL AND p.expires_at>?)))",
  )
    .bind(
      body.clientRequestId,
      actor.householdId,
      actor.childId,
      body.topicId,
      Date.now(),
      actor.grantId,
      Date.now(),
      Date.now(),
    )
    .run();
  const row = await c.env.DB.prepare(
    "SELECT * FROM training_cycles WHERE household_id=? AND child_id=? AND topic_id=?",
  )
    .bind(actor.householdId, actor.childId, body.topicId)
    .first<Cycle>();
  return row
    ? c.json(
        await cycleView(c.env.DB, actor, row),
        prior || row.id !== body.clientRequestId ? 200 : 201,
      )
    : c.json(
        {
          error: {
            code: "TRAINING_CHANGED",
            message: "权限已变化，请刷新档案。",
          },
        },
        409,
      );
});
