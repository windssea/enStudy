import type { CourseLesson } from "../packages/contracts/index";

export function courseStep(
  lessons: readonly CourseLesson[],
  grade: number,
  term: string,
  completed: readonly { lessonId: string }[],
) {
  const available = lessons
    .filter((lesson) => lesson.grade === grade && lesson.term === term)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const done = new Set(completed.map((row) => row.lessonId));
  const allPractised =
    available.length > 0 && available.every((lesson) => done.has(lesson.id));
  return {
    available,
    next: available.find((lesson) => !done.has(lesson.id)) ?? available[0],
    allPractised,
    nextTerm:
      term === "A" &&
      allPractised &&
      lessons.some((lesson) => lesson.grade === grade && lesson.term === "B")
        ? "B"
        : null,
  };
}
