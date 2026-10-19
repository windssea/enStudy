import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  courseCatalog,
  practicalTermRelease as release,
  gradeAnswer,
  exerciseVersion,
  publicExercise,
} from "../packages/server/exercises";
import preserved from "./fixtures/term-b-cooperation.v1-hashes.json";
import original from "../content/practical-term-course-release.v1.json";
import practicalPreserved from "./fixtures/term-b-practical.v1-hashes.json";
import exposure from "../content/concept-exposure-map.json";
import { courseStep } from "../src/courseNavigation";
import LessonView from "../src/LessonView";
vi.mock("../src/SceneStage", () => ({ default: () => null }));
const item = (id: string) => release.items.find((i) => i.id === id)!;
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
describe("fifth B-term practical reading, plans and revision", () => {
  it("accepts either parallel object order while preserving old versions and families", () => {
    for (const [id, alias] of [
      ["P2B-U05-L1.p9.order", "I pack a comb and a towel."],
      ["P2B-U05-L4.p9.order", "We pack a cup and a cloth bag."],
    ]) {
      const current = item(id),
        prior = original.items.find((i) => i.id === id)!;
      expect(current.version).toBe(2);
      expect(current.family).toBe(prior.family);
      expect(gradeAnswer(current, alias)).toBe(true);
      expect(gradeAnswer(current, prior.answers[0])).toBe(true);
      expect(exerciseVersion(id, 1)?.answers).toEqual(prior.answers);
      expect(exerciseVersion(id, 2)).toBe(current);
      expect(prior.answers).toHaveLength(1);
    }
  });
  it("protects a newly added painted answer already disclosed by the existing 3D word-form lab", () => {
    const painted = item("P6B-U05-L3.p8.input"),
      fresh = item("P6B-U05-L3.p3.choice");
    const targets = exposure.entries["forms.regular-past/paint"];
    expect(targets).toContain(`family:${painted.family}`);
    expect(targets).not.toContain(`family:${fresh.family}`);
  });
  it("preserves the fourth-unit snapshot and applied local migration exactly", () => {
    for (const [path, hash] of Object.entries({
      ...preserved,
      ...practicalPreserved,
    }))
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
  it("opens the scoped fifth unit in all six grades and continues into it without rewriting previous results", () => {
    expect(courseCatalog.lessons).toHaveLength(288);
    expect(new Set(courseCatalog.lessons.map((l) => l.id)).size).toBe(288);
    expect(courseCatalog.lessons.filter((l) => l.term === "A")).toHaveLength(
      144,
    );
    expect(release.lessons).toHaveLength(24);
    const titles = [
      "天气小记者",
      "好习惯",
      "小小厨房",
      "周末将要做什么",
      "数字世界",
      "我的英语项目",
    ];
    for (let grade = 1; grade <= 6; grade++) {
      const rows = release.lessons.filter((l) => l.grade === grade);
      expect(rows.map((l) => l.order)).toEqual([17, 18, 19, 20]);
      expect(rows.map((l) => l.id)).toEqual(
        [1, 2, 3, 4].map((n) => `P${grade}B-U05-L${n}`),
      );
      expect(rows.every((l) => l.unitTitle === titles[grade - 1])).toBe(true);
      expect(
        courseCatalog.lessons.filter(
          (l) => l.grade === grade && l.term === "B",
        ),
      ).toHaveLength(24);
      const older = courseCatalog.lessons.filter(
        (l) => l.grade === grade && l.term === "B" && l.unitNumber! < 5,
      );
      const next = courseStep(
        courseCatalog.lessons,
        grade,
        "B",
        older.map((l) => ({ lessonId: l.id })),
      );
      expect(next.next?.id).toBe(`P${grade}B-U05-L1`);
      expect(next.allPractised).toBe(false);
    }
  });
  it("grades 216 separate families across seven types, rejects distractors and wrong evidence, and never publishes private solutions", () => {
    expect(release.items).toHaveLength(216);
    expect(new Set(release.items.map((i) => i.family)).size).toBe(216);
    const ids = new Set(release.items.map((i) => i.id)),
      old = new Set(
        courseCatalog.items.filter((i) => !ids.has(i.id)).map((i) => i.family),
      );
    for (const row of release.items) {
      expect(old.has(row.family), row.id).toBe(false);
      expect(gradeAnswer(row, answer(row)), row.id).toBe(true);
      for (const key of [
        "answers",
        "repairs",
        "placements",
        "evidenceSolutions",
        "solutionSentences",
        "hint",
        "explanation",
      ])
        expect(publicExercise(row), row.id).not.toHaveProperty(key);
      const lesson = release.lessons.find((l) => l.id === row.lessonId)!;
      expect(
        row.solutionSentences!.some((s) =>
          lesson.cards.some((c) => c.example === s),
        ),
        row.id,
      ).toBe(false);
      if (row.type === "choice" || row.type === "listen") {
        for (const choice of row.choices!.filter(
          (c) => !row.answers.includes(c),
        ))
          expect(gradeAnswer(row, choice), row.id).toBe(false);
      } else if (row.type === "evidence") {
        const [source, value] = answer(row);
        expect(
          gradeAnswer(row, [source === "s1" ? "s2" : "s1", value]),
          row.id,
        ).toBe(false);
      } else if (row.type === "repair")
        expect(
          gradeAnswer(row, ["unknown-part", row.repairs![0].replacements[0]]),
          row.id,
        ).toBe(false);
      else if (row.type === "input")
        expect(gradeAnswer(row, "__not_a_target__"), row.id).toBe(false);
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
  it("distinguishes weather adjectives from weather nouns without pretending to supply live forecasts", () => {
    expect(gradeAnswer(item("P1B-U05-L1.p3.choice"), "sunny")).toBe(true);
    expect(gradeAnswer(item("P1B-U05-L1.p3.choice"), "sun")).toBe(false);
    expect(gradeAnswer(item("P1B-U05-L2.p3.choice"), "wind")).toBe(false);
    expect(gradeAnswer(item("P1B-U05-L4.p3.choice"), "How many")).toBe(false);
    expect(
      release.lessons.find((l) => l.id === "P1B-U05-L2")!.cards[0].rule,
    ).toContain("It rains也是正确句子");
  });
  it("teaches a requested contrast without falsely claiming and is always wrong, and checks two-person agreement", () => {
    expect(
      release.lessons.find((l) => l.id === "P2B-U05-L2")!.cards[0].rule,
    ).toContain("and也能");
    expect(item("P2B-U05-L2.p8.input").context).toContain("本题要求用but");
    expect(gradeAnswer(item("P2B-U05-L2.p3.choice"), "but")).toBe(true);
    expect(gradeAnswer(item("P2B-U05-L3.p3.choice"), "are")).toBe(true);
    expect(gradeAnswer(item("P2B-U05-L3.p3.choice"), "is")).toBe(false);
  });
  it("counts units rather than pluralising uncountable foods, and requires an actual source sentence for recipe order", () => {
    expect(gradeAnswer(item("P3B-U05-L2.p3.choice"), "many")).toBe(true);
    expect(gradeAnswer(item("P3B-U05-L2.p3.choice"), "much")).toBe(false);
    expect(gradeAnswer(item("P3B-U05-L3.p8.input"), "spoons")).toBe(true);
    expect(gradeAnswer(item("P3B-U05-L3.p8.input"), "spoon")).toBe(false);
    const reading = item("P3B-U05-L4.p5.evidence");
    expect(gradeAnswer(reading, ["s2", "three paper berries"])).toBe(true);
    expect(gradeAnswer(reading, ["s1", "three paper berries"])).toBe(false);
  });
  it("accepts full and contracted negative plans, keeps verbs after going to in base form, and does not infer completion", () => {
    for (const word of ["is not", "isn't", "ISN’T"])
      expect(gradeAnswer(item("P4B-U05-L2.p8.input"), word)).toBe(true);
    const repair = item("P4B-U05-L2.p6.repair");
    for (const word of ["are not", "aren't"])
      expect(gradeAnswer(repair, [repair.repairs![0].partId, word])).toBe(true);
    expect(
      gradeAnswer(item("P4B-U05-L3.p6.repair"), [
        item("P4B-U05-L3.p6.repair").repairs![0].partId,
        "making",
      ]),
    ).toBe(false);
    expect(
      gradeAnswer(item("P4B-U05-L4.p5.evidence"), [
        "s2",
        "no; only plans are listed",
      ]),
    ).toBe(true);
    for (const lesson of release.lessons.filter((l) => l.grade === 4))
      expect(lesson.conceptLabIds).toContain("tense.future");
  });
  it("separates no obligation from prohibition, missing replies from permission, and limited research from universal claims", () => {
    expect(gradeAnswer(item("P5B-U05-L2.p3.choice"), "don't have to")).toBe(
      false,
    );
    for (const word of ["must not", "mustn't"])
      expect(gradeAnswer(item("P5B-U05-L2.p8.input"), word)).toBe(true);
    expect(
      gradeAnswer(item("P5B-U05-L4.p5.evidence"), [
        "s2",
        "leaves the drawing out for now",
      ]),
    ).toBe(true);
    expect(
      gradeAnswer(item("P5B-U05-L4.p5.evidence"), [
        "s2",
        "assumes Sani agreed",
      ]),
    ).toBe(false);
    const research = item("P6B-U05-L4.p2.evidence");
    expect(
      gradeAnswer(research, [
        "s1",
        "three of the five pupils chose Plan Birch",
      ]),
    ).toBe(true);
    expect(gradeAnswer(research, ["s1", "every pupil chose Plan Birch"])).toBe(
      false,
    );
    const spelling = item("P6B-U05-L3.p6.repair");
    for (const word of ["colour", "color"])
      expect(gradeAnswer(spelling, [spelling.repairs![0].partId, word])).toBe(
        true,
      );
  });
  it("provides specific Chinese home activities and optional future labs while keeping the primary practice action clear", () => {
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
      expect(html).toContain("开始这节课的练习");
      expect(html).not.toMatch(/<details[^>]*\bopen\b/);
      expect(lesson.task).toContain("受控练习");
      if (lesson.grade === 4) expect(html).toContain("打开互动小实验");
    }
  });
});
