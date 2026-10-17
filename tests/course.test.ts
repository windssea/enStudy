import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  courseRelease,
  exercises,
  gradeAnswer,
  publicExercise,
} from "../packages/server/exercises";
import { selectReviewItems } from "../packages/domain/selection";

describe("authored foundation course release", () => {
  it("has four real micro-lessons for the first unit of each primary year", () => {
    expect(courseRelease.lessons).toHaveLength(24);
    for (let grade = 1; grade <= 6; grade++) {
      const lessons = courseRelease.lessons.filter(
        (lesson) => lesson.grade === grade,
      );
      expect(lessons.map((lesson) => lesson.order)).toEqual([1, 2, 3, 4]);
      expect(
        lessons.every(
          (lesson) =>
            lesson.cards.length === 3 &&
            lesson.task.length > 10 &&
            lesson.vocabulary.length === 3,
        ),
      ).toBe(true);
      expect(
        lessons.every(
          (lesson) =>
            courseRelease.items.filter((item) => item.lessonId === lesson.id)
              .length === 9,
        ),
      ).toBe(true);
    }
  });
  it("keeps correct answers out of public exercise payloads and lesson files", () => {
    const text = readFileSync("public/content/lessons.json", "utf8");
    expect(text).not.toContain('"answers":');
    expect(text).not.toContain('"private_answer_json":');
    for (const item of courseRelease.items)
      expect(publicExercise(item)).not.toHaveProperty("answers");
  });
  it("has valid, unique choices and reconstructable ordering tasks", () => {
    for (const item of courseRelease.items) {
      expect(item.answers.length).toBeGreaterThan(0);
      expect(gradeAnswer(item, item.answers[0])).toBe(true);
      if (item.type === "choice") {
        expect(new Set(item.choices).size).toBe(3);
        expect(item.choices).toContain(item.answers[0]);
      }
      if (item.type === "order")
        expect([...item.tokens!].sort()).toEqual(
          item.answers[0].split(" ").sort(),
        );
    }
  });
  it("marks all variants of a sentence as the same family", () => {
    const families = new Map<string, Set<string>>();
    for (const item of courseRelease.items) {
      const kinds = families.get(item.family!) ?? new Set();
      kinds.add(item.type);
      families.set(item.family!, kinds);
    }
    expect(families.size).toBe(71);
    expect(
      Array.from(families.values()).every((types) => types.size === 3),
    ).toBe(true);
  });
  it("accepts valid British and American spelling without accepting the wrong tense", () => {
    const item = exercises.find((e) => e.id === "P5A-U01-L4.f3.input")!;
    expect(gradeAnswer(item, "learnt")).toBe(true);
    expect(gradeAnswer(item, "learned")).toBe(true);
    expect(gradeAnswer(item, "learn")).toBe(false);
  });
  it("assigns the regular past target to played rather than irregular past", () => {
    expect(exercises.find((e) => e.id === "P5A-U01-L2.f3.input")?.skill).toBe(
      "morphology.verb.regular-past",
    );
  });
});
describe("bounded review selection", () => {
  const items = [
    { id: "old", skill: "be", modality: "recognition", family: "old-family" },
    { id: "new", skill: "be", modality: "recognition", family: "new-family" },
    { id: "spelling", skill: "be", modality: "spelling", family: "new-family" },
  ];
  it("only selects due cards in the requested modality and prefers a new family", () => {
    expect(
      selectReviewItems(
        [
          {
            skillId: "be",
            modality: "recognition",
            dueAt: 10,
            lastFamily: "old-family",
          },
          { skillId: "be", modality: "spelling", dueAt: 100 },
        ],
        items,
        20,
      ).map((i) => i.id),
    ).toEqual(["new"]);
  });
  it("does not repeat a family within a round", () => {
    const cards = [
      {
        skillId: "be",
        modality: "recognition",
        dueAt: 10,
        lastFamily: "old-family",
      },
      { skillId: "be", modality: "spelling", dueAt: 10 },
    ];
    expect(selectReviewItems(cards, items, 20).map((i) => i.id)).toEqual([
      "new",
    ]);
  });
  it("keeps the oldest due work first and caps each round at eight", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      skill: String(i),
      modality: "recognition",
      family: String(i),
    }));
    const cards = rows.map((item, i) => ({
      skillId: item.skill,
      modality: item.modality,
      dueAt: 20 - i,
    }));
    expect(selectReviewItems(cards, rows, 30).map((i) => i.id)).toEqual([
      "11",
      "10",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
    ]);
    expect(cards[0].dueAt).toBe(20);
  });
  it("falls back to the available family and handles legacy items without a family", () => {
    const legacy = [
      { id: "a", skill: "x", modality: "spelling" },
      { id: "b", skill: "x", modality: "spelling" },
    ];
    expect(
      selectReviewItems(
        [{ skillId: "x", modality: "spelling", dueAt: 0, lastFamily: "a" }],
        legacy,
        1,
      )[0].id,
    ).toBe("b");
    expect(
      selectReviewItems(
        [
          {
            skillId: "be",
            modality: "recognition",
            dueAt: 0,
            lastFamily: "old-family",
          },
        ],
        [items[0]],
        1,
      )[0].id,
    ).toBe("old");
  });
});
