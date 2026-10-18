import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  courseCatalog,
  neighbourhoodTermRelease as release,
  gradeAnswer,
  publicExercise,
} from "../packages/server/exercises";
import preserved from "./fixtures/term-b-explorers.v1-hashes.json";
import LessonView from "../src/LessonView";
vi.mock("../src/SceneStage", () => ({ default: () => null }));
const item = (id: string) => release.items.find((row) => row.id === id)!;
const answer = (row: (typeof release.items)[number]) =>
  row.type === "sort"
    ? Object.entries(row.placements!).map(([c, g]) => `${c}=${g}`)
    : ["repair", "evidence"].includes(row.type)
      ? JSON.parse(row.answers[0])
      : row.type === "order"
        ? row.answers[0]
            .replace(/([.!?,])/g, " $1")
            .trim()
            .split(/\s+/)
        : row.answers[0];
describe("third B-term neighbourhood and planning courses", () => {
  it("preserves the preceding release and both applied migrations exactly", () => {
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
  it("adds the scoped third unit in every grade with real tasks and distinct semester identities", () => {
    expect(courseCatalog.lessons).toHaveLength(240);
    expect(new Set(courseCatalog.lessons.map((l) => l.id)).size).toBe(240);
    expect(release.lessons).toHaveLength(24);
    for (let grade = 1; grade <= 6; grade++) {
      const lessons = release.lessons.filter((l) => l.grade === grade);
      expect(lessons.map((l) => l.order)).toEqual([9, 10, 11, 12]);
      expect(lessons.map((l) => l.id)).toEqual(
        [1, 2, 3, 4].map((i) => `P${grade}B-U03-L${i}`),
      );
      expect(
        courseCatalog.lessons.filter(
          (l) => l.grade === grade && l.term === "B",
        ),
      ).toHaveLength(16);
    }
    expect(courseCatalog.lessons.filter((l) => l.term === "A")).toHaveLength(
      144,
    );
  });
  it("grades all 216 authored tasks across seven types without leaking keys or reusing a previous family", () => {
    expect(release.items).toHaveLength(216);
    expect(new Set(release.items.map((i) => i.family)).size).toBe(216);
    const ids = new Set(release.items.map((i) => i.id)),
      old = new Set(
        courseCatalog.items.filter((i) => !ids.has(i.id)).map((i) => i.family),
      );
    for (const row of release.items) {
      expect([
        "grammar",
        "lexeme",
        "morphology",
        "vocabulary",
        "phonics",
        "listening",
        "reading",
        "speaking",
        "writing",
      ]).toContain(row.skill.split(".")[0]);
      expect(old.has(row.family), row.id).toBe(false);
      expect(gradeAnswer(row, answer(row)), row.id).toBe(true);
      expect(publicExercise(row)).not.toHaveProperty("answers");
      const lesson = release.lessons.find((l) => l.id === row.lessonId)!;
      expect(
        row.solutionSentences!.some((s) =>
          lesson.cards.some((c) => c.example === s),
        ),
      ).toBe(false);
    }
    for (const lesson of release.lessons)
      expect(
        release.items
          .filter((i) => i.lessonId === lesson.id)
          .map((i) => i.type),
      ).toEqual([
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
  });
  it("teaches near without falsely excluding next to, and requires an actual supporting sentence", () => {
    expect(
      release.lessons.find((l) => l.id === "P2B-U03-L1")!.cards[0].rule,
    ).toContain("也可以说near");
    const source = item("P2B-U03-L4.p5.evidence");
    expect(gradeAnswer(source, ["s2", "no; the direction is not given"])).toBe(
      true,
    );
    expect(gradeAnswer(source, ["s1", "no; the direction is not given"])).toBe(
      false,
    );
    expect(gradeAnswer(item("P2B-U03-L1.p3.choice"), "next to")).toBe(true);
    expect(gradeAnswer(item("P2B-U03-L1.p3.choice"), "next of")).toBe(false);
  });
  it("accepts declared natural alternatives and distinguishes cause, result and concession", () => {
    for (const a of ["because", "since", "as"])
      expect(gradeAnswer(item("P5B-U03-L1.p8.input"), a)).toBe(true);
    expect(gradeAnswer(item("P5B-U03-L1.p8.input"), "so")).toBe(false);
    expect(gradeAnswer(item("P5B-U03-L2.p3.choice"), "so")).toBe(true);
    expect(gradeAnswer(item("P5B-U03-L2.p3.choice"), "because")).toBe(false);
    for (const a of ["Although", "Though"])
      expect(gradeAnswer(item("P5B-U03-L3.p8.input"), a)).toBe(true);
    for (const a of ["aren't", "are not"])
      expect(gradeAnswer(item("P3B-U03-L2.p8.input"), a)).toBe(true);
  });
  it("separates timetable time from elapsed duration, price from total and conditions from promises", () => {
    const duration = item("P6B-U03-L1.p2.evidence");
    expect(gradeAnswer(duration, ["s1", "35 minutes"])).toBe(true);
    expect(gradeAnswer(duration, ["s1", "13:45"])).toBe(false);
    expect(
      gradeAnswer(item("P6B-U03-L2.p2.evidence"), ["s1", "28 dollars"]),
    ).toBe(true);
    expect(gradeAnswer(item("P6B-U03-L3.p3.choice"), "will rain")).toBe(false);
    expect(gradeAnswer(item("P6B-U03-L3.p3.choice"), "rains")).toBe(true);
    const constraints = item("P6B-U03-L4.p7.sort");
    expect(constraints.sorting!.groups.map((g) => g.label).join(" ")).toContain(
      "10点前",
    );
    expect(constraints.sorting!.cards[1].text).toContain("25 dollars");
  });
  it("offers the position lab in all four P1 lessons while preserving Chinese teaching and the main start action", () => {
    for (const lesson of release.lessons.filter((l) => l.grade === 1)) {
      expect(lesson.conceptLabIds).toContain("grammar.prepositions");
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
      expect(html).toContain("打开3D小实验");
      expect(html).toContain("开始这节课的练习");
      expect(html).not.toContain("<canvas");
    }
  });
});
