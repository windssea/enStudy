import type { LearningSession } from "../packages/contracts/index";

/** Describe the actual response control, independently of the curriculum category. */
export function exerciseKind(exercise: LearningSession["exercise"]): string {
  if (exercise.pictureChoices) return "听音选图";
  if (exercise.type === "order")
    return exercise.graphemeTokens ? "拼写" : "句子排序";
  return {
    choice: "单项选择",
    input: "填空",
    listen: "听力选择",
    sort: "分类",
    repair: "句子改错",
    evidence: "阅读与依据",
  }[exercise.type];
}
