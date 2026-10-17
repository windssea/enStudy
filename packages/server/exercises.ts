import raw from "../../content/exercises.json";
import course from "../../content/course-release.v1.json";
import expansion from "../../content/course-expansion.v1.json";
import expansionLatest from "../../content/course-expansion.latest.json";
import topics from "../../content/topic-release.v1.json";
import patterns from "../../content/pattern-release.v1.json";
import vocabulary from "../../content/vocabulary-release.v1.json";
import workshop from "../../content/workshop-release.v1.json";
import workshopLatest from "../../content/workshop-release.latest.json";
import { structuredCanonical, sortPlacements } from "../domain/structured";
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
  version?: number;
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
  workshopId?: string;
  placements?: Record<string, string>;
  repairs?: { partId: string; replacements: string[] }[];
  solutionSentences?: string[];
  evidenceTargets?: string[];
}
export const courseRelease = course as unknown as {
  id: string;
  manifestHash: string;
  lessons: CourseLesson[];
  items: PrivateExercise[];
  topicSkills: Record<string, string>;
};
export const courseExpansion = expansionLatest as unknown as {
  id: string;
  manifestHash: string;
  lessons: CourseLesson[];
  items: PrivateExercise[];
};
export const courseCatalog = {
  id: "course-catalog-v2",
  lessons: [...courseRelease.lessons, ...courseExpansion.lessons],
  items: [...courseRelease.items, ...courseExpansion.items],
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
  ...courseExpansion.items,
  ...topicRelease.items,
  ...patternRelease.items,
  ...vocabulary.items,
  ...workshopLatest.items,
] as PrivateExercise[];
export const workshopRelease = workshopLatest as unknown as {
  id: string;
  manifestHash: string;
  workshops: import("../contracts/index").Workshop[];
  items: PrivateExercise[];
};
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
const versionedExercises = new Map(
  [...expansion.items, ...workshop.items, ...exercises].map((item) => [
    `${item.id}@${(item as PrivateExercise).version ?? 1}`,
    item as PrivateExercise,
  ]),
);
export const exerciseVersion = (id: string, version = 1) =>
  versionedExercises.get(`${id}@${version}`);
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
    sorting,
    editing,
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
    sorting,
    editing,
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
  if (exercise.type === "sort" || exercise.type === "repair") {
    const canonical = structuredCanonical(exercise, answer);
    return canonical !== null && exercise.answers.includes(canonical);
  }
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
export function structuredFeedback(item: PrivateExercise, answer: Answer) {
  if (item.type === "sort" && item.sorting && item.placements) {
    const submitted = sortPlacements(item, answer)!;
    const label = (id: string) =>
      item.sorting!.groups.find((g) => g.id === id)?.label ?? "未放好";
    return {
      details: item.sorting.cards.map((card) => ({
        label: card.text,
        submitted: label(submitted[card.id]),
        expected: label(item.placements![card.id]),
        correct: submitted[card.id] === item.placements![card.id],
      })),
    };
  }
  if (
    item.type === "repair" &&
    item.editing &&
    item.repairs &&
    Array.isArray(answer)
  ) {
    const expected = item.repairs[0];
    return {
      details: [
        {
          label: "需要调整的词块",
          submitted: `${item.editing.parts.find((p) => p.id === answer[0])?.text} → ${answer[1]}`,
          expected: `${item.editing.parts.find((p) => p.id === expected.partId)?.text} → ${expected.replacements.join(" / ")}`,
          correct: gradeAnswer(item, answer),
        },
      ],
      correctedSentence: item.solutionSentences?.[0],
    };
  }
  return {};
}
