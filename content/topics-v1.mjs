// Original, constrained text practice. No AI-generated answer keys at runtime.
// A fact produces recognition and written-recall variants of the SAME family.
const bank = new Map();
export function add(topic, prompt, answer, wrong, rule, options = {}) {
  const facts = bank.get(topic) ?? [];
  facts.push({ prompt, answer, wrong, rule, ...options });
  bank.set(topic, facts);
}
const names = [
  "Mia",
  "Ben",
  "Amy",
  "Tom",
  "Lily",
  "Sam",
  "Eva",
  "Leo",
  "May",
  "Jack",
  "Ruby",
  "Max",
];
const activities = [
  ["play", "plays", "played", "playing", "played", "football", "踢足球"],
  ["read", "reads", "read", "reading", "read", "a story", "读故事"],
  ["draw", "draws", "drew", "drawing", "drawn", "a picture", "画画"],
  ["make", "makes", "made", "making", "made", "a cake", "做蛋糕"],
  ["write", "writes", "wrote", "writing", "written", "a letter", "写信"],
  ["eat", "eats", "ate", "eating", "eaten", "an apple", "吃苹果"],
  ["drink", "drinks", "drank", "drinking", "drunk", "some water", "喝水"],
  ["watch", "watches", "watched", "watching", "watched", "a film", "看电影"],
  ["wash", "washes", "washed", "washing", "washed", "the cups", "洗杯子"],
  ["clean", "cleans", "cleaned", "cleaning", "cleaned", "the room", "打扫房间"],
  ["build", "builds", "built", "building", "built", "a model", "搭模型"],
  ["take", "takes", "took", "taking", "taken", "a photo", "拍照"],
];
const places = [
  "park",
  "school",
  "library",
  "garden",
  "museum",
  "zoo",
  "shop",
  "pool",
  "farm",
  "beach",
  "station",
  "playground",
];
const objects = [
  "book",
  "bag",
  "pencil",
  "kite",
  "ball",
  "toy",
  "hat",
  "cup",
  "box",
  "card",
  "pen",
  "bike",
];
const attributes = [
  "happy",
  "kind",
  "busy",
  "ready",
  "quiet",
  "tired",
  "helpful",
  "careful",
  "friendly",
  "polite",
  "brave",
  "excited",
];
const fact = (topic, prompt, answer, wrong, rule, options) =>
  add(topic, prompt, answer, wrong, rule, options);
