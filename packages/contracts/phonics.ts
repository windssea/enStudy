export interface PhonicsWord {
  id: string;
  word: string;
  meaning: string;
  tiles: string[];
  groups: number[][];
  focus: number[];
  audioUrl: string;
}
export interface PhonicsStage {
  id: string;
  title: string;
  grade: number;
  kind: "sound" | "meaning";
  topicId: string;
  rule: string;
  focus: string;
  demos: PhonicsWord[];
  items: number;
  families: number;
  roundSizes: number[];
}
