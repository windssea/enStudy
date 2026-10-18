import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  courseCatalog,
  cooperationTermRelease as release,
  gradeAnswer,
  publicExercise,
} from "../packages/server/exercises";
import preserved from "./fixtures/term-b-neighbourhoods.v1-hashes.json";
import LessonView from "../src/LessonView";
import { courseStep } from "../src/courseNavigation";
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

describe("fourth B-term cooperation and everyday communication courses", () => {
  it("preserves the published unit three and applied membership migrations byte for byte", () => {
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
  it("opens the actual scoped fourth unit for all six grades and continues there after older units", () => {
    expect(courseCatalog.lessons).toHaveLength(288);
    expect(new Set(courseCatalog.lessons.map((l) => l.id)).size).toBe(288);
    expect(courseCatalog.lessons.filter((l) => l.term === "A")).toHaveLength(
      144,
    );
    expect(release.lessons).toHaveLength(24);
    const titles = [
      "一起动起来",
      "穿衣小助手",
      "一年四季",
      "安全与规则",
      "美食与文化",
      "讨论有办法",
    ];
    for (let grade = 1; grade <= 6; grade++) {
      const rows = release.lessons.filter((l) => l.grade === grade);
      expect(rows.map((l) => l.order)).toEqual([13, 14, 15, 16]);
      expect(rows.map((l) => l.id)).toEqual(
        [1, 2, 3, 4].map((n) => `P${grade}B-U04-L${n}`),
      );
      expect(rows.every((l) => l.unitTitle === titles[grade - 1])).toBe(true);
      expect(
        courseCatalog.lessons.filter(
          (l) => l.grade === grade && l.term === "B",
        ),
      ).toHaveLength(24);
      const old = courseCatalog.lessons.filter(
        (l) => l.grade === grade && l.term === "B" && l.unitNumber! < 4,
      );
      const next = courseStep(
        courseCatalog.lessons,
        grade,
        "B",
        old.map((l) => ({ lessonId: l.id })),
      );
      expect(next.next?.id).toBe(`P${grade}B-U04-L1`);
      expect(next.allPractised).toBe(false);
    }
  });
  it("grades 216 distinct task families across all seven modes without leaking answers or reusing a demonstrated sentence", () => {
    expect(release.items).toHaveLength(216);
    expect(new Set(release.items.map((i) => i.family)).size).toBe(216);
    const ids = new Set(release.items.map((i) => i.id));
    const old = new Set(
      courseCatalog.items.filter((i) => !ids.has(i.id)).map((i) => i.family),
    );
    for (const row of release.items) {
      expect(old.has(row.family), row.id).toBe(false);
      expect(gradeAnswer(row, answer(row)), row.id).toBe(true);
      const publicRow = publicExercise(row);
      for (const key of [
        "answers",
        "placements",
        "repairs",
        "evidenceSolutions",
        "solutionSentences",
        "hint",
        "explanation",
      ])
        expect(publicRow, row.id).not.toHaveProperty(key);
      const lesson = release.lessons.find((l) => l.id === row.lessonId)!;
      expect(
        row.solutionSentences!.some((s) =>
          lesson.cards.some((c) => c.example === s),
        ),
        row.id,
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
  it("accepts cannot contractions but rejects present-simple verb endings after can", () => {
    for (const a of ["cannot", "can't", "CAN’T"])
      expect(gradeAnswer(item("P1B-U04-L2.p8.input"), a)).toBe(true);
    expect(gradeAnswer(item("P1B-U04-L1.p3.choice"), "waves")).toBe(false);
    expect(gradeAnswer(item("P1B-U04-L3.p3.choice"), "Are")).toBe(false);
    expect(gradeAnswer(item("P1B-U04-L4.p3.choice"), "cans")).toBe(false);
  });
  it("uses the noun phrase head to distinguish these shoes from this pair of shoes", () => {
    expect(gradeAnswer(item("P2B-U04-L3.p3.choice"), "is")).toBe(true);
    expect(gradeAnswer(item("P2B-U04-L3.p3.choice"), "are")).toBe(false);
    expect(gradeAnswer(item("P2B-U04-L1.p8.input"), "Those")).toBe(false);
    expect(gradeAnswer(item("P2B-U04-L2.p8.input"), "These")).toBe(false);
    expect(
      release.lessons.find((l) => l.id === "P2B-U04-L3")!.cards[0].rule,
    ).toContain("中心词pair");
  });
  it("separates because from so and requires the actual sentence supporting the weather inference", () => {
    for (const a of ["because", "since", "as"])
      expect(gradeAnswer(item("P3B-U04-L1.p8.input"), a)).toBe(true);
    expect(gradeAnswer(item("P3B-U04-L3.p3.choice"), "because")).toBe(false);
    const weather = item("P3B-U04-L2.p5.evidence");
    expect(
      gradeAnswer(weather, ["s2", "no; the temperature is not given"]),
    ).toBe(true);
    expect(
      gradeAnswer(weather, ["s1", "no; the temperature is not given"]),
    ).toBe(false);
  });
  it("never grades no obligation as prohibition and accepts both spellings of must not", () => {
    const forbidden = item("P4B-U04-L2.p3.choice");
    expect(gradeAnswer(forbidden, "mustn't")).toBe(true);
    expect(gradeAnswer(forbidden, "don't have to")).toBe(false);
    for (const a of ["mustn't", "must not"])
      expect(gradeAnswer(item("P4B-U04-L2.p8.input"), a)).toBe(true);
    for (const a of ["don't have to", "do not have to"])
      expect(gradeAnswer(item("P4B-U04-L4.p8.input"), a)).toBe(true);
    expect(gradeAnswer(item("P4B-U04-L4.p8.input"), "mustn't")).toBe(false);
  });
  it("counts food units without marking uncountable food plural, and uses both constraints when comparing plans", () => {
    expect(gradeAnswer(item("P5B-U04-L1.p3.choice"), "many")).toBe(true);
    expect(gradeAnswer(item("P5B-U04-L2.p3.choice"), "a little")).toBe(false);
    expect(gradeAnswer(item("P5B-U04-L3.p8.input"), "plates")).toBe(true);
    const count = item("P5B-U04-L3.p5.evidence");
    expect(gradeAnswer(count, ["s2", "six buns"])).toBe(true);
    expect(gradeAnswer(count, ["s2", "three buns"])).toBe(false);
    const limit = item("P6B-U04-L3.p5.evidence");
    expect(gradeAnswer(limit, ["s2", "the paper limit"])).toBe(true);
    expect(gradeAnswer(limit, ["s2", "the time limit"])).toBe(false);
    expect(
      gradeAnswer(item("P6B-U04-L1.p6.repair"), [
        item("P6B-U04-L1.p6.repair").repairs![0].partId,
        "making",
      ]),
    ).toBe(true);
    for (const a of ["summarise", "summarize"])
      expect(gradeAnswer(item("P6B-U04-L4.p8.input"), a)).toBe(true);
  });
  it("offers 24 specific Chinese family activities as closed native disclosures without claiming completion or points", () => {
    expect(new Set(release.lessons.map((l) => l.homeActivity)).size).toBe(24);
    for (const lesson of release.lessons) {
      expect(lesson.homeActivity).toMatch(/[\u4e00-\u9fff]/);
      const html = renderToStaticMarkup(
        createElement(LessonView, {
          lesson,
          busy: false,
          completed: false,
          onStart: () => {},
          onBack: () => {},
        }),
      );
      expect(html).toContain("练完后，和家人用一用（可选）");
      expect(html).toContain("不用提交，不计分");
      expect(html).toContain("开始这节课的练习");
      expect(html).not.toMatch(/<details[^>]*\bopen\b/);
      expect(html).not.toContain("<canvas");
    }
  });
});
