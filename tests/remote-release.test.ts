import { describe, expect, it } from "vitest";
import { sameLessonRelease } from "../scripts/remote-release.mjs";
import expected from "../public/content/lessons.json";
describe("remote release propagation gate", () => {
  it("accepts the current snapshot independent of list order", () => {
    expect(
      sameLessonRelease(
        { ...expected, lessons: [...expected.lessons].reverse() },
        expected,
      ),
    ).toBe(true);
  });
  it("rejects the old 24-lesson release and mismatching aggregate labels", () => {
    expect(
      sameLessonRelease(
        {
          release: "course-foundations-v1",
          lessons: expected.lessons.slice(0, 24),
        },
        expected,
      ),
    ).toBe(false);
    expect(sameLessonRelease({ ...expected, release: "stale" }, expected)).toBe(
      false,
    );
  });
  it("rejects the same count with a substituted lesson or historical version", () => {
    const lessons: { id: string; version?: number; releaseId?: string }[] =
      structuredClone(expected.lessons);
    lessons[0].id = "unpublished";
    expect(sameLessonRelease({ ...expected, lessons }, expected)).toBe(false);
    lessons[0] = { ...expected.lessons[0], version: 999 };
    expect(sameLessonRelease({ ...expected, lessons }, expected)).toBe(false);
  });
});
