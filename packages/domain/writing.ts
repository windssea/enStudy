import type { WritingContent, WritingPrompt } from "../contracts/writing";
export const writingLimits = {
  drafts: 32,
  title: 80,
  plan: 800,
  paragraph: 1200,
} as const;
export const writingPrompts: readonly WritingPrompt[] = [
  {
    id: "writing.p1.picture-book",
    version: 1,
    grade: 1,
    title: "我的图画小册",
    description:
      "想象三幅图，给每幅配一个词或一句介绍。可以先指图、说中文，再试着写英文；这里保存文字，画图可在纸上完成。",
    sections: [
      {
        id: "picture",
        title: "第一幅：这是什么",
        guidance: "选一个自己会说的玩具或动物词，写一个词也可以。",
        starter: "This is a …",
      },
      {
        id: "detail",
        title: "第二幅：有什么特点",
        guidance: "可以写颜色或大小。不用复制句框，也可以用自己的句子。",
        starter: "It is …",
      },
      {
        id: "ending",
        title: "第三幅：我想介绍它",
        guidance: "说一件模型会做的事，或再介绍一件作品。",
        starter: "My toy can …",
      },
    ],
    checklist: [
      { id: "meaning", label: "我能用中文或指图说明自己写的意思。" },
      { id: "words", label: "我检查了想写的词；需要帮助的地方可以留着问。" },
      { id: "privacy", label: "我用了虚构图画，没有填写家庭地址或联系方式。" },
    ],
    lessonIds: ["P1B-U06-L1", "P1B-U06-L2", "P1B-U06-L3", "P1B-U06-L4"],
  },
  {
    id: "writing.p2.weekend",
    version: 1,
    grade: 2,
    title: "我的周末图鉴",
    description:
      "为虚构角色写三条周末配文。可以每格一句，也可以多写一点。没有固定标准答案。",
    sections: [
      {
        id: "routine",
        title: "平时的周末",
        guidance: "介绍角色通常做什么，留意主语和动词。",
        starter: "On Saturdays, …",
      },
      {
        id: "ability",
        title: "会做的一件事",
        guidance: "介绍角色的一项能力。不把这道练习当成对你本人能力的排名。",
        starter: "My character can …",
      },
      {
        id: "now",
        title: "现在的一张图",
        guidance: "想象角色此刻正在做什么，与平时日常分开。",
        starter: "Now, … is …",
      },
    ],
    checklist: [
      { id: "time", label: "我分清了平时做的事和此刻的动作。" },
      { id: "verbs", label: "我读回句子，检查了主语和动词。" },
      {
        id: "meaning",
        label: "配文能说明我想象的图画，不需要别人猜额外信息。",
      },
    ],
    lessonIds: ["P2B-U06-L1", "P2B-U06-L2", "P2B-U06-L3", "P2B-U06-L4"],
  },
  {
    id: "writing.p3.invitation",
    version: 1,
    grade: 3,
    title: "一张纸上邀请卡",
    description:
      "为虚构的校园展览写邀请，不会发送给任何人。写清活动、时间、地点，也允许别人拒绝。",
    sections: [
      {
        id: "event",
        title: "邀请参加什么",
        guidance: "介绍活动，用自己的话发出礼貌邀请。",
        starter: "Would you like to …?",
      },
      {
        id: "details",
        title: "时间和地点",
        guidance: "只用虚构教室与时间，不写真实家庭地址或电话。",
        starter: "The … is in … on … at …",
      },
      {
        id: "reply",
        title: "怎样回复",
        guidance: "礼貌询问是否愿意参加，不把没有回复当作同意。",
        starter: "Please reply by …",
      },
    ],
    checklist: [
      { id: "details", label: "活动、时间、地点都写清楚了。" },
      { id: "polite", label: "邀请是礼貌的，对方可以拒绝。" },
      { id: "privacy", label: "只用了虚构信息，并检查了拼写。" },
    ],
    lessonIds: ["P3B-U06-L1", "P3B-U06-L2", "P3B-U06-L3", "P3B-U06-L4"],
  },
  {
    id: "writing.p4.story-letter",
    version: 1,
    grade: 4,
    title: "有过去和计划的故事短信",
    description:
      "给虚构朋友写一封三段短信：过去的经历、现在的情况、之后的计划。不实际发送。",
    sections: [
      {
        id: "past",
        title: "第一段：发生过的事",
        guidance: "交代过去时间和一件已经结束的事。",
        starter: "Dear …, Yesterday, …",
      },
      {
        id: "now",
        title: "第二段：现在的情况",
        guidance: "说清此刻正在做什么，可补一个相关细节。",
        starter: "Now, we are …",
      },
      {
        id: "plan",
        title: "第三段：之后的计划",
        guidance: "计划还没完成，可以调整。写一句友好的结尾。",
        starter: "We are going to …",
      },
    ],
    checklist: [
      { id: "time", label: "过去、现在和未来计划的时间线清楚。" },
      { id: "verbs", label: "我读回句子，检查了动词形式和标点。" },
      { id: "meaning", label: "每段都与故事有关，不把计划说成已完成。" },
    ],
    lessonIds: ["P4B-U06-L1", "P4B-U06-L2", "P4B-U06-L3", "P4B-U06-L4"],
  },
  {
    id: "writing.p5.opinion",
    version: 1,
    grade: 5,
    title: "我的观点小报",
    description:
      "为一个虚构校园方案写三段短文。明确表达观点，用给出的或自己设定的虚构记录支持它，允许不同看法。",
    sections: [
      {
        id: "topic",
        title: "第一段：我的观点",
        guidance: "选一个具体方案，如图书角或词卡盒，说明你想建议什么。",
        starter: "I think … would be useful.",
      },
      {
        id: "evidence",
        title: "第二段：理由与依据",
        guidance: "给出相关理由；若编一条小调查，要写清只涉及哪些虚构人物。",
        starter: "One reason is … / In our pretend trial, …",
      },
      {
        id: "conclusion",
        title: "第三段：有限的结尾",
        guidance: "结论应与依据相符，可以提出下一步试验，不说所有人都同意。",
        starter: "We could … before deciding.",
      },
    ],
    checklist: [
      { id: "topic", label: "主题句和整段讨论的是同一个方案。" },
      { id: "scope", label: "理由相关，结论没有超出记录的范围。" },
      { id: "revision", label: "我检查了连接词、动词、拼写和标点。" },
    ],
    lessonIds: ["P5B-U06-L1", "P5B-U06-L2", "P5B-U06-L3", "P5B-U06-L4"],
  },
  {
    id: "writing.p6.project",
    version: 1,
    grade: 6,
    title: "我的英语主题项目",
    description:
      "保存一篇真正由你填写的三段作品。可以从一个虚构模型或纸上研究开始；不要求写个人隐私，也没有自动的语法分数。",
    sections: [
      {
        id: "introduction",
        title: "第一段：介绍主题",
        guidance: "让读者知道主题是什么，为什么值得介绍。",
        starter: "This project is about …",
      },
      {
        id: "details",
        title: "第二段：细节和依据",
        guidance: "给两条清楚的细节，区分记录、猜测和个人看法。",
        starter: "The notes show … / For example, …",
      },
      {
        id: "ending",
        title: "第三段：总结与后续",
        guidance: "回扣主题，写出仍不确定的事或下一步计划，不扩大结论。",
        starter: "We have learned … / Next, we could …",
      },
    ],
    checklist: [
      { id: "structure", label: "三段各有作用，标题与内容一致。" },
      { id: "evidence", label: "事实、观点和计划分清，结论有相应依据。" },
      { id: "revision", label: "我读回全文并检查时间、指代、拼写和标点。" },
    ],
    lessonIds: [
      "P6B-U05-L1",
      "P6B-U05-L2",
      "P6B-U05-L3",
      "P6B-U05-L4",
      "P6B-U06-L4",
    ],
  },
];
export const writingPrompt = (id: string) =>
  writingPrompts.find((p) => p.id === id);
