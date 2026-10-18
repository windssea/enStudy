import type { Actor } from "./app";
import { localDay } from "../domain/review";
import { sentenceKey, answerExposureKeys } from "../domain/exposure";
import {
  courseCatalog,
  patternRelease,
  vocabularyRelease,
  type PrivateExercise,
} from "./exercises";
import catalog from "../../public/content/catalog.json";
import conceptExposure from "../../content/concept-exposure-map.json";
import { conceptLabs } from "../domain/concepts";
// Read aliases preserve demonstrations recorded before a later content release.
// Never write these aliases as feedback: answering a task did not show a lab case.
const historicalConceptKeys = new Map<string, Set<string>>();
for (const lab of conceptLabs)
  for (const example of lab.cases) {
    const canonical = sentenceKey(example.sentence);
    const entries = conceptExposure.entries as Record<string, string[]>;
    for (const key of entries[`${lab.id}/${example.id}`] ?? []) {
      const aliases = historicalConceptKeys.get(key) ?? new Set<string>();
      aliases.add(canonical);
      historicalConceptKeys.set(key, aliases);
    }
  }
export function disclosureCheckKeys(item: PrivateExercise) {
  const primary = answerExposureKeys(item);
  const word =
    item.phonicsWordId ??
    (item.wordId ? wordPreview(item.wordId)?.word : undefined);
  // Read old vocabulary demonstrations as aliases, without writing an example
  // sentence the learner did not actually see in the phonics studio.
  const aliases = item.phonicsWordId
    ? vocabularyRelease.themes
        .flatMap((t) => t.words)
        .filter(
          (w) => w.word.toLowerCase() === item.phonicsWordId!.toLowerCase(),
        )
        .flatMap((w) => wordExampleKeys(w.id))
    : [];
  return [
    ...new Set([
      ...primary,
      ...(word ? [sentenceKey(word)] : []),
      ...aliases,
      ...primary.flatMap((key) => [...(historicalConceptKeys.get(key) ?? [])]),
    ]),
  ];
}
const patternPreviewKeys = new Map<string, string[]>();
export function wordPreview(id: string) {
  return vocabularyRelease.themes
    .flatMap((theme) => theme.words)
    .find((word) => word.id === id);
}
const wordPreviewKeys = new Map<string, string[]>();
export function wordExampleKeys(id: string) {
  const cached = wordPreviewKeys.get(id);
  if (cached) return cached;
  const word = wordPreview(id);
  if (!word) return [];
  const keys = [
    ...new Set([
      sentenceKey(word.example),
      ...vocabularyRelease.items
        .filter((item) => item.wordId === id)
        .flatMap(answerExposureKeys),
    ]),
  ];
  wordPreviewKeys.set(id, keys);
  return keys;
}
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
  const keys = await hashedExposureKeys(disclosureCheckKeys(item));
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
