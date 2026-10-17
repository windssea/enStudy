import { Hono } from "hono";
import { readAdult, type AuthEnv } from "./auth";
import { reportWindow, totalReportCounts } from "../domain/report";
import type { LearningReport } from "../contracts/index";

export const reportRoutes = new Hono<{ Bindings: AuthEnv }>();
const fault = (code: string, message: string) => ({ error: { code, message } });
// Use the immutable item version, and keep legacy foundation disclosures guided.
// An unverified/offline/AI observation must not become independent report evidence.
const observations = `observations AS (
 SELECT a.event_id,a.received_at,s.source,i.type,i.primary_skill_id AS skillId,k.label,i.modality,
 coalesce(json_extract(i.private_answer_json,'$.family'),i.id) AS family,a.evidence_source,
 CASE WHEN a.evidence_source<>'online' THEN 'unscored'
 WHEN a.outcome='correct' AND a.independent_evidence=1 AND NOT(s.source='lesson' AND s.release_id='course-foundations-v1') THEN 'independent'
 WHEN a.outcome IN('correct','hinted') THEN 'assisted'
 WHEN a.outcome='incorrect' THEN 'incorrect' ELSE 'unscored' END AS bucket
 FROM attempts a JOIN session_items si ON si.id=a.assignment_id AND si.household_id=a.household_id AND si.child_id=a.child_id
 JOIN learning_sessions s ON s.id=si.session_id AND s.household_id=a.household_id AND s.child_id=a.child_id
 JOIN items i ON i.id=si.item_id AND i.version=si.item_version
 JOIN skills k ON k.id=i.primary_skill_id
 WHERE a.household_id=? AND a.child_id=? AND a.received_at>=? AND a.received_at<?
)`;
const counts = `count(o.event_id) AS attempts,
 coalesce(sum(o.bucket='independent'),0) AS independent,
 coalesce(sum(o.bucket='assisted'),0) AS assisted,
 coalesce(sum(o.bucket='incorrect'),0) AS incorrect,
 coalesce(sum(o.bucket='unscored'),0) AS unscored`;

reportRoutes.get("/family/children/:id/report", async (c) => {
  const adult = await readAdult(c);
  if (!adult)
    return c.json(fault("ADULT_REQUIRED", "请家长登录后查看学习报告。"), 401);
  if (adult.mustChangePassword)
    return c.json(
      fault("PASSWORD_CHANGE_REQUIRED", "请先更新临时密码，再查看学习报告。"),
      403,
    );
  const values = c.req.queries("days"),
    days = values?.[0] ?? "7";
  if ((values?.length ?? 0) > 1 || !["7", "30"].includes(days))
    return c.json(fault("INVALID_REPORT_WINDOW", "请选择近7天或近30天。"), 422);
  const id = c.req.param("id");
  if (id.length > 100)
    return c.json(fault("NOT_FOUND", "找不到这个探险档案。"), 404);
  const child = await c.env.DB.prepare(
    "SELECT id,nickname,timezone FROM children WHERE id=? AND household_id=?",
  )
    .bind(id, adult.householdId)
    .first<{ id: string; nickname: string; timezone: string }>();
  if (!child) return c.json(fault("NOT_FOUND", "找不到这个探险档案。"), 404);
  const window = reportWindow(
    Date.now(),
    Number(days) as 7 | 30,
    child.timezone,
  );
  const scope = [adult.householdId, id, window.start, window.end];
  const query = (sql: string) =>
    c.env.DB.prepare(`WITH ${observations} ${sql}`).bind(...scope);
  const daily = c.env.DB.prepare(
    `WITH intervals(day,start,finish) AS(VALUES ${window.intervals.map(() => "(?,?,?)").join(",")}),${observations} SELECT d.day,${counts} FROM intervals d LEFT JOIN observations o ON o.received_at>=d.start AND o.received_at<d.finish GROUP BY d.day ORDER BY d.day`,
  ).bind(...window.intervals.flatMap((d) => [d.day, d.start, d.end]), ...scope);
  const results = await c.env.DB.batch([
    daily,
    query(
      `SELECT o.source,${counts} FROM observations o GROUP BY o.source ORDER BY attempts DESC,o.source`,
    ),
    query(
      `SELECT o.type,${counts} FROM observations o GROUP BY o.type ORDER BY attempts DESC,o.type`,
    ),
    query(
      `SELECT o.skillId,o.label,o.modality,${counts} FROM observations o GROUP BY o.skillId,o.label,o.modality HAVING sum(o.bucket IN('incorrect','assisted'))>0 ORDER BY incorrect DESC,assisted DESC,o.skillId,o.modality LIMIT 8`,
    ),
    query(
      `SELECT count(DISTINCT CASE WHEN o.evidence_source='online' THEN o.family END) AS taskFamilies,count(DISTINCT CASE WHEN o.bucket='independent' THEN o.family END) AS independentTaskFamilies FROM observations o`,
    ),
    c.env.DB.prepare(
      "SELECT count(*) AS completedRounds,count(DISTINCT r.lesson_id) AS completedLessons FROM session_results r JOIN learning_sessions s ON s.id=r.session_id AND s.household_id=r.household_id AND s.child_id=r.child_id WHERE r.household_id=? AND r.child_id=? AND r.completed_at>=? AND r.completed_at<? AND s.state='completed'",
    ).bind(...scope),
    c.env.DB.prepare(
      "SELECT count(*) AS total,coalesce(sum(due_at<=?),0) AS dueNow,coalesce(sum(due_at>? AND due_at<?),0) AS dueNext7Days FROM review_cards WHERE household_id=? AND child_id=?",
    ).bind(
      window.generatedAt,
      window.generatedAt,
      window.generatedAt + 7 * 86400000,
      adult.householdId,
      id,
    ),
  ]);
  const dailyRows = results[0].results as LearningReport["days"];
  const report: LearningReport = {
    child: { id: child.id, nickname: child.nickname },
    window: {
      days: window.days,
      from: window.from,
      through: window.through,
      timezone: window.timezone,
      timezoneFallback: window.timezoneFallback,
      generatedAt: window.generatedAt,
    },
    totals: {
      ...totalReportCounts(dailyRows),
      activeDays: dailyRows.filter((d) => d.attempts > 0).length,
      ...(results[4].results[0] as Pick<
        LearningReport["totals"],
        "taskFamilies" | "independentTaskFamilies"
      >),
      ...(results[5].results[0] as Pick<
        LearningReport["totals"],
        "completedRounds" | "completedLessons"
      >),
    },
    days: dailyRows,
    sources: results[1].results as LearningReport["sources"],
    interactions: results[2].results as LearningReport["interactions"],
    practice: results[3].results as LearningReport["practice"],
    review: results[6].results[0] as LearningReport["review"],
  };
  return c.json(report);
});