const loop = (topic, templates) => {
  for (let t = 0; t < templates.length; t++)
    for (let i = 0; i < 12; i++) {
      const row = templates[t](i);
      fact(topic, row[0], row[1], row[2], row[3], {
        ...(row[4] ?? {}),
        pattern: `${topic}.${t}`,
      });
    }
};
// Every loop below has five distinct task frames and twelve lexical contexts.
loop("grammar.pronouns", [
  (i) => [
    `${names[i]} is a girl. ___ is ${attributes[i]}.（填写人称代词）`,
    "She",
    ["He", "They"],
    "女孩用she指代。",
  ],
  (i) => [
    `${names[i]} is a boy. ___ has a ${objects[i]}.（填写人称代词）`,
    "He",
    ["She", "They"],
    "男孩用he指代。",
  ],
  (i) => [
    `The ${objects[i]} is new. ___ is mine.`,
    "It",
    ["They", "We"],
    "单个物品用it指代。",
  ],
  (i) => [
    `${names[i]} and I are friends. ___ go to the ${places[i]} together.`,
    "We",
    ["They", "He"],
    "包括我在内的一群人用we。",
  ],
  (i) => [
    `${names[i]} and Nora are classmates. ___ are ${attributes[i]}.`,
    "They",
    ["He", "It"],
    "第三人称复数用they。",
  ],
]);
loop("grammar.be", [
  (i) => [`I ___ ${attributes[i]}.`, "am", ["is", "are"], "I与am搭配。"],
  (i) => [
    `${names[i]} ___ ${attributes[i]}.`,
    "is",
    ["am", "are"],
    "一个人的姓名作主语，用is。",
  ],
  (i) => [`We ___ at the ${places[i]}.`, "are", ["am", "is"], "we与are搭配。"],
  (i) => [`The ${objects[i]} ___ new.`, "is", ["am", "are"], "单数物品用is。"],
  (i) => [`You ___ ${attributes[i]}.`, "are", ["am", "is"], "you与are搭配。"],
]);
const articles = [
  ["apple", "an"],
  ["egg", "an"],
  ["orange", "an"],
  ["umbrella", "an"],
  ["ant", "an"],
  ["elephant", "an"],
  ["book", "a"],
  ["cat", "a"],
  ["dog", "a"],
  ["kite", "a"],
  ["pencil", "a"],
  ["toy", "a"],
];
loop("grammar.articles", [
  (i) => [
    `I can see ___ ${articles[i][0]}.（第一次提到，填a或an）`,
    articles[i][1],
    [articles[i][1] === "a" ? "an" : "a", "the"],
    "第一次提到单个事物，用a或an；根据开头发音选择。",
  ],
  (i) => [
    `${names[i]} has ___ ${articles[i][0]}.（第一次提到，填a或an）`,
    articles[i][1],
    [articles[i][1] === "a" ? "an" : "a", "the"],
    "元音音素开头用an；辅音音素开头用a。",
  ],
  (i) => [
    `This is ___ ${articles[i][0]}.（第一次介绍，填a或an）`,
    articles[i][1],
    [articles[i][1] === "a" ? "an" : "a", "the"],
    "单数可数名词前通常需要限定词。",
  ],
  (i) => [
    `I have ${articles[i][1]} ${articles[i][0]}. ___ ${articles[i][0]} is nice.（再次提到，首字母大写）`,
    "The",
    ["A", "An"],
    "再次提到双方已知的同一事物用the。",
  ],
  (i) => [
    `${names[i]} points to the only ${objects[i]} on the desk. Please pass me ___ ${objects[i]}.（特指）`,
    "the",
    ["a", "an"],
    "特指双方明确知道的那个事物用the。",
  ],
]);
const countable = [
  ["apple", "可数"],
  ["book", "可数"],
  ["egg", "可数"],
  ["chair", "可数"],
  ["pencil", "可数"],
  ["bottle", "可数"],
  ["water", "不可数"],
  ["milk", "不可数"],
  ["rice", "不可数"],
  ["bread", "不可数"],
  ["juice", "不可数"],
  ["homework", "不可数"],
];
loop("grammar.countability", [
  (i) => [
    `在小学常见用法中，${countable[i][0]}属于哪类名词？（填可数或不可数）`,
    countable[i][1],
    [countable[i][1] === "可数" ? "不可数" : "可数", "动词"],
    "物品通常能按个数，水、米饭等在这里按量计。",
  ],
  (i) => [
    `请选择可直接使用的词组：${countable[i][0]}。`,
    countable[i][1] === "可数"
      ? `one ${countable[i][0]}`
      : `some ${countable[i][0]}`,
    [
      countable[i][1] === "可数"
        ? `much ${countable[i][0]}`
        : `a ${countable[i][0]}`,
      `an ${countable[i][0]}s`,
    ],
    "单数可数名词可跟one；不可数名词可跟some。",
  ],
  (i) => [
    `询问${countable[i][0]}的数量：How ___ ...?（many或much）`,
    countable[i][1] === "可数" ? "many" : "much",
    [countable[i][1] === "可数" ? "much" : "many", "old"],
    "many问可数名词数量，much问不可数名词的量。",
  ],
  (i) => [
    `描述很少的${countable[i][0]}，选择a few或a little。`,
    countable[i][1] === "可数" ? "a few" : "a little",
    [countable[i][1] === "可数" ? "a little" : "a few", "an"],
    "a few修饰可数复数，a little修饰不可数名词。",
  ],
  (i) => [
    `笔记卡${i + 1}：${countable[i][0]}的量词分类。填many类或much类。`,
    countable[i][1] === "可数" ? "many类" : "much类",
    [countable[i][1] === "可数" ? "much类" : "many类", "be类"],
    "先判断可数性，再选择量词。",
  ],
]);
loop("grammar.quantifiers", [
  (i) => [
    `How ___ ${objects[i] === "box" ? "boxes" : objects[i] + "s"} do you have?`,
    "many",
    ["much", "old"],
    "How many后接可数名词复数。",
  ],
  (i) => [
    `How ___ water does ${names[i]} need?`,
    "much",
    ["many", "often"],
    "water在这里是不可数名词，用much。",
  ],
  (i) => [
    `${names[i]} has a ___ books.（表示有几本）`,
    "few",
    ["little", "much"],
    "a few后接可数复数。",
  ],
  (i) => [
    `${names[i]} drinks a ___ milk.（表示一点儿）`,
    "little",
    ["few", "many"],
    "a little后接不可数名词。",
  ],
  (i) => [
    `肯定陈述：There are ___ ${objects[i] === "box" ? "boxes" : objects[i] + "s"} on the table.（填some或any）`,
    "some",
    ["any", "much"],
    "这里的普通肯定陈述用some；some也有其他用法，不能一概说问句只用any。",
  ],
]);
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
loop("grammar.prepositions", [
  (i) => [
    `My birthday is ___ ${months[i]}.`,
    "in",
    ["on", "at"],
    "月份前通常用in。",
  ],
  (i) => [
    `${names[i]} gets up ___ ${(i % 3) + 6} o'clock.`,
    "at",
    ["in", "on"],
    "具体钟点前用at。",
  ],
  (i) => [
    `第${i + 1}周：We play football ___ Monday.`,
    "on",
    ["in", "at"],
    "星期几前用on。",
  ],
  (i) => [
    `位置说明：球在${objects[i]}下面。The ball is ___ the ${objects[i]}.`,
    "under",
    ["on", "behind"],
    "under表示在……下面。",
  ],
  (i) => [
    `位置说明：${names[i]}站在树后面。${names[i]} is ___ the tree.`,
    "behind",
    ["under", "in"],
    "behind表示在……后面。",
  ],
]);
loop("grammar.modals", [
  (i) => [
    `能力：${names[i]} ___ swim.（能）`,
    "can",
    ["should", "must"],
    "can表示能力。",
  ],
  (i) => [
    `建议：${names[i]} is tired. You ___ rest.（应该）`,
    "should",
    ["can", "must"],
    "should常用来提出建议。",
  ],
  (i) => [
    `校规${i + 1}：You ___ follow the safety rules.（必须）`,
    "must",
    ["can", "should"],
    "must在此强调必须遵守。",
  ],
  (i) => [
    `${names[i]} can ___ ${activities[i][5]}.（使用${activities[i][0]}的正确形式）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "情态动词后接动词原形。",
  ],
  (i) => [
    `${names[i]} should ___ ${activities[i][5]}.（使用${activities[i][0]}的正确形式）`,
    activities[i][0],
    [
      activities[i][1],
      activities[i][2] === activities[i][0]
        ? activities[i][3]
        : activities[i][2],
    ],
    "should后也使用动词原形。",
  ],
]);
loop("grammar.there-be", [
  (i) => [
    `There ___ a ${objects[i]} on the desk.`,
    "is",
    ["are", "am"],
    "There is后接单数名词。",
  ],
  (i) => [
    `There ___ two ${objects[i] === "box" ? "boxes" : objects[i] + "s"} on the desk.`,
    "are",
    ["is", "am"],
    "There are后接复数名词。",
  ],
  (i) => [
    `___ there a ${objects[i]} in the bag?`,
    "Is",
    ["Are", "Am"],
    "There is疑问句把is放在前面。",
  ],
  (i) => [
    `___ there any ${objects[i] === "box" ? "boxes" : objects[i] + "s"} here?`,
    "Are",
    ["Is", "Am"],
    "复数there are的疑问形式用Are there。",
  ],
  (i) => [
    `There ___ some water in ${names[i]}'s cup.`,
    "is",
    ["are", "am"],
    "不可数名词water在此配is。",
  ],
]);
loop("grammar.possession", [
  (i) => [
    `${names[i]} ___ a new ${objects[i]}.（have或has）`,
    "has",
    ["have", "having"],
    "第三人称单数用has。",
  ],
  (i) => [
    `We ___ a ${objects[i]}.（have或has）`,
    "have",
    ["has", "having"],
    "we、you、they和I配have。",
  ],
  (i) => [
    `这是我的${objects[i]}：This is ___ ${objects[i]}.（my或mine）`,
    "my",
    ["mine", "me"],
    "名词前使用形容词性物主代词my。",
  ],
  (i) => [
    `这只${objects[i]}是我的：This ${objects[i]} is ___.（my或mine）`,
    "mine",
    ["my", "me"],
    "mine可以独立表示我的东西。",
  ],
  (i) => [
    `物品属于${names[i]}：This is ___ ${objects[i]}.（用姓名所有格）`,
    `${names[i]}'s`,
    [names[i], `${names[i]}s`],
    "姓名后加's表示所属。",
  ],
]);
loop("grammar.frequency", [
  (i) => [
    `${names[i]}每天都${activities[i][6]}。选择表示100%频率的词。`,
    "always",
    ["sometimes", "never"],
    "always表示总是。",
  ],
  (i) => [
    `${names[i]}一次也不做这件事。选择表示0%频率的词。`,
    "never",
    ["always", "often"],
    "never表示从不。",
  ],
  (i) => [
    `选择正确词序：${names[i]} + often + ${activities[i][1]} ${activities[i][5]}.`,
    `${names[i]} often ${activities[i][1]} ${activities[i][5]}.`,
    [
      `${names[i]} ${activities[i][1]} often ${activities[i][5]}.`,
      `Often ${names[i]} ${activities[i][0]} ${activities[i][5]}.`,
    ],
    "常见频率副词一般放在实义动词前。",
  ],
  (i) => [
    `选择正确词序：${names[i]} + is + always + ${attributes[i]}.`,
    `${names[i]} is always ${attributes[i]}.`,
    [
      `${names[i]} always is ${attributes[i]}.`,
      `${names[i]} is ${attributes[i]} always.`,
    ],
    "本题采用常见词序：be动词后放频率副词。",
    { context: "按课内常见词序作答；特殊强调语境可能有其他词序。" },
  ],
  (i) => [
    `想知道${names[i]}多久去一次${places[i]}：How ___ do you go there?`,
    "often",
    ["many", "much"],
    "How often询问频率。",
  ],
]);
loop("tense.present-simple", [
  (i) => [
    `Every day, ${names[i]} ___ ${activities[i][5]}.（${activities[i][0]}）`,
    activities[i][1],
    [activities[i][0], activities[i][3]],
    "第三人称单数的日常习惯，动词用三单形式。",
  ],
  (i) => [
    `We ___ ${activities[i][5]} every weekend.（${activities[i][0]}）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "we作主语的一般现在时用动词原形。",
  ],
  (i) => [
    `Does ${names[i]} ___ ${activities[i][5]} every day?（${activities[i][0]}）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "Does后面的动词恢复原形。",
  ],
  (i) => [
    `${names[i]} does not ___ ${activities[i][5]} on Mondays.（${activities[i][0]}）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "does not后用动词原形。",
  ],
  (i) => [
    `___ they ${activities[i][0]} ${activities[i][5]} every week?`,
    "Do",
    ["Does", "Are"],
    "they作主语，实义动词一般现在时问句用Do。",
  ],
]);
loop("tense.present-continuous", [
  (i) => [
    `Look! ${names[i]} is ___ ${activities[i][5]}.（${activities[i][0]}）`,
    activities[i][3],
    [activities[i][0], activities[i][1]],
    "现在正在发生：be + 动词-ing。",
  ],
  (i) => [
    `We ___ ${activities[i][3]} ${activities[i][5]} now.`,
    "are",
    ["is", "am"],
    "we配are，再接-ing。",
  ],
  (i) => [
    `I ___ ${activities[i][3]} ${activities[i][5]} now.`,
    "am",
    ["are", "is"],
    "I配am，再接-ing。",
  ],
  (i) => [
    `___ ${names[i]} ${activities[i][3]} ${activities[i][5]} now?`,
    "Is",
    ["Does", "Do"],
    "进行时问句将be动词放在主语前。",
  ],
  (i) => [
    `They are not ___ ${activities[i][5]} now.（${activities[i][0]}）`,
    activities[i][3],
    [activities[i][0], activities[i][1]],
    "否定进行时依然是be + not + -ing。",
  ],
]);
loop("tense.present-contrast", [
  (i) => [
    `习惯：${names[i]} ___ ${activities[i][5]} every day.`,
    activities[i][1],
    [activities[i][3], `is ${activities[i][3]}`],
    "every day在这里表示习惯，用一般现在时。",
  ],
  (i) => [
    `此刻：${names[i]} ___ ${activities[i][5]} right now.`,
    `is ${activities[i][3]}`,
    [activities[i][1], activities[i][0]],
    "right now在这里表示此刻，用现在进行时。",
  ],
  (i) => [
    `句子${names[i]} ${activities[i][1]} ${activities[i][5]} every Sunday. 使用什么时态？`,
    "一般现在时",
    ["现在进行时", "一般过去时"],
    "通常反复发生的活动，用一般现在时。",
  ],
  (i) => [
    `句子${names[i]} is ${activities[i][3]} ${activities[i][5]} now. 使用什么时态？`,
    "现在进行时",
    ["一般现在时", "一般过去时"],
    "is + -ing描述现在正在发生的动作。",
  ],
  (i) => [
    `选句表达“我们现在正在${activities[i][6]}”。`,
    `We are ${activities[i][3]} ${activities[i][5]} now.`,
    [
      `We ${activities[i][0]} ${activities[i][5]} every day.`,
      `We ${activities[i][2]} ${activities[i][5]} yesterday.`,
    ],
    "分清此刻、习惯和过去三个时间线。",
  ],
]);
loop("tense.past-simple", [
  (i) => [
    `Yesterday, ${names[i]} ___ ${activities[i][5]}.（${activities[i][0]}）`,
    activities[i][2],
    [activities[i][1], activities[i][3]],
    "过去发生的动作，使用过去式。",
  ],
  (i) => [
    `Did ${names[i]} ___ ${activities[i][5]} yesterday?（${activities[i][0]}）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "Did后的动词用原形。",
  ],
  (i) => [
    `We did not ___ ${activities[i][5]} last night.（${activities[i][0]}）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "did not后用动词原形。",
  ],
  (i) => [
    `${names[i]} ___ at the ${places[i]} yesterday.`,
    "was",
    ["is", "were"],
    "过去的单数be用was。",
  ],
  (i) => [
    `We ___ at the ${places[i]} last Sunday.`,
    "were",
    ["are", "was"],
    "过去的we配were。",
  ],
]);
loop("tense.past-continuous", [
  (i) => [
    `At eight last night, ${names[i]} ___ ${activities[i][3]} ${activities[i][5]}.`,
    "was",
    ["is", "were"],
    "过去某时正在发生：was/were + -ing。",
  ],
  (i) => [
    `At eight last night, we ___ ${activities[i][3]} ${activities[i][5]}.`,
    "were",
    ["are", "was"],
    "we的过去进行时用were + -ing。",
  ],
  (i) => [
    `${names[i]} was ___ ${activities[i][5]} when the phone rang.（${activities[i][0]}）`,
    activities[i][3],
    [activities[i][0], activities[i][1]],
    "was后接-ing，表示过去正在进行的背景。",
  ],
  (i) => [
    `___ ${names[i]} ${activities[i][3]} ${activities[i][5]} at nine last night?`,
    "Was",
    ["Did", "Does"],
    "过去进行时问句将was/were放在主语前。",
  ],
  (i) => [
    `They were not ___ ${activities[i][5]} at seven yesterday.（${activities[i][0]}）`,
    activities[i][3],
    [activities[i][0], activities[i][1]],
    "过去进行时否定保留were not和-ing。",
  ],
]);
loop("tense.past-contrast", [
  (i) => [
    `正在做某事时门铃突然响了：${names[i]} ___ ${activities[i][5]} when the doorbell rang.`,
    `was ${activities[i][3]}`,
    [activities[i][1], `is ${activities[i][3]}`],
    "过去正在进行的背景用过去进行时。",
  ],
  (i) => [
    `完整过去事件：${names[i]} ___ ${activities[i][5]} yesterday.（${activities[i][0]}）`,
    activities[i][2],
    [activities[i][1], activities[i][3]],
    "叙述已经发生的完整事件，用一般过去时。",
  ],
  (i) => [
    `${names[i]} was ${activities[i][3]} ${activities[i][5]} when the phone ___.（ring）`,
    "rang",
    ["rings", "ringing"],
    "打断背景活动的突然事件用一般过去时。",
  ],
  (i) => [
    `${names[i]} was ${activities[i][3]} ${activities[i][5]} at eight. 这句重点是？`,
    "过去某时正在进行",
    ["每天固定习惯", "明天的打算"],
    "was + -ing突出过去某个时刻的进行状态。",
  ],
  (i) => [
    `${names[i]} ${activities[i][2]} ${activities[i][5]} last night. 这句的时态是？`,
    "一般过去时",
    ["过去进行时", "现在进行时"],
    "过去式在此叙述过去发生的事件。",
  ],
]);
loop("tense.future", [
  (i) => [
    `Tomorrow, ${names[i]} will ___ ${activities[i][5]}.（${activities[i][0]}）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "will后用动词原形。",
  ],
  (i) => [
    `${names[i]} ___ going to ${activities[i][0]} ${activities[i][5]} tomorrow.`,
    "is",
    ["are", "am"],
    "be going to的be随主语变化。",
  ],
  (i) => [
    `We ___ going to visit the ${places[i]} tomorrow.`,
    "are",
    ["is", "am"],
    "we配are going to。",
  ],
  (i) => [
    `___ ${names[i]} going to ${activities[i][0]} ${activities[i][5]} tomorrow?`,
    "Is",
    ["Does", "Did"],
    "be going to问句把be放前面。",
  ],
  (i) => [
    `${names[i]} will not ___ ${activities[i][5]} tomorrow.（${activities[i][0]}）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "will not后仍用动词原形。",
  ],
]);
loop("tense.present-perfect", [
  (i) => [
    `${names[i]} has already ___ ${activities[i][5]}.（${activities[i][0]}）`,
    activities[i][4],
    [activities[i][1], activities[i][3]],
    "现在完成时：has/have + 过去分词。",
  ],
  (i) => [
    `We ___ already ${activities[i][4]} ${activities[i][5]}.`,
    "have",
    ["has", "are"],
    "we配have + 过去分词。",
  ],
  (i) => [
    `___ ${names[i]} ever visited the ${places[i]}?`,
    "Has",
    ["Have", "Does"],
    "单数主语的现在完成时问句用Has。",
  ],
  (i) => [
    `明确过去时间：${names[i]} ___ ${activities[i][5]} yesterday.（${activities[i][0]}）`,
    activities[i][2],
    [activities[i][1], `has ${activities[i][4]}`],
    "有明确的过去时间yesterday，在此用一般过去时。",
  ],
  (i) => [
    `We have not ___ ${activities[i][5]} yet.（${activities[i][0]}）`,
    activities[i][4],
    [activities[i][1], activities[i][3]],
    "have not后用过去分词。",
  ],
]);
// Morphology uses real lexical tables, not invented suffixes.
const plurals = [
  ["cat", "cats"],
  ["dog", "dogs"],
  ["book", "books"],
  ["pen", "pens"],
  ["cup", "cups"],
  ["bag", "bags"],
  ["hat", "hats"],
  ["desk", "desks"],
  ["lamp", "lamps"],
  ["tree", "trees"],
  ["bird", "birds"],
  ["car", "cars"],
  ["box", "boxes"],
  ["bus", "buses"],
  ["fox", "foxes"],
  ["dish", "dishes"],
  ["watch", "watches"],
  ["brush", "brushes"],
  ["class", "classes"],
  ["glass", "glasses"],
  ["bench", "benches"],
  ["peach", "peaches"],
  ["church", "churches"],
  ["beach", "beaches"],
  ["baby", "babies"],
  ["city", "cities"],
  ["story", "stories"],
  ["family", "families"],
  ["party", "parties"],
  ["library", "libraries"],
  ["cherry", "cherries"],
  ["puppy", "puppies"],
  ["lady", "ladies"],
  ["country", "countries"],
  ["strawberry", "strawberries"],
  ["butterfly", "butterflies"],
  ["boy", "boys"],
  ["toy", "toys"],
  ["key", "keys"],
  ["day", "days"],
  ["monkey", "monkeys"],
  ["donkey", "donkeys"],
  ["child", "children"],
  ["man", "men"],
  ["woman", "women"],
  ["foot", "feet"],
  ["tooth", "teeth"],
  ["mouse", "mice"],
  ["person", "people"],
  ["goose", "geese"],
  ["sheep", "sheep"],
  ["deer", "deer"],
  ["leaf", "leaves"],
  ["knife", "knives"],
  ["wife", "wives"],
  ["life", "lives"],
  ["wolf", "wolves"],
  ["shelf", "shelves"],
  ["half", "halves"],
  ["loaf", "loaves"],
];
for (const [singular, plural] of plurals)
  fact(
    "forms.noun-plural",
    `写出${singular}表示两个或更多时的复数形式。`,
    plural,
    [`${singular}ing`, `${singular}ed`],
    `${singular}的复数是${plural}。注意规则词尾和不规则变化。`,
  );
const regular = [
  "play",
  "watch",
  "wash",
  "walk",
  "talk",
  "look",
  "cook",
  "help",
  "jump",
  "visit",
  "open",
  "listen",
  "clean",
  "paint",
  "climb",
  "work",
  "need",
  "want",
  "start",
  "finish",
  "ask",
  "answer",
  "pick",
  "kick",
  "push",
  "pull",
  "plant",
  "water",
  "wait",
  "join",
  "stay",
  "enjoy",
  "learn",
  "turn",
  "show",
  "snow",
  "like",
  "love",
  "live",
  "move",
  "dance",
  "smile",
  "close",
  "hope",
  "save",
  "use",
  "invite",
  "arrive",
  "study",
  "carry",
  "cry",
  "try",
  "copy",
  "tidy",
  "worry",
  "hurry",
  "stop",
  "drop",
  "plan",
  "shop",
].map((word) => [
  word,
  word === "learn"
    ? "learned"
    : /[^aeiou]y$/.test(word)
      ? word.slice(0, -1) + "ied"
      : ["stop", "drop", "plan", "shop"].includes(word)
        ? word + word.at(-1) + "ed"
        : word.endsWith("e")
          ? word + "d"
          : word + "ed",
]);
for (const [base, past] of regular)
  fact(
    "forms.regular-past",
    `把动词${base}变为过去式。`,
    past,
    [`${base}s`, `${base}ing`],
    `${base}的过去式是${past}。区分加ed、加d、变y及双写。`,
    base === "learn" ? { alternatives: ["learnt"] } : {},
  );
const irregular = [
  ["go", "went", "gone"],
  ["come", "came", "come"],
  ["see", "saw", "seen"],
  ["eat", "ate", "eaten"],
  ["drink", "drank", "drunk"],
  ["do", "did", "done"],
  ["make", "made", "made"],
  ["take", "took", "taken"],
  ["give", "gave", "given"],
  ["get", "got", "got"],
  ["have", "had", "had"],
  ["say", "said", "said"],
  ["write", "wrote", "written"],
  ["read", "read", "read"],
  ["run", "ran", "run"],
  ["swim", "swam", "swum"],
  ["sing", "sang", "sung"],
  ["sit", "sat", "sat"],
  ["stand", "stood", "stood"],
  ["buy", "bought", "bought"],
  ["bring", "brought", "brought"],
  ["think", "thought", "thought"],
  ["teach", "taught", "taught"],
  ["catch", "caught", "caught"],
  ["find", "found", "found"],
  ["lose", "lost", "lost"],
  ["leave", "left", "left"],
  ["feel", "felt", "felt"],
  ["keep", "kept", "kept"],
  ["sleep", "slept", "slept"],
  ["meet", "met", "met"],
  ["send", "sent", "sent"],
  ["spend", "spent", "spent"],
  ["build", "built", "built"],
  ["tell", "told", "told"],
  ["sell", "sold", "sold"],
  ["hear", "heard", "heard"],
  ["hold", "held", "held"],
  ["know", "knew", "known"],
  ["grow", "grew", "grown"],
  ["throw", "threw", "thrown"],
  ["fly", "flew", "flown"],
  ["draw", "drew", "drawn"],
  ["break", "broke", "broken"],
  ["speak", "spoke", "spoken"],
  ["wake", "woke", "woken"],
  ["wear", "wore", "worn"],
  ["ride", "rode", "ridden"],
  ["drive", "drove", "driven"],
  ["choose", "chose", "chosen"],
  ["begin", "began", "begun"],
  ["forget", "forgot", "forgotten"],
  ["fall", "fell", "fallen"],
  ["cut", "cut", "cut"],
  ["put", "put", "put"],
  ["hit", "hit", "hit"],
  ["hurt", "hurt", "hurt"],
  ["let", "let", "let"],
  ["feed", "fed", "fed"],
  ["win", "won", "won"],
];
for (const [base, past, participle] of irregular) {
  fact(
    "forms.irregular-past",
    `写出不规则动词${base}的过去式。`,
    past,
    [`${base}ing`, `${base}s`],
    `${base} → ${past}。不规则变化需要结合句子提取。`,
  );
  fact(
    "forms.past-participle",
    `用于have/has之后：写出${base}的过去分词。`,
    participle,
    [`${base}ing`, `${base}s`],
    `${base} → ${past} → ${participle}。过去式与过去分词可能相同，也可能不同。`,
    base === "get" ? { alternatives: ["gotten"] } : {},
  );
}
const verbBases = [
  ...new Set([
    "run",
    "swim",
    "sit",
    "stop",
    "plan",
    "shop",
    "drop",
    "get",
    "put",
    "cut",
    "hit",
    "begin",
    ...activities.map((v) => v[0]),
    ...regular.map((v) => v[0]),
    ...irregular.map((v) => v[0]),
  ]),
].slice(0, 60);
const third = (base) =>
  base === "have"
    ? "has"
    : /[^aeiou]y$/.test(base)
      ? base.slice(0, -1) + "ies"
      : /(s|sh|ch|x|o)$/.test(base)
        ? base + "es"
        : base + "s";
const ing = (base) =>
  [
    "run",
    "swim",
    "sit",
    "get",
    "begin",
    "stop",
    "drop",
    "plan",
    "shop",
    "put",
    "cut",
    "hit",
  ].includes(base)
    ? base + base.at(-1) + "ing"
    : base.endsWith("e") && !base.endsWith("ee")
      ? base.slice(0, -1) + "ing"
      : base + "ing";
for (const base of verbBases) {
  fact(
    "forms.third-person",
    `He/She/It作主语：把${base}变为一般现在时第三人称单数形式。`,
    third(base),
    [ing(base), `${base}ed`],
    `${base} → ${third(base)}。先看主语，再按词尾规则变化。`,
  );
  fact(
    "forms.ing",
    `写出${base}的-ing形式。`,
    ing(base),
    [third(base), `${base}ed`],
    `${base} → ${ing(base)}。注意直接加、去e和双写。`,
  );
}
const comparisons = [
  ["small", "smaller", "smallest"],
  ["tall", "taller", "tallest"],
  ["short", "shorter", "shortest"],
  ["long", "longer", "longest"],
  ["young", "younger", "youngest"],
  ["old", "older", "oldest"],
  ["fast", "faster", "fastest"],
  ["slow", "slower", "slowest"],
  ["warm", "warmer", "warmest"],
  ["cold", "colder", "coldest"],
  ["strong", "stronger", "strongest"],
  ["weak", "weaker", "weakest"],
  ["clean", "cleaner", "cleanest"],
  ["bright", "brighter", "brightest"],
  ["dark", "darker", "darkest"],
  ["light", "lighter", "lightest"],
  ["high", "higher", "highest"],
  ["low", "lower", "lowest"],
  ["big", "bigger", "biggest"],
  ["hot", "hotter", "hottest"],
  ["thin", "thinner", "thinnest"],
  ["fat", "fatter", "fattest"],
  ["happy", "happier", "happiest"],
  ["easy", "easier", "easiest"],
  ["busy", "busier", "busiest"],
  ["heavy", "heavier", "heaviest"],
  ["funny", "funnier", "funniest"],
  ["early", "earlier", "earliest"],
  ["good", "better", "best"],
  ["bad", "worse", "worst"],
];
for (const [base, comparative, superlative] of comparisons) {
  fact(
    "forms.comparison",
    `比较两者：写出${base}的比较级。`,
    comparative,
    [superlative, base],
    `${base} → ${comparative} → ${superlative}。两者比较用比较级。`,
  );
  fact(
    "forms.comparison",
    `比较三者或更多：写出${base}的最高级（不写the）。`,
    superlative,
    [comparative, base],
    `${base}的最高级是${superlative}。`,
  );
}
const derivations = [
  ["happy", "unhappy", "不开心"],
  ["kind", "unkind", "不友善"],
  ["fair", "unfair", "不公平"],
  ["safe", "unsafe", "不安全"],
  ["lucky", "unlucky", "不幸运"],
  ["usual", "unusual", "不寻常"],
  ["tidy", "untidy", "不整洁"],
  ["healthy", "unhealthy", "不健康"],
  ["do", "redo", "重做"],
  ["write", "rewrite", "重写"],
  ["read", "reread", "重读"],
  ["use", "reuse", "再次使用"],
  ["play", "player", "运动员"],
  ["teach", "teacher", "教师"],
  ["sing", "singer", "歌手"],
  ["work", "worker", "工人"],
  ["farm", "farmer", "农民"],
  ["paint", "painter", "画家"],
  ["help", "helpful", "有帮助的"],
  ["care", "careful", "小心的"],
  ["hope", "hopeful", "充满希望的"],
  ["thank", "thankful", "感激的"],
  ["use", "useful", "有用的"],
  ["colour", "colourful", "多彩的"],
  ["care", "careless", "粗心的"],
  ["home", "homeless", "无家可归的"],
  ["hope", "hopeless", "无望的"],
  ["help", "helpless", "无助的"],
  ["fear", "fearless", "无畏的"],
  ["end", "endless", "无尽的"],
];
for (const [base, derived, meaning] of derivations) {
  fact(
    "forms.derivation",
    `给${base}加前缀或后缀，组成表示“${meaning}”的词。`,
    derived,
    [base, `${base}ing`],
    `${base} → ${derived}，表示${meaning}。词缀可以改变词义或词性。`,
    derived === "colourful" ? { alternatives: ["colorful"] } : {},
  );
  fact(
    "forms.derivation",
    `${derived}的基础词是哪一个？`,
    base,
    [derived, `${base}ed`],
    `观察${derived}，去掉构词词缀可以找到${base}。`,
  );
}
loop("sentence.negative", [
  (i) => [
    `把${names[i]} is ${attributes[i]}.改为否定，只填is后的词。`,
    "not",
    ["no", "do"],
    "be动词后加not。",
  ],
  (i) => [
    `否定：${names[i]} ___ not ${activities[i][0]} ${activities[i][5]} every day.`,
    "does",
    ["do", "is"],
    "三单实义动词否定用does not + 原形。",
  ],
  (i) => [
    `否定：We ___ not ${activities[i][0]} ${activities[i][5]} every day.`,
    "do",
    ["does", "are"],
    "we的实义动词否定用do not。",
  ],
  (i) => [
    `过去否定：${names[i]} did not ___ ${activities[i][5]} yesterday.（${activities[i][0]}）`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "did not后恢复原形。",
  ],
  (i) => [
    `情态否定：${names[i]} can ___ swim.（只填表示否定的一个词）`,
    "not",
    ["no", "does"],
    "can后加not；cannot通常合写，本题分词填空。",
  ],
]);
loop("sentence.yes-no", [
  (i) => [
    `___ ${names[i]} ${attributes[i]}?（询问现在的状态）`,
    "Is",
    ["Do", "Does"],
    "状态问句将be动词前置。",
  ],
  (i) => [
    `___ ${names[i]} ${activities[i][0]} ${activities[i][5]} every day?`,
    "Does",
    ["Do", "Is"],
    "三单实义动词问句用Does。",
  ],
  (i) => [
    `___ you ${activities[i][0]} ${activities[i][5]} every day?`,
    "Do",
    ["Does", "Is"],
    "you的实义动词问句用Do。",
  ],
  (i) => [
    `Does ${names[i]} like this ${objects[i]}? Yes, she ___.`,
    "does",
    ["do", "is"],
    "简短回答使用与问句一致的助动词。",
  ],
  (i) => [
    `Can ${names[i]} swim? No, he ___.`,
    "cannot",
    ["does not", "is not"],
    "can的简短否定回答用cannot或can't。",
    { alternatives: ["can't"] },
  ],
]);
loop("sentence.wh", [
  (i) => [
    `想知道${names[i]}的名字：___ is your name?`,
    "What",
    ["Where", "When"],
    "What询问事物或信息。",
  ],
  (i) => [
    `想知道${names[i]}在哪里：___ is ${names[i]}?`,
    "Where",
    ["Who", "Why"],
    "Where询问地点。",
  ],
  (i) => [
    `想知道谁拿着${objects[i]}：___ has the ${objects[i]}?`,
    "Who",
    ["When", "How"],
    "Who询问人。",
  ],
  (i) => [
    `想知道${names[i]}为什么喜欢${places[i]}：___ do you like it?`,
    "Why",
    ["Where", "What"],
    "Why询问原因。",
  ],
  (i) => [
    `想知道第${i + 1}次活动的时间：___ does the activity start?`,
    "When",
    ["Who", "Why"],
    "When询问时间。",
  ],
]);
loop("sentence.order", [
  (i) => [
    `按“主语+be+形容词”排序：${attributes[i]} / is / ${names[i]}`,
    `${names[i]} is ${attributes[i]}.`,
    [`Is ${names[i]} ${attributes[i]}.`, `${names[i]} ${attributes[i]} is.`],
    "陈述句先放主语，再放be。",
  ],
  (i) => [
    `按陈述句排序：${activities[i][5]} / ${activities[i][1]} / ${names[i]}`,
    `${names[i]} ${activities[i][1]} ${activities[i][5]}.`,
    [
      `${activities[i][1]} ${names[i]} ${activities[i][5]}.`,
      `${names[i]} ${activities[i][5]} ${activities[i][1]}.`,
    ],
    "常见陈述句顺序：主语、动词、宾语。",
  ],
  (i) => [
    `选择正确一般疑问句，使用you、like和the ${objects[i]}。`,
    `Do you like the ${objects[i]}?`,
    [`You do like the ${objects[i]}?`, `Like you do the ${objects[i]}?`],
    "一般疑问句用Do + 主语 + 原形。",
  ],
  (i) => [
    `选择正确进行时句子：we / now / ${activities[i][3]} / are / ${activities[i][5]}`,
    `We are ${activities[i][3]} ${activities[i][5]} now.`,
    [
      `We ${activities[i][3]} are ${activities[i][5]} now.`,
      `Are we ${activities[i][3]} ${activities[i][5]} now.`,
    ],
    "进行时陈述先主语，再be与-ing。",
  ],
  (i) => [
    `地点问句词序：where / ${names[i]} / is`,
    `Where is ${names[i]}?`,
    [`Where ${names[i]} is?`, `${names[i]} where is?`],
    "特殊疑问词后接相应的一般疑问句词序。",
  ],
]);
loop("sentence.connectives", [
  (i) => [
    `想表达两个并列活动：${names[i]} can read ___ draw.`,
    "and",
    ["but", "because"],
    "and连接并列信息。",
  ],
  (i) => [
    `原因：${names[i]} is happy ___ the ${objects[i]} is a gift.`,
    "because",
    ["but", "or"],
    "because后给出原因。",
  ],
  (i) => [
    `转折：${names[i]} is tired, ___ she still helps us.`,
    "but",
    ["because", "or"],
    "but表示转折。",
  ],
  (i) => [
    `二选一：Would ${names[i]} like a ${objects[i]} ___ a book?`,
    "or",
    ["because", "so"],
    "or连接可供选择的对象。",
  ],
  (i) => [
    `结果：It is raining at the ${places[i]}, ___ we stay inside.`,
    "so",
    ["because", "or"],
    "so引出结果。",
  ],
]);
loop("sentence.editing", [
  (i) => [
    `只改错误词：${names[i]} are ${attributes[i]}.（are应改为？）`,
    "is",
    ["am", "be"],
    "单数姓名配is。",
  ],
  (i) => [
    `只改错误词：Does ${names[i]} ${activities[i][1]} ${activities[i][5]}?（${activities[i][1]}应改为？）`,
    activities[i][0],
    [activities[i][3], `${activities[i][0]}ed`],
    "Does后用原形。",
  ],
  (i) => [
    `只改错误词：We is at the ${places[i]}.（is应改为？）`,
    "are",
    ["am", "be"],
    "we配are。",
  ],
  (i) => [
    `只改错误词：${names[i]} is ${activities[i][0]} ${activities[i][5]} now.（${activities[i][0]}应改为？）`,
    activities[i][3],
    [activities[i][1], `${activities[i][0]}ed`],
    "现在进行时需要be + -ing。",
  ],
  (i) => [
    `只改错误词：This ${objects[i]} is my.（my应改为？）`,
    "mine",
    ["me", "I"],
    "名词性物主代词mine可以独立作表语。",
  ],
]);
// Fixed frames deliberately specify the slot so valid free expression is not marked wrong.
const patternLoops = [
  [
    "greetings",
    [
      (i) => [
        `早上向${names[i]}问好：Good ___, ${names[i]}.`,
        "morning",
        ["night", "goodbye"],
        "Good morning用于上午见面。",
      ],
      (i) => [
        `下午见到${names[i]}：Good ___, ${names[i]}.`,
        "afternoon",
        ["night", "goodbye"],
        "Good afternoon用于下午见面。",
      ],
      (i) => [
        `${names[i]}帮你找到${objects[i]}，向他道谢：___ you.`,
        "Thank",
        ["Sorry", "Please"],
        "Thank you表达感谢。",
      ],
      (i) => [
        `不小心碰到${names[i]}，道歉：I am ___.`,
        "sorry",
        ["welcome", "please"],
        "I am sorry表达歉意。",
      ],
      (i) => [
        `${names[i]}说Thank you，你回答：You are ___.`,
        "welcome",
        ["sorry", "thanks"],
        "You are welcome回应感谢。",
      ],
    ],
  ],
  [
    "introductions",
    [
      (i) => [
        `介绍姓名：My ___ is ${names[i]}.`,
        "name",
        ["age", "colour"],
        "My name is...介绍姓名。",
      ],
      (i) => [
        `介绍年龄：I am ${i + 6} years ___.`,
        "old",
        ["long", "tall"],
        "years old表示年龄。",
      ],
      (i) => [
        `介绍朋友${names[i]}：___ is my friend ${names[i]}.`,
        "This",
        ["These", "Those"],
        "This is...用于介绍一个人。",
      ],
      (i) => [
        `想问${names[i]}来自哪里：Where are you ___?`,
        "from",
        ["to", "at"],
        "Where are you from?询问来自哪里。",
      ],
      (i) => [
        `初次认识${names[i]}：Nice to ___ you.`,
        "meet",
        ["look", "watch"],
        "Nice to meet you用于初次见面。",
      ],
    ],
  ],
  [
    "descriptions",
    [
      (i) => [
        `描述${objects[i]}的位置：It is ___ the desk.（在……下面）`,
        "under",
        ["behind", "on"],
        "It is + 介词短语描述位置。",
      ],
      (i) => [
        `表示存在：___ is a ${objects[i]} here.`,
        "There",
        ["They", "These"],
        "There is表示某处有单个事物。",
      ],
      (i) => [
        `问${objects[i]}是什么：What ___ it?`,
        "is",
        ["are", "do"],
        "What is it?询问是什么。",
      ],
      (i) => [
        `说${names[i]}很友善：She is very ___.（使用kind）`,
        "kind",
        ["kindly", "kindness"],
        "be后可以接形容词描述人。",
      ],
      (i) => [
        `描述${objects[i]}颜色：What ___ is it?`,
        "colour",
        ["old", "many"],
        "What colour is it?询问颜色。",
        { alternatives: ["color"] },
      ],
    ],
  ],
  [
    "preferences",
    [
      (i) => [
        `想要一个${objects[i]}：I would ___ a ${objects[i]}.`,
        "like",
        ["likes", "liking"],
        "would like表示想要。",
      ],
      (i) => [
        `想做某事：I want ___ ${activities[i][0]} ${activities[i][5]}.`,
        "to",
        ["for", "at"],
        "want to + 动词原形。",
      ],
      (i) => [
        `表达喜欢这个${objects[i]}：I ___ this ${objects[i]}.（使用like）`,
        "like",
        ["likes", "liking"],
        "I like + 名词，表达喜好。",
      ],
      (i) => [
        `表达喜欢做某事：I enjoy ___ ${activities[i][5]}.（${activities[i][0]}）`,
        activities[i][3],
        [activities[i][0], activities[i][1]],
        "enjoy后接-ing形式。",
      ],
      (i) => [
        `问${names[i]}最喜欢什么：What is your ___ animal?`,
        "favourite",
        ["like", "want"],
        "What is your favourite...?询问最喜欢的事物。",
        { alternatives: ["favorite"] },
      ],
    ],
  ],
  [
    "modals",
    [
      (i) => [
        `${names[i]}会${activities[i][6]}：She can ___ ${activities[i][5]}.`,
        activities[i][0],
        [activities[i][1], activities[i][3]],
        "can + 原形表示能力。",
      ],
      (i) => [
        `给${names[i]}建议：You should ___ ${activities[i][5]}.`,
        activities[i][0],
        [activities[i][1], activities[i][3]],
        "should + 原形表示建议。",
      ],
      (i) => [
        `在${places[i]}必须小心：You ___ be careful.（必须）`,
        "must",
        ["can", "may"],
        "must强调必须。",
      ],
      (i) => [
        `禁止触摸${objects[i]}：You must ___ touch it.`,
        "not",
        ["no", "does"],
        "must not表示禁止。",
      ],
      (i) => [
        `问${names[i]}是否会游泳：___ you swim?`,
        "Can",
        ["Are", "Is"],
        "Can you...?询问能力。",
      ],
    ],
  ],
  [
    "requests",
    [
      (i) => [
        `礼貌请求拿${objects[i]}：Could you ___ me the ${objects[i]}?（递给，使用pass）`,
        "pass",
        ["passes", "passing"],
        "Could you + 原形是一种礼貌请求。",
      ],
      (i) => [
        `请求许可去${places[i]}：___ I go to the ${places[i]}?（使用May）`,
        "May",
        ["Am", "Does"],
        "May I...?用于礼貌请求许可。",
      ],
      (i) => [
        `请求帮助${names[i]}：Can you ___ me, please?`,
        "help",
        ["helps", "helping"],
        "Can you help me, please?请求帮助。",
      ],
      (i) => [
        `借一件物品：May I ___ your ${objects[i]}?（使用borrow）`,
        "borrow",
        ["borrows", "borrowing"],
        "May I borrow...?请求借用。",
      ],
      (i) => [
        `礼貌回应${names[i]}的许可请求：Yes, you ___.（can）`,
        "can",
        ["are", "do"],
        "Yes, you can.表示许可。",
      ],
    ],
  ],
  [
    "suggestions",
    [
      (i) => [
        `邀请：Let's ___ ${activities[i][5]}.`,
        activities[i][0],
        [activities[i][1], activities[i][3]],
        "Let's后接原形。",
      ],
      (i) => [
        `建议：How about ___ ${activities[i][5]}?`,
        activities[i][3],
        [activities[i][0], activities[i][1]],
        "How about后可以接-ing。",
      ],
      (i) => [
        `建议：Why not ___ ${activities[i][5]}?`,
        activities[i][0],
        [activities[i][1], activities[i][3]],
        "Why not后接原形。",
      ],
      (i) => [
        `一起出发：Shall ___ go to the ${places[i]}?`,
        "we",
        ["us", "our"],
        "Shall we...?用于共同提议。",
      ],
      (i) => [
        `邀请${names[i]}：Would you like ___ visit the ${places[i]}?`,
        "to",
        ["for", "at"],
        "Would you like to + 原形表达邀请。",
      ],
    ],
  ],
  [
    "complements",
    [
      (i) => [
        `I want ___ ${activities[i][0]} ${activities[i][5]}.`,
        "to",
        ["at", "for"],
        "want to + 原形。",
      ],
      (i) => [
        `${names[i]} enjoys ___ ${activities[i][5]}.`,
        activities[i][3],
        [activities[i][0], activities[i][1]],
        "enjoy + -ing。",
      ],
      (i) => [
        `Please help ${names[i]} ___ ${activities[i][5]}.（${activities[i][0]}，只填一个词）`,
        activities[i][0],
        [activities[i][1], activities[i][3]],
        "help后可接原形或to + 原形；本题只填一个词。",
      ],
      (i) => [
        `It is fun ___ ${activities[i][0]} ${activities[i][5]}.`,
        "to",
        ["at", "of"],
        "It is + 形容词 + to do。",
      ],
      (i) => [
        `${names[i]} finished ___ the room.（clean）`,
        "cleaning",
        ["clean", "cleans"],
        "finish后接-ing。",
      ],
    ],
  ],
  [
    "collocations",
    [
      (i) => [
        `${names[i]} is good ___ drawing.`,
        "at",
        ["on", "to"],
        "be good at是固定搭配。",
      ],
      (i) => [
        `${names[i]} is interested ___ the ${objects[i]}.`,
        "in",
        ["at", "for"],
        "be interested in表示对……感兴趣。",
      ],
      (i) => [
        `Look ___ the ${objects[i]}.`,
        "at",
        ["to", "for"],
        "look at表示看向。",
      ],
      (i) => [
        `Listen ___ ${names[i]}, please.`,
        "to",
        ["at", "on"],
        "listen to表示听。",
      ],
      (i) => [
        `Thank you ___ the ${objects[i]}.`,
        "for",
        ["at", "in"],
        "Thank you for + 名词或-ing。",
      ],
    ],
  ],
  [
    "time",
    [
      (i) => [
        `问活动时间：What ___ does ${names[i]} get up?`,
        "time",
        ["many", "colour"],
        "What time询问具体时间。",
      ],
      (i) => [
        `问频率：How ___ does ${names[i]} visit the ${places[i]}?`,
        "often",
        ["many", "much"],
        "How often询问多久一次。",
      ],
      (i) => [
        `每周两次：${names[i]} swims ___ a week.`,
        "twice",
        ["two", "second"],
        "twice a week表示每周两次。",
      ],
      (i) => [
        `在${(i % 3) + 6}点：I get up ___ ${(i % 3) + 6} o'clock.（第${i + 1}天）`,
        "at",
        ["in", "on"],
        "具体钟点前用at。",
      ],
      (i) => [
        `在${months[i]}：We have a trip ___ ${months[i]}.`,
        "in",
        ["at", "on"],
        "月份前用in。",
      ],
    ],
  ],
  [
    "comparison",
    [
      (i) => [
        `两者比较：My ${objects[i]} is bigger ___ yours.`,
        "than",
        ["then", "as"],
        "比较级后常用than引出比较对象。",
      ],
      (i) => [
        `同样高：${names[i]} is as tall ___ Ben.`,
        "as",
        ["than", "then"],
        "as + 原级 + as。",
      ],
      (i) => [
        `太累而不能去${places[i]}：I am ___ tired to go.`,
        "too",
        ["very", "enough"],
        "too...to...表示太……而不能……。",
      ],
      (i) => [
        `够大能装下${objects[i]}：The bag is big ___ for it.`,
        "enough",
        ["too", "very"],
        "形容词 + enough。",
      ],
      (i) => [
        `比较两件物品：My ${objects[i]} is ___ than yours.（使用${comparisons[i][0]}的比较级）`,
        comparisons[i][1],
        [comparisons[i][0], comparisons[i][2]],
        "比较级 + than引出比较对象。",
      ],
    ],
  ],
  [
    "connections",
    [
      (i) => [
        `因为${names[i]}帮了我：I am happy ___ ${names[i]} helped me.`,
        "because",
        ["but", "or"],
        "because引出原因。",
      ],
      (i) => [
        `如果明天去${places[i]}：___ we go there tomorrow, we will take water.`,
        "If",
        ["Because of", "And"],
        "If引出条件。",
      ],
      (i) => [
        `虽然${names[i]}累了，但仍帮助我们：${names[i]} is tired, ___ still helps us.`,
        "but",
        ["because", "or"],
        "but连接转折信息。",
      ],
      (i) => [
        `先做第${i + 1}项活动：___, read the instructions. Then start.`,
        "First",
        ["Finally", "Because"],
        "First...Then...表示步骤先后。",
      ],
      (i) => [
        `在去${places[i]}之前：Wash your hands ___ you eat.（在……之前）`,
        "before",
        ["after", "because"],
        "before表示在……之前。",
      ],
    ],
  ],
];
for (const [id, frames] of patternLoops)
  loop(`sentence.patterns.${id}`, frames);
