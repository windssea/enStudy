import raw from "../../content/exercises.json";
import type { Answer, Category, Exercise } from "../contracts/index";
export interface PrivateExercise extends Exercise {
  answers: string[];
  skill: string;
  modality: string;
  hint: string;
  explanation: string;
}
export const exercises = raw as PrivateExercise[];
export function publicExercise(exercise: PrivateExercise): Exercise {
  const {
    id,
    category,
    title,
    context,
    prompt,
    type,
    choices,
    tokens,
    gradeMin,
  } = exercise;
  return {
    id,
    category,
    title,
    context,
    prompt,
    type,
    choices,
    tokens,
    gradeMin,
  };
}
export function normalise(answer: Answer): string {
  return (Array.isArray(answer) ? answer.join(" ") : answer)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}
export function gradeAnswer(
  exercise: PrivateExercise,
  answer: Answer,
): boolean {
  return exercise.answers.some(
    (accepted) => normalise(accepted) === normalise(answer),
  );
}
export function sampleList(category?: Category): Exercise[] {
  return exercises
    .filter((e) => !category || e.category === category)
    .map(publicExercise);
}
