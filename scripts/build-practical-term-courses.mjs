import source from "../content/practical-term-courses.v1.mjs";
import { compileMixedCourse } from "./compile-mixed-course.mjs";
await compileMixedCourse({
  source,
  term: "B",
  unitNumber: 5,
  unitLabel: "fifth-B-term-unit",
  id: "term-b-practical-v1",
  migrationPath: "migrations/0035_term_b_practical.sql",
  releasePath: "content/practical-term-course-release.v1.json",
  catalogRelease: "course-catalog-v11",
  summary:
    "Built 24 B-term unit-5 lessons / 216 mixed tasks; catalog 264/288. Prior snapshots preserved; full media, phonics, project editor and teaching review remain incomplete.",
});
