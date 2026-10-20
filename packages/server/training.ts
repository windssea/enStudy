import { Hono } from "hono";
import type { Actor, Env } from "./app";
import {
  exerciseById,
  topicCatalog as topicRelease,
  topicPublicationReleases,
  exercises,
  reservedTrainingRelease,
} from "./exercises";
import { writingAuthority, writingAuth } from "./writing";
import { hashedExposureKeys, disclosureCheckKeys } from "./exposure";
import {
  drawTraining,
  drawReservedTraining,
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
  event_id: string;
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
  material_release_id?: string | null;
  material_adopted_at?: number | null;
}
const reservedItems = (topic: string) =>
  reservedTrainingRelease.items.filter((i) => i.topicId === topic);
const reservedMaterial = (topic: string) =>
  reservedTrainingRelease.blueprints[topic];
const usesReserved = (cycle: Cycle) =>
  !!cycle.material_release_id &&
  cycle.material_release_id === reservedMaterial(cycle.topic_id)?.editionId;
function releaseReadiness(ids: string[]) {
  return {
    sql: `(SELECT count(*) FROM content_releases rr WHERE rr.status='published' AND rr.id IN (${ids.map(() => "?").join(",")}))=?`,
    params: [...ids, ids.length],
  };
}
const readinessFor = (topic: string) =>
  releaseReadiness(reservedMaterial(topic)?.releases ?? []);
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
        "SELECT r.phase,r.checkpoint,r.session_id AS sessionId,s.state,s.release_id AS materialReleaseId,x.total,x.independent,x.correct,x.completed_at AS completedAt FROM training_phase_runs r JOIN learning_sessions s ON s.id=r.session_id LEFT JOIN session_results x ON x.session_id=s.id WHERE r.cycle_id=? ORDER BY s.created_at,s.id",
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
        "SELECT si.item_id,a.event_id,a.outcome FROM training_phase_runs r JOIN session_items si ON si.session_id=r.session_id JOIN attempts a ON a.assignment_id=si.id WHERE r.cycle_id=? AND r.phase='diagnostic' ORDER BY si.position",
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
        eventId: r.event_id,
        title: item.title,
        dimension: reservedTrainingRelease.blueprints[
          cycle.topic_id
        ]?.dimensions.find((d) => d.id === item.trainingDimension)?.label,
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
    scope: usesReserved(cycle)
      ? "controlled-context"
      : (topicScopes.get(cycle.topic_id) ?? "new-lexeme"),
    materials: {
      kind: usesReserved(cycle) ? "reserved" : "shared",
      releaseId: cycle.material_release_id ?? null,
      revisionId: usesReserved(cycle)
        ? reservedMaterial(cycle.topic_id).revisionId
        : null,
      dimensions: usesReserved(cycle)
        ? reservedTrainingRelease.blueprints[cycle.topic_id].dimensions
        : [],
      canAdopt:
        !cycle.material_release_id &&
        !!reservedTrainingRelease.blueprints[cycle.topic_id] &&
        !next.finished &&
        !results.some((r) => !r.completedAt),
    },
    results: results.map((r) => ({
      ...r,
      materialKind: reservedTrainingRelease.releases.includes(
        r.materialReleaseId ?? "",
      )
        ? "reserved"
        : "shared",
    })),
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
  if (cycle.material_release_id && !usesReserved(cycle))
    throw new TrainingFault(
      "TRAINING_MATERIAL_VERSION",
      "这份计划需要更新后的材料，请刷新页面后继续。",
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
  const teaching = new Set(
    (
      await db
        .prepare(
          "SELECT evidence_key FROM teaching_exposures WHERE household_id=? AND child_id=?",
        )
        .bind(actor.householdId, actor.childId)
        .all<{ evidence_key: string }>()
    ).results.map((r) => r.evidence_key),
  );
  const pool = usesReserved(cycle)
    ? reservedItems(topic)
    : (topicItems.get(topic) ?? []);
  for (const item of pool)
    if (
      (await hashedExposureKeys(disclosureCheckKeys(item))).some((key) =>
        teaching.has(key),
      )
    )
      exposed.add(item.family ?? item.id);
  const weak = (
    await db
      .prepare(
        "SELECT si.item_id FROM training_phase_runs r JOIN session_items si ON si.session_id=r.session_id JOIN attempts a ON a.assignment_id=si.id WHERE r.cycle_id=? AND r.phase='diagnostic' AND a.outcome<>'correct'",
      )
      .bind(id)
      .all<{ item_id: string }>()
  ).results;
  const items = (usesReserved(cycle) ? drawReservedTraining : drawTraining)(
    pool,
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
  const guardedExposureKeys = await hashedExposureKeys(
    items.flatMap(disclosureCheckKeys),
  );
  const allowedReleases = usesReserved(cycle)
    ? reservedMaterial(topic).releases
    : topicPublicationReleases(topic);
  const publication = {
    sql: `${releaseReadiness(allowedReleases).sql} AND (SELECT count(*) FROM items p WHERE p.status='published' AND EXISTS(SELECT 1 FROM release_items r JOIN content_releases cr ON cr.id=r.release_id WHERE r.item_id=p.id AND r.item_version=p.version AND cr.status='published' AND r.release_id IN (${allowedReleases.map(() => "?").join(",")})) AND (${items.map(() => "(p.id=? AND p.version=?)").join(" OR ")}))=?`,
    params: [
      ...releaseReadiness(allowedReleases).params,
      ...allowedReleases,
      ...items.flatMap((i) => [i.id, i.version ?? 1]),
      items.length,
    ],
  };
  return { cycle, step, items, guardedItems, guardedExposureKeys, publication };
}
export const trainingRoutes = new Hono<{
  Bindings: Env;
  Variables: { actor: Actor };
}>();
trainingRoutes.get("/training/materials/:topic", async (c) => {
  const topicId = c.req.param("topic"),
    blueprint = reservedMaterial(topicId),
    reservedReady = readinessFor(topicId);
  const available =
    !!blueprint &&
    !!(await c.env.DB.prepare(`SELECT 1 WHERE ${reservedReady.sql}`)
      .bind(...reservedReady.params)
      .first());
  return c.json({
    childId: c.get("actor").childId,
    topicId,
    available,
    revisionId: available ? blueprint.revisionId : null,
    dimensions: available ? blueprint.dimensions : [],
  });
});
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
      "SELECT r.cycle_id,r.phase,r.checkpoint,r.session_id AS sessionId,s.state,s.release_id AS materialReleaseId,x.total,x.independent,x.correct,x.completed_at AS completedAt FROM training_cycles t JOIN training_phase_runs r ON r.cycle_id=t.id JOIN learning_sessions s ON s.id=r.session_id LEFT JOIN session_results x ON x.session_id=s.id WHERE t.household_id=? AND t.child_id=? ORDER BY s.created_at,s.id",
    )
      .bind(actor.householdId, actor.childId)
      .all<TrainingResult & { cycle_id: string }>()
  ).results;
  const coaching = (
    await c.env.DB.prepare(
      "SELECT r.cycle_id,si.item_id,a.event_id,a.outcome FROM training_cycles t JOIN training_phase_runs r ON r.cycle_id=t.id JOIN session_items si ON si.session_id=r.session_id JOIN attempts a ON a.assignment_id=si.id WHERE t.household_id=? AND t.child_id=? AND r.phase='diagnostic' AND a.outcome<>'correct' ORDER BY si.position",
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
  const material = reservedMaterial(body.topicId)?.editionId ?? null,
    reservedReady = readinessFor(body.topicId);
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO training_cycles(id,household_id,child_id,topic_id,created_at,material_release_id,material_adopted_at) SELECT ?,?,?,?,?,?,? WHERE ${writingAuthority} ${material ? `AND ${reservedReady.sql}` : ""}`,
  )
    .bind(
      body.clientRequestId,
      actor.householdId,
      actor.childId,
      body.topicId,
      Date.now(),
      material,
      material ? Date.now() : null,
      ...writingAuth(actor),
      ...(material ? reservedReady.params : []),
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
            message: "材料或档案状态有变化，请刷新后再开始。",
          },
        },
        409,
      );
});
trainingRoutes.post("/training/cycles/:id/materials", async (c) => {
  const actor = c.get("actor"),
    body = await c.req.json(),
    cycle = await readCycle(c.env.DB, actor, c.req.param("id"));
  if (!cycle)
    return c.json(
      { error: { code: "NOT_FOUND", message: "找不到这个专题计划。" } },
      404,
    );
  if (
    !body ||
    typeof body !== "object" ||
    !Number.isSafeInteger(body.expectedVersion) ||
    body.expectedVersion < 0
  )
    return c.json(
      {
        error: {
          code: "INVALID_MATERIAL_CHANGE",
          message: "请刷新后选择专用材料。",
        },
      },
      422,
    );
  if (usesReserved(cycle))
    return c.json(await cycleView(c.env.DB, actor, cycle));
  const view = await cycleView(c.env.DB, actor, cycle);
  if (!view.materials.canAdopt || cycle.version !== body.expectedVersion)
    return c.json(
      {
        error: {
          code: "TRAINING_CHANGED",
          message: "这一步已开始或记录有变化，请先继续原任务，再刷新计划。",
        },
      },
      409,
    );
  const now = Date.now();
  const reservedReady = readinessFor(cycle.topic_id);
  const saved = await c.env.DB.prepare(
    `UPDATE training_cycles SET material_release_id=?,material_adopted_at=?,version=version+1 WHERE id=? AND household_id=? AND child_id=? AND version=? AND material_release_id IS NULL AND NOT EXISTS(SELECT 1 FROM training_phase_runs r LEFT JOIN session_results x ON x.session_id=r.session_id WHERE r.cycle_id=training_cycles.id AND x.session_id IS NULL) AND ${reservedReady.sql} AND ${writingAuthority}`,
  )
    .bind(
      reservedMaterial(cycle.topic_id).editionId,
      now,
      cycle.id,
      actor.householdId,
      actor.childId,
      body.expectedVersion,
      ...reservedReady.params,
      ...writingAuth(actor, now),
    )
    .run();
  if (saved.meta.changes !== 1)
    return c.json(
      {
        error: {
          code: "TRAINING_CHANGED",
          message: "材料或权限已变化，请刷新后再试。",
        },
      },
      409,
    );
  return c.json(
    await cycleView(
      c.env.DB,
      actor,
      (await readCycle(c.env.DB, actor, cycle.id))!,
    ),
  );
});
