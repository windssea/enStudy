import { Hono, type MiddlewareHandler } from "hono";
import type { Actor } from "./app";
import type { B, Ctx, Connection } from "./aiRoutes";
import type { AdultSession } from "./auth";
import { verifyAdultPassword, type Credential } from "./adultVerification";
import { AiFault, providerUrl } from "./aiPolicy";
import { keyStoreReady, sealKey, unsealKey } from "./aiCrypto";
import {
  aiDay,
  reserveAi,
  settleAi,
  findAiRequest,
  expireAiText,
  type AiRequestRow,
} from "./aiBudget";
import { textCompletion } from "./aiAdapter";
import { writingAuthority, writingAuth } from "./writing";
import { exposureStatements } from "./exposure";
import { sentenceKey } from "../domain/exposure";
import {
  parseWritingReview,
  reviewableParagraph,
  writingReviewMessages,
} from "../domain/writingReview";
import type { WritingPrompt } from "../contracts/writing";
type Access = {
  owner: MiddlewareHandler<B>;
  connection: (
    c: Ctx,
    id: string,
    household: string,
  ) => Promise<Connection | null>;
  ownerSql: string;
  ownerParams: (
    adult: AdultSession,
    credential: Credential,
  ) => (string | number)[];
  audit: (c: Ctx, adult: AdultSession, action: string) => D1PreparedStatement;
};
interface Settings {
  household_id: string;
  connection_id: string | null;
  connection_version: number;
  enabled: number;
  consent_at: number | null;
  version: number;
}
const fault = (code: string, message: string) => ({ error: { code, message } });
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
const settingsFor = async (c: Ctx, household: string): Promise<Settings> =>
  (await c.env.DB.prepare(
    "SELECT * FROM ai_writing_settings WHERE household_id=?",
  )
    .bind(household)
    .first<Settings>()) ?? {
    household_id: household,
    connection_id: null,
    connection_version: 0,
    enabled: 0,
    consent_at: null,
    version: 0,
  };
const ready = (c: Ctx, s: Settings, conn: Connection | null) =>
  !!s.enabled &&
  !!s.consent_at &&
  !!conn &&
  s.connection_version === conn.version &&
  conn.tested_version === conn.version &&
  conn.state === "enabled" &&
  keyStoreReady(c.env) &&
  providerUrl(conn.base_url, c.env).approved;
