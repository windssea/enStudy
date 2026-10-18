import source from "../content/portfolio-term-courses.v1.mjs";
import { compileMixedCourse } from "./compile-mixed-course.mjs";
await compileMixedCourse({
  source,
  term: "B",
  unitNumber: 6,
  unitLabel: "sixth-B-term-unit",
  id: "term-b-portfolio-v1",
  migrationPath: "migrations/0037_term_b_portfolio.sql",
  releasePath: "content/portfolio-term-course-release.v1.json",
  catalogRelease: "course-catalog-v12",
  summary:
    "Built 24 final B-term core lessons / 216 mixed tasks; 288 core lessons across 72 units. Full media, phonics, speaking, free-writing and teaching review remain incomplete.",
});
