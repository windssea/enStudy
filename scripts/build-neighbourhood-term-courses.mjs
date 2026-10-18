import source from "../content/neighbourhood-term-courses.v1.mjs";
import { compileMixedCourse } from "./compile-mixed-course.mjs";
await compileMixedCourse({
  source,
  term: "B",
  unitNumber: 3,
  unitLabel: "third-B-term-unit",
  id: "term-b-neighbourhoods-v1",
  migrationPath: "migrations/0031_term_b_neighbourhoods.sql",
  releasePath: "content/neighbourhood-term-course-release.v1.json",
  catalogRelease: "course-catalog-v9",
  summary:
    "Built 24 B-term unit-3 lessons / 216 mixed tasks; catalog 216/288. Published snapshots preserved; complete media, phonics and teaching review remain unfinished.",
});
