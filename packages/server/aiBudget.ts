import { localDay } from "../domain/review";
import { AiFault } from "./aiPolicy";
export interface AiRequestRow {
  request_id: string;
  household_id: string;
  child_id: string | null;
  connection_id: string;
  connection_version: number;
  fingerprint: string;
  state: "reserved" | "completed" | "failed" | "unknown";
  reserved_units: number;
  actual_units: number | null;
  response_json: string | null;
  failure_code: string | null;
  created_at: number;
  expires_at: number;
}
export const aiDay = () => localDay(Date.now(), "Asia/Shanghai");
export async function findAiRequest(
  db: D1Database,
  household: string,
  id: string,
  fingerprint: string,
) {
  const row = await db
    .prepare(
      "SELECT * FROM ai_requests WHERE household_id=? AND(request_id=? OR fingerprint=?) ORDER BY CASE WHEN request_id=? THEN 0 ELSE 1 END LIMIT 1",
    )
    .bind(household, id, fingerprint, id)
    .first<AiRequestRow>();
  if (row?.request_id === id && row.fingerprint !== fingerprint)
    throw new AiFault(
      "AI_REQUEST_ID_REUSED",
      "这个请求编号已用于其他AI任务，请重新打开当前练习。",
    );
  return row;
}
export async function reserveAi(
  db: D1Database,
  input: {
    id: string;
    household: string;
    child: string | null;
    connection: string;
    version: number;
    fingerprint: string;
    units: number;
    authorization: string;
    params: (string | number)[];
    countChild?: boolean;
    extraStatements?: D1PreparedStatement[];
    afterStatements?: D1PreparedStatement[];
    ttlMs?: number;
  },
) {
  const previous = await findAiRequest(
    db,
    input.household,
    input.id,
    input.fingerprint,
  );
  if (previous) return { row: previous, created: false };
  const day = aiDay(),
    now = Date.now();
  const statements = [
    db
      .prepare(
        "INSERT OR IGNORE INTO ai_daily_budget(household_id,day) VALUES(?,?)",
      )
      .bind(input.household, day),
    db
      .prepare(
        `UPDATE ai_daily_budget SET calls=calls+1,units=units+? WHERE household_id=? AND day=? AND calls<COALESCE((SELECT daily_calls FROM ai_settings WHERE household_id=?),30) AND units+?<=COALESCE((SELECT daily_units FROM ai_settings WHERE household_id=?),60000) AND NOT EXISTS(SELECT 1 FROM ai_requests WHERE household_id=? AND(request_id=? OR fingerprint=?)) AND ${input.authorization}`,
      )
      .bind(
        input.units,
        input.household,
        day,
        input.household,
        input.units,
        input.household,
        input.household,
        input.id,
        input.fingerprint,
        ...input.params,
      ),
    db
      .prepare(
        "INSERT INTO ai_reservation_checks(request_id,scope,household_id,ok) VALUES(?,'household',?,changes())",
      )
      .bind(input.id, input.household),
  ];
  if (input.child && input.countChild !== false)
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO ai_child_budget(household_id,child_id,day) VALUES(?,?,?)",
        )
        .bind(input.household, input.child, day),
      db
        .prepare(
          "UPDATE ai_child_budget SET calls=calls+1 WHERE household_id=? AND child_id=? AND day=? AND calls<COALESCE((SELECT child_calls FROM ai_settings WHERE household_id=?),10)",
        )
        .bind(input.household, input.child, day, input.household),
      db
        .prepare(
          "INSERT INTO ai_reservation_checks(request_id,scope,household_id,ok) VALUES(?,'child',?,changes())",
        )
        .bind(input.id, input.household),
    );
  statements.push(...(input.extraStatements ?? []));
  statements.push(
    db
      .prepare(
        "INSERT INTO ai_requests(request_id,household_id,child_id,connection_id,connection_version,fingerprint,state,reserved_units,created_at,expires_at) VALUES(?,?,?,?,?,?,'reserved',?,?,?)",
      )
      .bind(
        input.id,
        input.household,
        input.child,
        input.connection,
        input.version,
        input.fingerprint,
        input.units,
        now,
        now + (input.ttlMs ?? 600000),
      ),
  );
  try {
    await db.batch([...statements, ...(input.afterStatements ?? [])]);
  } catch {
    const concurrent = await findAiRequest(
      db,
      input.household,
      input.id,
      input.fingerprint,
    );
    if (concurrent) return { row: concurrent, created: false };
    throw new AiFault(
      "AI_BUDGET_UNAVAILABLE",
      "今天的AI额度已用完，或连接和权限已变化。标准课程与讲解照常可用。",
    );
  }
  return {
    row: (await findAiRequest(
      db,
      input.household,
      input.id,
      input.fingerprint,
    ))!,
    created: true,
  };
}
export async function settleAi(
  db: D1Database,
  row: AiRequestRow,
  result: {
    response?: unknown;
    error?: AiFault;
    actual: number | null;
    responseGate?: { sql: string; params: (string | number)[] };
  },
) {
  const charged = result.actual ?? row.reserved_units,
    day = localDay(row.created_at, "Asia/Shanghai");
  const state = result.error
    ? result.error.code === "AI_REQUEST_UNKNOWN"
      ? "unknown"
      : "failed"
    : "completed";
  await db.batch([
    db
      .prepare(
        `UPDATE ai_requests SET state=?,actual_units=?,response_json=${result.responseGate ? `CASE WHEN ${result.responseGate.sql} THEN ? ELSE NULL END` : "?"},failure_code=? WHERE request_id=? AND household_id=? AND state='reserved'`,
      )
      .bind(
        state,
        result.actual,
        ...(result.responseGate?.params ?? []),
        result.response ? JSON.stringify(result.response) : null,
        result.error?.code ?? null,
        row.request_id,
        row.household_id,
      ),
    db
      .prepare(
        "UPDATE ai_daily_budget SET units=units-?+? WHERE household_id=? AND day=? AND changes()=1",
      )
      .bind(row.reserved_units, charged, row.household_id, day),
  ]);
}
export async function expireAiText(db: D1Database, household: string) {
  await db
    .prepare(
      "UPDATE ai_requests SET response_json=NULL WHERE request_id IN(SELECT request_id FROM ai_requests WHERE household_id=? AND expires_at<? AND response_json IS NOT NULL LIMIT 100)",
    )
    .bind(household, Date.now())
    .run();
}
