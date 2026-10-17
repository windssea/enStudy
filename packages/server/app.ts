import { Hono, type Context, type MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { bodyLimit } from "hono/body-limit";
import {
  addDays,
  localDay,
  midnight,
  schedule,
  type Card,
} from "../domain/review";
import {
  exercises,
  publicExercise,
  sampleList,
  gradeAnswer,
  normalise,
  courseCatalog,
  exerciseById,
  exerciseVersion,
  topicRelease,
  patternRelease,
  vocabularyRelease,
  wordThemes,
  workshopRelease,
  structuredFeedback,
} from "./exercises";
import { structuredCanonical } from "../domain/structured";
import {
  selectReviewItems,
  selectTopicItems,
  shuffle,
  type ReviewTarget,
} from "../domain/selection";
import type { Answer, LearningSession, Receipt } from "../contracts/index";
import { conceptLab } from "../domain/concepts";
import conceptExposure from "../../content/concept-exposure-map.json";
import { authRoutes, readAdult, readAccountActor, logoutAccount } from "./auth";
import { managedAccountRoutes } from "./managedAccounts";
import { reportRoutes } from "./reports";
import { createAiRoutes } from "./aiRoutes";
import type { AiConfig } from "./aiPolicy";
import { trainingRoutes, prepareTraining, TrainingFault } from "./training";
import type { TrainingPhase } from "../domain/training";
import { answerExposureKeys } from "../domain/exposure";
import {
  recordExposure,
  exposureStatements,
  lessonExampleKeys,
  exampleShownToday,
  exposurePredicate,
  hashedExposureKeys,
  patternPreview,
  patternExampleKeys,
} from "./exposure";

export interface Env extends AiConfig {
  DB: D1Database;
  APP_STAGE?: string;
  ALLOW_DEV_AUTH?: string;
}
export interface Actor {
  childId: string;
  householdId: string;
  grantId: string;
  nickname: string;
  grade: number;
  timezone: string;
}
type Bindings = {
  Bindings: Env;
  Variables: { actor: Actor; requestId: string };
};
export const app = new Hono<Bindings>();
class PlayerUpdateRequired extends Error {}
const supportsExercise = (type: string, version?: string) =>
  ["listen", "evidence"].includes(type)
    ? version === "3"
    : ["sort", "repair"].includes(type)
      ? ["2", "3"].includes(version ?? "")
      : true;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Old foundation lessons displayed every practice sentence before starting.
// Keep immutable receipts; reports conservatively treat these runs as guided.
const reportIndependent =
  "CASE WHEN s.source='lesson' AND s.release_id='course-foundations-v1' THEN 0 ELSE r.independent END";
const loopback = (host: string) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(host);
export const devAllowed = (
  env: Pick<Env, "APP_STAGE" | "ALLOW_DEV_AUTH">,
  url: string,
) =>
  env.APP_STAGE === "local" &&
  env.ALLOW_DEV_AUTH === "true" &&
  loopback(new URL(url).hostname);
const hash = async (token: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const fault = (code: string, message: string) => ({ error: { code, message } });

app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  c.header("Cache-Control", "private, no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Request-Id", c.get("requestId"));
  if (!["GET", "HEAD"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    const url = new URL(c.req.url);
    if (origin) {
      let accepted = false;
      try {
        const source = new URL(origin);
        accepted =
          source.origin === url.origin ||
          (devAllowed(c.env, c.req.url) && loopback(source.hostname));
      } catch {
        /* rejected */
      }
      if (!accepted)
        return c.json(fault("ORIGIN_REJECTED", "请求来源不匹配。"), 403);
    }
    if (!c.req.header("Content-Type")?.startsWith("application/json"))
      return c.json(fault("JSON_REQUIRED", "请使用JSON请求。"), 415);
  }
  await next();
});
app.use("*", async (c, next) => {
  const audio =
    c.req.path === "/api/v1/ai/voice/test/asr" ||
    /^\/api\/v1\/learning\/conversations\/[a-f0-9-]{36}\/transcribe$/.test(
      c.req.path,
    );
  if (audio) {
    const allowed = c.req.path.includes("/test/")
      ? await readAdult(c)
      : await actorFrom(c);
    if (!allowed)
      return c.json(fault("AUTH_REQUIRED", "请先登录并选择相应档案。"), 401);
  }
  return bodyLimit({
    maxSize: audio ? 1024 * 1024 : 16 * 1024,
    onError: (c) =>
      c.json(fault("BODY_TOO_LARGE", "请求内容过大，请录制更短的音频。"), 413),
  })(c, next);
});
app.onError((error, c) => {
  if (error instanceof PlayerUpdateRequired)
    return c.json(
      fault(
        "PLAYER_UPDATE_REQUIRED",
        "这段学习包含新的互动题型，请刷新页面后继续。已保存的答案和当前任务会保留。",
      ),
      409,
    );
  if (error instanceof TrainingFault)
    return c.json(fault(error.code, error.message), 409);
  if (error instanceof SyntaxError)
    return c.json(fault("INVALID_JSON", "JSON格式不正确。"), 400);
  console.error(
    JSON.stringify({ requestId: c.get("requestId"), errorType: error.name }),
  );
  return c.json(
    {
      ...fault("SERVICE_ERROR", "暂时无法保存，请稍后重试。"),
      requestId: c.get("requestId"),
    },
    500,
  );
});
app.get("/api/v1/health", (c) =>
  c.json({
    status: "ok",
    stage: c.env.APP_STAGE ?? "preview",
    developmentIdentityAvailable: devAllowed(c.env, c.req.url),
    aiEnabled: false,
    registrationOpen: false,
    accountLoginAvailable: true,
    offlineProtocol: 1,
    databaseBinding: Boolean(c.env.DB),
  }),
);
app.get("/api/v1/exercises", (c) =>
  c.json({ items: sampleList(), contentState: "development-samples" }),
);
app.get("/api/v1/lessons", (c) =>
  c.json({
    release: courseCatalog.id,
    lessons: courseCatalog.lessons,
    topicAvailability: Object.fromEntries(
      Object.entries(topicRelease.stats).map(([id, stats]) => [
        id,
        stats.families,
      ]),
    ),
    topicStats: topicRelease.stats,
    topicRelease: topicRelease.id,
    patternStats: patternRelease.stats,
    patternRelease: patternRelease.id,
    vocabulary: {
      release: vocabularyRelease.id,
      totalWords: vocabularyRelease.totalWords,
      totalItems: vocabularyRelease.totalItems,
      themes: wordThemes,
    },
    workshops: workshopRelease.workshops,
  }),
);

app.get("/api/v1/vocabulary/:themeId", (c) => {
  const theme = vocabularyRelease.themes.find(
    (theme) => theme.id === c.req.param("themeId"),
  );
  if (!theme) return c.json(fault("NOT_FOUND", "没有找到这个单词主题。"), 404);
  return c.json({
    theme: wordThemes.find((row) => row.id === theme.id),
    words: theme.words,
  });
});

async function actorFrom<E extends { Bindings: Env }>(
  c: Context<E>,
): Promise<Actor | null> {
  const accountActor = await readAccountActor(c);
  if (accountActor) return accountActor;
  if (getCookie(c, "eq_account")) return null;
  const token = getCookie(c, "eq_dev_session");
  if (!token || !devAllowed(c.env, c.req.url)) return null;
  return c.env.DB.prepare(
    `SELECT g.id AS grantId, g.child_id AS childId, g.household_id AS householdId, ch.nickname, ch.grade, ch.timezone FROM child_grants g JOIN children ch ON ch.id=g.child_id AND ch.household_id=g.household_id WHERE g.token_hash=? AND g.revoked_at IS NULL AND g.expires_at>?`,
  )
    .bind(await hash(token), Date.now())
    .first<Actor>();
}
app.get("/api/v1/me", async (c) => {
  const actor = await actorFrom(c);
  const adult = await readAdult(c);
  return c.json({
    offlineProtocol: 1,
    authenticated: Boolean(actor),
    developmentIdentityAvailable: devAllowed(c.env, c.req.url),
    registrationOpen: false,
    ...(adult
      ? {
          adult: {
            username: adult.username,
            householdId: adult.householdId,
            isAdmin: adult.isAdmin,
            mustChangePassword: adult.mustChangePassword,
          },
        }
      : {}),
    ...(actor
      ? {
          child: {
            id: actor.childId,
            householdId: actor.householdId,
            nickname: actor.nickname,
            grade: actor.grade,
          },
        }
      : {}),
  });
});
app.route("/api/v1", authRoutes);
app.route("/api/v1", managedAccountRoutes);
app.route("/api/v1", reportRoutes);
app.post("/api/v1/dev/session", async (c) => {
  if (!devAllowed(c.env, c.req.url))
    return c.json(
      fault("DEV_IDENTITY_DISABLED", "此环境没有启用开发身份。"),
      403,
    );
  const body = await c.req.json<{ family?: string; child?: number }>();
  if (!body || typeof body !== "object" || Array.isArray(body))
    return c.json(fault("INVALID_PROFILE", "请选择有效开发档案。"), 422);
  if (
    !["a", "b"].includes(body.family ?? "") ||
    ![1, 2].includes(body.child ?? 0)
  )
    return c.json(fault("INVALID_PROFILE", "请选择有效开发档案。"), 422);
  const householdId = `dev-family-${body.family}`;
  const childId = `dev-child-${body.family}${body.child}`;
  await logoutAccount(c);
  if (
    !(await c.env.DB.prepare(
      "SELECT id FROM children WHERE id=? AND household_id=?",
    )
      .bind(childId, householdId)
      .first())
  )
    return c.json(
      fault("LOCAL_SEED_REQUIRED", "请先运行npm run setup:local。"),
      503,
    );
  const old = getCookie(c, "eq_dev_session");
  if (old)
    await c.env.DB.prepare(
      "UPDATE child_grants SET revoked_at=? WHERE token_hash=?",
    )
      .bind(Date.now(), await hash(old))
      .run();
  const token = crypto.randomUUID() + crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO child_grants(id,household_id,child_id,token_hash,created_by,expires_at) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      householdId,
      childId,
      await hash(token),
      "dev-adult",
      Date.now() + 8 * 3600_000,
    )
    .run();
  setCookie(c, "eq_dev_session", token, {
    httpOnly: true,
    sameSite: "Strict",
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge: 8 * 3600,
  });
  return c.json({ saved: true });
});
app.post("/api/v1/logout", async (c) => {
  await logoutAccount(c);
  const token = getCookie(c, "eq_dev_session");
  if (token && devAllowed(c.env, c.req.url))
    await c.env.DB.prepare(
      "UPDATE child_grants SET revoked_at=? WHERE token_hash=?",
    )
      .bind(Date.now(), await hash(token))
      .run();
  deleteCookie(c, "eq_dev_session", { path: "/" });
  return c.json({ saved: true });
});

