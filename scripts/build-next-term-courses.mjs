import source from "../content/next-term-courses.v1.mjs";
import { compileMixedCourse } from "./compile-mixed-course.mjs";
await compileMixedCourse({
  source,
  term: "B",
  unitNumber: 1,
  unitLabel: "first-B-term-unit",
  id: "term-b-foundations-v1",
  migrationPath: "migrations/0028_term_b_foundations.sql",
  releasePath: "content/next-term-course-release.v1.json",
  catalogRelease: "course-catalog-v7",
  summary:
    "Built 24 first-B-term lessons / 216 mixed tasks; catalog 168/288. A-term bytes preserved; full media, phonics and teaching review remain incomplete.",
});
