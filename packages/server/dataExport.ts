import { Hono } from "hono";
import {
  readAdult,
  sessionHouseholdSql,
  type AdultSession,
  type AuthEnv,
} from "./auth";
import { verifyAdultPassword } from "./adultVerification";
import {
  exportSections,
  type ExportJob,
  type ExportManifest,
  type ExportSection,
} from "../contracts/dataExport";
import {
  exportExclusions,
  exportLifetime,
  validExportRequestId,
} from "../domain/dataExport";
type B = { Bindings: AuthEnv; Variables: { adult: AdultSession } };
export const dataExportRoutes = new Hono<B>();
const fault = (code: string, message: string) => ({ error: { code, message } });
const owner = `EXISTS(SELECT 1 FROM account_sessions s JOIN account_credentials a ON a.adult_id=s.adult_id JOIN household_members m ON m.adult_id=s.adult_id AND m.household_id=${sessionHouseholdSql} WHERE s.id=? AND s.adult_id=? AND m.household_id=? AND s.context_version=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.disabled_at IS NULL AND a.must_change_password=0 AND a.credential_version=? AND m.role='owner')`;
const args = (a: AdultSession, now = Date.now()) => [
  a.id,
  a.adultId,
  a.householdId,
  a.contextVersion,
  now,
  a.credentialVersion,
];
const scope = (a: AdultSession, now = Date.now()) => [
  a.householdId,
  a.adultId,
  a.id,
  a.contextVersion,
  a.credentialVersion,
  now,
  ...args(a, now),
];
const accessible = `j.household_id=? AND j.adult_id=? AND j.session_id=? AND j.context_version=? AND j.credential_version=? AND j.expires_at>? AND j.state='ready' AND ${owner}`;
const missing = () =>
  fault(
    "EXPORT_UNAVAILABLE",
    "数据包已到期、被移除，或不属于当前登录。请核对家庭后重新生成。",
  );
