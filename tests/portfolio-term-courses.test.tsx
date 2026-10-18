import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  courseCatalog,
  portfolioTermRelease as release,
  gradeAnswer,
  publicExercise,
} from "../packages/server/exercises";
import preserved from "./fixtures/term-b-practical.latest-hashes.json";
import exposure from "../content/concept-exposure-map.json";
import LessonView from "../src/LessonView";
import CourseWrapUp from "../src/CourseWrapUp";
import { courseStep } from "../src/courseNavigation";
vi.mock("../src/SceneStage", () => ({ default: () => null }));
const item = (id: string) => release.items.find((i) => i.id === id)!;
const answer = (row: (typeof release.items)[number]) =>
  row.type === "sort"
    ? Object.entries(row.placements!).map(([c, g]) => `${c}=${g}`)
    : ["repair", "evidence"].includes(row.type)
      ? JSON.parse(row.answers[0])
      : row.answers[0];
const repair = (id: string, word: string) =>
  gradeAnswer(item(id), [item(id).repairs![0].partId, word]);
describe("final B-term core lessons and continued review", () => {
  it("preserves applied v1 and v2 content and migrations", () => {
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
  it("provides four scoped lessons in every final unit without conflating 288 exercises with complete teaching coverage", () => {
    expect(courseCatalog.lessons).toHaveLength(288);
    expect(courseCatalog.items).toHaveLength(2592);
    for (const lesson of courseCatalog.lessons)
      expect(
        courseCatalog.items.filter((i) => i.lessonId === lesson.id),
        lesson.id,
      ).toHaveLength(lesson.itemCount);
    expect(new Set(courseCatalog.lessons.map((l) => l.id)).size).toBe(288);
    expect(new Set(courseCatalog.lessons.map((l) => l.unitId)).size).toBe(72);
    const titles = [
      "我们的英语小展览",
      "我的周末图鉴",
      "给朋友的邀请",
      "我的故事展",
      "我的观点小报",
      "走向新的旅程",
    ];
    for (let grade = 1; grade <= 6; grade++) {
      for (const term of ["A", "B"])
        expect(
          courseCatalog.lessons.filter(
            (l) => l.grade === grade && l.term === term,
          ),
        ).toHaveLength(24);
      const rows = release.lessons.filter((l) => l.grade === grade);
      expect(rows.map((l) => l.order)).toEqual([21, 22, 23, 24]);
      expect(
        rows.every(
          (l) =>
            l.unitTitle === titles[grade - 1] &&
            l.unitNumber === 6 &&
            l.term === "B",
        ),
      ).toBe(true);
      expect(
        rows.every(
          (l) =>
            l.task.includes("受控练习") &&
            l.task.includes("不代替自由口语或写作"),
        ),
      ).toBe(true);
    }
  });
  it("grades every task and distractor, protects private solutions and uses fresh evidence families", () => {
    expect(release.items).toHaveLength(216);
    expect(new Set(release.items.map((i) => i.family)).size).toBe(216);
    const ids = new Set(release.items.map((i) => i.id));
    const old = new Set(
      courseCatalog.items.filter((i) => !ids.has(i.id)).map((i) => i.family),
    );
    for (const row of release.items) {
      expect(old.has(row.family), row.id).toBe(false);
      if (["choice", "repair", "input"].includes(row.type)) {
        const target =
          row.type === "repair"
            ? row.repairs![0].replacements[0]
            : row.answers[0];
        const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(
          new RegExp("\\b" + escaped + "\\b", "i").test(row.context),
          row.id + " does not spell out its answer in the task instruction",
        ).toBe(false);
      }

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
      if (row.type === "choice" || row.type === "listen")
        for (const wrong of row.choices!.filter(
          (c) => !row.answers.includes(c),
        ))
          expect(gradeAnswer(row, wrong), row.id).toBe(false);
      if (row.type === "evidence") {
        const [s, v] = answer(row);
        expect(gradeAnswer(row, [s === "s1" ? "s2" : "s1", v]), row.id).toBe(
          false,
        );
      }
      if (row.type === "repair")
        expect(
          gradeAnswer(row, ["missing-part", row.repairs![0].replacements[0]]),
          row.id,
        ).toBe(false);
      if (row.type === "input")
        expect(gradeAnswer(row, "__wrong__"), row.id).toBe(false);
      const lesson = release.lessons.find((l) => l.id === row.lessonId)!;
      expect(
        row.solutionSentences!.some((s) =>
          lesson.cards.some((c) => c.example === s),
        ),
        row.id,
      ).toBe(false);
    }
    for (const l of release.lessons)
      expect(
        release.items.filter((i) => i.lessonId === l.id).map((i) => i.type),
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
  it("uses stated quantity and pronouns for exhibition descriptions", () => {
    expect(gradeAnswer(item("P1B-U06-L1.p3.choice"), "are")).toBe(false);
    expect(repair("P1B-U06-L3.p6.repair", "is")).toBe(true);
    expect(gradeAnswer(item("P1B-U06-L2.p8.input"), "her")).toBe(true);
    expect(item("P1B-U06-L2.p8.input").context).toContain("uses she");
    expect(gradeAnswer(item("P1B-U06-L4.p3.choice"), "jumps")).toBe(false);
  });
  it("accepts contracted ability and daily negatives while separating routines from current actions", () => {
    for (const a of ["cannot", "can't"])
      expect(gradeAnswer(item("P2B-U06-L2.p8.input"), a)).toBe(true);
    for (const a of ["do not", "don't"])
      expect(gradeAnswer(item("P3B-U06-L3.p8.input"), a)).toBe(true);
    expect(gradeAnswer(item("P2B-U06-L1.p3.choice"), "paint")).toBe(false);
    expect(gradeAnswer(item("P2B-U06-L3.p3.choice"), "does")).toBe(false);
    expect(repair("P2B-U06-L3.p6.repair", "does")).toBe(true);
  });
  it("reads invitation time, place, acceptance and missing details without treating silence as agreement", () => {
    expect(gradeAnswer(item("P3B-U06-L1.p3.choice"), "Where")).toBe(true);
    expect(repair("P3B-U06-L1.p6.repair", "on")).toBe(true);
    expect(gradeAnswer(item("P3B-U06-L2.p3.choice"), "visiting")).toBe(false);
    expect(
      gradeAnswer(item("P3B-U06-L4.p5.evidence"), ["s2", "the room"]),
    ).toBe(true);
    expect(
      release.lessons.find((l) => l.id === "P3B-U06-L4")!.cards[0].rule,
    ).toContain("不能由未写回复推断同意");
  });
  it("keeps past, current and future evidence separate and links disclosed wrote to the existing morph lab", () => {
    expect(repair("P4B-U06-L1.p6.repair", "see")).toBe(true);
    expect(repair("P4B-U06-L1.p6.repair", "saw")).toBe(false);
    expect(repair("P4B-U06-L3.p6.repair", "write")).toBe(true);
    for (const a of ["is not", "isn't"])
      expect(gradeAnswer(item("P4B-U06-L3.p8.input"), a)).toBe(true);
    expect(gradeAnswer(item("P4B-U06-L3.p8.input"), "was not")).toBe(false);
    const target = item("P4B-U06-L4.p6.repair");
    expect(exposure.entries["forms.irregular-past/write"]).toContain(
      `family:${target.family}`,
    );
    expect(exposure.entries["forms.irregular-past/write"]).not.toContain(
      `family:${item("P4B-U06-L1.p3.choice").family}`,
    );
  });
  it("accepts causal variants and limits claims to the stated sample", () => {
    for (const a of ["because", "since", "as"])
      expect(gradeAnswer(item("P5B-U06-L2.p8.input"), a)).toBe(true);
    expect(repair("P5B-U06-L2.p6.repair", "we")).toBe(true);
    expect(repair("P5B-U06-L4.p6.repair", "some")).toBe(true);
    expect(repair("P5B-U06-L4.p6.repair", "all")).toBe(false);
    const e = item("P5B-U06-L4.p2.evidence");
    expect(
      gradeAnswer(e, ["s1", "two of four trial pupils found cards faster"]),
    ).toBe(true);
    expect(gradeAnswer(e, ["s1", "every pupil will always be faster"])).toBe(
      false,
    );
    expect(
      release.lessons.find((l) => l.id === "P5B-U06-L3")!.cards[0].rule,
    ).toContain("别人可以有不同喜好");
  });
  it("checks experience, conditions and contextual word strategies without selling one round as mastery", () => {
    expect(gradeAnswer(item("P6B-U06-L1.p3.choice"), "has")).toBe(true);
    expect(repair("P6B-U06-L1.p6.repair", "seen")).toBe(true);
    expect(gradeAnswer(item("P6B-U06-L2.p3.choice"), "will be")).toBe(false);
    expect(
      gradeAnswer(item("P6B-U06-L3.p5.evidence"), ["s2", "the river's edge"]),
    ).toBe(true);
    expect(
      release.lessons.find((l) => l.id === "P6B-U06-L3")!.cards[0].rule,
    ).toContain("不是每个以un开头的词");
    expect(
      release.lessons.find((l) => l.id === "P6B-U06-L4")!.homeActivity,
    ).toContain("不把本轮练习当成毕业证书");
  });
  it("keeps optional Chinese home activities folded and loads concept demos only on demand", () => {
    expect(new Set(release.lessons.map((l) => l.homeActivity)).size).toBe(24);
    for (const lesson of release.lessons) {
      const html = renderToStaticMarkup(
        createElement(LessonView, {
          lesson,
          busy: false,
          completed: false,
          onStart: () => {},
          onBack: () => {},
        }),
      );
      expect(html).toContain("开始这节课的练习");
      expect(html).not.toMatch(/<details[^>]*\bopen\b/);
      expect(lesson.homeActivity).toMatch(/[\u4e00-\u9fff]/);
      if (lesson.conceptLabIds?.length) expect(html).toContain("打开3D小实验");
    }
  });
  it("offers continued review with an honest empty-due state after all B-term lessons", () => {
    const rows = courseCatalog.lessons.filter(
      (l) => l.grade === 6 && l.term === "B",
    );
    expect(
      courseStep(
        courseCatalog.lessons,
        6,
        "B",
        rows.map((l) => ({ lessonId: l.id })),
      ).allPractised,
    ).toBe(true);
    expect(
      courseStep(
        courseCatalog.lessons,
        6,
        "B",
        rows.slice(0, -1).map((l) => ({ lessonId: l.id })),
      ).allPractised,
    ).toBe(false);
    for (const dueCount of [0, 7]) {
      const html = renderToStaticMarkup(
        createElement(CourseWrapUp, { dueCount, onReview: () => {} }),
      );
      expect(html).toContain("看看复习安排");
      expect(html).toContain("不等于已掌握全部内容");
      expect(html).toContain(
        dueCount ? "7 条到期复习记录" : "现在没有到期复习",
      );
      expect(html).not.toContain("作品和练习记录已留");
    }
  });
});
