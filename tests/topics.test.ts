import { describe, expect, it } from "vitest";
import {
  topicRelease,
  publicExercise,
  gradeAnswer,
} from "../packages/server/exercises";
import { selectTopicItems, shuffle } from "../packages/domain/selection";
describe("large text topic banks", () => {
  it("covers every planned topic with 60 distinct task groups and 120 variants", () => {
    expect(Object.keys(topicRelease.stats)).toHaveLength(60);
    expect(topicRelease.items).toHaveLength(7200);
    expect(new Set(topicRelease.items.map((i) => i.id)).size).toBe(7200);
    for (const [topic, stats] of Object.entries(topicRelease.stats)) {
      const items = topicRelease.items.filter((i) => i.topicId === topic);
      expect(stats).toMatchObject({
        items: 120,
        families: 60,
        roundSizes: [5, 10, 20],
      });
      expect(items).toHaveLength(120);
      expect(new Set(items.map((i) => i.family)).size).toBe(60);
      expect(
        new Set(items.map((i) => JSON.stringify([i.prompt, i.reading ?? ""])))
          .size,
      ).toBe(60);
    }
  });
  it("keeps keys private and all choices unique and gradeable", () => {
    for (const item of topicRelease.items) {
      expect(gradeAnswer(item, item.answers[0])).toBe(true);
      expect(publicExercise(item)).not.toHaveProperty("answers");
      expect(publicExercise(item)).not.toHaveProperty("hint");
      if (item.type === "choice") {
        expect(item.choices).toContain(item.answers[0]);
        expect(new Set(item.choices!.map((c) => c.toLowerCase())).size).toBe(3);
        expect(item.choices!.filter((c) => gradeAnswer(item, c))).toHaveLength(
          1,
        );
      }
      if (item.topicId?.startsWith("reading."))
        expect(item.reading!.length).toBeGreaterThan(20);
    }
  });
  it("includes common irregulars and doubling rules with accepted regional variants", () => {
    const item = (topic: string, answer: string) =>
      topicRelease.items.find(
        (i) => i.topicId === topic && i.answers[0] === answer,
      )!;
    expect(item("forms.ing", "running")).toBeDefined();
    expect(item("forms.ing", "swimming")).toBeDefined();
    expect(item("forms.ing", "making")).toBeDefined();
    expect(item("forms.noun-plural", "children")).toBeDefined();
    expect(item("forms.noun-plural", "boxes")).toBeDefined();
    expect(gradeAnswer(item("forms.regular-past", "learned"), "learnt")).toBe(
      true,
    );
    expect(gradeAnswer(item("forms.past-participle", "got"), "gotten")).toBe(
      true,
    );
    expect(gradeAnswer(item("forms.ing", "running"), "runing")).toBe(false);
  });
});
describe("random topic draws", () => {
  const items = topicRelease.items.filter((i) => i.topicId === "grammar.be");
  it("draws 5/10/20 distinct families and never mutates the bank", () => {
    const before = items.map((i) => i.id);
    for (const size of [5, 10, 20]) {
      const drawn = selectTopicItems(items, new Set(), size, () => 0.35);
      expect(drawn).toHaveLength(size);
      expect(new Set(drawn.map((i) => i.family)).size).toBe(size);
      expect(drawn.every((i) => i.topicId === "grammar.be")).toBe(true);
    }
    expect(items.map((i) => i.id)).toEqual(before);
  });
  it("prioritizes unexposed families across rounds, including unattempted assignments", () => {
    const first = selectTopicItems(items, new Set(), 20, () => 0.25);
    const seen = new Set(first.map((i) => i.family!));
    const second = selectTopicItems(items, seen, 20, () => 0.25);
    expect(second.every((i) => !seen.has(i.family!))).toBe(true);
    second.forEach((i) => seen.add(i.family!));
    const third = selectTopicItems(items, seen, 20, () => 0.25);
    expect(third.every((i) => !seen.has(i.family!))).toBe(true);
  });
  it("uses a new draw and variant as randomness changes, without requiring probabilistic tests", () => {
    const a = selectTopicItems(items, new Set(), 10, () => 0);
    const b = selectTopicItems(items, new Set(), 10, () => 0.99);
    expect(a.map((i) => i.id)).not.toEqual(b.map((i) => i.id));
    expect(new Set(a.map((i) => i.pattern)).size).toBe(5);
  });
  it("reuses old families only when needed, with no duplicates even after exhaustion", () => {
    const seen = new Set(items.map((i) => i.family!));
    const drawn = selectTopicItems(items, seen, 20, () => 0.7);
    expect(drawn).toHaveLength(20);
    expect(new Set(drawn.map((i) => i.family)).size).toBe(20);
    expect(
      selectTopicItems(items.slice(0, 2), seen, 20, () => 0.7),
    ).toHaveLength(1);
    expect(selectTopicItems([], new Set())).toEqual([]);
  });
  it("shuffles presentation without changing answer multiplicity or source values", () => {
    const source = ["the", "cat", "and", "the", "dog"];
    const result = shuffle(source, () => 0);
    expect([...result].sort()).toEqual([...source].sort());
    expect(result).not.toEqual(source);
    expect(source).toEqual(["the", "cat", "and", "the", "dog"]);
  });
  it("revisits least-recently assigned families after exhausting unseen work", () => {
    const recent = Array.from(new Set(items.map((item) => item.family!)));
    const drawn = selectTopicItems(items, new Set(recent), 10, () => 0.7);
    expect(
      drawn.every((item) => recent.slice(-10).includes(item.family!)),
    ).toBe(true);
  });
});
