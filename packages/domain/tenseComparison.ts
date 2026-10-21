export type TimeReference = "past" | "present" | "future";
export type TimeAspect =
  "simple" | "continuous" | "perfect" | "perfect-continuous";
export const comparisonVersion = 1;
export const timeReferences = ["past", "present", "future"] as const;
export const referenceLabels = {
  past: "昨天 15:00",
  present: "现在 · 今天 15:00",
  future: "明天 15:00",
};
export type TenseComparisonRow = {
  id: string;
  reference: TimeReference;
  aspect: TimeAspect;
  name: string;
  before: string;
  verb: string;
  after: string;
  translation: string;
  focus: string;
  explanation: string;
  formula: string;
  advanced?: boolean;
};
export const tenseComparisonRows: TenseComparisonRow[] = [
  {
    id: "past.simple",
    reference: "past",
    aspect: "simple",
    name: "一般过去时",
    before: "I ",
    verb: "ate",
    after: " an apple at three yesterday.",
    translation: "昨天下午三点，我吃了一个苹果。",
    focus: "把过去的一次事件作为整体来讲",
    explanation:
      "告诉别人昨天发生了什么；这里不放大吃到一半的过程。图中的点概括整件事，不表示动作只花了一瞬间。",
    formula: "主语 + 动词过去式",
  },
  {
    id: "past.continuous",
    reference: "past",
    aspect: "continuous",
    name: "过去进行时",
    before: "At three yesterday, I ",
    verb: "was eating",
    after: " an apple.",
    translation: "昨天下午三点，我正在吃一个苹果。",
    focus: "昨天三点，动作正在进行",
    explanation: "把画面暂停在昨天15:00：那时已经开始吃，但还没吃完。",
    formula: "主语 + was / were + 动词-ing",
  },
  {
    id: "past.perfect",
    reference: "past",
    aspect: "perfect",
    name: "过去完成时",
    before: "By three yesterday, I ",
    verb: "had eaten",
    after: " an apple.",
    translation: "到昨天下午三点，我已经吃完了一个苹果。",
    focus: "在昨天三点之前，已经吃完",
    explanation:
      "先吃完，再到昨天15:00这个参照点。By表示“到……为止”；参照点也在过去。",
    formula: "主语 + had + 过去分词",
  },
  {
    id: "past.perfect-continuous",
    reference: "past",
    aspect: "perfect-continuous",
    name: "过去完成进行时",
    before: "At three yesterday, I ",
    verb: "had been eating",
    after: " an apple for two minutes.",
    translation: "昨天下午三点，我已经吃这个苹果两分钟了。",
    focus: "到昨天三点，已经持续吃了多久",
    explanation:
      "本情境设定14:58开始，15:00还在吃。强调此前持续的两分钟，不表示已经吃完。",
    formula: "主语 + had been + 动词-ing",
    advanced: true,
  },
  {
    id: "present.simple",
    reference: "present",
    aspect: "simple",
    name: "一般现在时",
    before: "I ",
    verb: "eat",
    after: " an apple every afternoon.",
    translation: "我每天下午吃一个苹果。",
    focus: "经常发生的习惯",
    explanation:
      "说的是每天下午的习惯；这句话没有说明我此刻是否在吃。换了习惯背景，不是在重述昨天那一次。",
    formula: "主语 + 动词原形 / 三单形式",
  },
  {
    id: "present.continuous",
    reference: "present",
    aspect: "continuous",
    name: "现在进行时",
    before: "I ",
    verb: "am eating",
    after: " an apple now.",
    translation: "我现在正在吃一个苹果。",
    focus: "现在，动作正在进行",
    explanation: "假设现在是今天15:00，画面停在这一刻：苹果还没吃完。",
    formula: "主语 + am / is / are + 动词-ing",
  },
  {
    id: "present.perfect",
    reference: "present",
    aspect: "perfect",
    name: "现在完成时",
    before: "I ",
    verb: "have just eaten",
    after: " an apple.",
    translation: "我刚刚吃完了一个苹果。",
    focus: "现在看到刚吃完的结果",
    explanation:
      "吃发生在现在之前，重点是现在已经吃过。这里不加yesterday这样的已结束过去时间。",
    formula: "主语 + have / has + 过去分词",
  },
  {
    id: "present.perfect-continuous",
    reference: "present",
    aspect: "perfect-continuous",
    name: "现在完成进行时",
    before: "I ",
    verb: "have been eating",
    after: " an apple for two minutes.",
    translation: "到现在，我已经吃这个苹果两分钟了。",
    focus: "从此前持续到现在，有多久",
    explanation: "本情境设定今天14:58开始，现在15:00还在吃；强调持续两分钟。",
    formula: "主语 + have / has been + 动词-ing",
    advanced: true,
  },
  {
    id: "future.simple",
    reference: "future",
    aspect: "simple",
    name: "一般将来时",
    before: "I ",
    verb: "will eat",
    after: " an apple at three tomorrow.",
    translation: "明天下午三点，我会吃一个苹果。",
    focus: "说明将来会做这件事",
    explanation:
      "站在现在，说明天15:00会发生什么。它是将来的安排或预测，不是已经发生的事实。",
    formula: "主语 + will + 动词原形",
  },
  {
    id: "future.continuous",
    reference: "future",
    aspect: "continuous",
    name: "将来进行时",
    before: "At three tomorrow, I ",
    verb: "will be eating",
    after: " an apple.",
    translation: "明天下午三点，我会在吃一个苹果。",
    focus: "想象明天三点时正在做什么",
    explanation: "把想象中的画面暂停在明天15:00，那时吃苹果的过程正在进行。",
    formula: "主语 + will be + 动词-ing",
    advanced: true,
  },
  {
    id: "future.perfect",
    reference: "future",
    aspect: "perfect",
    name: "将来完成时",
    before: "By three tomorrow, I ",
    verb: "will have eaten",
    after: " an apple.",
    translation: "到明天下午三点，我将已经吃完一个苹果。",
    focus: "到明天三点之前，就会吃完",
    explanation: "先站在现在作预测，再想象明天15:00回头看：那时已经吃完了。",
    formula: "主语 + will have + 过去分词",
    advanced: true,
  },
  {
    id: "future.perfect-continuous",
    reference: "future",
    aspect: "perfect-continuous",
    name: "将来完成进行时",
    before: "At three tomorrow, I ",
    verb: "will have been eating",
    after: " an apple for two minutes.",
    translation: "到明天下午三点，我就已经吃这个苹果两分钟了。",
    focus: "到明天三点，预计已持续多久",
    explanation:
      "情境设定明天14:58开始，15:00还在吃。预测的是持续时长，不是吃完的结果。",
    formula: "主语 + will have been + 动词-ing",
    advanced: true,
  },
];
export const comparisonSentence = (row: TenseComparisonRow) =>
  row.before + row.verb + row.after;
export const comparisonRowsFor = (reference: TimeReference | "all") =>
  reference === "all"
    ? tenseComparisonRows
    : tenseComparisonRows.filter((row) => row.reference === reference);
export const isTimeReference = (
  value: unknown,
): value is TimeReference | "all" =>
  value === "all" || timeReferences.some((key) => key === value);
/** Shared diagram geometry, all four rows use the same now/reference coordinates. */
export function comparisonGeometry(
  reference: TimeReference,
  aspect: TimeAspect,
) {
  const now = reference === "past" ? 430 : reference === "future" ? 55 : 270;
  const anchor =
    reference === "past" ? 180 : reference === "future" ? 340 : now;
  const start = anchor - (aspect === "perfect-continuous" ? 100 : 65);
  const end = aspect === "perfect" ? anchor - 25 : anchor + 45;
  return {
    now,
    anchor,
    start,
    end,
    habit: reference === "present" && aspect === "simple",
    predicted: reference === "future",
  };
}
