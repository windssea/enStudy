import { describe, it, expect } from "vitest";
import {
  patternRelease,
  gradeAnswer,
  publicExercise,
} from "../packages/server/exercises";
import { selectTopicItems } from "../packages/domain/selection";
describe("per-frame random practice", () => {
  it("gives all 72 frames 120 real variants and 40 distinct contexts", () => {
    expect(Object.keys(patternRelease.stats)).toHaveLength(72);
    expect(patternRelease.items).toHaveLength(8640);
    expect(new Set(patternRelease.items.map((item) => item.id)).size).toBe(
      8640,
    );
    for (const [id, stats] of Object.entries(patternRelease.stats)) {
      const items = patternRelease.items.filter(
        (item) => item.patternId === id,
      );
      expect(items).toHaveLength(120);
      expect(new Set(items.map((item) => item.context)).size).toBe(40);
      expect(new Set(items.map((item) => item.family)).size).toBe(
        stats.families,
      );
      expect(stats.families).toBeGreaterThanOrEqual(20);
      expect(stats.contexts).toBe(40);
      expect(new Set(items.map((item) => item.skill))).toEqual(
        new Set([`grammar.${id}`]),
      );
      const drawn = selectTopicItems(items, new Set(), 20, () => 0.35);
      expect(drawn).toHaveLength(20);
      expect(new Set(drawn.map((item) => item.family)).size).toBe(20);
    }
  });
  it("has three task types for each context, valid choices and reconstructable sentences", () => {
    for (const item of patternRelease.items) {
      expect(publicExercise(item)).not.toHaveProperty("answers");
      expect(publicExercise(item)).not.toHaveProperty("hint");
      expect(gradeAnswer(item, item.answers[0])).toBe(true);
      if (item.type === "choice") {
        expect(new Set(item.choices).size).toBe(3);
        expect(
          item.choices!.filter((choice) => gradeAnswer(item, choice)),
        ).toHaveLength(1);
      }
      if (item.type === "order")
        expect(item.tokens!.join(" ")).toBe(item.answers[0]);
    }
  });
  it("accepts legal start/help alternatives and contractions, without admitting wrong complements", () => {
    const find = (id: string, type = "input") =>
      patternRelease.items.find(
        (item) => item.patternId === id && item.type === type,
      )!;
    const start = find("pattern.complements.05");
    expect(gradeAnswer(start, "to read a story")).toBe(true);
    expect(gradeAnswer(start, "reading a story")).toBe(true);
    expect(gradeAnswer(start, "to reading a story")).toBe(false);
    const help = find("pattern.complements.06");
    expect(gradeAnswer(help, "read a story")).toBe(true);
    expect(gradeAnswer(help, "to read a story")).toBe(true);
    expect(gradeAnswer(help, "reading a story")).toBe(false);
    expect(
      gradeAnswer(
        find("pattern.introductions.02", "order"),
        "What's your name? My name is Mia.",
      ),
    ).toBe(true);
    expect(
      gradeAnswer(
        find("pattern.preferences.03", "order"),
        "I'd like some water.",
      ),
    ).toBe(true);
    expect(
      gradeAnswer(
        find("pattern.descriptions.04", "order"),
        "What color is my bag?",
      ),
    ).toBe(true);
  });
  it("shares families across equivalent contractions and never redraws the same sentence in one round", () => {
    const items = patternRelease.items.filter(
      (item) => item.patternId === "pattern.introductions.03",
    );
    const first = items.find(
      (item) => item.id === "frame.pattern.introductions.03.1.order",
    )!;
    const second = items.find(
      (item) => item.id === "frame.pattern.introductions.03.21.order",
    )!;
    expect(first.family).toBe(second.family);
    const drawn = selectTopicItems(items, new Set(), 20, () => 0.7);
    expect(new Set(drawn.map((item) => item.family)).size).toBe(20);
  });
  it("selects only the chosen frame and prioritizes different sentences in subsequent rounds", () => {
    const items = patternRelease.items.filter(
      (item) => item.patternId === "pattern.suggestions.02",
    );
    const first = selectTopicItems(items, new Set(), 5, () => 0.5);
    const seen = new Set(first.map((item) => item.family!));
    const next = selectTopicItems(items, seen, 5, () => 0.5);
    expect(
      next.every(
        (item) =>
          item.patternId === "pattern.suggestions.02" &&
          !seen.has(item.family!),
      ),
    ).toBe(true);
  });
});
