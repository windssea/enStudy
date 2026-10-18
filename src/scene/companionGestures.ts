/** Decorative play only. These actions never represent an assessment result. */
export const companionGestures = [
  { id: "blink", label: "眨眨眼", duration: 650, line: "眨眨眼，放松一下。" },
  { id: "wave", label: "挥挥手", duration: 900, line: "Hello! 一起慢慢来。" },
  { id: "nod", label: "点点头", duration: 1300, line: "先想一想，再慢慢试。" },
  {
    id: "stretch",
    label: "伸个懒腰",
    duration: 1700,
    line: "休息一下，也照顾好自己。",
  },
  {
    id: "tail",
    label: "摇摇尾巴",
    duration: 1500,
    line: "准备好啦，接着去探险吧。",
  },
] as const;
export type CompanionGesture = (typeof companionGestures)[number]["id"];
export function companionGesture(id: CompanionGesture) {
  return companionGestures.find((gesture) => gesture.id === id)!;
}
export function gestureEnvelope(age: number, seconds: number) {
  if (!Number.isFinite(age) || age <= 0 || age >= seconds) return 0;
  return Math.sin((Math.PI * age) / seconds) ** 2;
}