const learningAccess: MiddlewareHandler<Bindings> = async (c, next) => {
  const actor = await actorFrom(c);
  if (!actor)
    return c.json(
      fault("AUTH_REQUIRED", "请先登录，再选择你的探险档案。"),
      401,
    );
  const expected = c.req.header("X-EQ-Child-ID");
  if (expected && expected !== actor.childId)
    return c.json(
      fault("IDENTITY_CHANGED", "探险档案已在其他页面切换，请重新读取档案。"),
      409,
    );
  c.set("actor", actor);
  await next();
};
for (const path of [
  "/api/v1/sessions/*",
  "/api/v1/sessions",
  "/api/v1/attempts",
  "/api/v1/progress",
  "/api/v1/learning/*",
  "/api/v1/training/*",
])
  app.use(path, learningAccess);
app.route("/api/v1", createAiRoutes(actorFrom));
app.route("/api/v1", trainingRoutes);
interface Assignment {
  offline_prepared_at: number | null;
  id: string;
  lease_id: string;
  lease_grant_id: string | null;
  lease_version: number;
  assignment_id: string;
  item_id: string;
  item_version: number;
  hint_level: number;
  state: LearningSession["state"];
  cursor: number;
  total: number;
  lesson_id: string | null;
  source:
    | "lesson"
    | "topic"
    | "pattern"
    | "vocabulary"
    | "workshop"
    | "review"
    | "single";
  source_ref: string | null;
  presentation_json: string | null;
  cycle_id: string | null;
  training_phase: TrainingPhase | null;
  checkpoint: number | null;
  training_topic_id: string | null;
  heard_at: number | null;
  transcript_at: number | null;
}
async function loadSession(
  db: D1Database,
  actor: Actor,
  id: string,
): Promise<Assignment | null> {
  return db
    .prepare(
      `SELECT s.id,s.lease_id,s.lease_grant_id,s.lease_version,s.state,s.cursor,s.lesson_id,s.source,s.source_ref,si.id AS assignment_id,si.item_id,si.item_version,si.hint_level,si.presentation_json,si.offline_prepared_at,li.heard_at,li.transcript_at,tr.cycle_id,tr.phase AS training_phase,tr.checkpoint,tc.topic_id AS training_topic_id,(SELECT count(*) FROM session_items all_items WHERE all_items.session_id=s.id) AS total FROM learning_sessions s JOIN session_items si ON si.session_id=s.id AND si.household_id=s.household_id AND si.child_id=s.child_id AND si.position=s.cursor LEFT JOIN listening_inputs li ON li.assignment_id=si.id LEFT JOIN training_phase_runs tr ON tr.session_id=s.id LEFT JOIN training_cycles tc ON tc.id=tr.cycle_id WHERE s.id=? AND s.household_id=? AND s.child_id=?`,
    )
    .bind(id, actor.householdId, actor.childId)
    .first<Assignment>();
}
function sessionPayload(
  row: Assignment,
  actor: Actor,
  playerVersion?: string,
): LearningSession {
  const exercise = exerciseVersion(row.item_id, row.item_version)!;
  if (!supportsExercise(exercise.type, playerVersion))
    throw new PlayerUpdateRequired();
  return {
    id: row.id,
    ...(row.offline_prepared_at !== null ? { offlinePrepared: true } : {}),
    leaseId: row.lease_grant_id === actor.grantId ? row.lease_id : null,
    leaseVersion: row.lease_version,
    access:
      row.state !== "active"
        ? "ended"
        : row.lease_grant_id === actor.grantId
          ? "owner"
          : "takeover-required",
    state: row.state,
    assignmentId: row.assignment_id,
    hintLevel: row.hint_level,
    ...(exercise.type === "listen"
      ? {
          listening: {
            heard: !!row.heard_at,
            textSupport: !!row.transcript_at,
          },
        }
      : {}),
    position: row.cursor + 1,
    total: row.total,
    lessonId: row.lesson_id,
    source: row.source,
    ...(row.cycle_id
      ? {
          training: {
            cycleId: row.cycle_id,
            topicId: row.training_topic_id!,
            phase: row.training_phase!,
            checkpoint: row.checkpoint!,
          },
        }
      : {}),
    exercise: {
      ...publicExercise(exercise),
      ...(row.presentation_json ? JSON.parse(row.presentation_json) : {}),
    },
  };
}
const grantAuthorization =
  "EXISTS(SELECT 1 FROM child_grants g WHERE g.id=? AND g.revoked_at IS NULL AND g.expires_at>? AND (g.parent_session_id IS NULL OR EXISTS(SELECT 1 FROM account_sessions p WHERE p.id=g.parent_session_id AND p.revoked_at IS NULL AND p.expires_at>?)))";
