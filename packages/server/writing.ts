import { Hono } from "hono";
import type { Actor, Env } from "./app";
import { sessionHouseholdSql } from "./auth";
import {
  blankWriting,
  sameWritingText,
  writingContent,
  writingLimits,
  writingPrompt,
  writingPrompts,
} from "../domain/writing";
import type {
  WritingDraft,
  WritingPrompt,
  WritingReceipt,
} from "../contracts/writing";
type Bindings = { Bindings: Env; Variables: { actor: Actor } };
export const writingRoutes = new Hono<Bindings>();
const fault = (code: string, message: string) => ({ error: { code, message } });
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
const authority = `EXISTS(SELECT 1 FROM child_grants g WHERE g.id=? AND g.household_id=? AND g.child_id=? AND g.revoked_at IS NULL AND g.expires_at>? AND (g.parent_session_id IS NULL OR EXISTS(SELECT 1 FROM account_sessions s JOIN account_credentials a ON a.adult_id=s.adult_id JOIN household_members m ON m.adult_id=s.adult_id AND m.household_id=g.household_id WHERE s.id=g.parent_session_id AND s.revoked_at IS NULL AND s.expires_at>? AND a.disabled_at IS NULL AND a.must_change_password=0 AND g.household_id=${sessionHouseholdSql})))`;
const auth = (a: Actor, now = Date.now()) => [
  a.grantId,
  a.householdId,
  a.childId,
  now,
  now,
];
export const writingAuthority = authority;
export const writingAuth = auth;
interface Row {
  id: string;
  child_id: string;
  prompt_json: string;
  title: string;
  plan: string;
  paragraphs_json: string;
  checks_json: string;
  revision: number;
  created_at: number;
  updated_at: number;
}
const draft = (r: Row): WritingDraft => ({
  id: r.id,
  childId: r.child_id,
  prompt: JSON.parse(r.prompt_json) as WritingPrompt,
  title: r.title,
  plan: r.plan,
  paragraphs: JSON.parse(r.paragraphs_json),
  checks: JSON.parse(r.checks_json),
  revision: r.revision,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const read = (db: D1Database, a: Actor, id: string) =>
  db
    .prepare(
      `SELECT * FROM writing_drafts WHERE household_id=? AND child_id=? AND id=? AND ${authority}`,
    )
    .bind(a.householdId, a.childId, id, ...auth(a))
    .first<Row>();
interface Command {
  draft_id: string;
  command_hash: string;
  revision: number;
  checks_json: string;
}
const receipt = (db: D1Database, a: Actor, id: string) =>
  db
    .prepare(
      `SELECT draft_id,command_hash,revision,checks_json FROM writing_commands WHERE household_id=? AND child_id=? AND request_id=? AND ${authority}`,
    )
    .bind(a.householdId, a.childId, id, ...auth(a))
    .first<Command>();
const ack = (r: Command, id: string, replayed: boolean): WritingReceipt => ({
  saved: true,
  draftId: r.draft_id,
  requestId: id,
  revision: r.revision,
  checks: JSON.parse(r.checks_json),
  replayed,
});
const digest = async (v: unknown) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(v)),
      ),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const changed = () =>
  fault(
    "WRITING_CHANGED",
    "另一处已保存了新版本。这页文字还在，请先比较或另存一份。",
  );
