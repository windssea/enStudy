export interface WritingReview {
  encouragementChinese: string;
  observations: {
    quote: string;
    suggestionEnglish: string;
    reasonChinese: string;
  }[];
  nextStepChinese: string;
}
export interface WritingReviewResult {
  requestId: string;
  pending?: boolean;
  cached?: boolean;
  draftId: string;
  revision: number;
  section: number;
  review?: WritingReview;
}
export interface WritingReviewStatus {
  enabled: boolean;
  remaining: number;
  connectionLabel: string | null;
  providerHost: string | null;
}
export interface WritingReviewSettings {
  connectionId: string | null;
  enabled: boolean;
  version: number;
}
