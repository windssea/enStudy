import {
  ArrowLeftRight,
  ArrowRight,
  AudioLines,
  BookA,
  BookOpen,
  Box,
  Check,
  CircleQuestionMark,
  Clock,
  History,
  House,
  LayoutGrid,
  MessageSquareText,
  Mic,
  MonitorCheck,
  PencilLine,
  Play,
  Search,
  UserRound,
  Volume2,
  type LucideIcon,
} from "lucide-react";
const icons: Record<string, LucideIcon> = {
  home: House,
  book: BookOpen,
  words: BookA,
  topics: LayoutGrid,
  patterns: MessageSquareText,
  review: History,
  phonics: AudioLines,
  writing: PencilLine,
  talk: Mic,
  workshops: Box,
  offline: MonitorCheck,
  play: Play,
  arrow: ArrowRight,
  speaker: Volume2,
  person: UserRound,
  check: Check,
  help: CircleQuestionMark,
  clock: Clock,
  search: Search,
  change: ArrowLeftRight,
};
/** One pinned icon source behind the existing semantic API. */
export default function LearningIcon({ kind = "book" }: { kind?: string }) {
  const Icon = icons[kind] ?? BookOpen;
  return (
    <Icon
      className="learning-icon"
      size={24}
      strokeWidth={1.7}
      aria-hidden="true"
      focusable="false"
      fill={kind === "play" ? "currentColor" : "none"}
    />
  );
}
