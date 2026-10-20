import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import type { Catalog } from "../packages/contracts/index";
import { courseCatalog } from "../packages/server/exercises";
import CoursePicker from "../src/CoursePicker";
import { lessonCover, lessonExampleScene } from "../src/lessonScenes";
import bindings from "../public/content/course-scenes.v1.json";
import art from "../public/content/learning-art.v1.json";

const catalog: Catalog = JSON.parse(
  readFileSync("public/content/catalog.json", "utf8"),
);
describe("course selection and contextual illustrations", () => {
  it("keeps all twelve terms selectable and shows only the four lessons of the chosen unit", () => {
    for (let grade = 1; grade <= 6; grade++)
      for (const term of ["A", "B"]) {
        const units = catalog.units.filter(
          (u) => u.grade === String(grade) && u.term === term,
        );
        const lessons = courseCatalog.lessons.filter(
          (l) => l.grade === grade && l.term === term,
        );
        for (const unit of units) {
          const html = renderToStaticMarkup(
            <CoursePicker
              units={units}
              lessons={lessons}
              completed={[]}
              nextUnitId={unit.unit_id}
              onOpen={() => {}}
              onSelectUnit={() => {}}
            />,
          );
          expect(html.match(/class="course-unit-choice"/g)).toHaveLength(6);
          expect(html.match(/class="lesson-choice"/g)).toHaveLength(4);
          expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
          expect(html.match(/<h3>.*?<\/h3>/g)).toEqual(
            lessons
              .filter((l) => l.unitId === unit.unit_id)
              .map((lesson) => renderToStaticMarkup(<h3>{lesson.title}</h3>)),
          );
          expect(html).not.toMatch(
            /<canvas|换个伙伴|成长岛|自主路线|map-footer/,
          );
        }
      }
  });
  it("uses real completed records without treating a scene or viewed lesson as completed", () => {
    const lessons = courseCatalog.lessons.filter((l) => l.unitId === "P3A-U01");
    const html = renderToStaticMarkup(
      <CoursePicker
        units={catalog.units.filter((u) => u.unit_id === "P3A-U01")}
        lessons={lessons}
        completed={[{ lessonId: lessons[0].id }]}
        onOpen={() => {}}
        onSelectUnit={() => {}}
      />,
    );
    expect(html).toContain("1/4 课已练习");
    expect(html.match(/重新学习/g)).toHaveLength(2); // accessible name and visible action
    expect(html.match(/学习这一课/g)).toHaveLength(3);
  });
  it("binds scene art to real lessons and exact examples, never guesses art for unrelated text", () => {
    expect(bindings.styleId).toBe(art.styleId);
    for (const [id, binding] of Object.entries(bindings.lessons)) {
      const lesson = courseCatalog.lessons.find((l) => l.id === id)!;
      expect(lesson).toBeTruthy();
      expect(lessonCover(lesson)?.url).toBe(
        art.assets[binding.assetId as keyof typeof art.assets].url,
      );
      for (const example of binding.examples) {
        expect(lesson.cards.some((c) => c.example === example)).toBe(true);
        expect(lessonExampleScene(lesson, example)).toBeDefined();
      }
      expect(
        lessonExampleScene(lesson, "Is Mia holding a pencil?"),
      ).toBeUndefined();
    }
    const other = courseCatalog.lessons.find((l) => l.id === "P3A-U02-L1")!;
    expect(lessonCover(other)).toBeUndefined();
    expect(lessonExampleScene(other, "We have books.")).toBeUndefined();
  });
});
