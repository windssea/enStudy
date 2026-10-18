import source from "../content/discovery-courses.v1.mjs";
import { compileMixedCourse } from "./compile-mixed-course.mjs";
await compileMixedCourse({
  source,
  unitNumber: 5,
  unitLabel: "fifth-unit",
  id: "discovery-courses-v1",
  migrationPath: "migrations/0026_discovery_courses_v1.sql",
  releasePath: "content/discovery-course-release.v1.json",
  catalogRelease: "course-catalog-v5",
  summary:
    "Built 24 fifth-unit lessons / 216 mixed tasks; catalog 120/288. Phonics, media and textbook alignment remain partial.",
});
