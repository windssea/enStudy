import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import review from "../content/grade4-language-review.v1.json";
import cuesV2 from "../content/grade4-tense-release.cues-v2.json";
import originalTopics from "../content/topic-release.v1.json";
import historicalHashes from "./fixtures/grade4-pre-review-hashes.json";
import { restoreStoredAnswer } from "../packages/domain/structured";
import {
  courseCatalog,
  topicCatalog,
  exerciseVersion,
  grade4TenseRelease,
  gradeAnswer,
  publicExercise,
  topicPublicationReleases,
  type PrivateExercise,
} from "../packages/server/exercises";

describe("reviewed P4 English keeps accurate contexts and immutable history", () => {
  it("retains all earlier publication bytes, including applied migrations", () => {
    for (const [path, expected] of Object.entries(historicalHashes))
      expect(
        createHash("sha256").update(readFileSync(path)).digest("hex"),
        path,
      ).toBe(expected);
  });
  it("generates defined SQL values for legacy lessons without explicit unitNumber", () => {
    const sql = readFileSync(
      "migrations/0054_grade4_language_review.sql",
      "utf8",
    );
    expect(sql).not.toMatch(/\bundefined\b|\bNaN\b/);
    expect(sql).toContain(
      "'P4A-U01-L1',3,'grade4-language-review-v1',4,'A',1,",
    );
  });
  it("preserves every historical v1/v2 key, family and grading target", () => {
    for (const current of review.items as PrivateExercise[]) {
      const old = exerciseVersion(current.id, current.version! - 1)!;
      expect(old, current.id).toBeDefined();
      expect(old.version ?? 1).toBe(current.version! - 1);
      expect(current.family).toBe(old.family);
      expect(current.skill).toBe(old.skill);
      expect(current.modality).toBe(old.modality);
      for (const answer of old.answers)
        expect(
          gradeAnswer(
            current,
            ["repair", "evidence", "sort"].includes(old.type)
              ? restoreStoredAnswer(old, JSON.parse(answer))
              : answer,
          ),
          current.id + answer,
        ).toBe(true);
      expect(exerciseVersion(current.id, current.version!)).toEqual(current);
      expect(publicExercise(current)).not.toHaveProperty("answers");
      if (current.choices && current.type !== "evidence")
        expect(
          current.choices.filter((a) => gradeAnswer(current, a)),
        ).toHaveLength(1);
    }
    for (const old of cuesV2.items.filter((i) => i.version === 2))
      expect(exerciseVersion(old.id, 2)).toEqual(old);
    expect(originalTopics.items).toHaveLength(7200);
  });
  it("fixes the speaker's possessions without changing first-person negatives", () => {
    const question = grade4TenseRelease.items.find(
      (i) => i.id === "g4.forms.irregular-past.did.keep.question.input",
    )!;
    const negative = grade4TenseRelease.items.find(
      (i) => i.id === "g4.forms.irregular-past.did.keep.negative.input",
    )!;
    expect(question.prompt).toBe(
      "Did you ___ your promise yesterday?（过去式 kept）",
    );
    expect(negative.prompt).toContain("my promise");
    expect(gradeAnswer(question, "keep")).toBe(true);
    expect(gradeAnswer(question, "kept")).toBe(false);
    expect(question.wordFormCue?.word).toBe("kept");
  });
  it("gives each perfect example a past reference appropriate to its meaning", () => {
    const rows = grade4TenseRelease.items.filter((i) =>
      i.pattern?.endsWith(".participle"),
    );
    expect(rows).toHaveLength(120);
    for (const item of rows) {
      expect(item.prompt.match(/___/g)).toHaveLength(1);
      expect(item.prompt).toMatch(/had (?:already )?___/);
      expect(item.prompt).toMatch(
        /yesterday|last (?:night|Friday|autumn)|the day before/,
      );
      expect(item.prompt).not.toContain("before lunch");
    }
    const grow = rows.find((i) => i.id.endsWith(".grow.participle.input"))!;
    expect(grow.prompt).toContain(
      "By last autumn, the beans in our garden had ___ tall.",
    );
    const know = rows.find((i) => i.id.endsWith(".know.participle.input"))!;
    expect(know.prompt).toContain("for several minutes");
    const get = rows.find((i) => i.id.endsWith(".get.participle.input"))!;
    expect(gradeAnswer(get, "gotten")).toBe(true);
    expect(gradeAnswer(get, "got")).toBe(true);
    expect(gradeAnswer(get, "get")).toBe(false);
  });
  it("constrains lexical blanks and accepts the natural final-step equivalent", () => {
    const task = (id: string) => courseCatalog.items.find((i) => i.id === id)!;
    expect(task("P4A-U01-L4.f2.input").prompt).toContain("（play）");
    expect(task("P4B-U06-L1.p8.input").prompt).toContain("（take）");
    const teach = task("P4A-U04-L4.p8.input");
    expect(teach.prompt).toBe("Grandpa ___ me how to tie a knot yesterday.");
    expect(gradeAnswer(teach, "taught")).toBe(true);
    expect(gradeAnswer(teach, "teached")).toBe(false);
    const final = task("P4B-U06-L4.p8.input");
    expect(gradeAnswer(final, "finally")).toBe(true);
    expect(gradeAnswer(final, "lastly")).toBe(true);
    expect(gradeAnswer(final, "first")).toBe(false);
    for (const item of review.items.filter((i) => i.id.startsWith("bank."))) {
      expect(item.prompt).toMatch(/（[a-z]+）$/);
      expect(topicPublicationReleases(item.topicId!)).toContain(review.id);
      expect(topicCatalog.items.find((i) => i.id === item.id)).toEqual(item);
    }
  });
  it("serves reviewed lesson cards while retaining all 48 course identities and nine-task assignments", () => {
    expect(courseCatalog.lessons.filter((l) => l.grade === 4)).toHaveLength(48);
    for (const lesson of review.lessons) {
      expect(courseCatalog.lessons.find((l) => l.id === lesson.id)).toEqual(
        lesson,
      );
      expect(
        courseCatalog.items.filter((i) => i.lessonId === lesson.id),
      ).toHaveLength(9);
    }
    const cards = courseCatalog.lessons
      .filter((l) => l.grade === 4)
      .flatMap((l) => l.cards);
    expect(
      cards.some((c) => c.example === "I drove to the harbour last month."),
    ).toBe(false);
    expect(
      cards.some(
        (c) => c.example === "Dad drove us to the harbour last month.",
      ),
    ).toBe(true);
    expect(
      cards.some((c) => c.example === "Yes, he was. No, he was not."),
    ).toBe(false);
  });
});
