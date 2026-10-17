export type Category =
  "grammar" | "tense" | "forms" | "patterns" | "vocabulary" | "reading";
export type Answer = string | string[];
export interface Workshop {
  id: string;
  title: string;
  grade: number;
  description: string;
  rule: string;
  counts: { sort: number; repair: number };
  items: number;
}
export interface Exercise {
  id: string;
  category: Category;
  title: string;
  prompt: string;
  context: string;
  type:
    "choice" | "input" | "order" | "sort" | "repair" | "listen" | "evidence";
  choices?: string[];
  tokens?: string[];
  gradeMin: number;
  reading?: string;
  audioText?: string;
  passage?: { id: string; text: string }[];
  punctuationTokens?: boolean;
  sorting?: {
    cards: { id: string; text: string }[];
    groups: { id: string; label: string }[];
  };
  editing?: { parts: { id: string; text: string }[] };
}
export interface LearningSession {
  id: string;
  leaseId: string | null;
  leaseVersion: number;
  access: "owner" | "takeover-required" | "ended";
  state: "active" | "completed" | "paused" | "replaced";
  assignmentId: string;
  exercise: Exercise;
  hintLevel: number;
  listening?: { heard: boolean; textSupport: boolean };
  position?: number;
  total?: number;
  lessonId?: string | null;
  source?:
    | "lesson"
    | "topic"
    | "pattern"
    | "vocabulary"
    | "workshop"
    | "review"
    | "single";
  training?: {
    cycleId: string;
    topicId: string;
    phase: import("../domain/training").TrainingPhase;
    checkpoint: number;
  };
}
export interface TrainingCycle {
  id: string;
  topicId: string;
  title: string;
  version: number;
  planVersion: number;
  scope: "new-frame" | "new-lexeme";
  finished: boolean;
  results: import("../domain/training").TrainingResult[];
  coaching: { rule: string; example: string; hinted: boolean }[];
  next: {
    phase: import("../domain/training").TrainingPhase;
    label: string;
    checkpoint: number;
    readyAt: number;
    size: number;
    sessionId: string | null;
    sessionState: string | null;
  };
}
export interface TeachingCard {
  title: string;
  rule: string;
  example: string;
  translation: string;
}
export interface CourseLesson {
  version?: number;
  releaseId?: string;
  unitNumber?: number;
  unitLesson?: number;
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
export interface PatternStats extends TopicStats {
  contexts: number;
}
export type WordMode =
  "mixed" | "meaning" | "spelling" | "context" | "listening";
export interface WordCard {
  id: string;
  word: string;
  meaning: string;
  example: string;
}
export interface WordTheme {
  id: string;
  grade: number;
  title: string;
  description: string;
  wordCount: number;
  items: number;
  modes: WordMode[];
}
export interface VocabularySummary {
  practisedWords: number;
  dueWords: number;
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
  details?: {
    label: string;
    submitted: string;
    expected: string;
    correct: boolean;
  }[];
  correctedSentence?: string;
  support?: "hint" | "example" | "transcript";
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
  adult?: {
    username: string;
    householdId: string;
    isAdmin: boolean;
    mustChangePassword: boolean;
  };
  child?: { id: string; nickname: string; grade: number; householdId: string };
}
export interface ManagedAccount {
  id: string;
  username: string;
  householdName: string;
  childCount: number;
  disabled: boolean;
  mustChangePassword: boolean;
  isAdmin: boolean;
  version: number;
  createdAt: number;
}
export interface ChildProfile {
  id: string;
  nickname: string;
  grade: number;
}
export interface AiConnectionSummary {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  policyUrl: string;
  version: number;
  hasKey: boolean;
  keySuffix: string;
  approved: boolean;
  tested: boolean;
  tokenParameter: "max_tokens" | "max_completion_tokens";
  instructionRole: "system" | "developer";
  capabilities: {
    text: "unknown" | "supported" | "error";
    asr: string;
    tts: string;
    realtime: string;
  };
}
export interface AiSettingsView {
  available: boolean;
  allowedHosts: string[];
  items: AiConnectionSummary[];
  settings: {
    connectionId: string | null;
    enabled: boolean;
    dailyCalls: number;
    dailyUnits: number;
    childCalls: number;
    version: number;
  };
  usage: { calls: number; units: number };
  day: string;
}
export interface AiExplanationResult {
  requestId: string;
  pending?: boolean;
  cached?: boolean;
  explanation?: {
    explanationChinese: string;
    exampleEnglish: string;
    exampleChinese: string;
  };
}
export interface Progress {
  answered: number;
  correct: number;
  stars: number;
  cards: {
    skillId: string;
    modality?: string;
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