// This list is deliberately explicit. Never export a new column just because a
// table gains one; credentials, leases and encrypted AI payloads are excluded.
const simple = (
  table: string,
  fields: string,
  order: string,
  where = "t.household_id=?",
  joins = "",
) => ({
  table,
  order,
  where,
  joins,
  fields: fields.split(",").map((f) => [f, `t.${f}`] as [string, string]),
});
const sources = [
  simple("households", "id,name,created_at", "t.id", "t.id=?"),
  {
    ...simple("household_members", "adult_id,role", "t.adult_id"),
    joins: "LEFT JOIN account_credentials a ON a.adult_id=t.adult_id",
    extra: [["username", "a.username"]],
  },
  simple(
    "children",
    "id,nickname,grade,timezone,locale,stream_version,created_at",
    "t.id",
  ),
  simple(
    "child_companions",
    "child_id,companion_id,version,updated_at",
    "t.child_id",
  ),
  simple(
    "learning_sessions",
    "id,child_id,release_id,state,created_at,cursor,lesson_id,source,source_ref",
    "t.created_at,t.id",
  ),
  {
    ...simple(
      "session_items",
      "id,child_id,session_id,position,item_id,item_version,hint_level,revealed_at,content_release_id,offline_prepared_at",
      "t.session_id,t.position",
    ),
    joins: "JOIN items i ON i.id=t.item_id AND i.version=t.item_version",
    extra: [
      ["presentation", "json(t.presentation_json)"],
      ["question", "json(i.public_json)"],
    ],
  },
  {
    ...simple(
      "attempts",
      "event_id,child_id,assignment_id,server_sequence,outcome,independent_evidence,evidence_source,received_at,client_occurred_at,algorithm_version",
      "t.child_id,t.server_sequence",
    ),
    extra: [
      ["answer", "json(t.answer_json)"],
      ["receipt", "json(t.receipt_json)"],
    ],
  },
  simple(
    "session_results",
    "session_id,child_id,lesson_id,total,correct,independent,completed_at",
    "t.completed_at,t.session_id",
  ),
  simple(
    "review_cards",
    "child_id,skill_id,modality,stage,due_at,lapses,independent_successes,last_success_day,version,algorithm_version",
    "t.child_id,t.skill_id,t.modality",
  ),
  simple("reward_ledger", "id,child_id,source_attempt_id,delta,reason", "t.id"),
  simple(
    "training_cycles",
    "id,child_id,topic_id,plan_version,version,created_at,material_release_id,material_adopted_at",
    "t.created_at,t.id",
  ),
  {
    ...simple(
      "training_phase_runs",
      "cycle_id,phase,checkpoint,session_id",
      "t.cycle_id,t.phase,t.checkpoint",
      "c.household_id=?",
      "JOIN training_cycles c ON c.id=t.cycle_id",
    ),
    extra: [["child_id", "c.child_id"]],
  },
  simple(
    "teaching_exposures",
    "child_id,evidence_key,shown_day,shown_at",
    "t.child_id,t.shown_day,t.evidence_key",
  ),
  simple(
    "listening_inputs",
    "assignment_id,child_id,heard_at,transcript_at",
    "t.assignment_id",
  ),
  {
    ...simple(
      "writing_drafts",
      "id,child_id,prompt_id,prompt_version,title,plan,revision,created_at,updated_at",
      "t.child_id,t.created_at,t.id",
    ),
    extra: [
      ["prompt", "json(t.prompt_json)"],
      ["paragraphs", "json(t.paragraphs_json)"],
      ["self_checks", "json(t.checks_json)"],
    ],
  },
  {
    ...simple(
      "ai_settings",
      "active_connection_id,enabled,daily_calls,daily_units,child_calls,consent_at,version",
      "t.household_id",
    ),
    extra: [
      [
        "writing_review",
        "json((SELECT json_object('connection_id',w.connection_id,'connection_version',w.connection_version,'enabled',w.enabled,'consent_at',w.consent_at,'version',w.version) FROM ai_writing_settings w WHERE w.household_id=t.household_id))",
      ],
    ],
  },
  simple(
    "ai_voice_settings",
    "text_connection_id,asr_connection_id,tts_connection_id,asr_model,tts_model,tts_voice,text_enabled,asr_enabled,tts_enabled,consent_at,audio_consent_at,child_turns,child_audio_ms,family_audio_ms,child_tts_chars,family_tts_chars,version",
    "t.household_id",
  ),
  {
    ...simple(
      "ai_connections",
      "id,label,adapter,base_url,model,state,created_at,version,policy_url,token_parameter,instruction_role,tested_version",
      "t.created_at,t.id",
    ),
    extra: [["capabilities", "json(t.capabilities_json)"]],
  },
  simple(
    "ai_usage",
    "request_id,connection_id,child_id,state,reserved_units,actual_units,unit_type,created_at",
    "t.created_at,t.request_id",
  ),
  simple("ai_daily_budget", "day,calls,units", "t.day"),
  simple("ai_child_budget", "child_id,day,calls", "t.day,t.child_id"),
  simple(
    "ai_voice_budget",
    "subject,day,turns,audio_ms,tts_chars",
    "t.day,t.subject",
  ),
  {
    ...simple(
      "training_runs",
      "id,child_id,session_id,topic_id,topic_version,phase,state,created_at",
      "t.created_at,t.id",
    ),
    extra: [["summary", "json(t.summary_json)"]],
  },
  simple(
    "household_invitations",
    "id,recipient_id,invited_by,role,created_at,expires_at,accepted_at,revoked_at",
    "t.created_at,t.id",
  ),
  simple(
    "household_membership_audit",
    "id,actor_ref,target_ref,operation,created_at",
    "t.created_at,t.id",
  ),
];
export const exportSourceFields = sources.map((s, i) => ({
  section: exportSections[i][0],
  table: s.table,
  fields: [...s.fields, ...("extra" in s ? s.extra : [])].map(([name]) => name),
}));
const copyPart = (
  db: D1Database,
  household: string,
  id: string,
  build: string,
  index: number,
) => {
  const s = sources[index],
    fields = [...s.fields, ...("extra" in s ? s.extra : [])],
    json = fields.flatMap(([key, value]) => [`'${key}'`, value]).join(",");
  return db
    .prepare(
      `INSERT INTO family_export_parts(export_id,section,part,row_count,data_json) SELECT ?,?,CAST((rn-1)/25 AS INTEGER),COUNT(*),json_group_array(json(row_data)) FROM (SELECT row_number() OVER(ORDER BY ${s.order}) AS rn,json_object(${json}) AS row_data FROM ${s.table} t ${s.joins} WHERE ${s.where}) WHERE EXISTS(SELECT 1 FROM family_exports WHERE id=? AND build_id=? AND state='building') GROUP BY CAST((rn-1)/25 AS INTEGER)`,
    )
    .bind(id, exportSections[index][0], household, id, build);
};
async function cleanup(db: D1Database, now: number) {
  await db.batch([
    db.prepare("DELETE FROM family_exports WHERE expires_at<=?").bind(now),
    db
      .prepare("DELETE FROM family_export_commands WHERE created_at<?")
      .bind(now - 24 * 3600_000),
  ]);
}
dataExportRoutes.use("/family/exports/*", async (c, next) => {
  const a = await readAdult(c);
  if (!a)
    return c.json(fault("ADULT_REQUIRED", "请家长登录后管理数据包。"), 401);
  if (a.mustChangePassword || a.role !== "owner" || !a.householdId)
    return c.json(
      fault("OWNER_REQUIRED", "请由当前家庭的管理家长生成和下载数据包。"),
      403,
    );
  c.set("adult", a);
  // Expiry is enforced in every read even if opportunistic cleanup fails under
  // free-tier write limits. Cleanup never determines whether access is granted.
  c.executionCtx.waitUntil(cleanup(c.env.DB, Date.now()).catch(() => {}));
  await next();
});
async function job(db: D1Database, a: AdultSession, id: string) {
  return db
    .prepare(
      `SELECT j.id,j.created_at AS createdAt,j.expires_at AS expiresAt,coalesce(sum(p.row_count),0) AS rows,count(p.part) AS parts,coalesce(sum(length(CAST(p.data_json AS BLOB))),0) AS dataBytes FROM family_exports j LEFT JOIN family_export_parts p ON p.export_id=j.id WHERE j.id=? AND ${accessible} GROUP BY j.id`,
    )
    .bind(id, ...scope(a))
    .first<ExportJob>();
}
dataExportRoutes.get("/family/exports/list", async (c) => {
  const a = c.get("adult"),
    rows = await c.env.DB.prepare(
      `SELECT j.id FROM family_exports j WHERE ${accessible} ORDER BY j.created_at DESC`,
    )
      .bind(...scope(a))
      .all<{ id: string }>();
  const jobs = await Promise.all(
    rows.results.map((r) => job(c.env.DB, a, r.id)),
  );
  return c.json({ items: jobs.filter(Boolean), lifetimeMs: exportLifetime });
});
dataExportRoutes.post("/family/exports/create", async (c) => {
  const b = await c.req.json().catch(() => null),
    a = c.get("adult");
  if (
    !b ||
    typeof b !== "object" ||
    Array.isArray(b) ||
    !validExportRequestId(b.requestId) ||
    b.householdId !== a.householdId ||
    b.confirmed !== true
  )
    return c.json(
      fault("INVALID_EXPORT", "请确认当前家庭和导出范围，再重新验证密码。"),
      422,
    );
  const verified = await verifyAdultPassword(c, a, b.currentPassword);
  if ("response" in verified) return verified.response;
  const prior = await c.env.DB.prepare(
    "SELECT household_id,session_id,state FROM family_export_commands WHERE id=?",
  )
    .bind(b.requestId)
    .first<{ household_id: string; session_id: string; state: string }>();
  if (prior) {
    if (prior.household_id !== a.householdId || prior.session_id !== a.id)
      return c.json(
        fault("IDEMPOTENCY_MISMATCH", "此请求编号已经使用，请重新开始导出。"),
        409,
      );
    const saved = await job(c.env.DB, a, b.requestId);
    return saved
      ? c.json({ job: saved, replayed: true })
      : c.json(
          fault(
            "EXPORT_REMOVED",
            "原数据包已失效；请重新生成，不能用旧请求重新创建。",
          ),
          409,
        );
  }
  const now = Date.now(),
    build = crypto.randomUUID();
  let createdThisCall = false;
  try {
    const committed = await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM family_exports WHERE expires_at<=?").bind(
        now,
      ),
      c.env.DB.prepare(
        `INSERT INTO family_export_commands(id,household_id,adult_id,session_id,build_id,state,created_at) SELECT ?,?,?,?,?,'ready',? WHERE ${owner} AND EXISTS(SELECT 1 FROM account_credentials WHERE adult_id=? AND password_hash=? AND credential_version=?) AND NOT EXISTS(SELECT 1 FROM family_export_commands WHERE id=?) AND NOT EXISTS(SELECT 1 FROM family_exports WHERE household_id=? AND session_id=?)`,
      ).bind(
        b.requestId,
        a.householdId,
        a.adultId,
        a.id,
        build,
        now,
        ...args(a, now),
        a.adultId,
        verified.credential.password_hash,
        verified.credential.credential_version,
        b.requestId,
        a.householdId,
        a.id,
      ),
      c.env.DB.prepare(
        "INSERT INTO family_exports(id,household_id,adult_id,session_id,context_version,credential_version,build_id,created_at,expires_at,state) SELECT id,household_id,adult_id,session_id,?,?,build_id,?,?,'building' FROM family_export_commands WHERE id=? AND build_id=?",
      ).bind(
        a.contextVersion,
        a.credentialVersion,
        now,
        now + exportLifetime,
        b.requestId,
        build,
      ),
      ...sources.map((_, i) =>
        copyPart(c.env.DB, a.householdId, b.requestId, build, i),
      ),
      c.env.DB.prepare(
        "UPDATE family_exports SET state='ready' WHERE id=? AND build_id=?",
      ).bind(b.requestId, build),
    ]);
    createdThisCall = committed[1].meta.changes > 0;
  } catch {
    const raced = await job(c.env.DB, a, b.requestId);
    if (raced) return c.json({ job: raced, replayed: true });
    return c.json(
      fault(
        "EXPORT_NOT_CREATED",
        "数据包没有确认生成。已有包、权限变化或数据库额度都可能阻止生成；请刷新列表后再决定重试。",
      ),
      409,
    );
  }
  const saved = await job(c.env.DB, a, b.requestId);
  return saved
    ? c.json(
        { job: saved, replayed: !createdThisCall },
        createdThisCall ? 201 : 200,
      )
    : c.json(
        fault(
          "EXPORT_NOT_CREATED",
          "数据包未生成。请先下载或移除已有包，再核对家庭和账号权限。",
        ),
        409,
      );
});
dataExportRoutes.get("/family/exports/:id", async (c) => {
  const a = c.get("adult"),
    id = c.req.param("id");
  if (!validExportRequestId(id)) return c.json(missing(), 404);
  const saved = await job(c.env.DB, a, id);
  if (!saved) return c.json(missing(), 404);
  const rows = await c.env.DB.prepare(
    `SELECT p.section,p.part,p.row_count AS rows,length(CAST(p.data_json AS BLOB)) AS dataBytes FROM family_export_parts p JOIN family_exports j ON j.id=p.export_id WHERE j.id=? AND ${accessible} ORDER BY p.section,p.part`,
  )
    .bind(id, ...scope(a))
    .all<{
      section: ExportSection;
      part: number;
      rows: number;
      dataBytes: number;
    }>();
  const parts = exportSections.flatMap(([id]) =>
    rows.results.filter((p) => p.section === id),
  );
  const result: ExportManifest = {
    format: "english-quest-data",
    schema: 1,
    job: saved,
    parts,
    sections: exportSections.map(([id, label]) => ({
      id,
      label,
      rows: parts
        .filter((p) => p.section === id)
        .reduce((n, p) => n + p.rows, 0),
      parts: parts.filter((p) => p.section === id).length,
    })),
    excluded: exportExclusions,
  };
  // Re-check after reading parts: removal or revocation between awaits must not
  // return a misleading ready manifest assembled from a now-missing snapshot.
  const confirmed = await job(c.env.DB, a, id);
  if (
    !confirmed ||
    confirmed.parts !== parts.length ||
    confirmed.rows !== parts.reduce((n, p) => n + p.rows, 0)
  )
    return c.json(missing(), 404);
  return c.json(result);
});
dataExportRoutes.get("/family/exports/:id/parts/:section/:part", async (c) => {
  const a = c.get("adult"),
    id = c.req.param("id"),
    section = c.req.param("section"),
    raw = c.req.param("part");
  if (
    !validExportRequestId(id) ||
    !exportSections.some(([s]) => s === section) ||
    !/^(0|[1-9]\d{0,7})$/.test(raw)
  )
    return c.json(missing(), 404);
  const part = Number(raw),
    row = await c.env.DB.prepare(
      `SELECT p.data_json FROM family_export_parts p JOIN family_exports j ON j.id=p.export_id WHERE j.id=? AND p.section=? AND p.part=? AND ${accessible}`,
    )
      .bind(id, section, part, ...scope(a))
      .first<{ data_json: string }>();
  if (!row) return c.json(missing(), 404);
  return c.json({
    format: "english-quest-data",
    schema: 1,
    jobId: id,
    section,
    part,
    records: JSON.parse(row.data_json),
  });
});
dataExportRoutes.post("/family/exports/:id/remove", async (c) => {
  const a = c.get("adult"),
    id = c.req.param("id");
  if (!validExportRequestId(id)) return c.json(missing(), 404);
  await c.env.DB.prepare(
    `DELETE FROM family_exports WHERE id=? AND household_id=? AND adult_id=? AND session_id=? AND ${owner}`,
  )
    .bind(id, a.householdId, a.adultId, a.id, ...args(a))
    .run();
  const remaining = await c.env.DB.prepare(
    "SELECT 1 FROM family_exports WHERE id=? AND household_id=? AND adult_id=? AND session_id=?",
  )
    .bind(id, a.householdId, a.adultId, a.id)
    .first();
  if (remaining)
    return c.json(
      fault(
        "EXPORT_NOT_REMOVED",
        "移除还没有确认，登录或家庭权限可能已变化。请刷新列表后核对。",
      ),
      409,
    );
  return c.json({ removed: true });
});
