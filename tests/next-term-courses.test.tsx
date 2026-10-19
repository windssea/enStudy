import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import preserved from "./fixtures/term-a-releases.v1-hashes.json";
import {
  nextTermRelease,
  courseCatalog,
  gradeAnswer,
  publicExercise,
  structuredFeedback,
} from "../packages/server/exercises";
import { structuredCanonical } from "../packages/domain/structured";
import { conceptLab } from "../packages/domain/concepts";
import catalog from "../public/content/catalog.json";
import LessonView from "../src/LessonView";
vi.mock("../src/SceneStage", () => ({ default: () => null }));
const item = (id: string) =>
  nextTermRelease.items.find((row) => row.id === id)!;
const answer = (row: (typeof nextTermRelease.items)[number]) =>
  row.type === "sort"
    ? Object.entries(row.placements!).map(([card, group]) => `${card}=${group}`)
    : ["repair", "evidence"].includes(row.type)
      ? JSON.parse(row.answers[0])
      : row.type === "order"
        ? row.answers[0]
            .replace(/([.!?,])/g, " $1")
            .trim()
            .split(/\s+/)
        : row.answers[0];
describe("first B-term core courses", () => {
  it("keeps both existing shared-compiler A-term releases byte-for-byte unchanged", () => {
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
  it("opens a distinct first B-term unit without changing the 144 A-term lessons", () => {
    expect(courseCatalog.lessons).toHaveLength(288);
    expect(
      courseCatalog.lessons.filter((row) => row.term === "A"),
    ).toHaveLength(144);
    expect(nextTermRelease.lessons).toHaveLength(24);
    expect(new Set(courseCatalog.lessons.map((row) => row.id)).size).toBe(288);
    for (let grade = 1; grade <= 6; grade++) {
      const rows = courseCatalog.lessons.filter(
        (row) =>
          row.grade === grade && row.term === "B" && row.unitNumber === 1,
      );
      expect(rows.map((row) => row.order)).toEqual([1, 2, 3, 4]);
      expect(rows.map((row) => row.id)).toEqual(
        [1, 2, 3, 4].map((n) => `P${grade}B-U01-L${n}`),
      );
      for (const row of rows) {
        expect(row.unitNumber).toBe(1);
        expect(row.unitId).toBe(`P${grade}B-U01`);
      }
    }
    const units = catalog.units.filter((row) =>
      /^P[1-6]B-U01$/.test(row.unit_id),
    );
    expect(units).toHaveLength(6);
    for (const row of units) {
      expect(row.content_status).toBe("partial_mixed_interaction_core");
      expect(row.mapping_status).toBe("not_bound");
    }
  });
  it("authors 216 new families and 72 separated examples with no prior-course family collisions", () => {
    const old = new Set(
      courseCatalog.items
        .filter((row) => !row.lessonId?.includes("B-U01"))
        .map((row) => row.family),
    );
    expect(nextTermRelease.items).toHaveLength(216);
    expect(new Set(nextTermRelease.items.map((row) => row.family)).size).toBe(
      216,
    );
    expect(nextTermRelease.items.some((row) => old.has(row.family))).toBe(
      false,
    );
    expect(
      new Set(
        nextTermRelease.lessons.flatMap((row) =>
          row.cards.map((card) => card.example),
        ),
      ).size,
    ).toBe(72);
    for (const lesson of nextTermRelease.lessons) {
      const rows = nextTermRelease.items.filter(
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
      expect(lesson.vocabulary).toHaveLength(4);
      expect(lesson).not.toHaveProperty("practicePlan");
      for (const row of rows) {
        expect(publicExercise(row)).not.toHaveProperty("answers");
        expect(
          row.solutionSentences!.some((sentence) =>
            lesson.cards.some((card) => card.example === sentence),
          ),
        ).toBe(false);
      }
    }
  });
  it("grades all seven task types through their real contracts and rejects incomplete structured answers", () => {
    for (const row of nextTermRelease.items) {
      const value = answer(row);
      expect(gradeAnswer(row, value), row.id).toBe(true);
      expect(structuredCanonical(row, value), row.id).not.toBeNull();
      if (["sort", "repair", "evidence"].includes(row.type)) {
        expect(gradeAnswer(row, ["unknown"]), row.id).toBe(false);
        expect(structuredCanonical(row, ["unknown"]), row.id).toBeNull();
      }
      if (row.type === "repair")
        expect(
          structuredFeedback(row, value).details!.every(
            (detail) => detail.correct,
          ),
          row.id,
        ).toBe(true);
      if (row.type === "order")
        expect(row.tokens!.length).toBeLessThanOrEqual(16);
    }
  });
  it("accepts both regional weekend prepositions and explicitly controls future production", () => {
    const weekend = item("P3B-U01-L4.p8.input");
    for (const value of ["at", "on"])
      expect(gradeAnswer(weekend, value)).toBe(true);
    expect(gradeAnswer(weekend, "in")).toBe(false);
    const future = item("P5B-U01-L1.p8.input");
    expect(future.context).toContain("will");
    expect(gradeAnswer(future, "will")).toBe(true);
    expect(gradeAnswer(future, "is")).toBe(false);
    const repair = item("P5B-U01-L2.p6.repair");
    expect(gradeAnswer(repair, [repair.repairs![0].partId, "is"])).toBe(true);
    expect(gradeAnswer(repair, [repair.repairs![0].partId, "will"])).toBe(
      false,
    );
    expect(
      nextTermRelease.lessons.find((row) => row.id === "P5B-U01-L4")!.cards[0]
        .rule,
    ).toContain("相近");
  });
  it("uses correct possession, quantity and passive targets instead of misleading tags", () => {
    expect(gradeAnswer(item("P1B-U01-L1.p3.choice"), "has")).toBe(false);
    expect(item("P1B-U01-L2.p3.choice").skill).toBe("grammar.imperatives");
    expect(item("P4B-U01-L4.p6.repair").skill).toBe("grammar.there-be");
    expect(item("P4B-U01-L4.p8.input").skill).toBe(
      "grammar.quantity.questions",
    );
    expect(gradeAnswer(item("P6B-U01-L1.p3.choice"), "are")).toBe(false);
    const passive = item("P6B-U01-L4.p6.repair");
    expect(
      gradeAnswer(passive, [passive.repairs![0].partId, "decorated"]),
    ).toBe(true);
    expect(
      gradeAnswer(passive, [passive.repairs![0].partId, "decorating"]),
    ).toBe(false);
    // cut has the same spelling as a base verb and participle: its card must give context.
    expect(
      item("P6B-U01-L1.p7.sort").sorting!.cards.map((card) => card.text),
    ).toContain("cut the paper");
    expect(
      item("P6B-U01-L1.p7.sort").sorting!.cards.map((card) => card.text),
    ).not.toContain("cut");
  });
  it("keeps optional routine/future labs bound to known examples and independent of course credit", () => {
    expect(
      nextTermRelease.lessons.filter((row) => row.conceptLabIds?.length),
    ).toHaveLength(8);
    for (const lesson of nextTermRelease.lessons)
      for (const id of lesson.conceptLabIds ?? [])
        expect(conceptLab(id)).toBeDefined();
  });
  it("renders B-term identity, duration and reading material in the existing lesson player", () => {
    for (const grade of [1, 6]) {
      const lesson = nextTermRelease.lessons.find(
        (row) => row.grade === grade,
      )!;
      const html = renderToStaticMarkup(
        createElement(LessonView, {
          lesson,
          busy: false,
          completed: false,
          onStart: () => {},
          onBack: () => {},
        }),
      );
      expect(html).toContain("下学期");
      expect(html).toContain(`约${lesson.minutes}分钟`);
      expect(html.match(/class="card child-example"/g)).toHaveLength(1);
      expect(html).toContain('aria-label="第1张，共3张"');
      expect(html).toContain('aria-label="下一张例句"');
      expect(html).toContain(lesson.cards[0].example);
      expect(html).toContain("开始这节课的练习");
      expect(html).not.toContain("<canvas");
    }
  });
});
