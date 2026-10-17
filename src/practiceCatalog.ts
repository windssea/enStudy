import type { PatternStats } from "../packages/contracts/index";

export type LibraryItem = {
  id: string;
  group: string;
  title: string;
  description: string;
  grade: number;
  available: boolean;
};
export type LibraryBrowse = {
  group: string | null;
  query: string;
  year: number;
  returnTo?: string;
};
export type LibraryGroup = {
  id: string;
  title: string;
  description: string;
  symbol: string;
};
export const topicGroups: LibraryGroup[] = [
  {
    id: "grammar",
    title: "语法小工坊",
    description: "给句子找到合适的词",
    symbol: "blocks",
  },
  {
    id: "tense",
    title: "时态探险",
    description: "分清现在、过去和将来",
    symbol: "clock",
  },
  {
    id: "forms",
    title: "单词变形工厂",
    description: "看看词尾怎样变",
    symbol: "change",
  },
  {
    id: "sentence",
    title: "句子积木",
    description: "把问句、句型搭起来",
    symbol: "sentence",
  },
  {
    id: "vocabulary",
    title: "词语小天地",
    description: "找词义、拼单词、看情景",
    symbol: "words",
  },
  {
    id: "phonics",
    title: "拼读文字准备",
    description: "先认字母和词形，听辨另练",
    symbol: "letters",
  },
  {
    id: "reading",
    title: "阅读小侦探",
    description: "用文字情景练习找线索",
    symbol: "search",
  },
  {
    id: "expression",
    title: "表达小练场",
    description: "先练句框，口语和写作另练",
    symbol: "talk",
  },
];
const patternDescriptions: Record<string, string> = {
  问候与礼貌: "见面、道谢和道别这样说",
  介绍与个人信息: "介绍自己，认识新朋友",
  描述与存在: "说说有什么、在哪里",
  喜好与愿望: "分享喜欢的事和小愿望",
  能力建议与规则: "说会做什么、该怎样做",
  请求与许可: "有礼貌地请人帮忙",
  邀请与建议: "邀请朋友，一起出主意",
  动词接续: "两个动作怎样连起来",
  介词与常用搭配: "给词语找到固定伙伴",
  时间与频率: "问问几点、多久一次",
  比较与程度: "比较大小，说明程度",
  原因条件与衔接: "把原因、条件说清楚",
};
export function patternGroups(rows: Record<string, string>[]): LibraryGroup[] {
  return [...new Set(rows.map((row) => row.cluster))].map((id) => ({
    id,
    title: id,
    description: patternDescriptions[id] ?? "把常用句式放进情景里",
    symbol: "talk",
  }));
}
export function topicItems(
  rows: Record<string, string>[],
  availability: Record<string, number>,
): LibraryItem[] {
  return rows.map((row) => ({
    id: row.topic_id,
    group: row.category,
    title: row.title,
    description:
      row.category === "phonics"
        ? "文字音形准备，听辨另练"
        : row.category === "expression"
          ? "句框文字练习，口语与写作另练"
          : "先试5题，再按小计划慢慢练",
    grade: Number(row.grade_min),
    available: Boolean(availability[row.topic_id]),
  }));
}
export function patternItems(
  rows: Record<string, string>[],
  stats: Record<string, PatternStats>,
): LibraryItem[] {
  return rows.map((row) => ({
    id: row.pattern_id,
    group: row.cluster,
    title: row.frame,
    description: row.slot_rule,
    grade: Number(row.grade_min),
    available: Boolean(stats[row.pattern_id]?.items),
  }));
}
export const gradeName = (grade: number) =>
  ["一", "二", "三", "四", "五", "六"][grade - 1] ?? String(grade);
