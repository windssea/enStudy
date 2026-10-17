export const conversationScenes = [
  {
    id: "likes",
    title: "野餐点单",
    grade: 1,
    promptEnglish: "What fruit do you like?",
    promptChinese: "你喜欢什么水果？扮演小熊，用简单句回答。",
    words: ["fruit", "apple", "banana", "orange", "like", "eat", "food"],
    starters: ["I like apples.", "I like bananas.", "I don't like oranges."],
  },
  {
    id: "abilities",
    title: "技能小舞台",
    grade: 2,
    promptEnglish: "Can you ride a bike?",
    promptChinese: "扮演小狐狸，说说能做什么。",
    words: ["can", "swim", "ride", "bike", "sing", "dance", "draw", "play"],
    starters: ["Yes, I can.", "I can draw a cat.", "I can't swim yet."],
  },
  {
    id: "routine",
    title: "小兔的一天",
    grade: 3,
    promptEnglish: "What do you do after school?",
    promptChinese: "扮演小兔，聊聊放学后的活动，不说真实学校或住址。",
    words: [
      "school",
      "play",
      "read",
      "homework",
      "usually",
      "often",
      "day",
      "after",
    ],
    starters: [
      "I often read a book.",
      "I play after school.",
      "I do my homework.",
    ],
  },
  {
    id: "weekend",
    title: "周末故事盒",
    grade: 4,
    promptEnglish: "What did you do last weekend?",
    promptChinese: "用虚构的周末故事练习过去的表达。",
    words: [
      "weekend",
      "was",
      "were",
      "did",
      "played",
      "went",
      "visited",
      "yesterday",
      "last",
    ],
    starters: ["I played in the park.", "I was happy.", "I visited a museum."],
  },
  {
    id: "plans",
    title: "明天的小计划",
    grade: 5,
    promptEnglish: "What are you going to do tomorrow?",
    promptChinese: "给森林朋友设计明天的活动，可以用going to。",
    words: [
      "tomorrow",
      "going",
      "will",
      "plan",
      "play",
      "read",
      "walk",
      "visit",
    ],
    starters: [
      "I am going to read.",
      "I will take a walk.",
      "I am going to play.",
    ],
  },
  {
    id: "experiences",
    title: "探险家的经历",
    grade: 6,
    promptEnglish: "Have you ever seen a rainbow?",
    promptChinese: "扮演探险家，分享虚构经历；不用说个人隐私。",
    words: [
      "ever",
      "never",
      "have",
      "has",
      "seen",
      "been",
      "visited",
      "experience",
      "rainbow",
    ],
    starters: [
      "Yes, I have.",
      "I have never seen snow.",
      "I saw a rainbow yesterday.",
    ],
  },
];
export interface DialogueReply {
  replyEnglish: string;
  meaningChinese: string;
  hintChinese: string;
}
const unsuitable =
  /https?:|www\.|[<>]|\b(?:porn|suicide|fuck|kill yourself)\b|自杀|色情|裸照|性交|杀死|银行卡|身份证|加我微信|(?:api[_ -]?key|密钥)\s*[:：]/i;
const privateData =
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d[\d ()+-]{6,}\d|my (?:real )?name is|我的(?:真实)?姓名|我叫|(?:my|our) (?:home |school )?address|住址|学校叫/i;
export function learnerText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 320 &&
    !unsuitable.test(value) &&
    !privateData.test(value) &&
    !/[\u0000-\u001f]/.test(value)
  );
}
export function parseDialogue(
  raw: string,
  scene: (typeof conversationScenes)[number],
): DialogueReply {
  const value = JSON.parse(
    raw.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, "$1"),
  );
  if (
    !value ||
    Object.keys(value).sort().join(",") !==
      "hintChinese,meaningChinese,replyEnglish" ||
    !["replyEnglish", "meaningChinese", "hintChinese"].every(
      (key) =>
        typeof value[key] === "string" &&
        value[key].trim().length > 0 &&
        value[key].length <= (key === "replyEnglish" ? 180 : 220) &&
        !unsuitable.test(value[key]) &&
        !privateData.test(value[key]) &&
        !/[\u0000-\u001f]/.test(value[key]),
    ) ||
    !/^[\x20-\x7e‘’“”]+$/.test(value.replyEnglish) ||
    !/[\u4e00-\u9fff]/.test(value.meaningChinese) ||
    !/[\u4e00-\u9fff]/.test(value.hintChinese) ||
    !scene.words.some((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(value.replyEnglish),
    )
  )
    throw new Error("AI回复没有通过本次练习检查。");
  return value;
}