export const writingForLesson = (id: string) =>
  writingPrompts.find((p) => p.lessonIds.includes(id));
export function blankWriting(prompt: WritingPrompt): WritingContent {
  return {
    title: "",
    plan: "",
    paragraphs: prompt.sections.map(() => ""),
    checks: [],
  };
}
const text = (value: unknown, limit: number) =>
  typeof value === "string" &&
  value.length <= limit &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
export function writingContent(
  value: unknown,
  prompt: WritingPrompt,
): WritingContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    !text(v.title, writingLimits.title) ||
    !text(v.plan, writingLimits.plan) ||
    !Array.isArray(v.paragraphs) ||
    v.paragraphs.length !== prompt.sections.length ||
    v.paragraphs.some((p) => !text(p, writingLimits.paragraph)) ||
    !Array.isArray(v.checks) ||
    v.checks.length > prompt.checklist.length ||
    v.checks.some(
      (c) => typeof c !== "string" || !prompt.checklist.some((x) => x.id === c),
    ) ||
    new Set(v.checks).size !== v.checks.length
  )
    return null;
  if (v.checks.length && v.paragraphs.every((p: string) => !p.trim()))
    return null;
  return {
    title: v.title as string,
    plan: v.plan as string,
    paragraphs: v.paragraphs as string[],
    checks: [...(v.checks as string[])].sort(),
  };
}
export const sameWritingText = (a: WritingContent, b: WritingContent) =>
  a.title === b.title &&
  a.plan === b.plan &&
  JSON.stringify(a.paragraphs) === JSON.stringify(b.paragraphs);
export const sameWriting = (a: WritingContent, b: WritingContent) =>
  sameWritingText(a, b) &&
  JSON.stringify([...a.checks].sort()) === JSON.stringify([...b.checks].sort());
export const writingSaveResult = (
  sent: WritingContent,
  live: WritingContent,
  checks: string[],
) => {
  const saved = { ...sent, checks };
  return { saved, content: sameWriting(sent, live) ? saved : live };
};
export const writingText = (p: WritingPrompt, c: WritingContent) =>
  [c.title || p.title, ...c.paragraphs, "", "中文提纲（可选）：", c.plan].join(
    "\n\n",
  );
