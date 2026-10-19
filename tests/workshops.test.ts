import { describe, it, expect } from "vitest";
import {
  workshopRelease,
  exerciseVersion,
  gradeAnswer,
  publicExercise,
  structuredFeedback,
} from "../packages/server/exercises";
import { structuredCanonical, joinParts } from "../packages/domain/structured";
import { answerExposureKeys } from "../packages/domain/exposure";
import { reconcileDraft } from "../src/sessionDraft";
import type { LearningSession } from "../packages/contracts/index";
const answer = (item: (typeof workshopRelease.items)[number]) =>
  item.type === "sort"
    ? Object.entries(item.placements!).map(([id, group]) => `${id}=${group}`)
    : (JSON.parse(item.answers[0]) as string[]);
const legacyWorkshops = {
  workshops: workshopRelease.workshops.filter(
    (w) => w.id !== "be-action-contrast",
  ),
  items: workshopRelease.items.filter(
    (i) => i.workshopId !== "be-action-contrast",
  ),
};
describe("authored structured banks", () => {
  it("covers twelve workshops and all six grade suggestions without counting combinations as new vocabulary", () => {
    expect(legacyWorkshops.workshops).toHaveLength(12);
    expect(legacyWorkshops.items).toHaveLength(384);
    expect(new Set(legacyWorkshops.workshops.map((w) => w.grade)).size).toBe(6);
    for (const bank of legacyWorkshops.workshops) {
      const items = legacyWorkshops.items.filter(
        (i) => i.workshopId === bank.id,
      );
      expect(items.filter((i) => i.type === "sort")).toHaveLength(24);
      expect(items.filter((i) => i.type === "repair")).toHaveLength(8);
      expect(new Set(items.map((i) => i.family)).size).toBe(32);
    }
  });
  it("grades every authored task with its real multi-part payload and rejects a wrong placement or replacement", () => {
    for (const item of legacyWorkshops.items) {
      const correct = answer(item);
      expect(gradeAnswer(item, correct), item.id).toBe(true);
      expect(structuredCanonical(item, correct), item.id).not.toBeNull();
      const wrong = [...correct];
      if (item.type === "sort") {
        const [id, group] = wrong[0].split("=");
        wrong[0] = `${id}=${item.sorting!.groups.find((g) => g.id !== group)!.id}`;
      } else wrong[1] = "definitely-wrong";
      expect(gradeAnswer(item, wrong), item.id).toBe(false);
      const safe = JSON.stringify(publicExercise(item));
      for (const key of [
        "placements",
        "repairs",
        "solutionSentences",
        "answers",
        "evidenceTargets",
        "explanation",
      ])
        expect(safe).not.toContain(`"${key}"`);
      if (item.type === "repair") {
        const [part, replacement] = correct;
        expect(
          joinParts(
            item.editing!.parts.map((p) =>
              p.id === part ? replacement : p.text,
            ),
          ),
          item.id,
        ).toBe(item.solutionSentences![0]);
      }
    }
  });
  it("keeps sorting order independent and rejects duplicates, missing cards, unknown cards and unknown groups", () => {
    const item = legacyWorkshops.items.find((i) => i.type === "sort")!,
      correct = answer(item);
    expect(structuredCanonical(item, correct.reverse())).toBe(item.answers[0]);
    for (const invalid of [
      correct.slice(1),
      [...correct, correct[0]],
      [correct[0], correct[0], ...correct.slice(2)],
      correct.map((x, i) => (i ? x : "fake=g0")),
      correct.map((x, i) => (i ? x : `${x.split("=")[0]}=fake`)),
      "some raw string",
    ])
      expect(structuredCanonical(item, invalid)).toBeNull();
  });
  it("requires an actual selected part and a bounded replacement, but accepts case and compatible apostrophes", () => {
    const item = legacyWorkshops.items.find(
        (i) => i.id === "workshop.articles.repair.1",
      )!,
      correct = answer(item);
    expect(gradeAnswer(item, [correct[0], " A "])).toBe(true);
    for (const invalid of [
      ["fake", "a"],
      [correct[0], ""],
      [correct[0], "a", "extra"],
      [correct[0], "<b>"],
      [correct[0], "a".repeat(61)],
      "This is a book.",
    ])
      expect(structuredCanonical(item, invalid)).toBeNull();
    expect(
      gradeAnswer(item, [
        item.editing!.parts.find((p) => p.id !== correct[0])!.id,
        "a",
      ]),
    ).toBe(false);
  });
  it("returns individual feedback while the whole multi-card task still needs every placement correct", () => {
    const item = legacyWorkshops.items.find((i) => i.type === "sort")!,
      correct = answer(item),
      wrong = [...correct],
      [id, group] = wrong[0].split("=");
    wrong[0] = `${id}=${item.sorting!.groups.find((g) => g.id !== group)!.id}`;
    expect(
      structuredFeedback(item, wrong).details!.filter((d) => !d.correct),
    ).toHaveLength(1);
    expect(gradeAnswer(item, wrong)).toBe(false);
  });
  it("appends the accepted US spelling without mutating historical item version", () => {
    const previous = exerciseVersion("workshop.plurals.repair.4", 1)!,
      current = exerciseVersion(previous.id, 2)!,
      id = previous.repairs![0].partId;
    expect(gradeAnswer(current, [id, "buses"])).toBe(true);
    expect(gradeAnswer(current, [id, "busses"])).toBe(true);
    expect(previous.answers).toHaveLength(1);
    expect(current.answers).toHaveLength(2);
    expect(current.version).toBe(2);
  });
  it("shares constituent evidence between grouping and correction while keeping unrelated targets apart", () => {
    const sorted = legacyWorkshops.items.find(
        (i) => i.workshopId === "plurals" && i.type === "sort",
      )!,
      corrected = legacyWorkshops.items.find(
        (i) => i.id === "workshop.plurals.repair.1",
      )!;
    expect(
      answerExposureKeys(sorted).some((k) =>
        answerExposureKeys(corrected).includes(k),
      ),
    ).toBe(true);
    expect(answerExposureKeys(corrected)).toContain(
      `family:${corrected.family}`,
    );
  });
  it("preserves the exact same-assignment draft and describes moved drafts with words rather than IDs", () => {
    const item = legacyWorkshops.items[0],
      s = {
        assignmentId: "one",
        exercise: publicExercise(item),
      } as LearningSession,
      next = { ...s, assignmentId: "two" },
      draft = answer(item);
    expect(reconcileDraft(s, s, draft).answer).toBe(draft);
    const moved = reconcileDraft(s, next, draft);
    expect(moved.answer).toEqual([]);
    expect(moved.backup).toContain(item.sorting!.cards[0].text);
    expect(moved.backup).not.toContain(item.sorting!.cards[0].id);
  });
});
