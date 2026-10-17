import type { Actor } from "./app";
import { localDay } from "../domain/review";
import { sentenceKey, answerExposureKeys } from "../domain/exposure";
import {
  courseCatalog,
  patternRelease,
  type PrivateExercise,
} from "./exercises";
import catalog from "../../public/content/catalog.json";
const patternPreviewKeys = new Map<string, string[]>();
export const patternPreview = (id: string) =>
  catalog.patterns.find((row) => row.pattern_id === id);
export function patternExampleKeys(id: string) {
  const cached = patternPreviewKeys.get(id);
  if (cached) return cached;
  const row = patternPreview(id);
  if (!row) return [];
  // A dialogue separator in teaching copy does not make its answers unseen.
  const sentenceKeys = [
    ...new Set(
      [row.example, row.example.replace(/\s+[—–]\s+/g, " ")].map(sentenceKey),
    ),
  ];
  const keys = [
    ...new Set([
      ...sentenceKeys,
      ...patternRelease.items.flatMap((item) => {
        if (item.patternId !== id) return [];
        const primary = answerExposureKeys(item);
        const matches =
          sentenceKeys.some((key) => primary.includes(key)) ||
          (item.type === "order" &&
            item.answers.some((answer) =>
              sentenceKeys.includes(sentenceKey(answer)),
            ));
        return matches ? primary : [];
      }),
    ]),
  ];
  patternPreviewKeys.set(id, keys);
  return keys;
}
const authorized =
  "EXISTS(SELECT 1 FROM child_grants g LEFT JOIN account_sessions p ON p.id=g.parent_session_id WHERE g.id=? AND g.revoked_at IS NULL AND g.expires_at>? AND(g.parent_session_id IS NULL OR(p.revoked_at IS NULL AND p.expires_at>?)))";
const cache = new Map<string, Promise<string>>();
export async function hashedExposureKeys(keys: string[]) {
  return Promise.all(
    [...new Set(keys)].map((key) => {
      let value = cache.get(key);
      if (!value) {
        value = crypto.subtle
          .digest("SHA-256", new TextEncoder().encode(key))
          .then(
            (bytes) =>
              `sha256:${Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("")}`,
          );
        cache.set(key, value);
        if (cache.size > 8192) cache.delete(cache.keys().next().value!);
      }
      return value;
    }),
  );
}
export async function exposureStatements(
  db: D1Database,
  actor: Actor,
  keys: string[],
  now = Date.now(),
  guard?: { sql: string; params: (string | number)[] },
) {
  const hashed = await hashedExposureKeys(keys),
    day = localDay(now, actor.timezone);
  return hashed.map((key) =>
    db
      .prepare(
        `INSERT INTO teaching_exposures(household_id,child_id,evidence_key,shown_day,shown_at) SELECT ?,?,?,?,? WHERE ${authorized} ${guard ? `AND ${guard.sql}` : ""} ON CONFLICT(household_id,child_id,evidence_key) DO UPDATE SET shown_day=excluded.shown_day,shown_at=excluded.shown_at WHERE teaching_exposures.shown_day<>excluded.shown_day`,
      )
      .bind(
        actor.householdId,
        actor.childId,
        key,
        day,
        now,
        actor.grantId,
        now,
        now,
        ...(guard?.params ?? []),
      ),
  );
}
export async function recordExposure(
  db: D1Database,
  actor: Actor,
  keys: string[],
) {
  if (keys.length) await db.batch(await exposureStatements(db, actor, keys));
}
export const lessonExampleKeys = (id: string) =>
  courseCatalog.lessons
    .find((l) => l.id === id)
    ?.cards.map((card) => sentenceKey(card.example)) ?? [];
export const exposurePredicate = (count: number) =>
  `NOT EXISTS(SELECT 1 FROM teaching_exposures e WHERE e.household_id=? AND e.child_id=? AND e.shown_day=? AND e.evidence_key IN (${Array.from({ length: count }, () => "?").join(",")}))`;
export async function exampleShownToday(
  db: D1Database,
  actor: Actor,
  item: PrivateExercise,
) {
  const keys = await hashedExposureKeys(answerExposureKeys(item));
  return !!(await db
    .prepare(
      `SELECT 1 FROM teaching_exposures WHERE household_id=? AND child_id=? AND shown_day=? AND evidence_key IN (${keys.map(() => "?").join(",")}) LIMIT 1`,
    )
    .bind(
      actor.householdId,
      actor.childId,
      localDay(Date.now(), actor.timezone),
      ...keys,
    )
    .first());
}
