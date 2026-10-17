import type { Answer, LearningSession } from "../packages/contracts/index";

export function reconcileDraft(
  previous: LearningSession | null,
  next: LearningSession,
  answer: Answer,
) {
  if (previous?.assignmentId === next.assignmentId)
    return { answer, backup: null };
  const text = Array.isArray(answer) ? answer.join(" ") : answer;
  return {
    answer: next.exercise.type === "order" ? [] : "",
    backup: previous && text.trim() ? text : null,
  };
}
