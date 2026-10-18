import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  courseCatalog,
  explorerTermRelease,
  gradeAnswer,
  publicExercise,
} from "../packages/server/exercises";
import preserved from "./fixtures/term-b-foundations.v1-hashes.json";
import LessonView from "../src/LessonView";
vi.mock("../src/SceneStage", () => ({ default: () => null }));
const item = (id: string) =>
  explorerTermRelease.items.find((row) => row.id === id)!;
const answer = (row: (typeof explorerTermRelease.items)[number]) =>
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

describe("B-term second-unit learning", () => {
  it("preserves the published first B-term snapshot and applied migration", () => {
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
      ).toBe(hash);
  });
  it("adds four separate second-unit lessons per grade without replacing A or B unit 1", () => {
    expect(courseCatalog.lessons).toHaveLength(192);
    expect(new Set(courseCatalog.lessons.map((row) => row.id)).size).toBe(192);
    expect(explorerTermRelease.lessons).toHaveLength(24);
    expect(
      courseCatalog.lessons.filter((row) => row.term === "A"),
    ).toHaveLength(144);
    for (let grade = 1; grade <= 6; grade++) {
      const rows = explorerTermRelease.lessons.filter(
        (row) => row.grade === grade,
      );
      expect(rows.map((row) => row.order)).toEqual([5, 6, 7, 8]);
      expect(rows.map((row) => row.id)).toEqual(
        [1, 2, 3, 4].map((n) => `P${grade}B-U02-L${n}`),
      );
      expect(
        courseCatalog.lessons.filter(
          (row) => row.grade === grade && row.term === "B",
        ),
      ).toHaveLength(8);
    }
  });
  it("uses 216 distinct new families, all seven task types, and examples separated from the assessed sentences", () => {
    const ids = new Set(explorerTermRelease.items.map((row) => row.id));
    const previous = new Set(
      courseCatalog.items
        .filter((row) => !ids.has(row.id))
        .map((row) => row.family),
    );
    expect(explorerTermRelease.items).toHaveLength(216);
    expect(
      new Set(explorerTermRelease.items.map((row) => row.family)).size,
    ).toBe(216);
    expect(
      explorerTermRelease.items.some((row) => previous.has(row.family)),
    ).toBe(false);
    expect(
      new Set(
        explorerTermRelease.lessons.flatMap((row) =>
          row.cards.map((card) => card.example),
        ),
      ).size,
    ).toBe(72);
    for (const lesson of explorerTermRelease.lessons) {
      const tasks = explorerTermRelease.items.filter(
        (row) => row.lessonId === lesson.id,
      );
      expect(tasks.map((row) => row.type)).toEqual([
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
      for (const row of tasks) {
        expect(gradeAnswer(row, answer(row)), row.id).toBe(true);
        expect(publicExercise(row)).not.toHaveProperty("answers");
        expect(
          row.solutionSentences?.some((sentence) =>
            lesson.cards.some((card) => card.example === sentence),
          ),
        ).toBe(false);
      }
    }
  });
  it("accepts ordinary cause conjunctions while rejecting reversed cause/result in the controlled task", () => {
    const cause = item("P6B-U02-L2.p8.input");
    for (const value of ["because", "since", "as"])
      expect(gradeAnswer(cause, value)).toBe(true);
    expect(gradeAnswer(cause, "so")).toBe(false);
    expect(cause.skill).toBe("grammar.connectives.reason");
    const contrast = item("P6B-U02-L4.p3.choice");
    expect(gradeAnswer(contrast, "but")).toBe(true);
    expect(gradeAnswer(contrast, "because")).toBe(false);
    expect(item("P6B-U02-L4.p7.sort").skill).toBe("reading.source-checking");
  });
  it("does not double-mark tense after did or modals", () => {
    for (const [id, correct, wrong] of [
      ["P2B-U02-L4.p3.choice", "make", "makes"],
      ["P3B-U02-L1.p3.choice", "talk", "talks"],
      ["P4B-U02-L2.p3.choice", "bring", "brought"],
    ]) {
      expect(gradeAnswer(item(id), correct)).toBe(true);
      expect(gradeAnswer(item(id), wrong)).toBe(false);
    }
    const past = item("P4B-U02-L1.p6.repair");
    expect(gradeAnswer(past, [past.repairs![0].partId, "hang"])).toBe(true);
    expect(gradeAnswer(past, [past.repairs![0].partId, "hung"])).toBe(false);
  });
  it("separates timetable time from duration and uses only the supplied fictional records", () => {
    const duration = item("P5B-U02-L3.p2.evidence");
    expect(gradeAnswer(duration, ["s1", "25 minutes"])).toBe(true);
    expect(gradeAnswer(duration, ["s1", "08:20"])).toBe(false);
    const source = item("P6B-U02-L4.p5.evidence");
    expect(
      gradeAnswer(source, ["s2", "not yet; source and date are missing"]),
    ).toBe(true);
    expect(
      gradeAnswer(source, ["s1", "not yet; source and date are missing"]),
    ).toBe(false);
    expect(
      explorerTermRelease.lessons.find((row) => row.id === "P6B-U02-L1")!
        .cards[0].rule,
    ).toContain("不代表已证实");
  });
  it("renders Chinese guidance and semester identity through the existing lesson player", () => {
    for (const grade of [1, 3, 6]) {
      const lesson = explorerTermRelease.lessons.find(
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
      expect(html).toContain("开始这节课的练习");
      expect(html).not.toContain("<canvas");
    }
  });
});
