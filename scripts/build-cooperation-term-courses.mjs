import source from "../content/cooperation-term-courses.v1.mjs";
import { compileMixedCourse } from "./compile-mixed-course.mjs";
await compileMixedCourse({
  source,
  term: "B",
  unitNumber: 4,
  unitLabel: "fourth-B-term-unit",
  id: "term-b-cooperation-v1",
  migrationPath: "migrations/0034_term_b_cooperation.sql",
  releasePath: "content/cooperation-term-course-release.v1.json",
  catalogRelease: "course-catalog-v10",
  summary:
    "Built 24 B-term unit-4 lessons / 216 mixed tasks; catalog 240/288. Previous releases preserved; full media, phonics and teaching review remain incomplete.",
});