const words = [
  ["apple", "苹果"],
  ["banana", "香蕉"],
  ["orange", "橙子"],
  ["grape", "葡萄"],
  ["pear", "梨"],
  ["peach", "桃子"],
  ["lemon", "柠檬"],
  ["mango", "芒果"],
  ["carrot", "胡萝卜"],
  ["potato", "土豆"],
  ["tomato", "番茄"],
  ["onion", "洋葱"],
  ["cat", "猫"],
  ["dog", "狗"],
  ["bird", "鸟"],
  ["fish", "鱼"],
  ["rabbit", "兔子"],
  ["horse", "马"],
  ["cow", "奶牛"],
  ["sheep", "绵羊"],
  ["duck", "鸭子"],
  ["frog", "青蛙"],
  ["tiger", "老虎"],
  ["lion", "狮子"],
  ["book", "书"],
  ["pencil", "铅笔"],
  ["ruler", "尺子"],
  ["eraser", "橡皮"],
  ["bag", "包"],
  ["desk", "书桌"],
  ["chair", "椅子"],
  ["door", "门"],
  ["window", "窗户"],
  ["clock", "钟"],
  ["computer", "电脑"],
  ["paper", "纸"],
  ["head", "头"],
  ["hand", "手"],
  ["foot", "脚"],
  ["eye", "眼睛"],
  ["ear", "耳朵"],
  ["nose", "鼻子"],
  ["mouth", "嘴"],
  ["arm", "手臂"],
  ["leg", "腿"],
  ["hair", "头发"],
  ["face", "脸"],
  ["tooth", "牙齿"],
  ["sun", "太阳"],
  ["moon", "月亮"],
  ["star", "星星"],
  ["rain", "雨"],
  ["snow", "雪"],
  ["wind", "风"],
  ["cloud", "云"],
  ["tree", "树"],
  ["flower", "花"],
  ["river", "河流"],
  ["mountain", "山"],
  ["sea", "大海"],
];
const wordContexts = [
  "I ate a red ___ from the tree.",
  "The monkey is eating a yellow ___.",
  "We peeled an ___ for lunch.",
  "A small purple ___ grew on the vine.",
  "She ate a green ___ after lunch.",
  "This ___ has soft skin and a stone inside.",
  "The yellow ___ tastes sour.",
  "We cut a sweet yellow ___ for dessert.",
  "The rabbit ate an orange ___.",
  "Dad baked a ___ for dinner.",
  "We put a red ___ in the salad.",
  "Mum cut an ___ and her eyes watered.",
  "The ___ says meow.",
  "The ___ says woof.",
  "A ___ has feathers and wings.",
  "The ___ swims with fins.",
  "The ___ has long ears and hops.",
  "The farmer rides a ___.",
  "The ___ gives us milk.",
  "The ___ has thick wool.",
  "The ___ says quack.",
  "The green ___ jumps into the pond.",
  "The ___ has black stripes.",
  "The ___ has a large mane.",
  "I opened a ___ and read a story.",
  "I write with a ___ and can erase it.",
  "Use a ___ to draw a straight line.",
  "Use an ___ to remove pencil marks.",
  "I put my lunch in my ___.",
  "My books are on my writing ___.",
  "Please sit on the ___.",
  "Please open the ___ so we can enter.",
  "I can see the garden through the ___.",
  "The ___ on the wall shows the time.",
  "I type on the ___ to save my work.",
  "I drew a picture on a piece of ___.",
  "Put your hat on your ___.",
  "Raise your ___ to ask a question.",
  "I wear a shoe on each ___.",
  "I see with each ___.",
  "I hear with each ___.",
  "I smell flowers with my ___.",
  "I eat food with my ___.",
  "I wear a watch on my ___.",
  "My knee is part of my ___.",
  "I comb my ___ every morning.",
  "I wash my ___ before bed.",
  "The dentist checks each ___.",
  "The ___ gives us daylight.",
  "We saw the ___ in the night sky.",
  "A small ___ twinkled far away.",
  "The ___ made the ground wet.",
  "White ___ covered the ground in winter.",
  "The ___ blew my hat away.",
  "A white ___ floated across the sky.",
  "The ___ has a trunk and branches.",
  "A bee landed on the ___.",
  "Water flowed along the ___ toward the sea.",
  "We climbed a high ___.",
  "The ship sailed across the ___.",
];
for (const [i, [word, meaning]] of words.entries()) {
  const wrongWords = [words[(i + 1) % 60][0], words[(i + 7) % 60][0]];
  fact(
    "vocabulary.meaning",
    `文字识义：哪个英文词表示“${meaning}”？`,
    word,
    wrongWords,
    `${word}表示${meaning}。本题是文字识义，不是听力评分。`,
  );
  fact(
    "vocabulary.spelling",
    `根据中文写单词：${meaning}。首字母${word[0]}，共${word.length}个字母。`,
    word,
    [word.slice(0, -1) + "x", "x" + word.slice(1)],
    `${meaning}的拼写是${word}。`,
  );
  fact(
    "vocabulary.context",
    `${wordContexts[i]}（提示：${meaning}）`,
    word,
    wrongWords,
    `${word}表示${meaning}。结合句中的动作或特征理解这个词。`,
  );
}
const collocations = [
  ["do", "homework"],
  ["make", "a cake"],
  ["take", "a photo"],
  ["ride", "a bike"],
  ["play", "football"],
  ["read", "a story"],
  ["write", "a letter"],
  ["drink", "water"],
  ["eat", "breakfast"],
  ["brush", "your teeth"],
  ["wash", "your hands"],
  ["wear", "a hat"],
];
loop("vocabulary.collocations", [
  (i) => [
    `补全常见搭配：___ ${collocations[i][1]}.（首字母${collocations[i][0][0]}）`,
    collocations[i][0],
    ["is", "are"],
    `${collocations[i].join(" ")}是一组常见搭配。`,
  ],
  (i) => [
    `${names[i]}说“___ ${collocations[i][1]}”，填写基本搭配中的原形动词。`,
    collocations[i][0],
    ["am", "was"],
    `记住完整语块${collocations[i].join(" ")}。`,
  ],
  (i) => [
    `将搭配中的动词改回原形：${third(collocations[i][0])} ${collocations[i][1]}.`,
    collocations[i][0],
    [third(collocations[i][0]), ing(collocations[i][0])],
    `原形搭配为${collocations[i].join(" ")}。`,
  ],
  (i) => [
    `按提示补全：Please ___ ${collocations[i][1]}.（使用${collocations[i][0]}）`,
    collocations[i][0],
    [third(collocations[i][0]), ing(collocations[i][0])],
    "祈使句Please后用动词原形。",
  ],
  (i) => [
    `按提示补全：Let's ___ ${collocations[i][1]}.（使用${collocations[i][0]}）`,
    collocations[i][0],
    [third(collocations[i][0]), ing(collocations[i][0])],
    "Let's后用动词原形。",
  ],
]);
// Written phonics preparation; no sound-recognition evidence is claimed.
const cvc = [
  "cat",
  "bat",
  "hat",
  "mat",
  "sat",
  "map",
  "cap",
  "bag",
  "bed",
  "red",
  "hen",
  "pen",
  "pig",
  "big",
  "sit",
  "pin",
  "dog",
  "hot",
  "pot",
  "sun",
];
for (const word of cvc) {
  fact(
    "phonics.cvc",
    `音形准备：拼合字母${word.split("").join(" - ")}，写出单词。`,
    word,
    [word.slice(1) + word[0], word[1] + word[0] + word[2]],
    `${word}是本轮的短元音CVC单词。文字任务不证明听辨能力。`,
  );
  fact(
    "phonics.cvc",
    `找出${word}中间的元音字母。`,
    word[1],
    ["x", "z"],
    `${word}中间的元音字母是${word[1]}。`,
  );
  fact(
    "phonics.cvc",
    `补全${word}的拼写：${word[0]}_${word[2]}。只写缺少的字母。`,
    word[1],
    ["q", "v"],
    `${word}按辅音、元音、辅音的顺序拼写。`,
  );
}
const consonants = [
  ["ship", "sh"],
  ["shop", "sh"],
  ["fish", "sh"],
  ["dish", "sh"],
  ["chair", "ch"],
  ["cheese", "ch"],
  ["peach", "ch"],
  ["beach", "ch"],
  ["thin", "th"],
  ["thick", "th"],
  ["bath", "th"],
  ["teeth", "th"],
  ["phone", "ph"],
  ["photo", "ph"],
  ["elephant", "ph"],
  ["dolphin", "ph"],
  ["black", "bl"],
  ["blue", "bl"],
  ["green", "gr"],
  ["grass", "gr"],
];
for (const [word, cluster] of consonants) {
  const wrong = ["zz", "qq"];
  fact(
    "phonics.consonants",
    `观察${word}，找出本课标注的辅音组合。`,
    cluster,
    wrong,
    `${word}中包含${cluster}。sh/ch/th/ph与bl/gr的发音机制不同，听辨需另练。`,
  );
  fact(
    "phonics.consonants",
    `补全单词：${word.replace(cluster, "__")}（目标词${word}）。只填两个字母。`,
    cluster,
    wrong,
    `${word}中这一组字母是${cluster}。`,
  );
  fact(
    "phonics.consonants",
    `字母拼合：${word.split("").join(" / ")}，写成一个词。`,
    word,
    [word + "x", "x" + word],
    `完整拼写是${word}，其中有${cluster}。`,
  );
}
const vowels = [
  ["cap", "cape"],
  ["tap", "tape"],
  ["mad", "made"],
  ["hat", "hate"],
  ["can", "cane"],
  ["pan", "pane"],
  ["kit", "kite"],
  ["bit", "bite"],
  ["pin", "pine"],
  ["fin", "fine"],
  ["win", "wine"],
  ["rid", "ride"],
  ["not", "note"],
  ["hop", "hope"],
  ["cod", "code"],
  ["rob", "robe"],
  ["cub", "cube"],
  ["tub", "tube"],
  ["cut", "cute"],
  ["dim", "dime"],
];
for (const [short, long] of vowels) {
  fact(
    "phonics.vowels",
    `本组词末不发音e：给${short}末尾加e得到哪个词？`,
    long,
    [short, short + "a"],
    `${short} → ${long}。本组采用常见split digraph拼写模式；并非所有词尾e都遵循此规律。`,
  );
  fact(
    "phonics.vowels",
    `观察词族：${short}与${long}。后一个词末尾多了哪个字母？`,
    "e",
    ["a", "i"],
    `${long}末尾的e在本组不单独发音。`,
  );
  fact(
    "phonics.vowels",
    `写出${long}去掉最后一个e后的词。`,
    short,
    [long, short + "s"],
    `本组对应${short}和${long}，可结合设备朗读比较发音。`,
  );
}
const syllables = [
  ["sunset", "sun-set"],
  ["rabbit", "rab-bit"],
  ["picnic", "pic-nic"],
  ["basket", "bas-ket"],
  ["napkin", "nap-kin"],
  ["rocket", "rock-et"],
  ["pocket", "pock-et"],
  ["button", "but-ton"],
  ["kitten", "kit-ten"],
  ["muffin", "muf-fin"],
  ["sandpit", "sand-pit"],
  ["bedroom", "bed-room"],
  ["classroom", "class-room"],
  ["football", "foot-ball"],
  ["rainbow", "rain-bow"],
  ["toothbrush", "tooth-brush"],
  ["playground", "play-ground"],
  ["sunshine", "sun-shine"],
  ["cupcake", "cup-cake"],
  ["backpack", "back-pack"],
];
for (const [word, split] of syllables) {
  fact(
    "phonics.word-strategy",
    `按本课分块，把${split}合成一个单词。`,
    word,
    [word + "x", "x" + word],
    `${split} → ${word}。分块帮助拼写，实际语音重音需听读。`,
  );
  fact(
    "phonics.word-strategy",
    `按提示补全${word}：${split.split("-")[0]}-___。`,
    split.split("-")[1],
    ["xyz", "qqq"],
    `本课把${word}分成${split}。`,
  );
  fact(
    "phonics.word-strategy",
    `观察${word}的分块${split}，一共几块？（填英文数字）`,
    "two",
    ["one", "three"],
    `${split}是两个学习分块，不将字母个数等同于音节数。`,
  );
}
// Reading tasks contain the actual evidence, with new details per passage.
loop("reading.details", [
  (i) => [
    `${names[i]}去了哪里？填写文中的英文地点词。`,
    places[i],
    [places[(i + 1) % 12], places[(i + 2) % 12]],
    "回到原文定位地点。",
    {
      reading: `${names[i]} went to the ${places[i]} on Sunday. She took a red bag.`,
    },
  ],
  (i) => [
    `${names[i]}带了什么？填写文中的物品词。`,
    objects[i],
    [objects[(i + 1) % 12], objects[(i + 2) % 12]],
    "物品信息在第二句中。",
    { reading: `${names[i]} visited a friend. He brought a ${objects[i]}.` },
  ],
  (i) => [
    `${names[i]}在什么时候出发？填写英文星期。`,
    "Sunday",
    ["Monday", "Friday"],
    "定位时间词，不猜测。",
    {
      reading: `${names[i]} left on Sunday. The trip was to the ${places[i]}.`,
    },
  ],
  (i) => [
    `${names[i]}的包是什么颜色？填一个英文词。`,
    "red",
    ["blue", "green"],
    "找出直接描述bag的颜色词。",
    { reading: `${names[i]} has a red bag and a blue ${objects[i]}.` },
  ],
  (i) => [
    `谁去了${places[i]}？填写姓名。`,
    names[i],
    [names[(i + 1) % 12], names[(i + 2) % 12]],
    "寻找动作的执行者。",
    {
      reading: `${names[i]} went to the ${places[i]}. ${names[(i + 1) % 12]} stayed at home.`,
    },
  ],
]);
loop("reading.sequence", [
  (i) => [
    `按原文，${names[i]}先做的事是？填read或draw。`,
    "read",
    ["draw", "sleep"],
    "First标记第一步。",
    {
      reading: `${names[i]} had a busy day. First, she read a story. Then, she drew a picture.`,
    },
  ],
  (i) => [
    `按原文，${names[i]}最后去了哪里？填英文地点。`,
    places[i],
    [places[(i + 1) % 12], places[(i + 2) % 12]],
    "Finally标记最后一步。",
    {
      reading: `${names[i]} ate lunch. Next, he packed a bag. Finally, he went to the ${places[i]}.`,
    },
  ],
  (i) => [
    `按原文，${names[i]}为什么带伞？填rain或sun。`,
    "rain",
    ["sun", "snow"],
    "because后面给出原因。",
    { reading: `${names[i]} took an umbrella because there was rain outside.` },
  ],
  (i) => [
    `${names[i]}洗手是在吃饭之前还是之后？填before或after。`,
    "before",
    ["after", "during"],
    "根据原文先后关系判断。",
    { reading: `${names[i]} washed his hands. Then he ate dinner.` },
  ],
  (i) => [
    `${names[i]}买好${objects[i]}后去哪里？填home或school。`,
    "home",
    ["school", "park"],
    "Then后的事件发生在买东西之后。",
    { reading: `${names[i]} bought a ${objects[i]}. Then she went home.` },
  ],
]);
loop("reading.inference", [
  (i) => [
    `原文中的She指谁？填姓名。`,
    names[i],
    [names[(i + 1) % 12], names[(i + 2) % 12]],
    "通过前句的单数女性人物判断指代。",
    { reading: `${names[i]} is a girl. She has a ${objects[i]}.` },
  ],
  (i) => [
    `原文中的It指什么？填物品词。`,
    objects[i],
    ["girl", "boy"],
    "It指向前句中的单个物品。",
    { reading: `${names[i]} has a ${objects[i]}. It is new.` },
  ],
  (i) => [
    `根据线索，${names[i]}感觉怎样？填cold或hot。`,
    "cold",
    ["hot", "hungry"],
    "外套和发抖支持cold这一推断。",
    {
      reading: `${names[i]} put on a coat and still shivered. The wind was strong.`,
    },
  ],
  (i) => [
    `${names[i]}更可能在找什么？填food或books。`,
    "books",
    ["food", "shoes"],
    "图书馆和书架提供线索。",
    {
      reading: `${names[i]} entered the library and looked along the shelves.`,
    },
  ],
  (i) => [
    `${names[i]}更可能需要什么？填water或a coat。`,
    "water",
    ["a coat", "a ruler"],
    "运动后说口渴，支持需要水的推断。",
    {
      reading: `${names[i]} ran around the ${places[i]}. "I am thirsty," she said.`,
    },
  ],
]);
loop("reading.integrating", [
  (i) => [
    `结合两条资料，${names[i]}应该在哪一天去${places[i]}？填英文星期。`,
    "Saturday",
    ["Sunday", "Monday"],
    "同时满足开放与有空两个条件。",
    {
      reading: `Notice: The ${places[i]} opens on Saturday and Sunday. Diary: ${names[i]} is free only on Saturday.`,
    },
  ],
  (i) => [
    `结合清单，${names[i]}还缺什么？填物品词。`,
    objects[i],
    ["water", "food"],
    "比较需要的东西与已打包的东西。",
    {
      reading: `Trip list: water, food and a ${objects[i]}. ${names[i]}'s bag: water and food.`,
    },
  ],
  (i) => [
    `谁的安排符合${places[i]}的开放时间？填姓名。`,
    names[i],
    ["Alex", "Nora"],
    "将每人的到达时间与开放时段对照。",
    {
      reading: `The ${places[i]} opens at 9 a.m. and closes at 5 p.m. ${names[i]} will arrive at 10 a.m. Alex will arrive at 6 p.m.`,
    },
  ],
  (i) => [
    `结合天气和活动，${names[i]}该带哪件？填umbrella或sunglasses。`,
    "umbrella",
    ["sunglasses", "skates"],
    "目的地户外且预报下雨，需要雨具。",
    {
      reading: `Plan: ${names[i]} will walk to the ${places[i]}. Forecast: Rain all morning.`,
    },
  ],
  (i) => [
    `结合两张卡，${names[i]}能否买这件${objects[i]}？填yes或no。`,
    "no",
    ["yes", "maybe"],
    "比较价格与金额，已知钱不够。",
    {
      reading: `Price card: The ${objects[i]} costs ${i + 8} dollars. Wallet card: ${names[i]} has ${i + 5} dollars.`,
    },
  ],
]);
loop("expression.expansion", [
  (i) => [
    `按提示扩写：a ${objects[i]} → 一件红色物品。只填颜色词。`,
    "red",
    ["quickly", "run"],
    "形容词red放在名词前：a red...。",
  ],
  (i) => [
    `按提示扩写：${names[i]} is ${attributes[i]}. 加入程度词“非常”，只填一个词。`,
    "very",
    ["many", "much"],
    "very可以修饰本题的形容词。",
  ],
  (i) => [
    `扩写地点：${names[i]} reads ___ the library.（在……里面）`,
    "in",
    ["under", "behind"],
    "加入地点信息，使句意更具体。",
  ],
  (i) => [
    `扩写原因：I like the ${places[i]} ___ it is quiet.（因为）`,
    "because",
    ["but", "or"],
    "because连接原因。",
  ],
  (i) => [
    `扩写习惯：${names[i]} ${activities[i][1]} ${activities[i][5]} every ___.（每天，填day）`,
    "day",
    ["daily", "days"],
    "every day是常见时间短语。",
  ],
]);
loop("expression.speaking", [
  (i) => [
    `口语准备，补全句框：Hello, my ___ is ${names[i]}.`,
    "name",
    ["old", "from"],
    "完成后可自行读出整句；本题只评分文字。",
  ],
  (i) => [
    `口语准备，补全请求：May I ___ your ${objects[i]}?（借用）`,
    "borrow",
    ["keep", "buy"],
    "May I borrow...?礼貌借物；录音评测尚未提供。",
  ],
  (i) => [
    `口语准备，表达计划：I am going ___ visit the ${places[i]}.`,
    "to",
    ["at", "for"],
    "完成句框后，可以向家人说出计划。",
  ],
  (i) => [
    `口语准备，回应感谢：You are ___.（${names[i]}向你道谢）`,
    "welcome",
    ["sorry", "please"],
    "You are welcome回应感谢。",
  ],
  (i) => [
    `口语准备，提出邀请：Let's ___ ${activities[i][5]}.`,
    activities[i][0],
    [activities[i][1], activities[i][3]],
    "本题练习口语句框；不将文字答对计为口语掌握。",
  ],
]);
loop("expression.paragraph", [
  (i) => [
    `给${names[i]}的日记补顺序词：___, I got up. Then, I ate breakfast.（首先）`,
    "First",
    ["Finally", "Because"],
    "开头步骤用First。",
  ],
  (i) => [
    `给${names[i]}的日记补结束词：First, I packed. Then, I left. ___, I arrived.（最后）`,
    "Finally",
    ["First", "Because"],
    "Finally引出最后一步。",
  ],
  (i) => [
    `段落衔接：I like the ${places[i]}. It is quiet, ___ I can read there.（所以）`,
    "so",
    ["because", "but"],
    "so将前面的原因接到结果。",
  ],
  (i) => [
    `指代衔接：${names[i]} has a ${objects[i]}. ___ is new.`,
    "It",
    ["They", "We"],
    "用It避免重复单数物品。",
  ],
  (i) => [
    `同一主题段落里，哪一句符合“${names[i]}的爱好”？`,
    `${names[i]} likes drawing.`,
    ["The bus is late.", "The door is red."],
    "同一段围绕同一主题选择信息。",
  ],
]);
loop("expression.revision", [
  (i) => [
    `修订主谓一致：${names[i]} are ${attributes[i]}. 只写替换are的词。`,
    "is",
    ["am", "be"],
    "修订时先检查主语与动词一致。",
  ],
  (i) => [
    `修订时间一致：Yesterday, ${names[i]} plays football. 只写替换plays的词。`,
    "played",
    ["play", "playing"],
    "过去时间与过去式一致。",
  ],
  (i) => [
    `修订衔接：I like the ${places[i]}. It is quiet. 用“因为”连接，只写连接词。`,
    "because",
    ["but", "or"],
    "I like...because...让原因清楚。",
  ],
  (i) => [
    `修订代词：${names[i]} has a ${objects[i]}. They is new. 只写替换They的词。`,
    "It",
    ["He", "We"],
    "单个物品使用it。",
  ],
  (i) => [
    `修订问号：Where is ${names[i]}. 句末应改为什么符号？`,
    "?",
    [".", ","],
    "特殊疑问句通常以问号结束。",
  ],
]);
export default bank;
