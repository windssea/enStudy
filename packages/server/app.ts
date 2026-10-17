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
  courseRelease,
  exerciseById,
  topicRelease,
  patternRelease,
  vocabularyRelease,
  wordThemes,
} from "./exercises";
import {
  selectReviewItems,
  selectTopicItems,
  shuffle,
  type ReviewTarget,
} from "../domain/selection";
import type { Answer, LearningSession, Receipt } from "../contracts/index";
import { authRoutes, readAdult, readAccountActor, logoutAccount } from "./auth";
import { managedAccountRoutes } from "./managedAccounts";
import { createAiRoutes } from "./aiRoutes";
import type { AiConfig } from "./aiPolicy";

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
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
app.use(
  "*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: (c) => c.json(fault("BODY_TOO_LARGE", "请求内容过大。"), 413),
  }),
);
app.onError((error, c) => {
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
    databaseBinding: Boolean(c.env.DB),
  }),
);
app.get("/api/v1/exercises", (c) =>
  c.json({ items: sampleList(), contentState: "development-samples" }),
);
app.get("/api/v1/lessons", (c) =>
  c.json({
    release: courseRelease.id,
    lessons: courseRelease.lessons,
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
])
  app.use(path, learningAccess);
app.route("/api/v1", createAiRoutes(actorFrom));
interface Assignment {
  id: string;
  lease_id: string;
  lease_grant_id: string | null;
  lease_version: number;
  assignment_id: string;
  item_id: string;
  hint_level: number;
  state: LearningSession["state"];
  cursor: number;
  total: number;
  lesson_id: string | null;
  source: "lesson" | "topic" | "pattern" | "vocabulary" | "review" | "single";
  source_ref: string | null;
  presentation_json: string | null;
}
async function loadSession(
  db: D1Database,
  actor: Actor,
  id: string,
): Promise<Assignment | null> {
  return db
    .prepare(
      `SELECT s.id,s.lease_id,s.lease_grant_id,s.lease_version,s.state,s.cursor,s.lesson_id,s.source,s.source_ref,si.id AS assignment_id,si.item_id,si.hint_level,si.presentation_json,(SELECT count(*) FROM session_items all_items WHERE all_items.session_id=s.id) AS total FROM learning_sessions s JOIN session_items si ON si.session_id=s.id AND si.household_id=s.household_id AND si.child_id=s.child_id AND si.position=s.cursor WHERE s.id=? AND s.household_id=? AND s.child_id=?`,
    )
    .bind(id, actor.householdId, actor.childId)
    .first<Assignment>();
}
function sessionPayload(row: Assignment, actor: Actor): LearningSession {
  return {
    id: row.id,
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
    position: row.cursor + 1,
    total: row.total,
    lessonId: row.lesson_id,
    source: row.source,
    exercise: {
      ...publicExercise(exerciseById.get(row.item_id)!),
      ...(row.presentation_json ? JSON.parse(row.presentation_json) : {}),
    },
  };
}
const grantAuthorization =
  "EXISTS(SELECT 1 FROM child_grants g WHERE g.id=? AND g.revoked_at IS NULL AND g.expires_at>? AND (g.parent_session_id IS NULL OR EXISTS(SELECT 1 FROM account_sessions p WHERE p.id=g.parent_session_id AND p.revoked_at IS NULL AND p.expires_at>?)))";
async function sessionSnapshot(db: D1Database, actor: Actor, row: Assignment) {
  const attempt = await db
    .prepare(
      "SELECT receipt_json FROM attempts WHERE assignment_id=? AND household_id=? AND child_id=?",
    )
    .bind(row.assignment_id, actor.householdId, actor.childId)
    .first<{ receipt_json: string }>();
  return {
    childId: actor.childId,
    session: sessionPayload(row, actor),
    receipt: attempt ? JSON.parse(attempt.receipt_json) : null,
    hint: row.hint_level ? exerciseById.get(row.item_id)?.hint : null,
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
      ? await sessionSnapshot(c.env.DB, actor, row)
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
    body.expectedLeaseVersion < 0
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
    return c.json(await sessionSnapshot(c.env.DB, actor, current));
  };
  const saved = await prior();
  if (saved) return replay(saved);
  if (row.state !== "active" || row.lease_version !== body.expectedLeaseVersion)
    return c.json(
      fault("LEASE_REPLACED", "进度已变化，请刷新后再选择接着学。"),
      409,
    );
  const lease = crypto.randomUUID(),
    now = Date.now();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE learning_sessions SET lease_id=?,lease_grant_id=?,lease_version=lease_version+1 WHERE id=? AND household_id=? AND child_id=? AND state='active' AND lease_version=? AND ${grantAuthorization}`,
      ).bind(
        lease,
        actor.grantId,
        id,
        actor.householdId,
        actor.childId,
        body.expectedLeaseVersion,
        actor.grantId,
        now,
        now,
      ),
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
    body.mode === "review",
  ];
  if (
    ["exerciseId", "lessonId", "topicId", "patternId", "wordThemeId"].some(
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
    (!(body.topicId || body.patternId || body.wordThemeId) ||
      ![5, 10, 20].includes(body.roundSize))
  )
    return c.json(
      fault("INVALID_ROUND_SIZE", "特训每轮可选5、10或20题。"),
      422,
    );
  if (
    body.wordMode !== undefined &&
    (!body.wordThemeId ||
      !["mixed", "meaning", "spelling", "context"].includes(body.wordMode))
  )
    return c.json(
      fault("INVALID_WORD_MODE", "请选择词义、拼写、语境或混合练习。"),
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
          : body.mode === "review"
            ? "review"
            : "single";
  const reference = String(
    body.lessonId ??
      body.topicId ??
      body.patternId ??
      body.wordThemeId ??
      body.exerciseId ??
      "due",
  );
  const sourceRef = `${source}:${reference}${["topic", "pattern", "vocabulary"].includes(source) ? `:${body.roundSize ?? 10}` : ""}${source === "vocabulary" ? `:${body.wordMode ?? "mixed"}` : ""}`;
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
    return c.json(sessionPayload(existing, actor));
  }
  const lesson = courseRelease.lessons.find(
    (lesson) => lesson.id === body.lessonId,
  );
  let selected =
    source === "lesson"
      ? exercises.filter((item) => item.lessonId === lesson?.id)
      : source === "single"
        ? exercises.filter((item) => item.id === body.exerciseId)
        : [];
  if (source === "lesson" && !lesson) selected = [];
  if (["topic", "pattern", "vocabulary"].includes(source)) {
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
      source === "vocabulary"
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
          : topicRelease.items.filter((item) => item.topicId === body.topicId),
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
  const release = selected.some((item) => item.wordThemeId)
    ? vocabularyRelease.id
    : selected.some((item) => item.patternId)
      ? patternRelease.id
      : selected.some((item) => item.topicId)
        ? topicRelease.id
        : selected.some((item) => item.lessonId)
          ? courseRelease.id
          : "dev-samples-v1";
  const publication = await c.env.DB.prepare(
    `SELECT status,(SELECT count(*) FROM release_items ri WHERE ri.release_id=content_releases.id AND ri.item_id IN (${selected.map(() => "?").join(",")})) AS itemCount FROM content_releases WHERE id=?`,
  )
    .bind(...selected.map((item) => item.id), release)
    .first<{ status: string; itemCount: number }>();
  if (
    publication?.status !== "published" ||
    publication.itemCount !== selected.length
  )
    return c.json(
      fault("CONTENT_UNAVAILABLE", "这份内容暂时不可用，请换一份任务。"),
      409,
    );
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
        `INSERT INTO learning_sessions(id,household_id,child_id,release_id,lease_id,state,created_at,lesson_id,source,source_ref,lease_grant_id) SELECT ?,?,?,?,?,'active',?,?,?,?,? WHERE ${grantAuthorization} AND NOT EXISTS(SELECT 1 FROM learning_sessions s WHERE s.household_id=? AND s.child_id=? AND s.state='active' AND (s.lease_grant_id IS NULL OR s.lease_grant_id<>?))`,
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
      ),
      ...selected.map((item, index) =>
        c.env.DB.prepare(
          `INSERT INTO session_items(id,household_id,child_id,session_id,position,item_id,item_version,presentation_json) SELECT ?,?,?,?,?,?,1,? WHERE ${createdHere}`,
        ).bind(
          crypto.randomUUID(),
          actor.householdId,
          actor.childId,
          body.clientRequestId,
          index,
          item.id,
          JSON.stringify({
            ...(item.choices ? { choices: shuffle(item.choices) } : {}),
            ...(item.tokens ? { tokens: shuffle(item.tokens) } : {}),
          }),
          body.clientRequestId,
          lease,
          actor.grantId,
        ),
      ),
    ]);
  } catch (error) {
    const concurrent = await loadSession(c.env.DB, actor, body.clientRequestId);
    if (concurrent?.source_ref === sourceRef && concurrent.state === "active")
      return c.json(sessionPayload(concurrent, actor));
    throw error;
  }
  const created = await loadSession(c.env.DB, actor, body.clientRequestId);
  return created
    ? c.json(sessionPayload(created, actor), 201)
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
      "SELECT session_id AS sessionId,lesson_id AS lessonId,total,correct,independent,completed_at AS completedAt FROM session_results WHERE session_id=? AND household_id=? AND child_id=?",
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
    return c.json({ session: sessionPayload(row, actor) });
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
    return c.json({ session: sessionPayload(updated, actor) });
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
    "SELECT lesson_id AS lessonId,max(completed_at) AS completedAt,count(*) AS runs,max(independent) AS bestIndependent,max(total) AS total FROM session_results WHERE household_id=? AND child_id=? AND lesson_id IS NOT NULL GROUP BY lesson_id",
  )
    .bind(actor.householdId, actor.childId)
    .all();
  const due = await c.env.DB.prepare(
    "SELECT count(*) AS total FROM review_cards WHERE household_id=? AND child_id=? AND due_at<=?",
  )
    .bind(actor.householdId, actor.childId, Date.now())
    .first<{ total: number }>();
  const recent = await c.env.DB.prepare(
    "SELECT session_id AS sessionId,lesson_id AS lessonId,total,correct,independent,completed_at AS completedAt FROM session_results WHERE household_id=? AND child_id=? ORDER BY completed_at DESC LIMIT 10",
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
app.get("/api/v1/sessions/:id", async (c) => {
  const actor = c.get("actor");
  const row = await loadSession(c.env.DB, actor, c.req.param("id"));
  if (!row) return c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
  return c.json(sessionPayload(row, actor));
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
  const result = await c.env.DB.prepare(
    `UPDATE session_items SET hint_level=1 WHERE id=? AND household_id=? AND child_id=? AND NOT EXISTS(SELECT 1 FROM attempts WHERE assignment_id=session_items.id) AND EXISTS(SELECT 1 FROM learning_sessions WHERE id=session_items.session_id AND state='active' AND lease_id=? AND lease_grant_id=?) AND ${grantAuthorization}`,
  )
    .bind(
      row.assignment_id,
      actor.householdId,
      actor.childId,
      row.lease_id,
      actor.grantId,
      actor.grantId,
      Date.now(),
      Date.now(),
    )
    .run();
  if (!result.meta.changes)
    return c.json(fault("SESSION_CHANGED", "这次作答已完成或已切换。"), 409);
  return c.json({
    hint: exerciseById.get(row.item_id)!.hint,
    independentEvidence: false,
  });
});
interface StoredAttempt {
  event_id: string;
  answer_json: string;
  receipt_json: string;
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
  }>();
  if (!body || typeof body !== "object" || Array.isArray(body))
    return c.json(fault("INVALID_ATTEMPT", "答案或请求格式不正确。"), 422);
  if (
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
  const canonical = JSON.stringify(normalise(body.answer));
  const prior = () =>
    c.env.DB.prepare(
      "SELECT event_id,answer_json,receipt_json FROM attempts WHERE household_id=? AND child_id=? AND (event_id=? OR assignment_id=?)",
    )
      .bind(actor.householdId, actor.childId, body.eventId, body.assignmentId)
      .first<StoredAttempt>();
  const respondPrior = (stored: StoredAttempt) =>
    stored.answer_json === canonical
      ? c.json(JSON.parse(stored.receipt_json) as Receipt)
      : c.json(
          fault("IDEMPOTENCY_MISMATCH", "此编号已经提交过另一个答案。"),
          409,
        );
  for (let retry = 0; retry < 3; retry++) {
    const stored = await prior();
    if (stored) return respondPrior(stored);
    const row = await loadSession(c.env.DB, actor, body.sessionId);
    if (!row) return c.json(fault("NOT_FOUND", "找不到这次学习。"), 404);
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
    const exercise = exerciseById.get(row.item_id)!;
    const correct = gradeAnswer(exercise, body.answer);
    const outcome = !correct
      ? "incorrect"
      : row.hint_level
        ? "hinted"
        : "correct";
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
    const next = schedule(card, day, outcome),
      sequence = child!.stream_version + 1;
    const receipt: Receipt = {
      eventId: body.eventId,
      outcome,
      independentEvidence: outcome === "correct",
      feedback: exercise.explanation,
      nextReviewDay: next.dueDay,
      rewardDelta: 1,
      serverSequence: sequence,
    };
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE children SET stream_version=stream_version+1 WHERE id=? AND household_id=? AND stream_version=? AND ${grantAuthorization} AND EXISTS(SELECT 1 FROM learning_sessions s JOIN session_items si ON si.session_id=s.id WHERE s.id=? AND s.lease_id=? AND s.lease_grant_id=? AND s.state='active' AND si.id=? AND si.hint_level=?)`,
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
        ),
        c.env.DB.prepare(
          "INSERT INTO commit_assertions(event_id,household_id,child_id,ok) VALUES(?,?,?,changes())",
        ).bind(body.eventId, actor.householdId, actor.childId),
        c.env.DB.prepare(
          `INSERT INTO attempts(event_id,household_id,child_id,assignment_id,server_sequence,answer_json,outcome,independent_evidence,evidence_source,received_at,algorithm_version,receipt_json) VALUES(?,?,?,?,?,?,?,?,'online',?,'rules-v1',?)`,
        ).bind(
          body.eventId,
          actor.householdId,
          actor.childId,
          body.assignmentId,
          sequence,
          canonical,
          outcome,
          Number(outcome === "correct"),
          now,
          JSON.stringify(receipt),
        ),
        c.env.DB.prepare(
          `INSERT INTO review_cards(household_id,child_id,skill_id,modality,stage,due_at,lapses,independent_successes,last_success_day,version) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(child_id,skill_id,modality) DO UPDATE SET stage=excluded.stage,due_at=excluded.due_at,lapses=excluded.lapses,independent_successes=excluded.independent_successes,last_success_day=excluded.last_success_day,version=excluded.version`,
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
          "INSERT INTO reward_ledger(id,household_id,child_id,source_attempt_id,delta,reason) VALUES(?,?,?,?,1,'participation')",
        ).bind(
          crypto.randomUUID(),
          actor.householdId,
          actor.childId,
          body.eventId,
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
    "SELECT r.skill_id AS skillId,s.label, r.stage,r.due_at AS dueAt,r.lapses FROM review_cards r JOIN skills s ON s.id=r.skill_id WHERE r.household_id=? AND r.child_id=? ORDER BY r.due_at LIMIT 30",
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
