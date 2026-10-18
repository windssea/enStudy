import source from "../content/journey-courses.v1.mjs";
import { compileMixedCourse } from "./compile-mixed-course.mjs";
await compileMixedCourse({
  source,
  unitNumber: 6,
  unitLabel: "sixth-unit",
  id: "journey-courses-v1",
  migrationPath: "migrations/0027_journey_courses_v1.sql",
  releasePath: "content/journey-course-release.v1.json",
  catalogRelease: "course-catalog-v6",
  summary:
    "Built 24 sixth-unit lessons / 216 mixed tasks; catalog 144/288. All six A-term units have core practice; media and full curriculum remain incomplete.",
});
