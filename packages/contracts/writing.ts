export interface WritingPrompt {
  id: string;
  version: number;
  grade: number;
  title: string;
  description: string;
  sections: { id: string; title: string; guidance: string; starter: string }[];
  checklist: { id: string; label: string }[];
  lessonIds: string[];
}
export interface WritingContent {
  title: string;
  plan: string;
  paragraphs: string[];
  checks: string[];
}
export interface WritingDraft extends WritingContent {
  id: string;
  childId: string;
  prompt: WritingPrompt;
  revision: number;
  createdAt: number;
  updatedAt: number;
}
export interface WritingSummary {
  id: string;
  title: string;
  promptId: string;
  promptTitle: string;
  revision: number;
  updatedAt: number;
  checks: number;
}
export interface WritingReceipt {
  saved: true;
  draftId: string;
  requestId: string;
  revision: number;
  checks: string[];
  replayed: boolean;
}
