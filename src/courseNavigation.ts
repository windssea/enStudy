import type { Catalog, CourseLesson } from "../packages/contracts/index";

/** Use the curriculum registry for hierarchy, not global recommendation order. */
export function courseLessonPath(
  lesson: CourseLesson,
  units: Catalog["units"],
  lessons: readonly CourseLesson[] = [],
) {
  const unit = units.find((row) => row.unit_id === lesson.unitId);
  const index = lessons
    .filter((row) => row.unitId === lesson.unitId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .findIndex((row) => row.id === lesson.id);
  const number = lesson.unitLesson ?? (index < 0 ? undefined : index + 1);
  return [
    `${lesson.grade}年级${lesson.term === "A" ? "上学期" : "下学期"}`,
    unit ? `单元 ${unit.unit_in_term} · ${unit.title}` : lesson.unitTitle,
    number ? `第${number}课` : undefined,
  ]
    .filter(Boolean)
    .join(" / ");
}

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
