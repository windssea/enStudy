import { Hono } from "hono";
import type { Actor, Env } from "./app";
import { exerciseById, exerciseVersion, publicExercise } from "./exercises";
import { writingAuthority as authority, writingAuth as auth } from "./writing";
import {
  disclosureCheckKeys,
  exposureStatements,
  hashedExposureKeys,
} from "./exposure";
import { sentenceKey } from "../domain/exposure";
import { localDay } from "../domain/review";
import { mistakeQuery } from "../domain/mistakes";
import type { MistakeDetail, MistakePage } from "../contracts/mistakes";
import type { Receipt } from "../contracts/index";

export const mistakeRoutes = new Hono<{
  Bindings: Env;
  Variables: { actor: Actor };
}>();
const fault = (code: string, message: string) => ({ error: { code, message } });
export const mistakeEvent = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
export const mistakeExists = `EXISTS(SELECT 1 FROM attempts ma JOIN session_items mi ON mi.id=ma.assignment_id AND mi.household_id=ma.household_id AND mi.child_id=ma.child_id JOIN items mp ON mp.id=mi.item_id AND mp.version=mi.item_version JOIN learning_sessions ms ON ms.id=mi.session_id JOIN content_releases mr ON mr.id=coalesce(mi.content_release_id,ms.release_id) WHERE mp.status='published' AND mr.status='published' AND ma.event_id=? AND ma.household_id=? AND ma.child_id=? AND ma.outcome IN ('incorrect','hinted') AND mi.item_id=? AND mi.item_version=?) AND ${authority}`;
export const mistakePublication = `EXISTS(SELECT 1 FROM items ci JOIN lessons cl ON cl.id=ci.lesson_id AND cl.version=ci.lesson_version JOIN content_releases cr ON cr.id=cl.release_id JOIN release_items cri ON cri.release_id=cr.id AND cri.item_id=ci.id AND cri.item_version=ci.version WHERE ci.id=? AND ci.version=? AND ci.status='published' AND cr.status='published')`;
export const mistakeGuard = (
  a: Actor,
  event: string,
  item: { id: string; version?: number },
  now = Date.now(),
) => [
  event,
  a.householdId,
  a.childId,
  item.id,
  item.version ?? 1,
  ...auth(a, now),
];
interface Stored {
  event_id: string;
  item_id: string;
  item_version: number;
  received_at: number;
  outcome: "incorrect" | "hinted";
  answer_json: string;
  receipt_json: string;
  available: number;
}
export async function readMistake(db: D1Database, a: Actor, event: string) {
  return db
    .prepare(
      `SELECT a.event_id,si.item_id,si.item_version,a.received_at,a.outcome,a.answer_json,a.receipt_json,(i.status='published' AND r.status='published') AS available FROM attempts a JOIN session_items si ON si.id=a.assignment_id AND si.household_id=a.household_id AND si.child_id=a.child_id JOIN items i ON i.id=si.item_id AND i.version=si.item_version JOIN learning_sessions s ON s.id=si.session_id JOIN content_releases r ON r.id=coalesce(si.content_release_id,s.release_id) WHERE a.event_id=? AND a.household_id=? AND a.child_id=? AND a.outcome IN ('incorrect','hinted') AND ${authority}`,
    )
    .bind(event, a.householdId, a.childId, ...auth(a))
    .first<Stored>();
}
mistakeRoutes.get("/learning/mistakes", async (c) => {
  const a = c.get("actor"),
    query = mistakeQuery(new URL(c.req.url).searchParams);
  if (!query)
    return c.json(
      fault("INVALID_MISTAKE_QUERY", "请重新选择记录类型或从第一页开始。"),
      422,
    );
  const snapshot =
    query.snapshot ??
    (await c.env.DB.prepare(
      `SELECT coalesce(max(server_sequence),0) AS n FROM attempts WHERE household_id=? AND child_id=? AND ${authority}`,
    )
      .bind(a.householdId, a.childId, ...auth(a))
      .first<{ n: number }>())!.n;
  const rows = (
    await c.env.DB.prepare(
      `SELECT a.event_id,a.server_sequence,a.received_at,a.outcome,json_extract(i.public_json,'$.title') AS title,json_extract(i.public_json,'$.category') AS category,i.type,(i.status='published' AND r.status='published') AS available FROM attempts a JOIN session_items si ON si.id=a.assignment_id AND si.household_id=a.household_id AND si.child_id=a.child_id JOIN items i ON i.id=si.item_id AND i.version=si.item_version JOIN learning_sessions s ON s.id=si.session_id JOIN content_releases r ON r.id=coalesce(si.content_release_id,s.release_id) WHERE a.household_id=? AND a.child_id=? AND a.server_sequence<=? AND a.server_sequence<? AND a.outcome IN ('incorrect','hinted') ${query.kind === "all" ? "" : "AND a.outcome=?"} ${query.category === "all" ? "" : "AND json_extract(i.public_json,'$.category')=?"} AND ${authority} ORDER BY a.server_sequence DESC LIMIT 21`,
    )
      .bind(
        a.householdId,
        a.childId,
        snapshot,
        query.before ?? snapshot + 1,
        ...(query.kind === "all" ? [] : [query.kind]),
        ...(query.category === "all" ? [] : [query.category]),
        ...auth(a),
      )
      .all<{
        event_id: string;
        server_sequence: number;
        received_at: number;
        title: string;
        category: MistakePage["items"][number]["category"];
        type: MistakePage["items"][number]["type"];
        outcome: "incorrect" | "hinted";
        available: number;
      }>()
  ).results;
  const page: MistakePage = {
    childId: a.childId,
    snapshotSequence: snapshot,
    nextBefore: rows.length > 20 ? rows[19].server_sequence : null,
    items: rows.slice(0, 20).map((r) => ({
      eventId: r.event_id,
      savedAt: r.received_at,
      title: r.title,
      category: r.category,
      type: r.type,
      outcome: r.outcome,
      available: !!r.available,
    })),
  };
  return c.json(page);
});
mistakeRoutes.post("/learning/mistakes/:id/open", async (c) => {
  const a = c.get("actor"),
    id = c.req.param("id");
  if (!mistakeEvent(id))
    return c.json(fault("NOT_FOUND", "找不到这条已保存的记录。"), 404);
  const row = await readMistake(c.env.DB, a, id);
  if (!row) return c.json(fault("NOT_FOUND", "找不到这条已保存的记录。"), 404);
  const item = exerciseVersion(row.item_id, row.item_version);
  if (!item || !row.available)
    return c.json(
      fault("CONTENT_UNAVAILABLE", "这份材料已调整，先换一条记录看看吧。"),
      409,
    );
  const candidate = exerciseById.get(item.id);
  const current =
    candidate &&
    (await c.env.DB.prepare(`SELECT 1 WHERE ${mistakePublication}`)
      .bind(candidate.id, candidate.version ?? 1)
      .first())
      ? candidate
      : undefined;
  const now = Date.now(),
    keys = [item, ...(current && current !== item ? [current] : [])].flatMap(
      (i) => [
        ...disclosureCheckKeys(i),
        ...(i.audioText ? [sentenceKey(i.audioText)] : []),
      ],
    ),
    guardSql = `${mistakeExists}${current ? ` AND ${mistakePublication}` : ""}`,
    guardParams = (at: number) => [
      ...mistakeGuard(a, id, item, at),
      ...(current ? [current.id, current.version ?? 1] : []),
    ];
  await c.env.DB.batch(
    await exposureStatements(c.env.DB, a, keys, now, {
      sql: guardSql,
      params: guardParams(now),
    }),
  );
  const [key] = await hashedExposureKeys(keys);
  const saved = await c.env.DB.prepare(
    `SELECT 1 FROM teaching_exposures WHERE household_id=? AND child_id=? AND evidence_key=? AND shown_day=? AND ${guardSql}`,
  )
    .bind(
      a.householdId,
      a.childId,
      key,
      localDay(now, a.timezone),
      ...guardParams(Date.now()),
    )
    .first();
  if (!saved || localDay(Date.now(), a.timezone) !== localDay(now, a.timezone))
    return c.json(
      fault("MISTAKE_CHANGED", "记录或档案已变化，请重新打开。"),
      409,
    );
  const receipt = JSON.parse(row.receipt_json) as Receipt,
    answer: unknown = JSON.parse(row.answer_json);
  const detail: MistakeDetail = {
    childId: a.childId,
    eventId: id,
    itemVersion: row.item_version,
    retryVersion: current ? (current.version ?? 1) : null,
    currentTeaching:
      current && (current.version ?? 1) !== row.item_version
        ? {
            prompt: current.prompt,
            context: current.context,
            feedback: current.explanation,
          }
        : null,
    exercise: publicExercise(item),
    savedAt: row.received_at,
    outcome: row.outcome,
    submitted: typeof answer === "string" ? answer : null,
    reference:
      receipt.correctedSentence ??
      (["sort", "repair", "evidence"].includes(item.type)
        ? (item.solutionSentences?.[0] ?? null)
        : item.answers[0]),
    feedback: receipt.feedback,
    details: receipt.details,
  };
  return c.json(detail);
});
