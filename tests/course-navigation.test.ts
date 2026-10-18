import { describe, expect, it } from "vitest";
import { courseCatalog } from "../packages/server/exercises";
import { courseStep } from "../src/courseNavigation";
import { mapFragment, parseRoute } from "../src/routes";

describe("course map across terms", () => {
  it("round-trips every grade and term for reload and browser history", () => {
    for (let grade = 1; grade <= 6; grade++)
      for (const term of ["A", "B"] as const)
        expect(parseRoute(mapFragment(grade, term))).toEqual({
          view: "map",
          lessonId: null,
          mapScope: { grade, term },
        });
    expect(parseRoute("#map")).toEqual({ view: "map", lessonId: null });
    expect(parseRoute("#lesson=P6B-U01-L1")).toEqual({
      view: "lesson",
      lessonId: "P6B-U01-L1",
    });
  });
  it("rejects invalid map filters without turning them into course state", () => {
    for (const fragment of [
      "#map?grade=7&term=B",
      "#map?grade=3&term=C",
      "#map?grade=1.5&term=A",
      "#map?grade=%3Cscript%3E&term=B",
      "#map?grade=2",
    ])
      expect(parseRoute(fragment)).toEqual({ view: "map", lessonId: null });
    expect(() => mapFragment(7, "A")).toThrow();
    expect(() => mapFragment(3, "C")).toThrow();
  });
  const lessons = courseCatalog.lessons;
  const completed = (ids: string[]) => ids.map((lessonId) => ({ lessonId }));
  it("opens the first unfinished lesson of the selected grade and term", () => {
    const state = courseStep(
      [...lessons].reverse(),
      3,
      "B",
      completed(["P3B-U01-L1"]),
    );
    expect(state.available.map((row) => row.id)).toEqual(
      [1, 2, 3, 4].map((n) => `P3B-U01-L${n}`),
    );
    expect(state.next?.id).toBe("P3B-U01-L2");
    expect(state.allPractised).toBe(false);
    expect(state.nextTerm).toBeNull();
  });
  it("does not confuse a completed first A-term unit with the same-numbered B-term unit", () => {
    const state = courseStep(
      lessons,
      1,
      "B",
      completed([1, 2, 3, 4].map((n) => `P1A-U01-L${n}`)),
    );
    expect(state.next?.id).toBe("P1B-U01-L1");
    expect(state.allPractised).toBe(false);
  });
  it("offers the next term only when all available A-term lessons are practised", () => {
    const ids = lessons
      .filter((row) => row.grade === 5 && row.term === "A")
      .map((row) => row.id);
    expect(
      courseStep(lessons, 5, "A", completed(ids.slice(1))).nextTerm,
    ).toBeNull();
    const state = courseStep(lessons, 5, "A", completed([...ids, ...ids]));
    expect(state.allPractised).toBe(true);
    expect(state.next?.id).toBe("P5A-U01-L1");
    expect(state.nextTerm).toBe("B");
    expect(
      courseStep(
        lessons.filter((row) => row.term !== "B"),
        5,
        "A",
        completed(ids),
      ).nextTerm,
    ).toBeNull();
  });
  it("does not declare an empty term practised or use another grade's completions", () => {
    expect(courseStep([], 2, "B", [])).toMatchObject({
      allPractised: false,
      next: undefined,
      nextTerm: null,
    });
    expect(
      courseStep(
        lessons,
        2,
        "A",
        completed(
          lessons.filter((row) => row.grade === 1).map((row) => row.id),
        ),
      ).next?.id,
    ).toBe("P2A-U01-L1");
  });
  it("treats the last available B-term lesson as a replay without inventing later course progress", () => {
    const ids = lessons
      .filter((row) => row.grade === 6 && row.term === "B")
      .map((row) => row.id);
    const state = courseStep(lessons, 6, "B", completed(ids));
    expect(state.allPractised).toBe(true);
    expect(state.nextTerm).toBeNull();
    expect(state.next?.id).toBe("P6B-U01-L1");
    expect(state.available).toHaveLength(4);
  });
});
