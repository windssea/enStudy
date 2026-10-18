import { describe, expect, it } from "vitest";
import {
  actionRelease,
  courseCatalog,
  exerciseVersion,
  gradeAnswer,
  publicExercise,
  structuredFeedback,
} from "../packages/server/exercises";
import { structuredCanonical } from "../packages/domain/structured";
import catalog from "../public/content/catalog.json";
import conceptMap from "../content/concept-exposure-map.json";
import { answerExposureKeys } from "../packages/domain/exposure";
const answer = (item: (typeof actionRelease.items)[number]) =>
  item.type === "sort"
    ? Object.entries(item.placements!).map(
        ([card, group]) => `${card}=${group}`,
      )
    : item.type === "repair" || item.type === "evidence"
      ? JSON.parse(item.answers[0])
      : item.type === "order"
        ? item.answers[0].replace(/([.!?,])/g, " $1").split(/\s+/)
        : item.answers[0];
describe("fourth-unit mixed learning courses", () => {
  it("preserves the saved v1 task while new assignments use the reviewed searching phrase", () => {
    const id = "P3A-U04-L3.p3.choice",
      old = exerciseVersion(id, 1)!,
      current = exerciseVersion(id, 2)!;
    expect(old.prompt).toContain("finding a dictionary");
    expect(current.prompt).toContain("looking for a dictionary");
    expect(current.family).toBe(old.family);
    expect(gradeAnswer(old, "are")).toBe(true);
    expect(gradeAnswer(current, "are")).toBe(true);
    expect(publicExercise(current).prompt).not.toContain("finding");
    expect(actionRelease.items.find((item) => item.id === id)?.version).toBe(2);
  });
  it("adds four lessons per grade to the real catalog without replacing older units", () => {
    expect(courseCatalog.lessons).toHaveLength(264);
    expect(actionRelease.lessons).toHaveLength(24);
    expect(actionRelease.items).toHaveLength(216);
    for (let grade = 1; grade <= 6; grade++) {
      expect(
        actionRelease.lessons
          .filter((l) => l.grade === grade)
          .map((l) => l.order),
      ).toEqual([13, 14, 15, 16]);
      expect(
        courseCatalog.lessons.filter((l) => l.grade === grade),
      ).toHaveLength(44);
    }
    expect(new Set(courseCatalog.lessons.map((l) => l.id)).size).toBe(264);
    for (const lesson of actionRelease.lessons) {
      expect(lesson.itemCount).toBe(9);
      expect(
        lesson.topicIds.every((id) =>
          catalog.topics.some((t) => t.topic_id === id),
        ),
      ).toBe(true);
    }
  });
  it("uses all seven supported task types with distinct task families and separate listening facts", () => {
    expect(new Set(actionRelease.items.map((i) => i.family)).size).toBe(216);
    const counts = Object.fromEntries(
      [...new Set(actionRelease.items.map((i) => i.type))].map((type) => [
        type,
        actionRelease.items.filter((i) => i.type === type).length,
      ]),
    );
    expect(counts).toEqual({
      listen: 48,
      evidence: 48,
      choice: 24,
      repair: 24,
      sort: 24,
      input: 24,
      order: 24,
    });
    for (const lesson of actionRelease.lessons) {
      const items = actionRelease.items.filter((i) => i.lessonId === lesson.id);
      expect(items.map((i) => i.type)).toEqual([
        "listen",
        "evidence",
        "choice",
        "listen",
        "evidence",
        "repair",
        "sort",
        "input",
        "order",
      ]);
      const passage = items.find((i) => i.type === "evidence")!.passage!;
      expect(
        items
          .filter((i) => i.type === "listen")
          .every((i) => !passage.some((s) => s.text === i.audioText)),
      ).toBe(true);
    }
  });
  it("grades every task through its actual structured or text contract", () => {
    for (const item of actionRelease.items) {
      const value = answer(item);
      expect(gradeAnswer(item, value), item.id).toBe(true);
      expect(structuredCanonical(item, value), item.id).not.toBeNull();
      expect(exerciseVersion(item.id, item.version ?? 1), item.id).toBe(item);
      if (item.choices)
        expect(
          item.choices.filter((choice) =>
            item.type === "evidence"
              ? gradeAnswer(item, [
                  item.evidenceSolutions![0].sentenceId,
                  choice,
                ])
              : gradeAnswer(item, choice),
          ),
        ).toHaveLength(1);
      if (item.type === "sort" || item.type === "repair")
        expect(
          structuredFeedback(item, value).details!.every((row) => row.correct),
        ).toBe(true);
    }
  });
  it("does not publish correction mappings or reuse its teaching examples as assessed solutions", () => {
    for (const lesson of actionRelease.lessons)
      for (const item of actionRelease.items.filter(
        (i) => i.lessonId === lesson.id,
      )) {
        for (const sentence of item.solutionSentences ?? [])
          expect(
            lesson.cards.some(
              (card) => card.example.toLowerCase() === sentence.toLowerCase(),
            ),
            item.id,
          ).toBe(false);
        const data = publicExercise(item) as unknown as Record<string, unknown>;
        for (const key of [
          "answers",
          "placements",
          "repairs",
          "evidenceSolutions",
          "solutionSentences",
          "evidenceTargets",
          "hint",
          "explanation",
        ])
          expect(Object.hasOwn(data, key)).toBe(false);
      }
  });
  it("accepts supported time phrase positions and rejects an adverb inside a noun phrase", () => {
    const item = actionRelease.items.find(
      (i) => i.id === "P3A-U04-L1.p9.order",
    )!;
    for (const sentence of [
      "The boys are washing their boots now.",
      "Now, the boys are washing their boots.",
      "The boys are now washing their boots.",
    ])
      expect(gradeAnswer(item, sentence), sentence).toBe(true);
    expect(gradeAnswer(item, "The now boys are washing their boots.")).toBe(
      false,
    );
    const past = actionRelease.items.find(
      (i) => i.id === "P4A-U04-L4.p9.order",
    )!;
    expect(
      gradeAnswer(past, "Yesterday, Sam gave the key back to the guard."),
    ).toBe(true);
  });
  it("separates incomplete and incorrect evidence from complete meaningful answers", () => {
    const sort = actionRelease.items.find((i) => i.type === "sort")!,
      correct = answer(sort) as string[];
    expect(structuredCanonical(sort, correct.slice(1))).toBeNull();
    expect(gradeAnswer(sort, [...correct].reverse())).toBe(true);
    const bad = [...correct];
    bad[0] = bad[0].replace(/g[01]$/, bad[0].endsWith("g0") ? "g1" : "g0");
    expect(gradeAnswer(sort, bad)).toBe(false);
    expect(
      structuredFeedback(sort, bad).details!.filter((d) => !d.correct),
    ).toHaveLength(1);
    const repair = actionRelease.items.find((i) => i.type === "repair")!;
    expect(structuredCanonical(repair, ["unknown", "is"])).toBeNull();
    const reading = actionRelease.items.find((i) => i.type === "evidence")!;
    expect(
      gradeAnswer(reading, ["s3", reading.evidenceSolutions![0].answer]),
    ).toBe(false);
  });
  it("maps previously demonstrated forms into new course editing and classification evidence", () => {
    const keys = (conceptMap.entries as Record<string, string[]>)[
      "forms.ing/sit"
    ];
    const repair = actionRelease.items.find(
      (i) => i.id === "P3A-U04-L4.p6.repair",
    )!;
    for (const key of answerExposureKeys(repair)) expect(keys).toContain(key);
    const sort = actionRelease.items.find(
        (i) => i.id === "P3A-U04-L4.p7.sort",
      )!,
      card = sort.sorting!.cards.find((c) => c.text === "sit")!;
    expect(keys).toContain(`workshop-target:${sort.skill}:${card.id}`);
  });
});