app.post("/api/v1/sessions/:id/offline-pack", async (c) => {
  const actor = c.get("actor"),
    body = await c.req.json();
  if (
    !body ||
    ![body.assignmentId, body.leaseId].every(
      (v) => typeof v === "string" && UUID.test(v),
    )
  )
    return c.json(
      fault("INVALID_OFFLINE_PACK", "请先打开一轮学习，再准备离线练习。"),
      422,
    );
  const row = await loadSession(c.env.DB, actor, c.req.param("id"));
  if (!row) return c.json(fault("NOT_FOUND", "找不到这轮学习。"), 404);
  if (
    row.state !== "active" ||
    row.lease_grant_id !== actor.grantId ||
    row.lease_id !== body.leaseId ||
    row.assignment_id !== body.assignmentId
  )
    return c.json(
      fault("LEASE_REPLACED", "设备或当前题目已变化，请先读取最新进度。"),
      409,
    );
  if (row.cycle_id)
    return c.json(
      fault(
        "TRAINING_REQUIRES_ONLINE",
        "专题分步测验需要在线完成；可把普通课程或随机特训带去离线练习。",
      ),
      409,
    );
  const pending = await c.env.DB.prepare(
    "SELECT si.id,si.position,si.item_id,si.item_version,si.presentation_json,li.heard_at,li.transcript_at FROM session_items si LEFT JOIN attempts a ON a.assignment_id=si.id LEFT JOIN listening_inputs li ON li.assignment_id=si.id WHERE si.session_id=? AND si.household_id=? AND si.child_id=? AND si.position>=? AND a.event_id IS NULL ORDER BY si.position LIMIT 20",
  )
    .bind(row.id, actor.householdId, actor.childId, row.cursor)
    .all<{
      id: string;
      position: number;
      item_id: string;
      item_version: number;
      presentation_json: string | null;
      heard_at: number | null;
      transcript_at: number | null;
    }>();
  if (!pending.results.length || pending.results[0].id !== row.assignment_id)
    return c.json(
      fault(
        "ANSWER_ALREADY_SAVED",
        "这一题已保存，请先进入下一题再准备离线练习。",
      ),
      409,
    );
  const items = pending.results.map((item) => {
    const version = exerciseVersion(item.item_id, item.item_version)!;
    if (!supportsExercise(version.type, c.req.header("X-EQ-Player-Version")))
      throw new PlayerUpdateRequired();
    return {
      assignmentId: item.id,
      position: item.position + 1,
      exercise: {
        ...publicExercise(version),
        ...(item.presentation_json ? JSON.parse(item.presentation_json) : {}),
      },
      ...(version.type === "listen"
        ? {
            listening: {
              heard: !!item.heard_at,
              textSupport: !!item.transcript_at,
            },
          }
        : {}),
    };
  });
  const now = Date.now(),
    packId = crypto.randomUUID();
  const marked = await c.env.DB.prepare(
    `UPDATE session_items SET offline_prepared_at=COALESCE(offline_prepared_at,?),offline_pack_id=? WHERE session_id=? AND household_id=? AND child_id=? AND position>=? AND NOT EXISTS(SELECT 1 FROM attempts a WHERE a.assignment_id=session_items.id) AND EXISTS(SELECT 1 FROM learning_sessions s WHERE s.id=? AND s.state='active' AND s.cursor=? AND s.lease_id=? AND s.lease_grant_id=? AND NOT EXISTS(SELECT 1 FROM attempts a WHERE a.assignment_id=?)) AND ${grantAuthorization}`,
  )
    .bind(
      now,
      packId,
      row.id,
      actor.householdId,
      actor.childId,
      row.cursor,
      row.id,
      row.cursor,
      row.lease_id,
      actor.grantId,
      row.assignment_id,
      actor.grantId,
      now,
      now,
    )
    .run();
  if (marked.meta.changes !== items.length)
    return c.json(
      fault(
        "LEASE_REPLACED",
        "题目或设备已变化，离线包未准备好。请重新读取进度。",
      ),
      409,
    );
  return c.json({
    schema: 1,
    id: packId,
    householdId: actor.householdId,
    childId: actor.childId,
    nickname: actor.nickname,
    preparedAt: now,
    expiresAt: now + 7 * 86400000,
    sessionId: row.id,
    leaseId: row.lease_id,
    leaseVersion: row.lease_version,
    source: row.source,
    items,
  });
});
app.post("/api/v1/sessions/:id/listening", async (c) => {
  const actor = c.get("actor"),
    body = await c.req.json();
  if (
    !body ||
    ![body.assignmentId, body.leaseId].every(
      (value) => typeof value === "string" && UUID.test(value),
    ) ||
    !["heard", "text"].includes(body.mode)
  )
    return c.json(
      fault("INVALID_LISTENING_INPUT", "请先听本题，或选择文字辅助。"),
      422,
    );
  const row = await loadSession(c.env.DB, actor, c.req.param("id"));
  if (!row) return c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
  if (
    row.assignment_id !== body.assignmentId ||
    row.lease_id !== body.leaseId ||
    row.lease_grant_id !== actor.grantId ||
    row.state !== "active"
  )
    return c.json(
      fault("LEASE_REPLACED", "本题或设备已经变化，请刷新后继续。"),
      409,
    );
  const item = exerciseVersion(row.item_id, row.item_version)!;
  if (item.type !== "listen")
    return c.json(
      fault("INVALID_LISTENING_INPUT", "这道题不需要听音状态。"),
      422,
    );
  if (!supportsExercise(item.type, c.req.header("X-EQ-Player-Version")))
    throw new PlayerUpdateRequired();
  if (
    (body.mode === "heard" && row.heard_at) ||
    (body.mode === "text" && row.transcript_at)
  )
    return c.json({ heard: !!row.heard_at, textSupport: !!row.transcript_at });
  const now = Date.now(),
    guard = `EXISTS(SELECT 1 FROM learning_sessions s JOIN session_items si ON si.session_id=s.id WHERE s.id=? AND s.household_id=? AND s.child_id=? AND s.lease_id=? AND s.lease_grant_id=? AND s.state='active' AND si.id=? AND si.position=s.cursor AND NOT EXISTS(SELECT 1 FROM attempts a WHERE a.assignment_id=si.id))`;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO listening_inputs(assignment_id,household_id,child_id,heard_at,transcript_at) SELECT ?,?,?,?,? WHERE ${grantAuthorization} AND ${guard} ON CONFLICT(assignment_id) DO UPDATE SET heard_at=COALESCE(listening_inputs.heard_at,excluded.heard_at),transcript_at=COALESCE(listening_inputs.transcript_at,excluded.transcript_at)`,
      ).bind(
        body.assignmentId,
        actor.householdId,
        actor.childId,
        body.mode === "heard" ? now : null,
        body.mode === "text" ? now : null,
        actor.grantId,
        now,
        now,
        row.id,
        actor.householdId,
        actor.childId,
        body.leaseId,
        actor.grantId,
        body.assignmentId,
      ),
      c.env.DB.prepare(
        "INSERT INTO listening_commits(id,household_id,child_id,ok) VALUES(?,?,?,changes())",
      ).bind(crypto.randomUUID(), actor.householdId, actor.childId),
      ...(body.mode === "text"
        ? await exposureStatements(
            c.env.DB,
            actor,
            answerExposureKeys(item),
            now,
          )
        : []),
    ]);
  } catch {
    return c.json(
      fault(
        "LISTENING_NOT_SAVED",
        "听音状态还没保存，题目或设备可能已变化，请刷新后重试。",
      ),
      409,
    );
  }
  const saved = await loadSession(c.env.DB, actor, row.id);
  if (
    !saved ||
    saved.assignment_id !== body.assignmentId ||
    saved.lease_grant_id !== actor.grantId ||
    saved.lease_id !== body.leaseId
  )
    return c.json(
      fault("LEASE_REPLACED", "本题或设备已经变化，请刷新后继续。"),
      409,
    );
  return c.json({
    heard: !!saved.heard_at,
    textSupport: !!saved.transcript_at,
  });
});
async function sessionSnapshot(
  db: D1Database,
  actor: Actor,
  row: Assignment,
  playerVersion?: string,
) {
  const session = sessionPayload(row, actor, playerVersion);
  const attempt = await db
    .prepare(
      "SELECT receipt_json FROM attempts WHERE assignment_id=? AND household_id=? AND child_id=?",
    )
    .bind(row.assignment_id, actor.householdId, actor.childId)
    .first<{ receipt_json: string }>();
  if (attempt)
    await recordExposure(
      db,
      actor,
      answerExposureKeys(exerciseVersion(row.item_id, row.item_version)!),
    );
  return {
    childId: actor.childId,
    session,
    receipt: attempt ? JSON.parse(attempt.receipt_json) : null,
    hint: row.hint_level
      ? exerciseVersion(row.item_id, row.item_version)?.hint
      : null,
  };
}
app.get("/api/v1/sessions/current", async (c) => {
  const actor = c.get("actor");
  const active = await c.env.DB.prepare(
    "SELECT id FROM learning_sessions WHERE household_id=? AND child_id=? AND state='active' ORDER BY created_at DESC LIMIT 1",
  )
    .bind(actor.householdId, actor.childId)
    .first<{ id: string }>();
  if (!active) return c.json({ childId: actor.childId, session: null });
  const row = await loadSession(c.env.DB, actor, active.id);
  return c.json(
    row
      ? await sessionSnapshot(
          c.env.DB,
          actor,
          row,
          c.req.header("X-EQ-Player-Version"),
        )
      : { childId: actor.childId, session: null },
  );
});
app.post("/api/v1/sessions/:id/takeover", async (c) => {
  const actor = c.get("actor"),
    body = await c.req.json(),
    id = c.req.param("id");
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.clientRequestId !== "string" ||
    !UUID.test(body.clientRequestId) ||
    !Number.isSafeInteger(body.expectedLeaseVersion) ||
    body.expectedLeaseVersion < 0 ||
    (body.resume !== undefined && typeof body.resume !== "boolean")
  )
    return c.json(
      fault("INVALID_TAKEOVER", "请先读取最新进度，再选择在本设备接着学。"),
      422,
    );
  const row = await loadSession(c.env.DB, actor, id);
  if (!row) return c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
  type Claim = {
    session_id: string;
    grant_id: string;
    expected_version: number;
    lease_id: string;
  };
  const prior = () =>
    c.env.DB.prepare(
      "SELECT session_id,grant_id,expected_version,lease_id FROM session_claims WHERE household_id=? AND child_id=? AND request_id=?",
    )
      .bind(actor.householdId, actor.childId, body.clientRequestId)
      .first<Claim>();
  const replay = async (claim: Claim) => {
    if (
      claim.session_id !== id ||
      claim.grant_id !== actor.grantId ||
      claim.expected_version !== body.expectedLeaseVersion
    )
      return c.json(
        fault("IDEMPOTENCY_MISMATCH", "这个接续编号已用于其他设备或任务。"),
        409,
      );
    const current = await loadSession(c.env.DB, actor, id);
    if (
      !current ||
      current.state !== "active" ||
      current.lease_id !== claim.lease_id ||
      current.lease_grant_id !== actor.grantId
    )
      return c.json(
        fault("LEASE_REPLACED", "这轮学习又换了设备，请先刷新进度。"),
        409,
      );
    return c.json(
      await sessionSnapshot(
        c.env.DB,
        actor,
        current,
        c.req.header("X-EQ-Player-Version"),
      ),
    );
  };
  const saved = await prior();
  if (saved) return replay(saved);
  const resume = body.resume === true;
  if (
    row.state !== (resume ? "paused" : "active") ||
    row.lease_version !== body.expectedLeaseVersion
  )
    return c.json(
      fault("LEASE_REPLACED", "进度已变化，请刷新后再选择接着学。"),
      409,
    );
  const lease = crypto.randomUUID(),
    now = Date.now();
  try {
    await c.env.DB.batch([
      ...(resume
        ? [
            c.env.DB.prepare(
              `UPDATE learning_sessions SET state='paused' WHERE household_id=? AND child_id=? AND state='active' AND lease_grant_id=? AND ${grantAuthorization}`,
            ).bind(
              actor.householdId,
              actor.childId,
              actor.grantId,
              actor.grantId,
              now,
              now,
            ),
          ]
        : []),
      c.env.DB.prepare(
        `UPDATE learning_sessions SET state='active',lease_id=?,lease_grant_id=?,lease_version=lease_version+1 WHERE id=? AND household_id=? AND child_id=? AND state=? AND lease_version=? AND ${grantAuthorization} AND NOT EXISTS(SELECT 1 FROM learning_sessions other WHERE other.household_id=? AND other.child_id=? AND other.state='active' AND other.id<>?)`,
      ).bind(
        lease,
        actor.grantId,
        id,
        actor.householdId,
        actor.childId,
        resume ? "paused" : "active",
        body.expectedLeaseVersion,
        actor.grantId,
        now,
        now,
        actor.householdId,
        actor.childId,
        id,
      ),
      ...(resume
        ? [
            c.env.DB.prepare(
              "INSERT INTO session_activation_checks(request_id,household_id,child_id,ok) VALUES(?,?,?,changes())",
            ).bind(body.clientRequestId, actor.householdId, actor.childId),
          ]
        : []),
      c.env.DB.prepare(
        "INSERT INTO session_claims(household_id,child_id,request_id,session_id,grant_id,expected_version,lease_id,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM learning_sessions WHERE id=? AND lease_id=? AND lease_grant_id=?)",
      ).bind(
        actor.householdId,
        actor.childId,
        body.clientRequestId,
        id,
        actor.grantId,
        body.expectedLeaseVersion,
        lease,
        now,
        id,
        lease,
        actor.grantId,
      ),
    ]);
  } catch (error) {
    const concurrent = await prior();
    if (concurrent) return replay(concurrent);
    if (resume)
      return c.json(
        fault("LEASE_REPLACED", "另一任务或设备仍在使用进度，请刷新后接续。"),
        409,
      );
    throw error;
  }
  const committed = await prior();
  return committed
    ? replay(committed)
    : c.json(
        fault("LEASE_REPLACED", "其他设备先接上了进度，请刷新后再试。"),
        409,
      );
});
async function reviewTargets(db: D1Database, actor: Actor) {
  const cards = await db
    .prepare(
      "SELECT skill_id AS skillId,modality,due_at AS dueAt FROM review_cards WHERE household_id=? AND child_id=? AND due_at<=? ORDER BY due_at LIMIT 40",
    )
    .bind(actor.householdId, actor.childId, Date.now())
    .all<ReviewTarget>();
  const recent = await db
    .prepare(
      "SELECT si.item_id FROM attempts a JOIN session_items si ON si.id=a.assignment_id WHERE a.household_id=? AND a.child_id=? ORDER BY a.received_at DESC LIMIT 100",
    )
    .bind(actor.householdId, actor.childId)
    .all<{ item_id: string }>();
  const families = new Map<string, string>();
  for (const row of recent.results) {
    const item = exerciseById.get(row.item_id);
    if (item && !families.has(`${item.skill}:${item.modality}`))
      families.set(`${item.skill}:${item.modality}`, item.family ?? item.id);
  }
  return cards.results.map((card) => ({
    ...card,
    lastFamily: families.get(`${card.skillId}:${card.modality}`),
  }));
}
app.post("/api/v1/sessions", async (c) => {
  const actor = c.get("actor"),
    body = await c.req.json();
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !UUID.test(body.clientRequestId ?? "")
  )
    return c.json(fault("INVALID_SESSION", "练习或请求编号无效。"), 422);
  const selectors = [
    typeof body.exerciseId === "string",
    typeof body.lessonId === "string",
    typeof body.topicId === "string",
    typeof body.patternId === "string",
    typeof body.wordThemeId === "string",
    typeof body.workshopId === "string",
    body.mode === "review",
  ];
  if (
    [
      "exerciseId",
      "lessonId",
      "topicId",
      "patternId",
      "wordThemeId",
      "workshopId",
    ].some(
      (key) =>
        body[key] !== undefined &&
        (typeof body[key] !== "string" ||
          body[key].length < 1 ||
          body[key].length > 160),
    ) ||
    (body.mode !== undefined && body.mode !== "review")
  )
    return c.json(fault("INVALID_SESSION", "学习任务格式不正确。"), 422);
  if (selectors.filter(Boolean).length !== 1)
    return c.json(fault("INVALID_SESSION", "请选择一种有效的学习任务。"), 422);
  if (
    body.roundSize !== undefined &&
    (!(body.topicId || body.patternId || body.wordThemeId || body.workshopId) ||
      ![5, 10, 20].includes(body.roundSize))
  )
    return c.json(
      fault("INVALID_ROUND_SIZE", "特训每轮可选5、10或20题。"),
      422,
    );
  if (
    body.wordMode !== undefined &&
    (!body.wordThemeId ||
      !["mixed", "meaning", "spelling", "context", "listening"].includes(
        body.wordMode,
      ))
  )
    return c.json(
      fault("INVALID_WORD_MODE", "请选择词义、拼写、语境或混合练习。"),
      422,
    );
  if (
    body.trainingCycleId !== undefined &&
    (!body.topicId ||
      typeof body.trainingCycleId !== "string" ||
      !UUID.test(body.trainingCycleId) ||
      !Number.isSafeInteger(body.trainingVersion) ||
      body.roundSize !== undefined)
  )
    return c.json(
      fault("INVALID_TRAINING", "请从专题计划中继续，步骤与题量由服务端决定。"),
      422,
    );
  const source: Assignment["source"] = body.lessonId
    ? "lesson"
    : body.topicId
      ? "topic"
      : body.patternId
        ? "pattern"
        : body.wordThemeId
          ? "vocabulary"
          : body.workshopId
            ? "workshop"
            : body.mode === "review"
              ? "review"
              : "single";
  const reference = String(
    body.lessonId ??
      body.topicId ??
      body.patternId ??
      body.wordThemeId ??
      body.workshopId ??
      body.exerciseId ??
      "due",
  );
  const sourceRef = `${source}:${reference}${["topic", "pattern", "vocabulary", "workshop"].includes(source) ? `:${body.roundSize ?? 10}` : ""}${source === "vocabulary" ? `:${body.wordMode ?? "mixed"}` : ""}${body.trainingCycleId ? `:training:${body.trainingCycleId}:${body.trainingVersion}` : ""}`;
  const existing = await loadSession(c.env.DB, actor, body.clientRequestId);
  if (existing) {
    if (
      existing.source_ref !== sourceRef &&
      !(existing.source_ref === null && existing.item_id === body.exerciseId)
    )
      return c.json(
        fault("IDEMPOTENCY_MISMATCH", "这个请求编号已用于其他学习任务。"),
        409,
      );
    if (existing.state !== "active")
      return c.json(
        fault("SESSION_CHANGED", "这次学习已结束或被新任务替换。"),
        409,
      );
    return c.json(
      sessionPayload(existing, actor, c.req.header("X-EQ-Player-Version")),
    );
  }
  const lesson = courseCatalog.lessons.find(
    (lesson) => lesson.id === body.lessonId,
  );
  const training = body.trainingCycleId
    ? await prepareTraining(
        c.env.DB,
        actor,
        body.trainingCycleId,
        body.trainingVersion,
        body.topicId,
      )
    : null;
  let selected =
    source === "lesson"
      ? exercises.filter((item) => item.lessonId === lesson?.id)
      : source === "single"
        ? exercises.filter((item) => item.id === body.exerciseId)
        : [];
  if (source === "lesson" && !lesson) selected = [];
  if (training) selected = training.items;
  else if (["topic", "pattern", "vocabulary", "workshop"].includes(source)) {
    const recent = await c.env.DB.prepare(
      "SELECT si.item_id FROM session_items si JOIN learning_sessions s ON s.id=si.session_id WHERE si.household_id=? AND si.child_id=? ORDER BY s.created_at DESC,si.position LIMIT 400",
    )
      .bind(actor.householdId, actor.childId)
      .all<{ item_id: string }>();
    const recentFamilies = new Set(
      recent.results.map(
        (row) => exerciseById.get(row.item_id)?.family ?? row.item_id,
      ),
    );
    selected = selectTopicItems(
      source === "workshop"
        ? workshopRelease.items
            .filter((item) => item.workshopId === body.workshopId)
            .map((item) => ({ ...item, pattern: item.type }))
        : source === "vocabulary"
          ? vocabularyRelease.items.filter(
              (item) =>
                item.wordThemeId === body.wordThemeId &&
                ((body.wordMode ?? "mixed") === "mixed" ||
                  item.wordMode === body.wordMode),
            )
          : source === "pattern"
            ? patternRelease.items.filter(
                (item) => item.patternId === body.patternId,
              )
            : topicRelease.items.filter(
                (item) => item.topicId === body.topicId,
              ),
      recentFamilies,
      body.roundSize ?? 10,
    );
  }
  if (source === "review")
    selected = selectReviewItems(
      await reviewTargets(c.env.DB, actor),
      exercises,
      Date.now(),
    );
  if (!selected.length)
    return c.json(
      fault(
        source === "review" ? "NO_DUE_REVIEWS" : "CONTENT_NOT_AVAILABLE",
        source === "review"
          ? "今天还没有到期的复习，去学一点新内容吧。"
          : "这份学习内容还在准备中。",
      ),
      404,
    );
  if (
    selected.some(
      (item) =>
        !supportsExercise(item.type, c.req.header("X-EQ-Player-Version")),
    )
  )
    throw new PlayerUpdateRequired();
  const publication = await c.env.DB.prepare(
    `SELECT i.id,l.release_id FROM items i JOIN lessons l ON l.id=i.lesson_id AND l.version=i.lesson_version JOIN content_releases r ON r.id=l.release_id JOIN release_items ri ON ri.release_id=r.id AND ri.item_id=i.id AND ri.item_version=i.version WHERE (${selected.map(() => "(i.id=? AND i.version=?)").join(" OR ")}) AND i.status='published' AND r.status='published'`,
  )
    .bind(...selected.flatMap((item) => [item.id, item.version ?? 1]))
    .all<{ id: string; release_id: string }>();
  const origins = new Map(
    publication.results.map((row) => [row.id, row.release_id]),
  );
  if (origins.size !== selected.length)
    return c.json(
      fault("CONTENT_UNAVAILABLE", "这份内容暂时不可用，请换一份任务。"),
      409,
    );
  const release = origins.get(selected[0].id)!;
  const lease = crypto.randomUUID(),
    now = Date.now();
  const createdHere =
    "EXISTS(SELECT 1 FROM learning_sessions s WHERE s.id=? AND s.lease_id=? AND s.lease_grant_id=?)";
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE learning_sessions SET state='paused' WHERE household_id=? AND child_id=? AND state='active' AND lease_grant_id=? AND ${grantAuthorization}`,
      ).bind(
        actor.householdId,
        actor.childId,
        actor.grantId,
        actor.grantId,
        now,
        now,
      ),
      c.env.DB.prepare(
        `INSERT INTO learning_sessions(id,household_id,child_id,release_id,lease_id,state,created_at,lesson_id,source,source_ref,lease_grant_id) SELECT ?,?,?,?,?,'active',?,?,?,?,? WHERE ${grantAuthorization} AND NOT EXISTS(SELECT 1 FROM learning_sessions s WHERE s.household_id=? AND s.child_id=? AND s.state='active' AND (s.lease_grant_id IS NULL OR s.lease_grant_id<>?)) ${training ? `AND EXISTS(SELECT 1 FROM training_cycles WHERE id=? AND household_id=? AND child_id=? AND version=?) AND NOT EXISTS(SELECT 1 FROM session_items seen WHERE seen.household_id=? AND seen.child_id=? AND seen.item_id IN (${training.guardedItems.map(() => "?").join(",")})) AND NOT EXISTS(SELECT 1 FROM teaching_exposures e WHERE e.household_id=? AND e.child_id=? AND e.evidence_key IN (${training.guardedExposureKeys.map(() => "?").join(",")}))` : ""}`,
      ).bind(
        body.clientRequestId,
        actor.householdId,
        actor.childId,
        release,
        lease,
        now,
        lesson?.id ?? null,
        source,
        sourceRef,
        actor.grantId,
        actor.grantId,
        now,
        now,
        actor.householdId,
        actor.childId,
        actor.grantId,
        ...(training
          ? [
              training.cycle.id,
              actor.householdId,
              actor.childId,
              training.cycle.version,
              actor.householdId,
              actor.childId,
              ...training.guardedItems,
              actor.householdId,
              actor.childId,
              ...training.guardedExposureKeys,
            ]
          : []),
      ),
      ...(training
        ? [
            c.env.DB.prepare(
              "INSERT INTO training_claim_checks(session_id,ok) VALUES(?,changes())",
            ).bind(body.clientRequestId),
            c.env.DB.prepare(
              "INSERT INTO training_phase_runs(cycle_id,phase,checkpoint,session_id) VALUES(?,?,?,?)",
            ).bind(
              training.cycle.id,
              training.step.phase,
              training.step.checkpoint,
              body.clientRequestId,
            ),
            c.env.DB.prepare(
              "UPDATE training_cycles SET version=version+1 WHERE id=? AND version=?",
            ).bind(training.cycle.id, training.cycle.version),
          ]
        : []),
      ...selected.map((item, index) =>
        c.env.DB.prepare(
          `INSERT INTO session_items(id,household_id,child_id,session_id,position,item_id,item_version,presentation_json,content_release_id) SELECT ?,?,?,?,?,?,?,?,? WHERE ${createdHere}`,
        ).bind(
          crypto.randomUUID(),
          actor.householdId,
          actor.childId,
          body.clientRequestId,
          index,
          item.id,
          item.version ?? 1,
          JSON.stringify({
            ...(item.choices ? { choices: shuffle(item.choices) } : {}),
            ...(item.tokens ? { tokens: shuffle(item.tokens) } : {}),
            ...(item.sorting
              ? {
                  sorting: {
                    ...item.sorting,
                    cards: shuffle(item.sorting.cards),
                    groups: shuffle(item.sorting.groups),
                  },
                }
              : {}),
          }),
          origins.get(item.id)!,
          body.clientRequestId,
          lease,
          actor.grantId,
        ),
      ),
      ...(lesson
        ? await exposureStatements(
            c.env.DB,
            actor,
            lessonExampleKeys(lesson.id),
            now,
            {
              sql: createdHere,
              params: [body.clientRequestId, lease, actor.grantId],
            },
          )
        : []),
    ]);
  } catch (error) {
    const concurrent = await loadSession(c.env.DB, actor, body.clientRequestId);
    if (concurrent?.source_ref === sourceRef && concurrent.state === "active")
      return c.json(
        sessionPayload(concurrent, actor, c.req.header("X-EQ-Player-Version")),
      );
    if (training)
      throw new TrainingFault(
        "TRAINING_CHANGED",
        "专题计划或设备进度已变化，请刷新后继续原任务。",
      );
    throw error;
  }
  const created = await loadSession(c.env.DB, actor, body.clientRequestId);
  return created
    ? c.json(
        sessionPayload(created, actor, c.req.header("X-EQ-Player-Version")),
        201,
      )
    : c.json(
        fault(
          "TAKEOVER_REQUIRED",
          "另一台设备还有正在学习的任务，请先选择在本设备接着学。",
        ),
        409,
      );
});
app.post("/api/v1/sessions/:id/next", async (c) => {
  const actor = c.get("actor"),
    row = await loadSession(c.env.DB, actor, c.req.param("id")),
    body = await c.req.json();
  if (!row) return c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
  if (
    !body ||
    body.leaseId !== row.lease_id ||
    row.lease_grant_id !== actor.grantId ||
    typeof body.assignmentId !== "string"
  )
    return c.json(
      fault("LEASE_REPLACED", "学习会话已切换，请重新打开任务。"),
      409,
    );
  const result = () =>
    c.env.DB.prepare(
      `SELECT r.session_id AS sessionId,r.lesson_id AS lessonId,r.total,r.correct,${reportIndependent} AS independent,r.completed_at AS completedAt FROM session_results r JOIN learning_sessions s ON s.id=r.session_id WHERE r.session_id=? AND r.household_id=? AND r.child_id=?`,
    )
      .bind(row.id, actor.householdId, actor.childId)
      .first();
  if (row.state === "completed")
    return c.json({ completed: true, session: null, result: await result() });
  if (row.state !== "active")
    return c.json(fault("SESSION_CHANGED", "这次学习已被新任务替换。"), 409);
  const submitted = await c.env.DB.prepare(
    "SELECT si.position FROM session_items si JOIN attempts a ON a.assignment_id=si.id WHERE si.session_id=? AND si.id=? AND a.household_id=? AND a.child_id=?",
  )
    .bind(row.id, body.assignmentId, actor.householdId, actor.childId)
    .first<{ position: number }>();
  if (!submitted || submitted.position > row.cursor)
    return c.json(fault("ANSWER_REQUIRED", "先完成当前这一步，再继续。"), 409);
  if (submitted.position < row.cursor)
    return c.json({
      session: sessionPayload(row, actor, c.req.header("X-EQ-Player-Version")),
    });
  const authorization = grantAuthorization;
  const now = Date.now();
  if (row.cursor + 1 < row.total) {
    await c.env.DB.prepare(
      `UPDATE learning_sessions SET cursor=cursor+1 WHERE id=? AND household_id=? AND child_id=? AND cursor=? AND state='active' AND lease_id=? AND lease_grant_id=? AND ${authorization}`,
    )
      .bind(
        row.id,
        actor.householdId,
        actor.childId,
        row.cursor,
        body.leaseId,
        actor.grantId,
        actor.grantId,
        now,
        now,
      )
      .run();
    const updated = (await loadSession(c.env.DB, actor, row.id))!;
    if (
      updated.cursor === row.cursor ||
      updated.lease_id !== body.leaseId ||
      updated.lease_grant_id !== actor.grantId ||
      updated.state !== "active"
    )
      return c.json(
        fault("SESSION_CHANGED", "任务状态有变化，请重新打开。"),
        409,
      );
    return c.json({
      session: sessionPayload(
        updated,
        actor,
        c.req.header("X-EQ-Player-Version"),
      ),
    });
  }
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE learning_sessions SET state='completed' WHERE id=? AND household_id=? AND child_id=? AND cursor=? AND state='active' AND lease_id=? AND lease_grant_id=? AND ${authorization} AND NOT EXISTS(SELECT 1 FROM session_items si LEFT JOIN attempts a ON a.assignment_id=si.id WHERE si.session_id=learning_sessions.id AND a.event_id IS NULL)`,
    ).bind(
      row.id,
      actor.householdId,
      actor.childId,
      row.cursor,
      body.leaseId,
      actor.grantId,
      actor.grantId,
      now,
      now,
    ),
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO session_results(session_id,household_id,child_id,lesson_id,total,correct,independent,completed_at) SELECT s.id,s.household_id,s.child_id,s.lesson_id,count(*),sum(CASE WHEN a.outcome IN ('correct','hinted') THEN 1 ELSE 0 END),sum(a.independent_evidence),? FROM learning_sessions s JOIN session_items si ON si.session_id=s.id JOIN attempts a ON a.assignment_id=si.id WHERE s.id=? AND s.household_id=? AND s.child_id=? AND s.state='completed' GROUP BY s.id",
    ).bind(now, row.id, actor.householdId, actor.childId),
  ]);
  const completed = await result();
  return completed
    ? c.json({ completed: true, session: null, result: completed })
    : c.json(fault("SESSION_CHANGED", "这次任务尚未完成，请重新打开。"), 409);
});
app.get("/api/v1/learning/summary", async (c) => {
  const actor = c.get("actor");
  const completed = await c.env.DB.prepare(
    `SELECT r.lesson_id AS lessonId,max(r.completed_at) AS completedAt,count(*) AS runs,max(${reportIndependent}) AS bestIndependent,max(r.total) AS total FROM session_results r JOIN learning_sessions s ON s.id=r.session_id WHERE r.household_id=? AND r.child_id=? AND r.lesson_id IS NOT NULL GROUP BY r.lesson_id`,
  )
    .bind(actor.householdId, actor.childId)
    .all();
  const due = await c.env.DB.prepare(
    "SELECT count(*) AS total FROM review_cards WHERE household_id=? AND child_id=? AND due_at<=?",
  )
    .bind(actor.householdId, actor.childId, Date.now())
    .first<{ total: number }>();
  const recent = await c.env.DB.prepare(
    `SELECT r.session_id AS sessionId,r.lesson_id AS lessonId,r.total,r.correct,${reportIndependent} AS independent,r.completed_at AS completedAt FROM session_results r JOIN learning_sessions s ON s.id=r.session_id WHERE r.household_id=? AND r.child_id=? ORDER BY r.completed_at DESC LIMIT 10`,
  )
    .bind(actor.householdId, actor.childId)
    .all();
  return c.json({
    completedLessons: completed.results,
    dueCount: due?.total ?? 0,
    recent: recent.results,
  });
});
app.get("/api/v1/learning/vocabulary", async (c) => {
  const actor = c.get("actor");
  const summary = await c.env.DB.prepare(
    "SELECT count(DISTINCT skill_id) AS practisedWords,count(DISTINCT CASE WHEN due_at<=? THEN skill_id END) AS dueWords FROM review_cards WHERE household_id=? AND child_id=? AND skill_id LIKE 'lexeme.word.%'",
  )
    .bind(Date.now(), actor.householdId, actor.childId)
    .first();
  return c.json(summary ?? { practisedWords: 0, dueWords: 0 });
});
app.post("/api/v1/learning/lessons/:id/view", async (c) => {
  const keys = lessonExampleKeys(c.req.param("id"));
  if (!keys.length)
    return c.json(fault("NOT_FOUND", "这节课还在准备中。"), 404);
  await recordExposure(c.env.DB, c.get("actor"), keys);
  return c.json({ saved: true });
});
app.post("/api/v1/learning/patterns/:id/view", async (c) => {
  const id = c.req.param("id"),
    preview = patternPreview(id);
  if (!preview) return c.json(fault("NOT_FOUND", "这个句式还在准备中。"), 404);
  const actor = c.get("actor"),
    keys = patternExampleKeys(id);
  await recordExposure(c.env.DB, actor, keys);
  const [key] = await hashedExposureKeys(keys);
  const now = Date.now();
  const saved = await c.env.DB.prepare(
    `SELECT 1 FROM teaching_exposures WHERE household_id=? AND child_id=? AND evidence_key=? AND shown_day=? AND ${grantAuthorization}`,
  )
    .bind(
      actor.householdId,
      actor.childId,
      key,
      localDay(now, actor.timezone),
      actor.grantId,
      now,
      now,
    )
    .first();
  if (!saved)
    return c.json(
      fault("AUTH_CHANGED", "档案权限有变化，请刷新后再打开例句。"),
      409,
    );
  return c.json({ saved: true, example: preview.example });
});
app.post("/api/v1/learning/concepts/:id/view", async (c) => {
  const lab = conceptLab(c.req.param("id"));
  if (!lab) return c.json(fault("NOT_FOUND", "这个互动示范还在准备中。"), 404);
  const body = await c.req.json();
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.caseId !== "string"
  )
    return c.json(fault("INVALID_CONCEPT", "请选择一个演示例子。"), 422);
  const example = lab.cases.find((row) => row.id === body.caseId);
  const keys = (conceptExposure.entries as Record<string, string[]>)[
    `${lab.id}/${body.caseId}`
  ];
  if (!example || !keys?.length)
    return c.json(
      fault("INVALID_CONCEPT", "请选择这个专题里的演示例子。"),
      422,
    );
  const actor = c.get("actor");
  await recordExposure(c.env.DB, actor, keys);
  const [key] = await hashedExposureKeys(keys),
    now = Date.now();
  const saved = await c.env.DB.prepare(
    `SELECT 1 FROM teaching_exposures WHERE household_id=? AND child_id=? AND evidence_key=? AND shown_day=? AND ${grantAuthorization}`,
  )
    .bind(
      actor.householdId,
      actor.childId,
      key,
      localDay(now, actor.timezone),
      actor.grantId,
      now,
      now,
    )
    .first();
  if (!saved)
    return c.json(
      fault("AUTH_CHANGED", "档案权限有变化，请刷新后再打开示范。"),
      409,
    );
  return c.json({ saved: true, example });
});
app.get("/api/v1/sessions/:id/snapshot", async (c) => {
  const actor = c.get("actor"),
    row = await loadSession(c.env.DB, actor, c.req.param("id"));
  return row
    ? c.json(
        await sessionSnapshot(
          c.env.DB,
          actor,
          row,
          c.req.header("X-EQ-Player-Version"),
        ),
      )
    : c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
});
app.get("/api/v1/sessions/:id", async (c) => {
  const actor = c.get("actor");
  const row = await loadSession(c.env.DB, actor, c.req.param("id"));
  if (!row) return c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
  return c.json(
    sessionPayload(row, actor, c.req.header("X-EQ-Player-Version")),
  );
});
app.post("/api/v1/sessions/:id/hint", async (c) => {
  const actor = c.get("actor"),
    row = await loadSession(c.env.DB, actor, c.req.param("id"));
  if (!row) return c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
  const body = await c.req.json();
  if (
    row.lease_grant_id !== actor.grantId ||
    (body?.leaseId !== undefined && body.leaseId !== row.lease_id)
  )
    return c.json(
      fault("LEASE_REPLACED", "这轮学习已换了设备，请先读取最新进度。"),
      409,
    );
  if (row.total > 1 && (!body || body.assignmentId !== row.assignment_id))
    return c.json(
      fault("SESSION_CHANGED", "题目已经变化，请重新打开当前练习。"),
      409,
    );
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE session_items SET hint_level=1 WHERE id=? AND household_id=? AND child_id=? AND NOT EXISTS(SELECT 1 FROM attempts WHERE assignment_id=session_items.id) AND EXISTS(SELECT 1 FROM learning_sessions WHERE id=session_items.session_id AND state='active' AND lease_id=? AND lease_grant_id=?) AND ${grantAuthorization}`,
    ).bind(
      row.assignment_id,
      actor.householdId,
      actor.childId,
      row.lease_id,
      actor.grantId,
      actor.grantId,
      Date.now(),
      Date.now(),
    ),
    ...(await exposureStatements(
      c.env.DB,
      actor,
      answerExposureKeys(exerciseVersion(row.item_id, row.item_version)!),
      Date.now(),
      {
        sql: "EXISTS(SELECT 1 FROM session_items si JOIN learning_sessions s ON s.id=si.session_id WHERE si.id=? AND si.hint_level=1 AND s.state='active' AND s.lease_id=? AND s.lease_grant_id=? AND NOT EXISTS(SELECT 1 FROM attempts a WHERE a.assignment_id=si.id))",
        params: [row.assignment_id, row.lease_id, actor.grantId],
      },
    )),
  ]);
  if (!results[0].meta.changes)
    return c.json(fault("SESSION_CHANGED", "这次作答已完成或已切换。"), 409);
  return c.json({
    hint: exerciseVersion(row.item_id, row.item_version)!.hint,
    independentEvidence: false,
  });
});
interface StoredAttempt {
  offline_prepared_at: number | null;
  event_id: string;
  answer_json: string;
  receipt_json: string;
  item_id: string;
  item_version: number;
  evidence_source: string;
  client_occurred_at: number | null;
}
interface StoredCard {
  stage: number;
  due_at: number;
  lapses: number;
  independent_successes: number;
  last_success_day: string | null;
  version: number;
}
app.post("/api/v1/attempts", async (c) => {
  const actor = c.get("actor");
  const body = await c.req.json<{
    eventId: string;
    sessionId: string;
    leaseId: string;
    assignmentId: string;
    answer: Answer;
    evidenceSource?: "offline_unverified";
    clientOccurredAt?: number;
  }>();
  if (!body || typeof body !== "object" || Array.isArray(body))
    return c.json(fault("INVALID_ATTEMPT", "答案或请求格式不正确。"), 422);
  if (
    (body.evidenceSource !== undefined &&
      body.evidenceSource !== "offline_unverified") ||
    (body.evidenceSource === "offline_unverified" &&
      (!Number.isSafeInteger(body.clientOccurredAt) ||
        body.clientOccurredAt! < 0 ||
        body.clientOccurredAt! > Date.now() + 300000)) ||
    ![body.eventId, body.sessionId, body.leaseId, body.assignmentId].every(
      (id) => typeof id === "string" && UUID.test(id),
    ) ||
    !(
      typeof body.answer === "string" ||
      (Array.isArray(body.answer) &&
        body.answer.length <= 16 &&
        body.answer.every((t) => typeof t === "string" && t.length <= 100))
    ) ||
    !normalise(body.answer) ||
    normalise(body.answer).length > 500
  )
    return c.json(fault("INVALID_ATTEMPT", "答案或请求格式不正确。"), 422);
  const prior = () =>
    c.env.DB.prepare(
      "SELECT a.event_id,a.answer_json,a.receipt_json,a.evidence_source,a.client_occurred_at,si.item_id,si.item_version,si.offline_prepared_at FROM attempts a JOIN session_items si ON si.id=a.assignment_id WHERE a.household_id=? AND a.child_id=? AND (a.event_id=? OR a.assignment_id=?)",
    )
      .bind(actor.householdId, actor.childId, body.eventId, body.assignmentId)
      .first<StoredAttempt>();
  const respondPrior = async (stored: StoredAttempt) => {
    const canonical = structuredCanonical(
      exerciseVersion(stored.item_id, stored.item_version)!,
      body.answer,
    );
    if (
      canonical !== null &&
      stored.answer_json === canonical &&
      stored.evidence_source ===
        (body.evidenceSource ??
          (stored.offline_prepared_at !== null
            ? "offline_unverified"
            : "online")) &&
      (stored.client_occurred_at !== null) === !!body.evidenceSource &&
      (!body.evidenceSource ||
        stored.client_occurred_at === body.clientOccurredAt)
    ) {
      await recordExposure(
        c.env.DB,
        actor,
        answerExposureKeys(
          exerciseVersion(stored.item_id, stored.item_version)!,
        ),
      );
      return c.json(JSON.parse(stored.receipt_json) as Receipt);
    }
    return c.json(
      fault("IDEMPOTENCY_MISMATCH", "此编号已经提交过另一个答案。"),
      409,
    );
  };
  for (let retry = 0; retry < 3; retry++) {
    const stored = await prior();
    if (stored) return respondPrior(stored);
    const row = await loadSession(c.env.DB, actor, body.sessionId);
    if (!row) return c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
    if (body.evidenceSource && row.cycle_id)
      return c.json(
        fault(
          "TRAINING_REQUIRES_ONLINE",
          "专题分步测验需要在线完成；离线草稿仍可保留。",
        ),
        409,
      );
    if (
      row.assignment_id !== body.assignmentId ||
      row.lease_id !== body.leaseId ||
      row.lease_grant_id !== actor.grantId ||
      row.state !== "active"
    )
      return c.json(
        fault("LEASE_REPLACED", "学习会话已切换，请重新打开练习。"),
        409,
      );
    const exercise = exerciseVersion(row.item_id, row.item_version)!;
    if (exercise.type === "listen" && !row.heard_at && !row.transcript_at)
      return c.json(
        fault(
          "LISTENING_INPUT_REQUIRED",
          "请先播放并确认听到，或选择文字辅助，再检查答案。",
        ),
        409,
      );
    const canonical = structuredCanonical(exercise, body.answer);
    if (canonical === null)
      return c.json(
        fault(
          "INCOMPLETE_ANSWER",
          "请放好每张卡，或选出一个词块并填写修改，再一起检查。",
        ),
        422,
      );
    const evidenceKeys = await hashedExposureKeys(answerExposureKeys(exercise));
    const offline = !!body.evidenceSource || row.offline_prepared_at !== null;
    const support = offline
      ? "offline"
      : exercise.type === "listen" && row.transcript_at
        ? "transcript"
        : row.hint_level
          ? "hint"
          : (await exampleShownToday(c.env.DB, actor, exercise))
            ? "example"
            : undefined;
    const correct = gradeAnswer(exercise, body.answer);
    const outcome = !correct ? "incorrect" : support ? "hinted" : "correct";
    const now = Date.now(),
      day = localDay(now, actor.timezone);
    const child = await c.env.DB.prepare(
      "SELECT stream_version FROM children WHERE household_id=? AND id=?",
    )
      .bind(actor.householdId, actor.childId)
      .first<{ stream_version: number }>();
    const old = await c.env.DB.prepare(
      "SELECT * FROM review_cards WHERE household_id=? AND child_id=? AND skill_id=? AND modality=?",
    )
      .bind(actor.householdId, actor.childId, exercise.skill, exercise.modality)
      .first<StoredCard>();
    const card: Card | null = old
      ? {
          stage: old.stage,
          dueDay: localDay(old.due_at, actor.timezone),
          lapses: old.lapses,
          independentSuccesses: old.independent_successes,
          lastSuccessDay: old.last_success_day,
          version: old.version,
        }
      : null;
    const next = schedule(card, day, offline ? "hinted" : outcome),
      sequence = child!.stream_version + 1;
    const receipt: Receipt = {
      ...structuredFeedback(exercise, body.answer),
      ...(support ? { support } : {}),
      eventId: body.eventId,
      outcome,
      independentEvidence: outcome === "correct",
      feedback: exercise.explanation,
      nextReviewDay: next.dueDay,
      rewardDelta: offline ? 0 : 1,
      serverSequence: sequence,
    };
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE children SET stream_version=stream_version+1 WHERE id=? AND household_id=? AND stream_version=? AND ${grantAuthorization} AND EXISTS(SELECT 1 FROM learning_sessions s JOIN session_items si ON si.session_id=s.id WHERE s.id=? AND s.lease_id=? AND s.lease_grant_id=? AND s.state='active' AND si.id=? AND si.hint_level=? AND COALESCE(si.offline_prepared_at,0)=?) ${outcome === "correct" ? `AND ${exposurePredicate(answerExposureKeys(exercise).length)}` : ""}`,
        ).bind(
          actor.childId,
          actor.householdId,
          child!.stream_version,
          actor.grantId,
          now,
          now,
          body.sessionId,
          body.leaseId,
          actor.grantId,
          body.assignmentId,
          row.hint_level,
          row.offline_prepared_at ?? 0,
          ...(outcome === "correct"
            ? [actor.householdId, actor.childId, day, ...evidenceKeys]
            : []),
        ),
        c.env.DB.prepare(
          "INSERT INTO commit_assertions(event_id,household_id,child_id,ok) VALUES(?,?,?,changes())",
        ).bind(body.eventId, actor.householdId, actor.childId),
        c.env.DB.prepare(
          `INSERT INTO attempts(event_id,household_id,child_id,assignment_id,server_sequence,answer_json,outcome,independent_evidence,evidence_source,received_at,client_occurred_at,algorithm_version,receipt_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,'rules-v3-offline',?)`,
        ).bind(
          body.eventId,
          actor.householdId,
          actor.childId,
          body.assignmentId,
          sequence,
          canonical,
          outcome,
          Number(outcome === "correct"),
          offline ? "offline_unverified" : "online",
          now,
          body.evidenceSource ? body.clientOccurredAt! : null,
          JSON.stringify(receipt),
        ),
        ...(await exposureStatements(
          c.env.DB,
          actor,
          answerExposureKeys(exercise),
          now,
        )),
        c.env.DB.prepare(
          `INSERT INTO review_cards(household_id,child_id,skill_id,modality,stage,due_at,lapses,independent_successes,last_success_day,version,algorithm_version) VALUES(?,?,?,?,?,?,?,?,?,?,'rules-v3-offline') ON CONFLICT(child_id,skill_id,modality) DO UPDATE SET stage=excluded.stage,due_at=excluded.due_at,lapses=excluded.lapses,independent_successes=excluded.independent_successes,last_success_day=excluded.last_success_day,version=excluded.version,algorithm_version=excluded.algorithm_version`,
        ).bind(
          actor.householdId,
          actor.childId,
          exercise.skill,
          exercise.modality,
          next.stage,
          midnight(next.dueDay, actor.timezone),
          next.lapses,
          next.independentSuccesses,
          next.lastSuccessDay,
          next.version,
        ),
        c.env.DB.prepare(
          "INSERT INTO reward_ledger(id,household_id,child_id,source_attempt_id,delta,reason) VALUES(?,?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          actor.householdId,
          actor.childId,
          body.eventId,
          offline ? 0 : 1,
          offline ? "offline_practice" : "participation",
        ),
      ]);
      return c.json(receipt, 201);
    } catch (error) {
      const completed = await prior();
      if (completed) return respondPrior(completed);
      if (retry === 2) {
        console.error(
          JSON.stringify({
            requestId: c.get("requestId"),
            errorType: error instanceof Error ? error.name : "Unknown",
          }),
        );
        return c.json(
          fault("VERSION_CONFLICT", "保存遇到冲突，请用同一答案重试。"),
          409,
        );
      }
    }
  }
  return c.json(fault("VERSION_CONFLICT", "请重试保存。"), 409);
});
app.get("/api/v1/progress", async (c) => {
  const { householdId, childId } = c.get("actor");
  const summary = await c.env.DB.prepare(
    "SELECT COUNT(*) AS answered,COALESCE(SUM(CASE WHEN outcome IN ('correct','hinted') THEN 1 ELSE 0 END),0) AS correct FROM attempts WHERE household_id=? AND child_id=?",
  )
    .bind(householdId, childId)
    .first();
  const reward = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(delta),0) AS stars FROM reward_ledger WHERE household_id=? AND child_id=?",
  )
    .bind(householdId, childId)
    .first();
  const cards = await c.env.DB.prepare(
    "SELECT r.skill_id AS skillId,r.modality,s.label, r.stage,r.due_at AS dueAt,r.lapses FROM review_cards r JOIN skills s ON s.id=r.skill_id WHERE r.household_id=? AND r.child_id=? ORDER BY r.due_at,r.skill_id,r.modality LIMIT 30",
  )
    .bind(householdId, childId)
    .all();
  const recent = await c.env.DB.prepare(
    "SELECT outcome,received_at AS receivedAt FROM attempts WHERE household_id=? AND child_id=? ORDER BY received_at DESC LIMIT 10",
  )
    .bind(householdId, childId)
    .all();
  return c.json({
    ...summary,
    ...reward,
    cards: cards.results,
    recent: recent.results,
  });
});
app.notFound((c) => c.json(fault("NOT_FOUND", "找不到这个API。"), 404));
