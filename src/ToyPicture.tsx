import LearningIcon from "./LearningIcon";
export type ToyKind =
  | "home"
  | "map"
  | "words"
  | "topics"
  | "patterns"
  | "review"
  | "parent"
  | "play"
  | "check"
  | "next"
  | "help"
  | "wave"
  | "clock"
  | "search"
  | "change"
  | "speaker";
const icons: Record<ToyKind, string> = {
  home: "home",
  map: "book",
  words: "words",
  topics: "topics",
  patterns: "patterns",
  review: "review",
  parent: "person",
  play: "play",
  check: "check",
  next: "arrow",
  help: "help",
  wave: "person",
  clock: "clock",
  search: "search",
  change: "change",
  speaker: "speaker",
};
/** Compatibility name for the shared semantic icon set. */
export default function ToyPicture({ kind }: { kind: ToyKind }) {
  return <LearningIcon kind={icons[kind]} />;
}