export function createWritingAiRoutes(
  resolveActor: (c: Ctx) => Promise<Actor | null>,
  access: Access,
) {
  const routes = new Hono<B>();
  routes.use("/ai/writing-settings", access.owner);
  routes.get("/ai/writing-settings", async (c) => {
    const s = await settingsFor(c, c.get("adult").householdId);
    return c.json({
      available: keyStoreReady(c.env),
      settings: {
        connectionId: s.connection_id,
        enabled: !!s.enabled,
        version: s.version,
      },
    });
  });
  routes.post("/ai/writing-settings", async (c) => {
    const b = await c.req.json(),
      a = c.get("adult");
    if (
      !b ||
      typeof b !== "object" ||
      typeof b.enabled !== "boolean" ||
      !Number.isSafeInteger(b.version) ||
      b.version < 0
    )
      return c.json(
        fault("INVALID_WRITING_AI_SETTINGS", "请读取并核对作品点评设置。"),
        422,
      );
    const conn =
      typeof b.connectionId === "string"
        ? await access.connection(c, b.connectionId, a.householdId)
        : null;
    if (
      b.enabled &&
      (!conn ||
        conn.state !== "enabled" ||
        conn.version !== conn.tested_version ||
        !keyStoreReady(c.env) ||
        !providerUrl(conn.base_url, c.env).approved ||
        b.consent !== true)
    )
      return c.json(
        fault(
          "AI_NOT_READY",
          "请先测试文本连接，并单独确认所选段落将交给此服务点评。",
        ),
        409,
      );
    const verified = await verifyAdultPassword(c, a, b.currentPassword);
    if ("response" in verified) return verified.response;
    const result = await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO ai_settings(household_id) SELECT ? WHERE ${access.ownerSql}`,
      ).bind(a.householdId, ...access.ownerParams(a, verified.credential)),
      c.env.DB.prepare(
        `INSERT INTO ai_writing_settings(household_id,connection_id,connection_version,enabled,consent_at,version) SELECT ?,?,?,?,?,1 WHERE ${access.ownerSql} AND((?=0 AND NOT EXISTS(SELECT 1 FROM ai_writing_settings WHERE household_id=?)) OR EXISTS(SELECT 1 FROM ai_writing_settings WHERE household_id=? AND version=?)) AND(?=0 OR EXISTS(SELECT 1 FROM ai_connections WHERE id=? AND household_id=? AND version=? AND tested_version=version AND state='enabled')) ON CONFLICT(household_id) DO UPDATE SET connection_id=excluded.connection_id,connection_version=excluded.connection_version,enabled=excluded.enabled,consent_at=excluded.consent_at,version=ai_writing_settings.version+1 WHERE ai_writing_settings.version=?`,
      ).bind(
        a.householdId,
        conn?.id ?? null,
        conn?.version ?? 0,
        Number(b.enabled),
        b.enabled ? Date.now() : null,
        ...access.ownerParams(a, verified.credential),
        b.version,
        a.householdId,
        a.householdId,
        b.version,
        Number(b.enabled),
        conn?.id ?? "",
        a.householdId,
        conn?.version ?? -1,
        b.version,
      ),
      access.audit(
        c,
        a,
        b.enabled ? "ai.writing.enable" : "ai.writing.disable",
      ),
    ]);
    return result[1].meta.changes
      ? c.json({ saved: true })
      : c.json(fault("AI_CONFIG_CHANGED", "设置已变化，请刷新后核对。"), 409);
  });
  routes.get("/learning/writing/ai/status", async (c) => {
    const a = await resolveActor(c);
    if (!a) return c.json(fault("AUTH_REQUIRED", "请先选择探险档案。"), 401);
    const s = await settingsFor(c, a.householdId),
      conn = s.connection_id
        ? await access.connection(c, s.connection_id, a.householdId)
        : null;
    const budget = await c.env.DB.prepare(
      "SELECT child_calls,daily_calls FROM ai_settings WHERE household_id=?",
    )
      .bind(a.householdId)
      .first<{ child_calls: number; daily_calls: number }>();
    const child = await c.env.DB.prepare(
      "SELECT calls FROM ai_child_budget WHERE household_id=? AND child_id=? AND day=?",
    )
      .bind(a.householdId, a.childId, aiDay())
      .first<{ calls: number }>();
    const household = await c.env.DB.prepare(
      "SELECT calls FROM ai_daily_budget WHERE household_id=? AND day=?",
    )
      .bind(a.householdId, aiDay())
      .first<{ calls: number }>();
    await expireAiText(c.env.DB, a.householdId);
    const enabled = ready(c, s, conn);
    return c.json({
      enabled,
      remaining: Math.max(
        0,
        Math.min(
          (budget?.child_calls ?? 10) - (child?.calls ?? 0),
          (budget?.daily_calls ?? 30) - (household?.calls ?? 0),
        ),
      ),
      connectionLabel: enabled ? conn!.label : null,
      providerHost: enabled ? new URL(conn!.base_url).host : null,
    });
  });
  routes.post("/learning/writing/drafts/:id/review", async (c) => {
    const a = await resolveActor(c),
      b = await c.req.json();
    if (!a) return c.json(fault("AUTH_REQUIRED", "请先选择探险档案。"), 401);
    if (
      !b ||
      typeof b !== "object" ||
      b.childId !== a.childId ||
      !uuid(b.clientRequestId) ||
      !Number.isSafeInteger(b.expectedRevision) ||
      b.expectedRevision < 1 ||
      !Number.isInteger(b.section) ||
      b.section < 0 ||
      b.section > 2 ||
      b.confirmed !== true ||
      (b.readOnly !== undefined && typeof b.readOnly !== "boolean")
    )
      return c.json(
        fault(
          "INVALID_WRITING_REVIEW",
          "请先保存作品，核对本段后再主动请求点评。",
        ),
        422,
      );
    const d = await c.env.DB.prepare(
      `SELECT prompt_json,paragraphs_json,revision FROM writing_drafts WHERE id=? AND household_id=? AND child_id=? AND ${writingAuthority}`,
    )
      .bind(c.req.param("id"), a.householdId, a.childId, ...writingAuth(a))
      .first<{
        prompt_json: string;
        paragraphs_json: string;
        revision: number;
      }>();
    if (!d)
      return c.json(
        fault("NOT_FOUND", "这份草稿暂不可读，请核对当前档案。"),
        404,
      );
    if (d.revision !== b.expectedRevision)
      return c.json(
        fault("WRITING_CHANGED", "作品已保存了新版本，请重新读取后点评。"),
        409,
      );
    const paragraph = (JSON.parse(d.paragraphs_json) as string[])[b.section],
      prompt = JSON.parse(d.prompt_json) as WritingPrompt;
    if (!reviewableParagraph(paragraph))
      return c.json(
        fault(
          "INVALID_REVIEW_PARAGRAPH",
          "请先写下并保存这一段；点评内容请使用虚构信息，不含网址、联系方式或明显敏感资料。作品仍可照常编辑。",
        ),
        422,
      );
    const s = await settingsFor(c, a.householdId),
      conn = s.connection_id
        ? await access.connection(c, s.connection_id, a.householdId)
        : null;
    if (!ready(c, s, conn))
      return c.json(
        fault("AI_DISABLED", "家长还没有开启作品点评，可以继续写作和自查。"),
        403,
      );
    const connection = conn!,
      id = c.req.param("id"),
      section = b.section as number;
    const gate = (requestId?: string) => ({
      sql: `${writingAuthority} AND EXISTS(SELECT 1 FROM writing_drafts WHERE id=? AND household_id=? AND child_id=? AND revision=?) AND EXISTS(SELECT 1 FROM ai_writing_settings s JOIN ai_connections c ON c.id=s.connection_id AND c.household_id=s.household_id WHERE s.household_id=? AND s.enabled=1 AND s.consent_at IS NOT NULL AND s.version=? AND s.connection_version=c.version AND c.id=? AND c.version=? AND c.tested_version=c.version AND c.state='enabled')${requestId ? " AND EXISTS(SELECT 1 FROM writing_ai_links WHERE request_id=? AND draft_id=? AND draft_revision=? AND section_index=? AND household_id=? AND child_id=?)" : ""}`,
      params: [
        ...writingAuth(a),
        id,
        a.householdId,
        a.childId,
        d.revision,
        a.householdId,
        s.version,
        connection.id,
        connection.version,
        ...(requestId
          ? [requestId, id, d.revision, section, a.householdId, a.childId]
          : []),
      ],
    });
    const allowed = async (requestId?: string) => {
      const g = gate(requestId);
      return !!(await c.env.DB.prepare(`SELECT 1 WHERE ${g.sql}`)
        .bind(...g.params)
        .first());
    };
    const messages = writingReviewMessages(
        prompt,
        section,
        paragraph,
        connection.instruction_role,
      ),
      fingerprint = `writing:${a.grantId}:${id}:${d.revision}:${section}:${connection.id}:${connection.version}:${s.version}`;
    await expireAiText(c.env.DB, a.householdId);
    const previous =
      b.readOnly === true
        ? await findAiRequest(
            c.env.DB,
            a.householdId,
            b.clientRequestId,
            fingerprint,
          )
        : null;
    if (b.readOnly === true && !previous)
      return c.json(
        fault(
          "AI_REVIEW_NOT_FOUND",
          "本版本还没有可读取的点评。本次没有发给服务商，可继续自己修改。",
        ),
        409,
      );
    const initial = gate(),
      reservation = previous
        ? { row: previous, created: false }
        : await reserveAi(c.env.DB, {
            id: b.clientRequestId,
            household: a.householdId,
            child: a.childId,
            connection: connection.id,
            version: connection.version,
            fingerprint,
            units:
              new TextEncoder().encode(JSON.stringify(messages)).length + 1200,
            authorization: initial.sql,
            params: initial.params,
            afterStatements: [
              c.env.DB.prepare(
                "INSERT INTO writing_ai_links(request_id,household_id,child_id,draft_id,draft_revision,section_index) VALUES(?,?,?,?,?,?)",
              ).bind(
                b.clientRequestId,
                a.householdId,
                a.childId,
                id,
                d.revision,
                section,
              ),
            ],
          });
    const row = reservation.row;
    if (reservation.created) {
      let actual: number | null = null,
        dispatched = false;
      try {
        if (!(await allowed(row.request_id)))
          throw new AiFault(
            "AI_PERMISSION_CHANGED",
            "作品或权限已变化，未发送点评。请重新读取作品。",
          );
        const key = await unsealKey(
          c.env,
          a.householdId,
          connection.id,
          connection,
        );
        dispatched = true;
        const output = await textCompletion(
          c.env,
          connection,
          key,
          messages,
          700,
        );
        actual = output.actualTokens;
        if (output.content.includes(key))
          throw new AiFault(
            "AI_OUTPUT_BLOCKED",
            "本次点评内容未通过检查，请继续自己修改或向家长求助。",
          );
        let review;
        try {
          review = parseWritingReview(output.content, paragraph);
        } catch {
          throw new AiFault(
            "AI_OUTPUT_BLOCKED",
            "本次点评格式或引用不合适，未展示建议。可以继续写作。",
          );
        }
        const encrypted = await sealKey(
          c.env,
          a.householdId,
          `writing:${row.request_id}`,
          JSON.stringify(review),
        );
        await settleAi(c.env.DB, row, {
          response: {
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            keyId: encrypted.keyId,
          },
          actual,
          responseGate: gate(row.request_id),
        });
      } catch (error) {
        const failure =
          error instanceof AiFault
            ? error
            : new AiFault(
                "AI_REQUEST_UNKNOWN",
                "点评结果暂时未知，可能已产生用量；请读取本次结果，不会自动重发。",
              );
        await settleAi(c.env.DB, row, {
          error: failure,
          actual: dispatched ? actual : 0,
        });
        throw failure;
      }
    }
    if (!(await allowed(row.request_id)))
      return c.json(
        fault(
          "AI_PERMISSION_CHANGED",
          "作品、连接或权限已变化，已停止展示点评；已经发出的请求可能计费。",
        ),
        409,
      );
    const current = (await findAiRequest(
      c.env.DB,
      a.householdId,
      row.request_id,
      fingerprint,
    )) as AiRequestRow;
    const base = {
      requestId: row.request_id,
      draftId: id,
      revision: d.revision,
      section,
    };
    if (current.state === "reserved" && Date.now() - current.created_at < 25000)
      return c.json({ ...base, pending: true });
    if (
      current.state !== "completed" ||
      !current.response_json ||
      current.expires_at <= Date.now()
    )
      throw new AiFault(
        "AI_REVIEW_UNAVAILABLE",
        "本版本的点评未完成或已到期，不会自动重新收费请求。继续修改并保存后，可请求新建议。",
      );
    const envelope = JSON.parse(current.response_json),
      raw = await unsealKey(c.env, a.householdId, `writing:${row.request_id}`, {
        key_id: envelope.keyId,
        key_iv: envelope.iv,
        key_ciphertext: envelope.ciphertext,
      });
    const review = parseWritingReview(raw, paragraph);
    if (!(await allowed(row.request_id)))
      return c.json(
        fault("AI_PERMISSION_CHANGED", "作品或权限已变化，已停止展示点评。"),
        409,
      );
    const exposures = await exposureStatements(
      c.env.DB,
      a,
      review.observations.map((o) => sentenceKey(o.suggestionEnglish)),
      Date.now(),
      gate(row.request_id),
    );
    if (exposures.length) await c.env.DB.batch(exposures);
    if (!(await allowed(row.request_id)))
      return c.json(
        fault("AI_PERMISSION_CHANGED", "作品或权限已变化，已停止展示点评。"),
        409,
      );
    return c.json({ ...base, review, cached: !reservation.created });
  });
  return routes;
}
