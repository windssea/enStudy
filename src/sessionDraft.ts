import type { Answer, LearningSession } from "../packages/contracts/index";
import { emptyAnswer } from "../packages/domain/structured";

export function reconcileDraft(
  previous: LearningSession | null,
  next: LearningSession,
  answer: Answer,
) {
  if (previous?.assignmentId === next.assignmentId)
    return { answer, backup: null };
  const text =
    previous?.exercise.type === "sort" && Array.isArray(answer)
      ? answer
          .map((entry) => {
            const [id, group] = entry.split("=");
            return `${previous.exercise.sorting?.cards.find((c) => c.id === id)?.text ?? "卡片"} → ${previous.exercise.sorting?.groups.find((g) => g.id === group)?.label ?? "未放好"}`;
          })
          .join("；")
      : previous?.exercise.type === "repair" &&
          Array.isArray(answer) &&
          answer.length
        ? `${previous.exercise.editing?.parts.find((p) => p.id === answer[0])?.text ?? "词块"} → ${answer[1] ?? "未填写"}`
        : Array.isArray(answer)
          ? answer.join(" ")
          : answer;
  return {
    answer: emptyAnswer(next.exercise),
    backup: previous && text.trim() ? text : null,
  };
}
