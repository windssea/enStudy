export type Category =
  "grammar" | "tense" | "forms" | "patterns" | "vocabulary" | "reading";
export type Answer = string | string[];
export interface Exercise {
  id: string;
  category: Category;
  title: string;
  prompt: string;
  context: string;
  type: "choice" | "input" | "order";
  choices?: string[];
  tokens?: string[];
  gradeMin: number;
  reading?: string;
  audioText?: string;
}
export interface LearningSession {
  id: string;
  leaseId: string;
  assignmentId: string;
  exercise: Exercise;
  hintLevel: number;
  position?: number;
  total?: number;
  lessonId?: string | null;
  source?: "lesson" | "topic" | "review" | "single";
}
export interface TeachingCard {
  title: string;
  rule: string;
  example: string;
  translation: string;
}
export interface CourseLesson {
  id: string;
  unitId: string;
  unitTitle?: string;
  grade: number;
  term: string;
  title: string;
  subtitle: string;
  minutes: number;
  order: number;
  cards: TeachingCard[];
  vocabulary: { word: string; meaning: string }[];
  task: string;
  topicIds: string[];
  itemCount: number;
}
export interface TopicStats {
  items: number;
  families: number;
  roundSizes: number[];
  mode: string;
}
export interface SessionResult {
  sessionId: string;
  lessonId: string | null;
  total: number;
  correct: number;
  independent: number;
  completedAt: number;
}
export interface LearningSummary {
  completedLessons: {
    lessonId: string;
    completedAt: number;
    runs: number;
    bestIndependent: number;
    total: number;
  }[];
  dueCount: number;
  recent: SessionResult[];
}
export interface Receipt {
  eventId: string;
  outcome: "correct" | "incorrect" | "hinted";
  independentEvidence: boolean;
  feedback: string;
  nextReviewDay: string;
  rewardDelta: number;
  serverSequence: number;
}
export interface Identity {
  authenticated: boolean;
  developmentIdentityAvailable: boolean;
  registrationOpen?: boolean;
  adult?: { username: string; householdId: string };
  child?: { id: string; nickname: string; grade: number; householdId: string };
}
export interface ChildProfile {
  id: string;
  nickname: string;
  grade: number;
}
export interface Progress {
  answered: number;
  correct: number;
  stars: number;
  cards: {
    skillId: string;
    label: string;
    stage: number;
    dueAt: number;
    lapses: number;
  }[];
  recent: { outcome: string; receivedAt: number }[];
}
export interface Catalog {
  release: string;
  units: Record<string, string>[];
  topics: Record<string, string>[];
  patterns: Record<string, string>[];
}
