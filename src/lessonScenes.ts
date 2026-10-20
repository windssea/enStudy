import art from "../public/content/learning-art.v1.json";
import scenes from "../public/content/course-scenes.v1.json";
import type { CourseLesson } from "../packages/contracts/index";

/** Exact lesson and example bindings: unrelated lessons never inherit a guessed picture. */
export function lessonCover(lesson: Pick<CourseLesson, "id">) {
  const binding = scenes.lessons[lesson.id as keyof typeof scenes.lessons];
  if (!binding) return undefined;
  const asset = art.assets[binding.assetId as keyof typeof art.assets];
  return asset ? { ...asset, styleId: art.styleId } : undefined;
}
export function lessonExampleScene(lesson: CourseLesson, example: string) {
  const binding = scenes.lessons[lesson.id as keyof typeof scenes.lessons];
  return binding?.examples.includes(example) ? lessonCover(lesson) : undefined;
}
