import type { Catalog, CourseLesson } from "../packages/contracts/index";

/** A station is a real unit in the current scope, never a decorative progress flag. */
export function courseMapStations(
  units: Catalog["units"],
  lessons: readonly CourseLesson[],
  completed: readonly { lessonId: string }[],
) {
  const done = new Set(completed.map((row) => row.lessonId));
  return [...units]
    .sort((a, b) => Number(a.unit_in_term) - Number(b.unit_in_term))
    .map((unit) => {
      const available = lessons
        .filter((row) => row.unitId === unit.unit_id)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      return {
        id: unit.unit_id,
        number: Number(unit.unit_in_term),
        title: unit.title,
        task: unit.integrated_task,
        focus: unit.grammar_focus,
        total: available.length,
        practised: available.filter((row) => done.has(row.id)).length,
        next: available.find((row) => !done.has(row.id)) ?? available[0],
      };
    });
}
export type CourseMapStation = ReturnType<typeof courseMapStations>[number];
