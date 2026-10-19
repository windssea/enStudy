import { describe, it, expect } from "vitest";
import {
  workshopRelease,
  gradeAnswer,
  publicExercise,
  exerciseVersion,
} from "../packages/server/exercises";
const items = workshopRelease.items.filter(
  (i) => i.workshopId === "be-action-contrast",
);
describe("contextual be/action contrast", () => {
  it("clarifies standard question order while preserving the original item and answer set", () => {
    const original = exerciseVersion("contrast.be-action.question-state", 1)!;
    const current = exerciseVersion(original.id, 2)!;
    expect(original.version).toBe(1);
    expect(current.prompt).toContain("标准一般疑问句");
    expect(current.prompt).not.toBe(original.prompt);
    expect(current.answers).toEqual(original.answers);
    expect(current.explanation).toContain("口语中Nora is ready?");
  });
  it("contains twelve separate judgments and five response types", () => {
    expect(items).toHaveLength(12);
    expect(new Set(items.map((i) => i.family)).size).toBe(12);
    expect(new Set(items.map((i) => i.type)).size).toBe(5);
  });
  it("accepts authored answers and rejects the contrasting grammatical error", () => {
    for (const item of items) {
      const answer = ["repair", "evidence"].includes(item.type)
        ? JSON.parse(item.answers[0])
        : item.type === "order"
          ? ["Is", "your", "sister", "in", "the", "library", "?"]
          : item.answers[0];
      expect(gradeAnswer(item, answer), item.id).toBe(true);
      expect(
        gradeAnswer(
          item,
          item.type === "repair"
            ? [answer[0], "does"]
            : item.type === "evidence"
              ? ["s2", answer[1]]
              : "are do",
        ),
        item.id,
      ).toBe(false);
    }
    const response = items.find((i) => i.id.endsWith("short-action"))!;
    expect(gradeAnswer(response, "are")).toBe(false);
    expect(gradeAnswer(response, " DO ")).toBe(true);
  });
  it("requires the supporting sentence as well as the right reading answer", () => {
    const item = items.find((i) => i.type === "evidence")!;
    expect(gradeAnswer(item, ["s1", "She is a bus driver."])).toBe(true);
    expect(gradeAnswer(item, ["s2", "She is a bus driver."])).toBe(false);
    expect(gradeAnswer(item, ["s1", "She is at home."])).toBe(false);
  });
  it("accepts both full and contracted negation while rejecting a change to the wrong part", () => {
    const item = items.find((i) => i.id.endsWith("negative-state"))!;
    expect(gradeAnswer(item, ["p1", "is not"])).toBe(true);
    expect(gradeAnswer(item, ["p1", "isn’t"])).toBe(true);
    expect(gradeAnswer(item, ["p0", "isn't"])).toBe(false);
  });
  it("keeps answers, evidence targets and teaching notes private until feedback", () => {
    for (const item of items) {
      const data = publicExercise(item);
      for (const field of [
        "answers",
        "repairs",
        "explanation",
        "hint",
        "evidenceTargets",
        "evidenceSolutions",
        "demand",
      ])
        expect(data).not.toHaveProperty(field);
    }
  });
});
