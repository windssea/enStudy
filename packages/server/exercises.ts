import raw from "../../content/exercises.json";
import course from "../../content/course-release.v1.json";
import expansion from "../../content/course-expansion.v1.json";
import expansionLatest from "../../content/course-expansion.latest.json";
import topics from "../../content/topic-release.v1.json";
import patterns from "../../content/pattern-release.v1.json";
import vocabulary from "../../content/vocabulary-release.v1.json";
import workshop from "../../content/workshop-release.v1.json";
import workshopLatest from "../../content/workshop-release.latest.json";
import story from "../../content/story-course-release.v1.json";
import wordListening from "../../content/word-listening-release.v1.json";
import action from "../../content/action-course-release.v1.json";
import actionLatest from "../../content/action-course-release.latest.json";
import discovery from "../../content/discovery-course-release.v1.json";
import journey from "../../content/journey-course-release.v1.json";
import nextTerm from "../../content/next-term-course-release.v1.json";
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
  evidenceSolutions?: { sentenceId: string; answer: string }[];
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
  id: "course-catalog-v7",
  lessons: [
    ...courseRelease.lessons,
    ...courseExpansion.lessons,
    ...story.lessons,
    ...actionLatest.lessons,
    ...discovery.lessons,
    ...journey.lessons,
    ...nextTerm.lessons,
  ] as CourseLesson[],
  items: [
    ...courseRelease.items,
    ...courseExpansion.items,
    ...story.items,
    ...actionLatest.items,
    ...discovery.items,
    ...journey.items,
    ...nextTerm.items,
  ] as PrivateExercise[],
};
export const storyRelease = story as unknown as {
  id: string;
  manifestHash: string;
  lessons: CourseLesson[];
  items: PrivateExercise[];
};
export const actionRelease = actionLatest as unknown as {
  id: string;
  manifestHash: string;
  releases: string[];
  lessons: CourseLesson[];
  items: PrivateExercise[];
};
export const discoveryRelease = discovery as unknown as {
  id: string;
  manifestHash: string;
  lessons: CourseLesson[];
  items: PrivateExercise[];
};
export const journeyRelease = journey as unknown as {
  id: string;
  manifestHash: string;
  lessons: CourseLesson[];
  items: PrivateExercise[];
};
export const nextTermRelease = nextTerm as unknown as {
  id: string;
  manifestHash: string;
  lessons: CourseLesson[];
  items: PrivateExercise[];
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
  ...story.items,
  ...wordListening.items,
  ...actionLatest.items,
  ...discovery.items,
  ...journey.items,
  ...nextTerm.items,
] as PrivateExercise[];
export const workshopRelease = workshopLatest as unknown as {
  id: string;
  manifestHash: string;
  workshops: import("../contracts/index").Workshop[];
  items: PrivateExercise[];
};
const originalVocabulary = vocabulary as unknown as {
  id: string;
  manifestHash: string;
  items: PrivateExercise[];
  totalWords: number;
  totalItems: number;
  themes: (WordTheme & { words: WordCard[] })[];
};
export const vocabularyRelease = {
  ...originalVocabulary,
  id: "vocabulary-catalog-v2",
  items: [
    ...originalVocabulary.items,
    ...wordListening.items,
  ] as PrivateExercise[],
  totalItems: 1440,
  themes: originalVocabulary.themes.map((theme) => ({
    ...theme,
    items: 80,
    modes: [...theme.modes, "listening"] as WordMode[],
  })),
};
export const wordThemes: WordTheme[] = vocabularyRelease.themes.map(
  ({ words, ...theme }) => theme,
);
export const exerciseById = new Map(exercises.map((item) => [item.id, item]));
const versionedExercises = new Map(
  [...expansion.items, ...workshop.items, ...action.items, ...exercises].map(
    (item) => [
      `${item.id}@${(item as PrivateExercise).version ?? 1}`,
      item as PrivateExercise,
    ],
  ),
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
    passage,
    punctuationTokens,
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
    passage,
    punctuationTokens,
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
  if (
    exercise.type === "sort" ||
    exercise.type === "repair" ||
    exercise.type === "evidence"
  ) {
    const canonical = structuredCanonical(exercise, answer);
    return canonical !== null && exercise.answers.includes(canonical);
  }
  if (exercise.type === "order" && exercise.punctuationTokens)
    return exercise.answers.some(
      (a) =>
        structuredCanonical(exercise, a) ===
        structuredCanonical(exercise, answer),
    );
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
  if (
    item.type === "evidence" &&
    item.passage &&
    item.evidenceSolutions &&
    Array.isArray(answer)
  ) {
    const expected = item.evidenceSolutions[0];
    return {
      details: [
        {
          label: "原文依据",
          submitted:
            item.passage.find((s) => s.id === answer[0])?.text ?? "未选择",
          expected: item.passage.find((s) => s.id === expected.sentenceId)!
            .text,
          correct: item.evidenceSolutions.some(
            (s) => s.sentenceId === answer[0],
          ),
        },
        {
          label: "问题答案",
          submitted: answer[1],
          expected: expected.answer,
          correct: item.evidenceSolutions.some(
            (s) => normalise(s.answer) === normalise(answer[1]),
          ),
        },
      ],
      correctedSentence: item.solutionSentences?.[0],
    };
  }
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
