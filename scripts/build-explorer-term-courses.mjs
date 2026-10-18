import source from "../content/explorer-term-courses.v1.mjs";
import { compileMixedCourse } from "./compile-mixed-course.mjs";
await compileMixedCourse({
  source,
  term: "B",
  unitNumber: 2,
  unitLabel: "second-B-term-unit",
  id: "term-b-explorers-v1",
  migrationPath: "migrations/0029_term_b_explorers.sql",
  releasePath: "content/explorer-term-course-release.v1.json",
  catalogRelease: "course-catalog-v8",
  summary:
    "Built 24 B-term unit-2 lessons / 216 mixed tasks; catalog 192/288. Previous releases preserved; full media, phonics and teaching review still incomplete.",
});
