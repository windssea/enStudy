import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import preserved from "./fixtures/discovery-release.v1-hashes.json";
import {
  journeyRelease,
  courseCatalog,
  gradeAnswer,
  publicExercise,
  exerciseVersion,
  structuredFeedback,
} from "../packages/server/exercises";
import { structuredCanonical } from "../packages/domain/structured";
import { answerExposureKeys, sentenceKey } from "../packages/domain/exposure";
import { disclosureCheckKeys } from "../packages/server/exposure";
import { conceptLab } from "../packages/domain/concepts";
import exposure from "../content/concept-exposure-map.json";
import catalog from "../public/content/catalog.json";
const item = (id: string) => journeyRelease.items.find((row) => row.id === id)!;
const solution = (row: (typeof journeyRelease.items)[number]) =>
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
describe("sixth-unit core curriculum", () => {
  it("preserves the published fifth-unit bytes across the shared compiler refactor", () => {
    for (const [path, hash] of Object.entries(preserved))
      expect(
        createHash("sha256")
          .update(
            readFileSync(
              new URL(`../${path}`, import.meta.url),
              "utf8",
            ).replaceAll("\r\n", "\n"),
          )
          .digest("hex"),
        path,
      ).toBe(hash);
  });
  it("opens four sixth-unit lessons in every grade and keeps all previous courses", () => {
    expect(courseCatalog.lessons).toHaveLength(216);
    expect(new Set(courseCatalog.lessons.map((row) => row.id)).size).toBe(216);
    expect(journeyRelease.lessons).toHaveLength(24);
    for (let grade = 1; grade <= 6; grade++) {
      expect(
        journeyRelease.lessons
          .filter((row) => row.grade === grade)
          .map((row) => row.order),
      ).toEqual([21, 22, 23, 24]);
      expect(
        courseCatalog.lessons.filter((row) => row.grade === grade),
      ).toHaveLength(36);
    }
    const units = catalog.units.filter((unit) =>
      /^P[1-6]A-U06$/.test(unit.unit_id),
    );
    expect(units).toHaveLength(6);
    for (const unit of units) {
      expect(unit.content_status).toBe("partial_mixed_interaction_core");
      expect(unit.mapping_status).toBe("not_bound");
    }
  });
  it("provides 216 distinct new task families, separated examples and complete public metadata", () => {
    expect(journeyRelease.items).toHaveLength(216);
    const families = new Set(journeyRelease.items.map((row) => row.family));
    expect(families.size).toBe(216);
    expect(
      courseCatalog.items
        .filter((row) => !row.lessonId?.includes("-U06-"))
        .some((row) => families.has(row.family)),
    ).toBe(false);
    expect(
      new Set(
        journeyRelease.lessons.flatMap((row) =>
          row.cards.map((card) => card.example),
        ),
      ).size,
    ).toBe(72);
    for (const lesson of journeyRelease.lessons) {
      expect(lesson.cards).toHaveLength(3);
      expect(lesson.vocabulary).toHaveLength(4);
      expect(
        lesson.topicIds.every((id) =>
          catalog.topics.some((topic) => topic.topic_id === id),
        ),
      ).toBe(true);
      expect(lesson).not.toHaveProperty("practicePlan");
      const rows = journeyRelease.items.filter(
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
              (card) => sentence.toLowerCase() === card.example.toLowerCase(),
            ),
          ),
          row.id,
        ).toBe(false);
        for (const field of [
          "answers",
          "repairs",
          "placements",
          "hint",
          "explanation",
          "evidenceTargets",
          "evidenceSolutions",
        ])
          expect(publicExercise(row)).not.toHaveProperty(field);
        if (row.audioText)
          expect(
            rows
              .find((r) => r.passage)
              ?.passage?.some((sentence) => sentence.text === row.audioText),
          ).toBe(false);
      }
    }
  });
  it("grades the actual seven answer contracts and rejects invalid structured responses", () => {
    for (const row of journeyRelease.items) {
      const correct = solution(row);
      expect(gradeAnswer(row, correct), row.id).toBe(true);
      expect(structuredCanonical(row, correct), row.id).not.toBeNull();
      expect(exerciseVersion(row.id, 1), row.id).toBe(row);
      if (row.type === "order")
        expect(row.tokens!.length).toBeLessThanOrEqual(16);
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
      if (row.type === "sort")
        expect(
          structuredCanonical(row, (correct as string[]).slice(1)),
        ).toBeNull();
      if (row.type === "repair")
        expect(structuredCanonical(row, ["unknown", "who"])).toBeNull();
      if (row.type === "evidence")
        expect(gradeAnswer(row, ["s3", row.evidenceSolutions![0].answer])).toBe(
          false,
        );
    }
  });
  it("accepts who or which with that in the authored subject relative clauses", () => {
    for (const row of journeyRelease.items.filter(
      (row) => row.gradeMin === 6 && ["input", "repair"].includes(row.type),
    )) {
      const value =
        row.type === "repair" ? [row.repairs![0].partId, "that"] : "that";
      expect(gradeAnswer(row, value), row.id).toBe(true);
      const canonical = solution(row);
      expect(gradeAnswer(row, canonical), row.id).toBe(true);
      if (row.type === "repair")
        expect(
          structuredFeedback(row, value).details!.every(
            (detail) => detail.correct,
          ),
          row.id,
        ).toBe(true);
      expect(
        gradeAnswer(
          row,
          row.type === "repair" ? [row.repairs![0].partId, "where"] : "where",
        ),
      ).toBe(false);
    }
  });
  it("accepts both authored advice alternatives and normal please positions", () => {
    const repair = item("P5A-U06-L4.p6.repair");
    for (const word of ["should", "could"]) {
      expect(gradeAnswer(item("P5A-U06-L4.p8.input"), word)).toBe(true);
      expect(gradeAnswer(repair, [repair.repairs![0].partId, word])).toBe(true);
    }
    expect(gradeAnswer(repair, [repair.repairs![0].partId, "shoulds"])).toBe(
      false,
    );
    const order = item("P3A-U06-L3.p9.order");
    for (const value of [
      "I would like some postcards, please.",
      "Please, I would like some postcards.",
    ])
      expect(gradeAnswer(order, value)).toBe(true);
  });
  it("uses accurate capability tags and explicit controlled grammar targets", () => {
    expect(item("P3A-U06-L4.p8.input").skill).toBe(
      "grammar.preferences.polite",
    );
    expect(item("P3A-U06-L2.p3.choice").skill).toBe("grammar.shopping.prices");
    expect(gradeAnswer(item("P3A-U06-L2.p3.choice"), "is")).toBe(false);
    expect(gradeAnswer(item("P4A-U06-L3.p3.choice"), "wideest")).toBe(false);
    expect(
      gradeAnswer(item("P4A-U06-L3.p6.repair"), [
        item("P4A-U06-L3.p6.repair").repairs![0].partId,
        "biggest",
      ]),
    ).toBe(true);
    expect(item("P6A-U06-L4.p9.order").context).toContain("who");
    for (const row of journeyRelease.items.filter(
      (row) => !["listen", "evidence"].includes(row.type),
    ))
      expect(row.category).toBe(row.gradeMin === 4 ? "forms" : "grammar");
  });
  it("shares existing comparison demonstration protection with new sixth-unit tasks", () => {
    const row = item("P4A-U06-L3.p3.choice"),
      entries = exposure.entries as Record<string, string[]>;
    for (const key of answerExposureKeys(row))
      expect(entries["forms.comparison/bridge-group"]).toContain(key);
    expect(
      journeyRelease.lessons.filter((lesson) => lesson.conceptLabIds?.length),
    ).toHaveLength(4);
  });
  it("reads historical case identities without writing fictitious demonstration visits", () => {
    const lab = conceptLab("forms.comparison")!;
    const key = (id: string) =>
      sentenceKey(lab.cases.find((row) => row.id === id)!.sentence);
    for (const suffix of ["p3.choice", "p7.sort"]) {
      const row = item(`P4A-U06-L3.${suffix}`);
      expect(disclosureCheckKeys(row)).toContain(key("wide"));
      expect(answerExposureKeys(row)).not.toContain(key("wide"));
    }
    const repair = item("P4A-U06-L3.p6.repair");
    expect(disclosureCheckKeys(repair)).not.toContain(key("wide"));
    expect(disclosureCheckKeys(repair)).not.toContain(key("thin"));
    expect(new Set(disclosureCheckKeys(repair)).size).toBe(
      disclosureCheckKeys(repair).length,
    );
  });
});
