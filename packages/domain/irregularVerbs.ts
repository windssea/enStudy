export const irregularVersion = 1;
export const irregularGroups = {
  all: "全部变形",
  AAA: "三形相同",
  ABB: "过去式＝过去分词",
  ABA: "原形＝过去分词",
  ABC: "三形不同",
} as const;
export type IrregularGroup = keyof typeof irregularGroups;
export const irregularTopics = [
  {
    id: "forms.irregular-past.core",
    title: "不规则过去式 · 常用30词",
    skill: "morphology.verb.irregular-past",
    dimension: "常用动词的过去式与句中应用",
  },
  {
    id: "forms.irregular-past.extended",
    title: "不规则过去式 · 进阶30词",
    skill: "morphology.verb.irregular-past",
    dimension: "更多动词的过去式与句中应用",
  },
  {
    id: "forms.irregular-past.did",
    title: "did / didn't 后用原形",
    skill: "grammar.past-simple",
    dimension: "过去问句与否定句还原动词",
  },
  {
    id: "forms.irregular-past.participle",
    title: "过去式还是过去分词 · 拓展",
    skill: "morphology.verb.past-participle",
    dimension: "区分动词三形，不把过去分词当作时态",
  },
] as const;
// Original contexts. Reference forms: Cambridge English Grammar Today and
// British Council irregular-verb tables. British English is the display form.
const rows = [
  ["go", "went", "gone", "去", "to the park"],
  ["come", "came", "come", "来", "to my house"],
  ["see", "saw", "seen", "看见", "a kite"],
  ["eat", "ate", "eaten", "吃", "a pear"],
  ["drink", "drank", "drunk", "喝", "some juice"],
  ["take", "took", "taken", "拿；拍摄", "a photo"],
  ["give", "gave", "given", "给", "Ben a pencil"],
  ["make", "made", "made", "制作", "a paper boat"],
  ["get", "got", "got", "得到", "a new cap"],
  ["have", "had", "had", "有；吃", "breakfast"],
  ["do", "did", "done", "做", "my homework"],
  ["say", "said", "said", "说", "hello"],
  ["tell", "told", "told", "告诉；讲述", "a story"],
  ["buy", "bought", "bought", "买", "a notebook"],
  ["bring", "brought", "brought", "带来", "my lunch"],
  ["find", "found", "found", "找到", "a coin"],
  ["think", "thought", "thought", "想", "about the game"],
  ["know", "knew", "known", "知道", "the answer"],
  ["write", "wrote", "written", "写", "a postcard"],
  ["read", "read", "read", "读", "a comic"],
  ["run", "ran", "run", "跑", "in the park"],
  ["swim", "swam", "swum", "游泳", "in the pool"],
  ["sing", "sang", "sung", "唱", "a song"],
  ["sit", "sat", "sat", "坐", "on the bench"],
  ["stand", "stood", "stood", "站", "by the door"],
  ["sleep", "slept", "slept", "睡", "well"],
  ["meet", "met", "met", "见面", "my cousin"],
  ["put", "put", "put", "放", "a book on the desk"],
  ["cut", "cut", "cut", "剪；切", "some paper"],
  ["let", "let", "let", "让", "Ben use my pen"],
  ["begin", "began", "begun", "开始", "the game"],
  ["break", "broke", "broken", "弄坏", "a toy"],
  ["choose", "chose", "chosen", "选择", "a blue shirt"],
  ["draw", "drew", "drawn", "画", "a dragon"],
  ["feed", "fed", "fed", "喂", "the ducks"],
  ["fall", "fell", "fallen", "落下；进入某种状态", "asleep early"],
  ["feel", "felt", "felt", "感觉", "happy"],
  ["fly", "flew", "flown", "飞；放飞", "a kite"],
  ["forget", "forgot", "forgotten", "忘记", "my lunch box"],
  ["grow", "grew", "grown", "种植；生长", "some beans"],
  ["hear", "heard", "heard", "听见", "a bell"],
  ["hold", "held", "held", "拿着", "a balloon"],
  ["keep", "kept", "kept", "保持；遵守", "my promise"],
  ["leave", "left", "left", "离开；留下", "my keys at home"],
  ["lose", "lost", "lost", "丢失", "a glove"],
  ["pay", "paid", "paid", "付款", "for the snack"],
  ["ride", "rode", "ridden", "骑", "my bike"],
  ["ring", "rang", "rung", "使铃响", "the bell"],
  ["sell", "sold", "sold", "卖", "an old comic"],
  ["send", "sent", "sent", "寄；发送", "a card"],
  ["speak", "spoke", "spoken", "说某种语言", "English"],
  ["spend", "spent", "spent", "花费", "an hour at the library"],
  ["teach", "taught", "taught", "教", "my sister a song"],
  ["throw", "threw", "thrown", "扔", "a ball"],
  ["understand", "understood", "understood", "理解", "the question"],
  ["wake", "woke", "woken", "醒来", "up early"],
  ["wear", "wore", "worn", "穿；戴", "a cap"],
  ["win", "won", "won", "赢", "the race"],
  ["build", "built", "built", "建造", "a tower"],
  ["catch", "caught", "caught", "接住；抓住", "a ball"],
] as const;
export const irregularVerbs = rows.map(
  ([base, past, participle, meaning, complement], index) => ({
    base,
    past,
    participle,
    meaning,
    complement,
    level: index < 30 ? "core" : "extended",
    group: (base === past && past === participle
      ? "AAA"
      : past === participle
        ? "ABB"
        : base === participle
          ? "ABA"
          : "ABC") as IrregularGroup,
    note:
      base === "read"
        ? "原形读 /riːd/；过去式和过去分词读 /red/。"
        : base === "get"
          ? "英式英语用 got；美式英语也常用过去分词 gotten。"
          : "",
    participleAlternatives: base === "get" ? ["gotten"] : [],
    time: base === "grow" ? "last spring" : "yesterday",
  }),
);
export type IrregularScope = "all" | "core" | "extended";
export function irregularPage(
  group: IrregularGroup,
  page: number,
  scope: IrregularScope = "all",
) {
  const words = irregularVerbs.filter(
    (w) =>
      (scope === "all" || w.level === scope) &&
      (group === "all" || w.group === group),
  );
  return {
    words: words.slice(page * 10, page * 10 + 10),
    total: words.length,
    pages: Math.ceil(words.length / 10),
  };
}
export function grade4PracticeTopics(
  lessonId: string,
): { id: string; title: string }[] {
  if (/^P4A-U01-/.test(lessonId))
    return [{ id: "tense.present-simple", title: "一般现在时" }];
  if (/^P4A-U02-/.test(lessonId))
    return [{ id: "tense.past-simple", title: "一般过去时" }];
  if (/^P4A-U03-/.test(lessonId))
    return [
      { id: "forms.regular-past", title: "规则动词过去式" },
      irregularTopics[0],
    ];
  if (/^P4A-U04-/.test(lessonId)) return irregularTopics.slice(0, 2);
  if (/^P4B-U02-/.test(lessonId)) return [irregularTopics[2]];
  if (/^P4B-U05-/.test(lessonId))
    return [{ id: "tense.future", title: "will与going to" }];
  if (/^P4B-U06-/.test(lessonId))
    return [irregularTopics[0], irregularTopics[2]];
  return [];
}
export const irregularExamples = [
  "I went to the park yesterday.",
  "I didn't go to the park yesterday.",
  "Did you go to the park yesterday?",
];