writingRoutes.get("/learning/writing/prompts", (c) =>
  c.json({ prompts: writingPrompts, limits: writingLimits }),
);
writingRoutes.get("/learning/writing/drafts", async (c) => {
  const a = c.get("actor");
  const rows = await c.env.DB.prepare(
    `SELECT id,title,prompt_id,prompt_json,revision,updated_at,json_array_length(checks_json) AS checks FROM writing_drafts WHERE household_id=? AND child_id=? AND ${authority} ORDER BY updated_at DESC,id LIMIT ?`,
  )
    .bind(a.householdId, a.childId, ...auth(a), writingLimits.drafts)
    .all<{
      id: string;
      title: string;
      prompt_id: string;
      prompt_json: string;
      revision: number;
      updated_at: number;
      checks: number;
    }>();
  return c.json({
    items: rows.results.map((r) => ({
      id: r.id,
      title: r.title,
      promptId: r.prompt_id,
      promptTitle: (JSON.parse(r.prompt_json) as WritingPrompt).title,
      revision: r.revision,
      updatedAt: r.updated_at,
      checks: r.checks,
    })),
  });
});
writingRoutes.get("/learning/writing/drafts/:id", async (c) => {
  const id = c.req.param("id");
  if (!uuid(id))
    return c.json(fault("WRITING_NOT_FOUND", "没有找到这份草稿。"), 404);
  const row = await read(c.env.DB, c.get("actor"), id);
  return row
    ? c.json({ draft: draft(row) })
    : c.json(fault("WRITING_NOT_FOUND", "没有找到这份草稿。"), 404);
});
writingRoutes.post("/learning/writing/drafts", async (c) => {
  const b = await c.req.json().catch(() => null),
    a = c.get("actor");
  if (!b || !uuid(b.requestId) || typeof b.promptId !== "string")
    return c.json(
      fault("INVALID_WRITING", "请选择一个写作主题，再新建草稿。"),
      422,
    );
  if (b.childId !== a.childId)
    return c.json(
      fault("IDENTITY_CHANGED", "探险档案已变化，请重新打开写作小工坊。"),
      409,
    );
  const p = writingPrompt(b.promptId);
  if (!p)
    return c.json(
      fault("INVALID_WRITING_PROMPT", "这个写作主题还未开放。"),
      422,
    );
  const hash = await digest({
      kind: "create",
      promptId: p.id,
      promptVersion: p.version,
    }),
    prior = await receipt(c.env.DB, a, b.requestId);
  if (prior)
    return prior.command_hash === hash
      ? c.json(ack(prior, b.requestId, true))
      : c.json(
          fault("COMMAND_CHANGED", "这次新建请求的内容有变化，请重新操作。"),
          409,
        );
  const id = crypto.randomUUID(),
    now = Date.now(),
    empty = blankWriting(p);
  const batch = await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO writing_drafts(id,household_id,child_id,prompt_id,prompt_version,prompt_json,title,plan,paragraphs_json,checks_json,revision,last_request_id,last_command_hash,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,1,?,?,?,? WHERE ${authority} AND (SELECT count(*) FROM writing_drafts WHERE household_id=? AND child_id=?)<? AND NOT EXISTS(SELECT 1 FROM writing_commands WHERE household_id=? AND child_id=? AND request_id=?)`,
    ).bind(
      id,
      a.householdId,
      a.childId,
      p.id,
      p.version,
      JSON.stringify(p),
      "",
      "",
      JSON.stringify(empty.paragraphs),
      "[]",
      b.requestId,
      hash,
      now,
      now,
      ...auth(a, now),
      a.householdId,
      a.childId,
      writingLimits.drafts,
      a.householdId,
      a.childId,
      b.requestId,
    ),
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO writing_commands SELECT household_id,child_id,?,?,?,revision,checks_json,? FROM writing_drafts WHERE id=? AND household_id=? AND child_id=? AND last_request_id=? AND last_command_hash=? AND ${authority}`,
    ).bind(
      b.requestId,
      id,
      hash,
      now,
      id,
      a.householdId,
      a.childId,
      b.requestId,
      hash,
      ...auth(a, now),
    ),
  ]);
  const saved = await receipt(c.env.DB, a, b.requestId);
  if (saved)
    return saved.command_hash === hash
      ? c.json(
          ack(saved, b.requestId, batch[0].meta.changes === 0),
          batch[0].meta.changes ? 201 : 200,
        )
      : c.json(
          fault("COMMAND_CHANGED", "这次新建请求的内容有变化，请重新操作。"),
          409,
        );
  return c.json(
    fault(
      "WRITING_NOT_CREATED",
      `还没有确认新建。每个档案最多保存${writingLimits.drafts}份草稿；可先检查已有作品或移除不需要的草稿。`,
    ),
    409,
  );
});
writingRoutes.post("/learning/writing/drafts/:id/save", async (c) => {
  const b = await c.req.json().catch(() => null),
    a = c.get("actor"),
    id = c.req.param("id");
  if (
    !uuid(id) ||
    !b ||
    !uuid(b.requestId) ||
    !Number.isSafeInteger(b.expectedRevision) ||
    b.expectedRevision < 1
  )
    return c.json(
      fault("INVALID_WRITING", "草稿保存信息不完整，请重新读取后再试。"),
      422,
    );
  if (b.childId !== a.childId)
    return c.json(
      fault("IDENTITY_CHANGED", "探险档案已变化，请重新打开写作小工坊。"),
      409,
    );
  const hash = await digest({
      kind: "save",
      id,
      revision: b.expectedRevision,
      content: {
        title: b.content?.title,
        plan: b.content?.plan,
        paragraphs: b.content?.paragraphs,
        checks: Array.isArray(b.content?.checks)
          ? [...b.content.checks].sort()
          : b.content?.checks,
      },
    }),
    prior = await receipt(c.env.DB, a, b.requestId);
  if (prior)
    return prior.command_hash === hash
      ? c.json(ack(prior, b.requestId, true))
      : c.json(
          fault("COMMAND_CHANGED", "这次保存的内容有变化，请重新操作。"),
          409,
        );
  const row = await read(c.env.DB, a, id);
  if (!row)
    return c.json(fault("WRITING_NOT_FOUND", "没有找到这份草稿。"), 404);
  if (row.revision !== b.expectedRevision) return c.json(changed(), 409);
  const before = draft(row),
    content = writingContent(b.content, before.prompt);
  if (!content)
    return c.json(
      fault(
        "INVALID_WRITING_CONTENT",
        "请检查标题、段落数量和字数上限；自查项只能选本主题提供的项目。",
      ),
      422,
    );
  const checks = sameWritingText(before, content) ? content.checks : [],
    now = Date.now();
  const batch = await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE writing_drafts SET title=?,plan=?,paragraphs_json=?,checks_json=?,revision=revision+1,last_request_id=?,last_command_hash=?,updated_at=? WHERE id=? AND household_id=? AND child_id=? AND revision=? AND ${authority}`,
    ).bind(
      content.title,
      content.plan,
      JSON.stringify(content.paragraphs),
      JSON.stringify(checks),
      b.requestId,
      hash,
      now,
      id,
      a.householdId,
      a.childId,
      b.expectedRevision,
      ...auth(a, now),
    ),
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO writing_commands SELECT household_id,child_id,?,?,?,revision,checks_json,? FROM writing_drafts WHERE id=? AND household_id=? AND child_id=? AND revision=? AND last_request_id=? AND last_command_hash=? AND ${authority}`,
    ).bind(
      b.requestId,
      id,
      hash,
      now,
      id,
      a.householdId,
      a.childId,
      b.expectedRevision + 1,
      b.requestId,
      hash,
      ...auth(a, now),
    ),
  ]);
  const saved = await receipt(c.env.DB, a, b.requestId);
  if (saved)
    return saved.command_hash === hash
      ? c.json(ack(saved, b.requestId, batch[0].meta.changes === 0))
      : c.json(
          fault("COMMAND_CHANGED", "这次保存的内容有变化，请重新操作。"),
          409,
        );
  return c.json(changed(), 409);
});
writingRoutes.post("/learning/writing/drafts/:id/remove", async (c) => {
  const b = await c.req.json().catch(() => null),
    a = c.get("actor"),
    id = c.req.param("id");
  if (
    !uuid(id) ||
    !b ||
    !Number.isSafeInteger(b.expectedRevision) ||
    b.expectedRevision < 1
  )
    return c.json(fault("INVALID_WRITING", "请重新读取草稿后再移除。"), 422);
  if (b.childId !== a.childId)
    return c.json(
      fault("IDENTITY_CHANGED", "探险档案已变化，请重新打开写作小工坊。"),
      409,
    );
  const row = await read(c.env.DB, a, id);
  if (!row)
    return c.json(fault("WRITING_NOT_FOUND", "没有找到这份草稿。"), 404);
  const result = await c.env.DB.prepare(
    `DELETE FROM writing_drafts WHERE id=? AND household_id=? AND child_id=? AND revision=? AND ${authority} RETURNING id`,
  )
    .bind(id, a.householdId, a.childId, b.expectedRevision, ...auth(a))
    .first();
  return result ? c.json({ removed: true }) : c.json(changed(), 409);
});
