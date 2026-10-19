// Dedicated controlled-text material. Each row below is an authored task frame,
// not an inference about the cause of a child's mistake or free communication.
const names = [
  "Zoe",
  "Hugo",
  "Iris",
  "Finn",
  "Nina",
  "Owen",
  "Lucy",
  "Noah",
  "Ada",
  "Eli",
  "Rose",
  "Kai",
];
const places = [
  "art room",
  "music room",
  "science room",
  "sports centre",
  "toy shop",
  "bookshop",
  "classroom",
  "dining room",
  "bus stop",
  "train station",
  "school hall",
  "animal centre",
];
const objects = [
  "robot",
  "drum",
  "sketchbook",
  "helmet",
  "ticket",
  "camera",
  "ruler",
  "basket",
  "badge",
  "bottle",
  "puzzle",
  "scarf",
];
const adjectives = [
  "sleepy",
  "hungry",
  "thirsty",
  "safe",
  "warm",
  "cold",
  "early",
  "late",
  "awake",
  "calm",
  "proud",
  "patient",
];
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];
const actions = [
  ["paint", "paints", "painted", "painting", "a wall"],
  ["plant", "plants", "planted", "planting", "a tree"],
  ["open", "opens", "opened", "opening", "the gate"],
  ["close", "closes", "closed", "closing", "the window"],
  ["carry", "carries", "carried", "carrying", "a basket"],
  ["tidy", "tidies", "tidied", "tidying", "the desk"],
  ["visit", "visits", "visited", "visiting", "a friend"],
  ["water", "waters", "watered", "watering", "the flowers"],
  ["check", "checks", "checked", "checking", "the list"],
  ["pack", "packs", "packed", "packing", "a bag"],
  ["fix", "fixes", "fixed", "fixing", "a chair"],
  ["collect", "collects", "collected", "collecting", "the cards"],
];
const irregularActions = [
  ["come", "came", "come", "comes", "coming", "to the animal centre"],
  ["drink", "drank", "drunk", "drinks", "drinking", "some juice"],
  ["eat", "ate", "eaten", "eats", "eating", "a sandwich"],
  ["see", "saw", "seen", "sees", "seeing", "a rainbow"],
  ["take", "took", "taken", "takes", "taking", "a picture"],
  ["make", "made", "made", "makes", "making", "a paper plane"],
  ["find", "found", "found", "finds", "finding", "a shell"],
  ["run", "ran", "run", "runs", "running", "around the field"],
  ["swim", "swam", "swum", "swims", "swimming", "across the pool"],
  ["give", "gave", "given", "gives", "giving", "Alex a badge"],
  ["read", "read", "read", "reads", "reading", "a poem"],
  ["speak", "spoke", "spoken", "speaks", "speaking", "English"],
];
const frames = new Map();
const row = (prompt, answer, wrong, rule, alternatives = []) => ({
  prompt,
  answer,
  wrong,
  rule,
  alternatives,
});
function topic(id, dimensions) {
  frames.set(id, dimensions);
}
// Five observable dimensions per topic. The twelve contexts per dimension are
// disjoint between diagnostic / practice / application / delayed retrieval.
topic("grammar.pronouns", [
  [
    "we",
    "包括自己的复数",
    (i) =>
      row(
        `${names[i]} and I work at the ${places[i]}. ___ work together.`,
        "We",
        ["They", "It"],
        "一群人里包括说话的我，用we。",
      ),
  ],
  [
    "they",
    "其他人的复数",
    (i) =>
      row(
        `${names[i]} and Alex have a ${objects[i]}. ___ share it.`,
        "They",
        ["He", "It"],
        "两个人一起作主语，用they指代。",
      ),
  ],
  [
    "it",
    "单个事物",
    (i) =>
      row(
        `Here is a ${objects[i]}. ___ belongs to ${names[i]}.`,
        "It",
        ["They", "We"],
        "单个物品用it，不用表示复数的they。",
      ),
  ],
  [
    "she",
    "明确为女孩的人物",
    (i) =>
      row(
        `The girl beside ${names[i]} is ${adjectives[i]}. ___ needs a rest.`,
        "She",
        ["He", "They"],
        "材料明确是一个女孩，用she；不根据姓名猜性别。",
      ),
  ],
  [
    "he",
    "明确为男孩的人物",
    (i) =>
      row(
        `The boy at the ${places[i]} has a map. ___ shows it to ${names[i]}.`,
        "He",
        ["She", "They"],
        "材料明确是一个男孩，用he。",
      ),
  ],
]);
topic("grammar.be", [
  [
    "singular",
    "单数主语",
    (i) =>
      row(
        `${names[i]} ___ at the ${places[i]} today.`,
        "is",
        ["am", "are"],
        "一个人的姓名作主语，现在时用is。",
      ),
  ],
  [
    "plural",
    "复数主语",
    (i) =>
      row(
        `${names[i]} and Alex ___ ${adjectives[i]} today.`,
        "are",
        ["is", "am"],
        "两个人是复数主语，用are。",
      ),
  ],
  [
    "i",
    "I与am",
    (i) =>
      row(
        `I ___ beside ${names[i]} at the ${places[i]}.`,
        "am",
        ["is", "are"],
        "现在时中，I与am搭配。",
      ),
  ],
  [
    "negative",
    "be的否定",
    (i) =>
      row(
        `情景：${names[i]}现在不在活动室。${names[i]} ___ at the ${places[i]}.（填写is的否定形式）`,
        "is not",
        ["does not", "are not"],
        "be的否定在is后加not，也可以缩写为isn't。",
        ["isn't"],
      ),
  ],
  [
    "question",
    "be提到问句前",
    (i) =>
      row(
        `问两位朋友是否准备好：___ ${names[i]} and Alex ready for the visit?`,
        "Are",
        ["Is", "Am"],
        "复数主语的be问句把are放在前面。",
      ),
  ],
]);
const vowelNouns = [
  "apricot",
  "insect",
  "owl",
  "envelope",
  "engine",
  "octopus",
  "alligator",
  "avocado",
  "eagle",
  "igloo",
  "oar",
  "ankle",
];
topic("grammar.articles", [
  [
    "vowel",
    "元音开头的声音",
    (i) =>
      row(
        `${names[i]} drew ___ ${vowelNouns[i]} on the card.`,
        "an",
        ["a", "some"],
        "单数可数名词第一次提到，开头是元音音素时用an。",
      ),
  ],
  [
    "consonant",
    "辅音开头的声音",
    (i) =>
      row(
        `${names[i]} found ___ ${objects[i]} near the door.`,
        "a",
        ["an", "some"],
        "单数可数名词第一次提到，开头是辅音音素时用a。",
      ),
  ],
  [
    "known",
    "再次指明同一个物品",
    (i) =>
      row(
        `${names[i]} bought a ${objects[i]}. ___ ${objects[i]} is a gift for Alex.`,
        "The",
        ["A", "An"],
        "第二句明确指前面同一个物品，用the。",
      ),
  ],
  [
    "silent-h",
    "不发音的h",
    (i) =>
      row(
        `${names[i]} waited for ___ hour before entering the ${places[i]}.`,
        "an",
        ["a", "some"],
        "hour的h不发音，开头是元音音素，所以是an hour。",
      ),
  ],
  [
    "you-sound",
    "字母u与实际声音",
    (i) =>
      row(
        `${names[i]} wears ___ uniform to help at the ${places[i]}.`,
        "a",
        ["an", "some"],
        "uniform开头是辅音音素/j/，所以用a uniform；不能只看元音字母。",
      ),
  ],
]);
topic("grammar.countability", [
  [
    "unit",
    "可数名词的一个",
    (i) =>
      row(
        `${names[i]} needs one ___ for the game.（填写${objects[i]}）`,
        objects[i],
        [`${objects[i]}s`, "water"],
        "one后面用可数名词单数。",
      ),
  ],
  [
    "mass-be",
    "不可数名词与is",
    (i) =>
      row(
        `The water in ${names[i]}'s bottle ___ cold.`,
        "is",
        ["are", "am"],
        "water在这里是不可数名词，用is。",
      ),
  ],
  [
    "measure",
    "用容器计量",
    (i) =>
      row(
        `${names[i]} buys two ___ of milk.（两瓶）`,
        "bottles",
        ["bottle", "milks"],
        "计量牛奶用two bottles of milk，把可数的容器bottle变复数。",
      ),
  ],
  [
    "many",
    "数量与可数复数",
    (i) =>
      row(
        `How ___ tickets does ${names[i]} need for the trip?（多少张）`,
        "many",
        ["much", "little"],
        "tickets是可数名词复数，问多少用how many。",
      ),
  ],
  [
    "much",
    "数量与不可数",
    (i) =>
      row(
        `How ___ rice does ${names[i]} want for lunch?（多少）`,
        "much",
        ["many", "few"],
        "rice在这里是不可数名词，问多少用how much。",
      ),
  ],
]);
topic("grammar.quantifiers", [
  [
    "some",
    "普通肯定句",
    (i) =>
      row(
        `${names[i]} has ___ stickers to share.（一些，普通肯定陈述）`,
        "some",
        ["any", "much"],
        "普通肯定陈述中的一些可用some；some也可以用于请求或邀请。",
      ),
  ],
  [
    "any",
    "否定句",
    (i) =>
      row(
        `${names[i]} does not have ___ tickets left.（任何）`,
        "any",
        ["some", "much"],
        "这个否定句用any表示没有任何票。",
      ),
  ],
  [
    "many",
    "可数名词",
    (i) =>
      row(
        `${names[i]} asks: How ___ badges are in the basket?`,
        "many",
        ["much", "little"],
        "badges可数且是复数，数量问句用many。",
      ),
  ],
  [
    "little",
    "少量不可数",
    (i) =>
      row(
        `${names[i]} needs ___ water for the plant.（一点儿，填a little或a few）`,
        "a little",
        ["a few", "many"],
        "water不可数，表示一点儿用a little。",
      ),
  ],
  [
    "few",
    "少量可数",
    (i) =>
      row(
        `${names[i]} takes ___ pencils to the ${places[i]}.（几支，填a few或a little）`,
        "a few",
        ["a little", "much"],
        "pencils是可数名词复数，几支用a few。",
      ),
  ],
]);
topic("grammar.prepositions", [
  [
    "at",
    "具体钟点",
    (i) =>
      row(
        `${names[i]} leaves the ${places[i]} ___ six o'clock.`,
        "at",
        ["on", "in"],
        "具体钟点前用at。",
      ),
  ],
  [
    "on",
    "星期",
    (i) =>
      row(
        `${names[i]} helps at the ${places[i]} ___ ${days[i]}.`,
        "on",
        ["at", "in"],
        "星期几前用on。",
      ),
  ],
  [
    "in",
    "月份",
    (i) =>
      row(
        `${names[i]} starts the art club ___ September.`,
        "in",
        ["on", "at"],
        "月份前用in。",
      ),
  ],
  [
    "under",
    "物品下方",
    (i) =>
      row(
        `位置提示：${names[i]}的${objects[i]}在椅子下。The ${objects[i]} is ___ the chair.`,
        "under",
        ["on", "behind"],
        "under表示在参照物下方；先找清楚椅子这个参照物。",
      ),
  ],
  [
    "behind",
    "物品后方",
    (i) =>
      row(
        `位置提示：${names[i]}在活动室的门后。${names[i]} is ___ the door.`,
        "behind",
        ["under", "in"],
        "behind表示在参照物后方。",
      ),
  ],
]);
topic("grammar.modals", [
  [
    "ability",
    "能力",
    (i) =>
      row(
        `${names[i]} ___ swim without help.（能，表示能力）`,
        "can",
        ["must", "should"],
        "can在这里说明能力。",
      ),
  ],
  [
    "advice",
    "建议",
    (i) =>
      row(
        `${names[i]} feels ${adjectives[i]}. You ___ ask an adult for help.（应该，表示建议）`,
        "should",
        ["must", "cannot"],
        "should常用来给建议。",
      ),
  ],
  [
    "rule",
    "必须遵守的要求",
    (i) =>
      row(
        `安全要求：${names[i]} ___ wear a helmet when riding.（必须）`,
        "must",
        ["can", "may"],
        "must在这条安全要求中表示必须。",
      ),
  ],
  [
    "prohibition",
    "明确禁止",
    (i) =>
      row(
        `禁止触摸展品：${names[i]} ___ touch the model.（用must的否定形式）`,
        "must not",
        ["does not", "should"],
        "must not或mustn't表示不准；不等于不必。",
        ["mustn't"],
      ),
  ],
  [
    "base",
    "情态动词后用原形",
    (i) =>
      row(
        `${names[i]} can ___ ${actions[i][4]}.（使用${actions[i][0]}的正确形式）`,
        actions[i][0],
        [actions[i][1], actions[i][3]],
        "can后接动词原形，不加第三人称单数词尾。",
      ),
  ],
]);
topic("grammar.there-be", [
  [
    "singular",
    "一个事物",
    (i) =>
      row(
        `There ___ a ${objects[i]} beside ${names[i]}'s desk.`,
        "is",
        ["are", "am"],
        "There is后接单数可数名词。",
      ),
  ],
  [
    "plural",
    "多个事物",
    (i) =>
      row(
        `There ___ three tickets in ${names[i]}'s bag.`,
        "are",
        ["is", "am"],
        "three tickets是复数，用There are。",
      ),
  ],
  [
    "mass",
    "不可数事物",
    (i) =>
      row(
        `There ___ some water in ${names[i]}'s cup.`,
        "is",
        ["are", "am"],
        "water不可数，在这个there be句中用is。",
      ),
  ],
  [
    "negative",
    "否定存在",
    (i) =>
      row(
        `情景：${names[i]}的桌上没有相机。There ___ a camera on the desk.（用is的否定形式）`,
        "is not",
        ["are not", "does not"],
        "There is not或There isn't表示没有一个相机。",
        ["isn't"],
      ),
  ],
  [
    "question",
    "询问存在",
    (i) =>
      row(
        `___ there any visitors at the ${places[i]} today?`,
        "Are",
        ["Is", "Am"],
        "询问复数visitors是否存在，把Are放到there前。",
      ),
  ],
]);
topic("grammar.possession", [
  [
    "my",
    "名词前的my",
    (i) =>
      row(
        `${names[i]} asks about your ${objects[i]}. You say: This is ___ ${objects[i]}.（我的）`,
        "my",
        ["mine", "me"],
        "名词前面用my；mine后面不再接这个名词。",
      ),
  ],
  [
    "mine",
    "单独使用mine",
    (i) =>
      row(
        `You tell ${names[i]}: This ${objects[i]} is ___.（我的）`,
        "mine",
        ["my", "me"],
        "这里后面没有名词，单独用mine。",
      ),
  ],
  [
    "name",
    "姓名的所有格",
    (i) =>
      row(
        `这是${names[i]}的物品：It is ___ ${objects[i]}.（用姓名填写）`,
        `${names[i]}'s`,
        [names[i], `${names[i]}s`],
        "单个姓名后加's表示属于这个人。",
      ),
  ],
  [
    "ours",
    "our与ours",
    (i) =>
      row(
        `You and ${names[i]} made this puzzle. This puzzle is ___.（我们的）`,
        "ours",
        ["our", "us"],
        "单独表示我们的，用ours；our后要接名词。",
      ),
  ],
  [
    "their",
    "their与theirs",
    (i) =>
      row(
        `${names[i]} and Alex brought ___ tickets.（他们自己的）`,
        "their",
        ["theirs", "them"],
        "tickets前用their，表示他们的。",
      ),
  ],
]);
topic("grammar.frequency", [
  [
    "always",
    "每次都发生",
    (i) =>
      row(
        `${names[i]} checks the list every time. ${names[i]} ___ checks it.（总是）`,
        "always",
        ["never", "sometimes"],
        "always表示总是、每次都如此。",
      ),
  ],
  [
    "usually",
    "通常发生",
    (i) =>
      row(
        `${names[i]} walks to the ${places[i]} on most days. ${names[i]} ___ walks there.（通常）`,
        "usually",
        ["never", "rarely"],
        "usually表示通常，不是每次都一定发生。",
      ),
  ],
  [
    "sometimes",
    "有时发生",
    (i) =>
      row(
        `${names[i]} goes to the ${places[i]} now and then. ${names[i]} ___ goes there.（有时）`,
        "sometimes",
        ["always", "never"],
        "sometimes表示有时，不等于总是。",
      ),
  ],
  [
    "never",
    "从不发生",
    (i) =>
      row(
        `${names[i]} does not drop litter at any time. ${names[i]} ___ drops litter.（从不）`,
        "never",
        ["always", "often"],
        "never已经有否定意思，这句不用再加not。",
      ),
  ],
  [
    "be-position",
    "频率副词与be",
    (i) =>
      row(
        `要表达${names[i]}总是很守时，哪一句自然？`,
        `${names[i]} is always on time.`,
        [`${names[i]} always is time on.`, `${names[i]} on is always time.`],
        "在这个普通陈述中，always放在be动词is之后。",
      ),
  ],
]);
topic("tense.present-simple", [
  [
    "third",
    "第三人称单数",
    (i) =>
      row(
        `Every Tuesday, ${names[i]} ___ ${actions[i][4]}.（使用${actions[i][0]}）`,
        actions[i][1],
        [actions[i][0], actions[i][3]],
        "习惯用一般现在时；单个人名作主语，动词用第三人称单数形式。",
      ),
  ],
  [
    "plural",
    "复数主语",
    (i) =>
      row(
        `${names[i]} and Alex ___ ${actions[i][4]} every week.（使用${actions[i][0]}）`,
        actions[i][0],
        [actions[i][1], actions[i][3]],
        "复数主语的日常活动用动词原形。",
      ),
  ],
  [
    "negative",
    "does not后接原形",
    (i) =>
      row(
        `${names[i]} does not ___ ${actions[i][4]} on Sundays.（使用${actions[i][0]}）`,
        actions[i][0],
        [actions[i][1], actions[i][2]],
        "does not后面用动词原形，不再加s。",
      ),
  ],
  [
    "question",
    "Does引导问句",
    (i) =>
      row(
        `___ ${names[i]} help at the ${places[i]} every week?`,
        "Does",
        ["Do", "Is"],
        "询问一个人的日常活动，用Does；后面的help保留原形。",
      ),
  ],
  [
    "be",
    "稳定状态与be",
    (i) =>
      row(
        `${names[i]}'s ${objects[i]} ___ blue.（描述现在的颜色）`,
        "is",
        ["are", "am"],
        "描述单个物品当前的状态，可以用一般现在时的is。",
      ),
  ],
]);
topic("tense.present-continuous", [
  [
    "singular",
    "is加ing",
    (i) =>
      row(
        `Look! ${names[i]} ___ ${actions[i][3]} ${actions[i][4]}.`,
        "is",
        ["are", "am"],
        "Look提示正在发生；单数主语用is加动词ing形式。",
      ),
  ],
  [
    "plural",
    "are加ing",
    (i) =>
      row(
        `Right now, ${names[i]} and Alex ___ ${actions[i][3]} ${actions[i][4]}.`,
        "are",
        ["is", "am"],
        "复数主语正在做某事，用are加动词ing形式。",
      ),
  ],
  [
    "i",
    "am加ing",
    (i) =>
      row(
        `I ___ helping ${names[i]} at the ${places[i]} now.`,
        "am",
        ["is", "are"],
        "I正在做某事，用am加动词ing形式。",
      ),
  ],
  [
    "verb",
    "动词ing形式",
    (i) =>
      row(
        `${names[i]} is ___ ${actions[i][4]} at the moment.（使用${actions[i][0]}）`,
        actions[i][3],
        [actions[i][0], actions[i][1]],
        "现在进行时结构是am/is/are加动词ing形式。",
      ),
  ],
  [
    "question",
    "进行时问句",
    (i) =>
      row(
        `___ ${names[i]} helping at the ${places[i]} now?`,
        "Is",
        ["Does", "Do"],
        "现在进行时的问句把be放到主语前，不用does加helping。",
      ),
  ],
]);
topic("tense.present-contrast", [
  [
    "habit",
    "日常习惯",
    (i) =>
      row(
        `${names[i]} ___ ${actions[i][4]} every Friday.（使用${actions[i][0]}）`,
        actions[i][1],
        [actions[i][3], actions[i][2]],
        "every Friday说明习惯，一般现在时用第三人称单数形式。",
      ),
  ],
  [
    "now",
    "此刻动作",
    (i) =>
      row(
        `It is happening now: ${names[i]} is ___ ${actions[i][4]}.（使用${actions[i][0]}）`,
        actions[i][3],
        [actions[i][1], actions[i][0]],
        "明确是此刻正在发生，用is加动词ing形式。",
      ),
  ],
  [
    "plural-habit",
    "复数主语的习惯",
    (i) =>
      row(
        `On school days, ${names[i]} and Alex ___ the list together.（使用check）`,
        "check",
        ["checks", "checking"],
        "习惯用一般现在时，复数主语后用原形check。",
      ),
  ],
  [
    "negative-habit",
    "习惯的否定",
    (i) =>
      row(
        `${names[i]} does not ___ ${actions[i][4]} on Mondays.（使用${actions[i][0]}）`,
        actions[i][0],
        [actions[i][3], actions[i][1]],
        "does not说明一般现在时的否定，后接动词原形。",
      ),
  ],
  [
    "now-question",
    "询问正在发生",
    (i) =>
      row(
        `问此刻是否正在帮助：___ ${names[i]} helping Alex now?`,
        "Is",
        ["Does", "Did"],
        "现在正在帮助是is helping，问句把Is提到前面。",
      ),
  ],
]);
topic("tense.past-simple", [
  [
    "regular",
    "规则过去式",
    (i) =>
      row(
        `Yesterday, ${names[i]} ___ ${actions[i][4]}.（使用${actions[i][0]}）`,
        actions[i][2],
        [actions[i][0], actions[i][3]],
        "Yesterday指已经过去的时间，用相应的过去式。",
      ),
  ],
  [
    "irregular",
    "不规则过去式",
    (i) =>
      row(
        `Last Saturday, ${names[i]} ___ ${irregularActions[i][5]}.（使用${irregularActions[i][0]}）`,
        irregularActions[i][1],
        [irregularActions[i][3], irregularActions[i][4]],
        `${irregularActions[i][0]}的过去式是${irregularActions[i][1]}，需要记住实际词形，不能只加ed。`,
      ),
  ],
  [
    "be",
    "过去的be",
    (i) =>
      row(
        `${names[i]} ___ at the ${places[i]} yesterday.`,
        "was",
        ["is", "were"],
        "单数主语在过去的状态，用was。",
      ),
  ],
  [
    "negative",
    "did not后接原形",
    (i) =>
      row(
        `${names[i]} did not ___ ${actions[i][4]} yesterday.（使用${actions[i][0]}）`,
        actions[i][0],
        [actions[i][2], actions[i][1]],
        "did not后用动词原形，过去的信息已经在did中。",
      ),
  ],
  [
    "question",
    "Did引导过去问句",
    (i) =>
      row(
        `___ ${names[i]} visit the ${places[i]} last week?`,
        "Did",
        ["Does", "Is"],
        "询问过去的活动，用Did，后面visit保留原形。",
      ),
  ],
]);
topic("tense.past-continuous", [
  [
    "was",
    "过去时刻的单数",
    (i) =>
      row(
        `At six yesterday, ${names[i]} ___ ${actions[i][3]} ${actions[i][4]}.`,
        "was",
        ["is", "were"],
        "过去某个时刻正在发生，单数主语用was加ing。",
      ),
  ],
  [
    "were",
    "过去时刻的复数",
    (i) =>
      row(
        `At six yesterday, ${names[i]} and Alex ___ ${actions[i][3]} ${actions[i][4]}.`,
        "were",
        ["was", "are"],
        "复数主语在过去某刻正在做，用were加ing。",
      ),
  ],
  [
    "ing",
    "过去进行中的动词形式",
    (i) =>
      row(
        `${names[i]} was ___ ${actions[i][4]} when the bell rang.（使用${actions[i][0]}）`,
        actions[i][3],
        [actions[i][2], actions[i][0]],
        "was后面用动词ing，表示当时正在进行。",
      ),
  ],
  [
    "question",
    "过去进行时问句",
    (i) =>
      row(
        `___ ${names[i]} waiting at the ${places[i]} at noon yesterday?`,
        "Was",
        ["Did", "Is"],
        "询问过去某刻正在等待，把Was放在主语前。",
      ),
  ],
  [
    "negative",
    "过去进行时否定",
    (i) =>
      row(
        `情景：铃响时${names[i]}没有在画画。${names[i]} ___ drawing when the bell rang.（用was的否定形式）`,
        "was not",
        ["did not", "is not"],
        "过去进行时的否定是was not加ing，也可用wasn't。",
        ["wasn't"],
      ),
  ],
]);
topic("tense.past-contrast", [
  [
    "background",
    "进行中的背景",
    (i) =>
      row(
        `${names[i]} ___ ${actions[i][3]} ${actions[i][4]} when the phone rang.（当时正在）`,
        "was",
        ["is", "did"],
        "背景是过去正在进行的动作，用was加ing。",
      ),
  ],
  [
    "event",
    "突然发生的事件",
    (i) =>
      row(
        `${names[i]} was waiting at the ${places[i]} when the bell ___.（使用ring）`,
        "rang",
        ["ringing", "rings"],
        "铃响是打断背景的过去事件，这里用一般过去式rang。",
      ),
  ],
  [
    "finished",
    "已经完成的过去动作",
    (i) =>
      row(
        `The job was finished yesterday: ${names[i]} ___ ${actions[i][4]}.（使用${actions[i][0]}）`,
        actions[i][2],
        [actions[i][1], actions[i][3]],
        "情景明确这件事已在昨天完成，这里使用一般过去时。",
      ),
  ],
  [
    "parallel",
    "过去同时进行",
    (i) =>
      row(
        `${names[i]} and Alex ___ waiting while the guide was checking the tickets.`,
        "were",
        ["was", "are"],
        "while连接两个当时正在进行的动作；复数主语用were。",
      ),
  ],
  [
    "ongoing-form",
    "背景动作的ing",
    (i) =>
      row(
        `At that moment, ${names[i]} was still ___ ${actions[i][4]}.（使用${actions[i][0]}）`,
        actions[i][3],
        [actions[i][2], actions[i][1]],
        "过去那个时刻仍在做，用was加ing，不把完整动词过去式接在was后。",
      ),
  ],
]);
topic("tense.future", [
  [
    "will",
    "will加原形",
    (i) =>
      row(
        `Tomorrow, ${names[i]} will ___ ${actions[i][4]}.（使用${actions[i][0]}）`,
        actions[i][0],
        [actions[i][1], actions[i][2]],
        "will后面接动词原形。",
      ),
  ],
  [
    "going-to",
    "be going to",
    (i) =>
      row(
        `${names[i]} ___ going to help at the ${places[i]} tomorrow.`,
        "is",
        ["are", "am"],
        "单个人名作主语时，计划结构是is going to。",
      ),
  ],
  [
    "plural",
    "复数计划",
    (i) =>
      row(
        `${names[i]} and Alex ___ going to bring a map tomorrow.`,
        "are",
        ["is", "am"],
        "复数主语的计划结构用are going to。",
      ),
  ],
  [
    "question",
    "will的问句",
    (i) =>
      row(
        `___ ${names[i]} help at the ${places[i]} tomorrow?（使用will）`,
        "Will",
        ["Does", "Was"],
        "will的问句把Will放在主语前；后面的help用原形。",
      ),
  ],
  [
    "negative",
    "will的否定",
    (i) =>
      row(
        `情景：${names[i]}明天不会迟到。${names[i]} ___ be late tomorrow.（使用will的否定形式）`,
        "will not",
        ["does not", "was not"],
        "will not或won't后接be原形。",
        ["won't"],
      ),
  ],
]);
topic("tense.present-perfect", [
  [
    "has",
    "has与单数",
    (i) =>
      row(
        `${names[i]} ___ already finished the model.（使用has或have）`,
        "has",
        ["have", "is"],
        "单数主语的现在完成时用has加过去分词。",
      ),
  ],
  [
    "have",
    "have与复数",
    (i) =>
      row(
        `${names[i]} and Alex ___ already finished the map.（使用has或have）`,
        "have",
        ["has", "are"],
        "复数主语的现在完成时用have加过去分词。",
      ),
  ],
  [
    "participle",
    "过去分词",
    (i) =>
      row(
        `${names[i]} has already ___ ${irregularActions[i][5]}.（使用${irregularActions[i][0]}）`,
        irregularActions[i][2],
        [irregularActions[i][3], irregularActions[i][4]],
        `${irregularActions[i][0]}的过去分词是${irregularActions[i][2]}；has后面用过去分词。`,
      ),
  ],
  [
    "negative",
    "完成时的否定",
    (i) =>
      row(
        `情景：${names[i]}还没有完成作品。${names[i]} ___ finished the work yet.（使用has的否定形式）`,
        "has not",
        ["did not", "is not"],
        "has not或hasn't加过去分词表示到现在尚未完成。",
        ["hasn't"],
      ),
  ],
  [
    "question",
    "完成时的问句",
    (i) =>
      row(
        `___ ${names[i]} and Alex checked the tickets yet?（使用has或have）`,
        "Have",
        ["Has", "Did"],
        "复数主语的完成时问句用Have，后面用过去分词checked。",
      ),
  ],
]);
export default frames;
