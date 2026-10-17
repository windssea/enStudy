import raw from "../../content/exercises.json";
import course from "../../content/course-release.v1.json";
import topics from "../../content/topic-release.v1.json";
import patterns from "../../content/pattern-release.v1.json";
import vocabulary from "../../content/vocabulary-release.v1.json";
import type {
  Answer,
  Category,
  CourseLesson,
  Exercise,
  WordTheme,
  WordCard,
  WordMode,
} from "../contracts/index";
export interface PrivateExercise extends Exercise {
  answers: string[];
  skill: string;
  modality: string;
  hint: string;
  explanation: string;
  family?: string;
  lessonId?: string;
  topicId?: string;
  pattern?: string;
  patternId?: string;
  wordId?: string;
  wordThemeId?: string;
  wordMode?: WordMode;
}
export const courseRelease = course as unknown as {
  id: string;
  manifestHash: string;
  lessons: CourseLesson[];
  items: PrivateExercise[];
  topicSkills: Record<string, string>;
};
export const topicRelease = topics as unknown as {
  id: string;
  manifestHash: string;
  items: PrivateExercise[];
  stats: Record<
    string,
    { items: number; families: number; roundSizes: number[]; mode: string }
  >;
};
export const patternRelease = patterns as unknown as {
  id: string;
  manifestHash: string;
  items: PrivateExercise[];
  stats: Record<
    string,
    {
      items: number;
      contexts: number;
      families: number;
      roundSizes: number[];
      mode: string;
    }
  >;
};
export const exercises = [
  ...raw,
  ...courseRelease.items,
  ...topicRelease.items,
  ...patternRelease.items,
  ...vocabulary.items,
] as PrivateExercise[];
export const vocabularyRelease = vocabulary as unknown as {
  id: string;
  manifestHash: string;
  items: PrivateExercise[];
  totalWords: number;
  totalItems: number;
  themes: (WordTheme & { words: WordCard[] })[];
};
export const wordThemes: WordTheme[] = vocabularyRelease.themes.map(
  ({ words, ...theme }) => theme,
);
export const exerciseById = new Map(exercises.map((item) => [item.id, item]));
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
    reading,
    audioText,
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
    reading,
    audioText,
  };
}
export function normalise(answer: Answer): string {
  return (Array.isArray(answer) ? answer.join(" ") : answer)
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
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
    .filter(
      (e) =>
        e.id.startsWith("sample.") && (!category || e.category === category),
    )
    .map(publicExercise);
}
