export type Category = "grammar" | "tense" | "forms" | "patterns";
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
}
export interface LearningSession {
  id: string;
  leaseId: string;
  assignmentId: string;
  exercise: Exercise;
  hintLevel: number;
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
  child?: { id: string; nickname: string; grade: number; householdId: string };
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
