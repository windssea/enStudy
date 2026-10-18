import { describe, it, expect } from "vitest";
import {
  courseCatalog,
  courseExpansion,
  exerciseVersion,
  publicExercise,
  gradeAnswer,
} from "../packages/server/exercises";
import { answerExposureKeys, sentenceKey } from "../packages/domain/exposure";
import { hashedExposureKeys } from "../packages/server/exposure";
describe("second-unit course expansion", () => {
  it("contains four second-unit lessons in every grade and preserves the first 24", () => {
    expect(courseCatalog.lessons).toHaveLength(168);
    expect(courseExpansion.items).toHaveLength(216);
    for (let grade = 1; grade <= 6; grade++) {
      const lessons = courseExpansion.lessons.filter((l) => l.grade === grade);
      expect(lessons).toHaveLength(4);
      expect(lessons.map((l) => l.order)).toEqual([5, 6, 7, 8]);
      for (const lesson of lessons) {
        expect(lesson.unitId).toBe(`P${grade}A-U02`);
        expect(lesson.cards).toHaveLength(3);
        const items = courseExpansion.items.filter(
          (i) => i.lessonId === lesson.id,
        );
        expect(items).toHaveLength(9);
        expect(new Set(items.map((i) => i.family)).size).toBe(9);
        for (const type of ["choice", "input", "order"])
          expect(items.filter((i) => i.type === type)).toHaveLength(3);
      }
    }
  });
  it("keeps demonstrated sentences separate from every lesson's practice targets", () => {
    for (const lesson of courseExpansion.lessons) {
      const shown = new Set(lesson.cards.map((c) => sentenceKey(c.example)));
      for (const item of courseExpansion.items.filter(
        (i) => i.lessonId === lesson.id,
      )) {
        expect(answerExposureKeys(item).some((key) => shown.has(key))).toBe(
          false,
        );
        expect(publicExercise(item)).not.toHaveProperty("answers");
        expect(gradeAnswer(item, item.answers[0])).toBe(true);
        if (item.type === "choice") {
          expect(
            item.choices!.filter((a) => gradeAnswer(item, a)),
          ).toHaveLength(1);
        }
        if (item.type === "order") {
          expect(item.tokens!.length).toBeLessThanOrEqual(16);
          expect([...item.tokens!].sort()).toEqual(
            item.answers[0].split(" ").sort(),
          );
        } else if (item.type === "input")
          expect(item.modality).toBe("controlled-production");
      }
    }
  });
  it("labels actual blanks separately inside integrated lessons", () => {
    expect(exerciseVersion("P1A-U02-L4.p1.choice", 2)?.skill).toBe(
      "grammar.articles",
    );
    expect(exerciseVersion("P1A-U02-L4.p4.choice", 2)?.skill).toBe(
      "grammar.be.present",
    );
    expect(exerciseVersion("P1A-U02-L4.p7.choice", 2)?.skill).toBe(
      "vocabulary.colours",
    );
    expect(exerciseVersion("P3A-U02-L4.p4.choice", 2)?.skill).toBe(
      "grammar.prepositions",
    );
    expect(exerciseVersion("P5A-U02-L4.p4.choice", 2)?.skill).toBe(
      "grammar.modals",
    );
    expect(exerciseVersion("P6A-U02-L3.p1.choice", 2)?.skill).toBe(
      "grammar.past-simple",
    );
  });
  it("retains immutable v1 assignments while offering v2 to new sessions", () => {
    const old = exerciseVersion("P1A-U02-L2.p1.choice", 1),
      current = exerciseVersion("P1A-U02-L2.p1.choice", 2);
    expect(old?.skill).toBe("grammar.demonstratives");
    expect(current?.skill).toBe("grammar.be.present");
    expect(old?.answers).toEqual(current?.answers);
    expect(courseExpansion.items.filter((i) => i.version === 2)).toHaveLength(
      54,
    );
  });
});
describe("teaching exposure fingerprints", () => {
  it("normalizes display case spacing punctuation and apostrophes without exposing source text in storage keys", async () => {
    expect(sentenceKey("  I  can’t swim! ")).toBe(sentenceKey("I can't swim."));
    const [hash] = await hashedExposureKeys([sentenceKey("I can't swim.")]);
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(hash).not.toContain("swim");
    expect((await hashedExposureKeys(["hello"]))[0]).toBe(
      "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
  it("recognizes a complete example across recognition input and order", () => {
    for (const type of ["choice", "input", "order"] as const) {
      const item = exerciseVersion(`P1A-U01-L3.f1.${type}`)!;
      expect(answerExposureKeys(item)).toContain(sentenceKey("I am happy."));
    }
  });
});
