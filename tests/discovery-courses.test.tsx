import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  discoveryRelease,
  courseCatalog,
  gradeAnswer,
  publicExercise,
  exerciseVersion,
  structuredFeedback,
} from "../packages/server/exercises";
import { structuredCanonical } from "../packages/domain/structured";
import { answerExposureKeys } from "../packages/domain/exposure";
import { conceptLab } from "../packages/domain/concepts";
import exposure from "../content/concept-exposure-map.json";
import LessonConcepts from "../src/LessonConcepts";
import catalog from "../public/content/catalog.json";
vi.mock("../src/SceneStage", () => ({ default: () => null }));
const item = (id: string) =>
  discoveryRelease.items.find((row) => row.id === id)!;
const solution = (row: (typeof discoveryRelease.items)[number]) =>
  row.type === "sort"
    ? Object.entries(row.placements!).map(([card, group]) => `${card}=${group}`)
    : row.type === "repair" || row.type === "evidence"
      ? JSON.parse(row.answers[0])
      : row.type === "order"
        ? row.answers[0]
            .replace(/([.!?,])/g, " $1")
            .trim()
            .split(/\s+/)
        : row.answers[0];
describe("fifth-unit original lessons and guided 3D links", () => {
  it("adds four fifth-unit lessons in every grade while retaining all older versions", () => {
    expect(courseCatalog.lessons).toHaveLength(120);
    expect(new Set(courseCatalog.lessons.map((row) => row.id)).size).toBe(120);
    expect(discoveryRelease.lessons).toHaveLength(24);
    expect(discoveryRelease.items).toHaveLength(216);
    const newUnits = catalog.units.filter((unit) =>
      /^P[1-6]A-U05$/.test(unit.unit_id),
    );
    expect(newUnits).toHaveLength(6);
    for (const unit of newUnits) {
      expect(unit.content_status).toBe("partial_mixed_interaction_core");
      expect(unit.mapping_status).toBe("not_bound");
    }
    for (let grade = 1; grade <= 6; grade++) {
      expect(
        discoveryRelease.lessons
          .filter((row) => row.grade === grade)
          .map((row) => row.order),
      ).toEqual([17, 18, 19, 20]);
      expect(
        courseCatalog.lessons.filter((row) => row.grade === grade),
      ).toHaveLength(20);
    }
    expect(exerciseVersion("P3A-U04-L3.p3.choice", 1)?.prompt).toContain(
      "finding a dictionary",
    );
    expect(exerciseVersion("P3A-U04-L3.p3.choice", 2)?.prompt).toContain(
      "looking for a dictionary",
    );
  });
  it("provides 216 distinct task families and 72 separate authored teaching examples", () => {
    expect(new Set(discoveryRelease.items.map((row) => row.family)).size).toBe(
      216,
    );
    expect(
      new Set(
        discoveryRelease.lessons.flatMap((row) =>
          row.cards.map((card) => card.example),
        ),
      ).size,
    ).toBe(72);
    for (const lesson of discoveryRelease.lessons) {
      expect(lesson.cards).toHaveLength(3);
      expect(lesson.vocabulary).toHaveLength(4);
      expect(
        lesson.topicIds.every((id) =>
          catalog.topics.some((topic) => topic.topic_id === id),
        ),
      ).toBe(true);
      const rows = discoveryRelease.items.filter(
        (row) => row.lessonId === lesson.id,
      );
      expect(rows.map((row) => row.type)).toEqual([
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
      for (const row of rows) {
        expect(
          row.solutionSentences?.some((sentence) =>
            lesson.cards.some(
              (card) => card.example.toLowerCase() === sentence.toLowerCase(),
            ),
          ),
        ).toBe(false);
        if (row.audioText)
          expect(
            rows
              .find((r) => r.passage)
              ?.passage?.some((s) => s.text === row.audioText),
          ).toBe(false);
      }
    }
  });
  it("grades all seven types and does not accept distractors or incomplete structured answers", () => {
    for (const row of discoveryRelease.items) {
      const correct = solution(row);
      expect(gradeAnswer(row, correct), row.id).toBe(true);
      expect(structuredCanonical(row, correct), row.id).not.toBeNull();
      expect(exerciseVersion(row.id, 1), row.id).toBe(row);
      if (row.type === "sort" || row.type === "repair")
        expect(
          structuredFeedback(row, correct).details?.every(
            (part) => part.correct,
          ),
        ).toBe(true);
      if (row.choices)
        expect(
          row.choices.filter((choice) =>
            gradeAnswer(
              row,
              row.type === "evidence"
                ? [row.evidenceSolutions![0].sentenceId, choice]
                : choice,
            ),
          ),
        ).toHaveLength(1);
      if (row.type === "order")
        expect(row.tokens!.length).toBeLessThanOrEqual(16);
      if (row.type === "sort")
        expect(
          structuredCanonical(row, (correct as string[]).slice(1)),
        ).toBeNull();
      if (row.type === "evidence")
        expect(gradeAnswer(row, ["s3", row.evidenceSolutions![0].answer])).toBe(
          false,
        );
      for (const field of [
        "answers",
        "repairs",
        "placements",
        "evidenceSolutions",
        "evidenceTargets",
        "solutionSentences",
        "hint",
        "explanation",
      ])
        expect(publicExercise(row)).not.toHaveProperty(field);
    }
  });
  it("teaches comparison and conditional rules under their actual categories", () => {
    for (const row of discoveryRelease.items.filter(
      (row) => !["listen", "evidence"].includes(row.type),
    )) {
      expect(row.category).toBe(
        row.gradeMin === 3
          ? "tense"
          : row.gradeMin === 4 || row.gradeMin === 5
            ? "forms"
            : "grammar",
      );
    }
    expect(gradeAnswer(item("P4A-U05-L3.p3.choice"), "wideer")).toBe(false);
    expect(gradeAnswer(item("P6A-U05-L1.p3.choice"), "will rain")).toBe(false);
    expect(gradeAnswer(item("P6A-U05-L4.p3.choice"), "bring")).toBe(false);
  });
  it("accepts supported legal time positions and both quiet comparatives", () => {
    const order = item("P1A-U05-L4.p9.order");
    for (const sentence of [
      "The puppy is sleepy now.",
      "Now the puppy is sleepy.",
      "The puppy is now sleepy.",
    ])
      expect(gradeAnswer(order, sentence)).toBe(true);
    expect(gradeAnswer(order, "The now puppy is sleepy.")).toBe(false);
    const repair = item("P5A-U05-L1.p6.repair"),
      part = repair.repairs![0].partId;
    for (const response of ["quieter", "more quiet"])
      expect(gradeAnswer(repair, [part, response])).toBe(true);
    expect(gradeAnswer(repair, [part, "quietest"])).toBe(false);
  });
  it("keeps explicitly ordered conditional tasks unambiguous", () => {
    expect(
      gradeAnswer(item("P6A-U05-L1.p9.order"), "If it rains, we will wait."),
    ).toBe(true);
    expect(
      gradeAnswer(item("P6A-U05-L1.p9.order"), "We will wait if it rains."),
    ).toBe(false);
    expect(item("P6A-U05-L1.p9.order").prompt).toContain("If开头");
    expect(
      gradeAnswer(item("P6A-U05-L4.p9.order"), "We will finish if Bo helps."),
    ).toBe(true);
    expect(item("P6A-U05-L4.p9.order").prompt).toContain("条件");
  });
  it("keeps lesson 3D optional, collapsed and bound to real concept labs", () => {
    expect(
      discoveryRelease.lessons.filter((lesson) => lesson.conceptLabIds?.length),
    ).toHaveLength(12);
    for (const lesson of discoveryRelease.lessons)
      for (const id of lesson.conceptLabIds ?? [])
        expect(conceptLab(id)).toBeDefined();
    const html = renderToStaticMarkup(
      createElement(LessonConcepts, {
        ids: ["forms.comparison"],
        childId: "child",
      }),
    );
    expect(html).toContain("想看规律动起来");
    expect(html).not.toContain(" open=");
    expect(html).not.toContain("<canvas");
    expect(
      renderToStaticMarkup(createElement(LessonConcepts, { ids: ["missing"] })),
    ).toBe("");
  });
  it("marks demonstrated wider and thinner as assisted across the new lesson types", () => {
    const entries = exposure.entries as Record<string, string[]>;
    const choice = item("P4A-U05-L3.p3.choice"),
      repair = item("P4A-U05-L3.p6.repair"),
      sort = item("P4A-U05-L3.p7.sort");
    for (const key of answerExposureKeys(choice))
      expect(entries["forms.comparison/wide"]).toContain(key);
    for (const key of answerExposureKeys(repair))
      expect(entries["forms.comparison/thin"]).toContain(key);
    for (const root of ["wide", "thin"]) {
      const card = sort.sorting!.cards.find((card) => card.text === root)!;
      expect(entries[`forms.comparison/${root}`]).toContain(
        `workshop-target:${sort.skill}:${card.id}`,
      );
    }
  });
});
