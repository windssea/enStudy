import type { Category, Exercise, Receipt } from "./index";
export const mistakeKinds = ["incorrect", "hinted", "all"] as const;
export type MistakeKind = (typeof mistakeKinds)[number];
export interface MistakeEntry {
  eventId: string;
  savedAt: number;
  title: string;
  category: Category;
  type: Exercise["type"];
  outcome: "incorrect" | "hinted";
  available: boolean;
}
export interface MistakePage {
  childId: string;
  snapshotSequence: number;
  nextBefore: number | null;
  items: MistakeEntry[];
}
export interface MistakeDetail {
  childId: string;
  eventId: string;
  exercise: Exercise;
  itemVersion: number;
  retryVersion: number | null;
  currentTeaching: {
    prompt: string;
    context?: string;
    feedback: string;
  } | null;
  savedAt: number;
  outcome: "incorrect" | "hinted";
  submitted: string | null;
  reference: string | null;
  feedback: string;
  details: Receipt["details"];
}
