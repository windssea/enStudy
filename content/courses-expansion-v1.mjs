// Original second-unit lessons. Demonstrations and practice use different
// complete sentences. Grammar drills are controlled text work, not voice tests.
const lessons = [];
const gerund = (verb) =>
  ({
    get: "getting",
    have: "having",
    go: "going",
    take: "taking",
    make: "making",
    ride: "riding",
  })[verb] ?? `${verb}ing`;
const clockZh = (t) => ({ seven: "七", eight: "八", nine: "九" })[t] ?? t;
const nameZh = (name) =>
  ({
    "The children": "孩子们",
    "the children": "孩子们",
    "the boys": "男孩们",
    "The players": "队员们",
    You: "你",
  })[name] ?? name;
const fact = (
  context,
  prompt,
  answer,
  wrong,
  sentence,
  meaning,
  alternatives = [],
) => ({ context, prompt, answer, wrong, sentence, meaning, alternatives });
function add(
  grade,
  index,
  title,
  skill,
  topicIds,
  rule,
  examples,
  vocabulary,
  cases,
  frames,
  task,
) {
  lessons.push({
    id: `P${grade}A-U02-L${index}`,
    unitId: `P${grade}A-U02`,
    grade,
    term: "A",
    order: 4 + index,
    unitLesson: index,
    unitNumber: 2,
    minutes: 7,
    title,
    subtitle: task,
    skill,
    topicIds,
    rule,
    examples: examples.map(([example, translation]) => ({
      example,
      translation,
    })),
    vocabulary: vocabulary.map(([word, meaning]) => ({ word, meaning })),
    facts: frames.flatMap((frame) => cases.map(frame)),
    task,
  });
}
const stationery = [
  ["bag", "a", "书包"],
  ["eraser", "an", "橡皮"],
  ["umbrella", "an", "雨伞"],
];
add(
  1,
  1,
  "a和an，找到合适的伙伴",
  "grammar.articles",
  ["grammar.articles"],
  "第一次介绍一件东西，通常用a或an。听开头的音：元音音素前用an，辅音音素前用a，不能只看字母。",
  [
    ["This is a book.", "这是一本书。"],
    ["I have an apple.", "我有一个苹果。"],
    ["It is an orange.", "这是一个橙子。"],
  ],
  [
    ["bag", "书包"],
    ["eraser", "橡皮"],
    ["umbrella", "雨伞"],
  ],
  stationery,
  [
    ([w, a, z]) =>
      fact(
        `第一次介绍一个${z}，填写a或an。`,
        `This is ___ ${w}.`,
        a,
        [a === "a" ? "an" : "a", "some"],
        `This is ${a} ${w}.`,
        `这是一个${z}。`,
      ),
    ([w, a, z]) =>
      fact(
        `第一次说自己有一个${z}，填写a或an。`,
        `I have ___ ${w}.`,
        a,
        [a === "a" ? "an" : "a", "many"],
        `I have ${a} ${w}.`,
        `我有一个${z}。`,
      ),
    ([w, a, z]) =>
      fact(
        `第一次说这是什么，填写a或an。`,
        `It is ___ ${w}.`,
        a,
        [a === "a" ? "an" : "a", "two"],
        `It is ${a} ${w}.`,
        `这是一个${z}。`,
      ),
  ],
  "打开书包，用a或an介绍两件自己的物品。",
);
const things = [
  ["ruler", "尺子"],
  ["pencil", "铅笔"],
  ["book", "书"],
];
add(
  1,
  2,
  "This is和That is",
  "grammar.demonstratives",
  ["grammar.be"],
  "this指较近的一件东西，that指较远的一件东西。介绍一件东西用This is…或That is…，这里的is不变成are。",
  [
    ["This is my bag.", "这是我的书包。"],
    ["That is a kite.", "那是一个风筝。"],
    ["This is your cup.", "这是你的杯子。"],
  ],
  [
    ["this", "这个"],
    ["that", "那个"],
    ["ruler", "尺子"],
  ],
  things,
  [
    ([w, z]) =>
      fact(
        `介绍手边自己的${z}，填写be动词。`,
        `This ___ my ${w}.`,
        "is",
        ["am", "are"],
        `This is my ${w}.`,
        `这是我的${z}。`,
      ),
    ([w, z]) =>
      fact(
        `介绍远处的一件${z}，填写be动词。`,
        `That ___ a ${w}.`,
        "is",
        ["am", "are"],
        `That is a ${w}.`,
        `那是一个${z}。`,
      ),
    ([w, z]) =>
      fact(
        `介绍手边对方的${z}，填写be动词。`,
        `This ___ your ${w}.`,
        "is",
        ["am", "are"],
        `This is your ${w}.`,
        `这是你的${z}。`,
      ),
  ],
  "和家长把物品放近或放远，分别用This is和That is介绍。",
);
const coloured = [
  ["ruler", "blue", "蓝色", "尺子"],
  ["bag", "green", "绿色", "书包"],
  ["pencil", "yellow", "黄色", "铅笔"],
];
add(
  1,
  3,
  "把颜色放进句子里",
  "vocabulary.colours",
  ["vocabulary.context"],
  "颜色词可以放在物品前，如a red book；也可以放在is后，如The book is red。先看中文情景，不能只凭猜测选择颜色。",
  [
    ["This is a red book.", "这是一本红色的书。"],
    ["The cup is orange.", "杯子是橙色的。"],
    ["I have a pink bag.", "我有一个粉色的书包。"],
  ],
  [
    ["blue", "蓝色"],
    ["green", "绿色"],
    ["yellow", "黄色"],
  ],
  coloured,
  [
    ([w, c, z, n]) =>
      fact(
        `介绍一件${z}的${n}。`,
        `This is a ___ ${w}.`,
        c,
        ["red", "pink"],
        `This is a ${c} ${w}.`,
        `这是一个${z}的${n}。`,
      ),
    ([w, c, z, n]) =>
      fact(
        `这件${n}是${z}的。`,
        `The ${w} is ___.`,
        c,
        ["red", "pink"],
        `The ${w} is ${c}.`,
        `${n}是${z}的。`,
      ),
    ([w, c, z, n]) =>
      fact(
        `我有一个${z}的${n}。`,
        `I have a ___ ${w}.`,
        c,
        ["red", "pink"],
        `I have a ${c} ${w}.`,
        `我有一个${z}的${n}。`,
      ),
  ],
  "找两种颜色的文具，告诉家长它们是什么颜色。",
);
add(
  1,
  4,
  "我的小小书包展",
  "grammar.demonstratives",
  ["grammar.articles", "grammar.be"],
  "先说This is，再说a/an、颜色和物品。a/an看紧跟着它的单词开头的音：a blue bag、an orange bag。",
  [
    ["This is a black pen.", "这是一支黑色的钢笔。"],
    ["That is an orange box.", "那是一个橙色的盒子。"],
    ["My book is red.", "我的书是红色的。"],
  ],
  [
    ["my", "我的"],
    ["your", "你的"],
    ["colour", "颜色"],
  ],
  coloured,
  [
    ([w, c, z, n]) =>
      fact(
        `第一次介绍近处一件${z}的${n}，填写a或an。`,
        `This is ___ ${c} ${w}.`,
        "a",
        ["an", "many"],
        `This is a ${c} ${w}.`,
        `这是一个${z}的${n}。`,
      ),
    ([w, c, z, n]) =>
      fact(
        `介绍远处一件${z}的${n}，填写be动词。`,
        `That ___ a ${c} ${w}.`,
        "is",
        ["am", "are"],
        `That is a ${c} ${w}.`,
        `那是一个${z}的${n}。`,
      ),
    ([w, c, z, n]) =>
      fact(
        `告诉朋友：我的${n}是${z}的。`,
        `My ${w} is ___.`,
        c,
        ["red", "pink"],
        `My ${w} is ${c}.`,
        `我的${n}是${z}的。`,
      ),
  ],
  "办一个一分钟书包展，用完整句子介绍两件物品。",
);
const skills = [
  ["Ben", "he", "swim", "swimming", "游泳"],
  ["Amy", "she", "draw a cat", "drawing a cat", "画一只猫"],
  ["Leo", "he", "ride a bike", "riding a bike", "骑自行车"],
];
add(
  2,
  1,
  "Can放前面，问问能不能",
  "grammar.modals",
  ["grammar.modals", "sentence.yes-no"],
  "询问能力，用Can加人物加动词原形。can没有三单变化，后面的动词不加s，也不变成-ing。",
  [
    ["Can Lily dance?", "Lily会跳舞吗？"],
    ["Can you sing?", "你会唱歌吗？"],
    ["Can they run?", "他们会跑步吗？"],
  ],
  [
    ["swim", "游泳"],
    ["draw", "画画"],
    ["ride", "骑"],
  ],
  skills,
  [
    ([n, p, v, ing, z]) =>
      fact(
        `询问${n}有没有${z}的能力，填写情态动词。`,
        `___ ${n} ${v}?`,
        "Can",
        ["Does", "Is"],
        `Can ${n} ${v}?`,
        `${n}会${z}吗？`,
      ),
    ([n, p, v, ing, z]) =>
      fact(
        `询问你有没有${z}的能力。`,
        `___ you ${v}?`,
        "Can",
        ["Do", "Are"],
        `Can you ${v}?`,
        `你会${z}吗？`,
      ),
    ([n, p, v, ing, z]) =>
      fact(
        `询问他们有没有${z}的能力，can后填写原形。`,
        `Can they ___?`,
        v,
        [ing, `to ${v}`],
        `Can they ${v}?`,
        `他们会${z}吗？`,
      ),
  ],
  "问家长Can you…?，了解一项家长会做的事情。",
);
add(
  2,
  2,
  "听清能力，再作简短回答",
  "grammar.modals",
  ["grammar.modals", "sentence.yes-no"],
  "能做到时用Yes, … can；做不到时用No, … can't。人物代词要和提问中的人物对应，不能只记Yes或No。",
  [
    ["Can Lily sing? Yes, she can.", "Lily会唱歌吗？会的。"],
    ["Can Tom fly? No, he can't.", "Tom会飞吗？不会。"],
    ["Can you dance? Yes, I can.", "你会跳舞吗？我会。"],
  ],
  [
    ["yes", "是；会"],
    ["no", "不；不会"],
    ["can’t", "不能；不会"],
  ],
  skills,
  [
    ([n, p, v, ing, z]) =>
      fact(
        `${n}会${z}，完成肯定回答。`,
        `Can ${n} ${v}? Yes, ${p} ___.`,
        "can",
        ["can't", "is"],
        `Can ${n} ${v}? Yes, ${p} can.`,
        `${n}会${z}吗？会的。`,
      ),
    ([n, p, v, ing, z]) =>
      fact(
        `${n}还不会${z}，完成否定回答。`,
        `Can ${n} ${v}? No, ${p} ___.`,
        "can't",
        ["can", "does"],
        `Can ${n} ${v}? No, ${p} can't.`,
        `${n}会${z}吗？还不会。`,
        ["cannot"],
      ),
    ([n, p, v, ing, z]) =>
      fact(
        `他们都会${z}，完成肯定回答。`,
        `Can they ${v}? Yes, ___ can.`,
        "they",
        ["he", "she"],
        `Can they ${v}? Yes, they can.`,
        `他们会${z}吗？他们会。`,
      ),
  ],
  "和家长一问一答，用真实情况回答，不把“不会”当作丢脸的事。",
);
add(
  2,
  3,
  "不会，也可以说完整",
  "grammar.modals",
  ["grammar.modals", "sentence.negative"],
  "表达还不会某项技能，可以用can't或cannot加动词原形。can't后不加to；说“现在不会”不代表以后学不会。",
  [
    ["I can't skate.", "我不会滑冰。"],
    ["She cannot dive.", "她不会潜水。"],
    ["We can't fly.", "我们不会飞。"],
  ],
  [
    ["cannot", "不能；不会"],
    ["learn", "学习"],
    ["yet", "还；尚"],
  ],
  skills,
  [
    ([n, p, v, ing, z]) =>
      fact(
        `我现在还不会${z}，用can't或cannot表达。`,
        `I ___ ${v}.`,
        "can't",
        ["can", "am"],
        `I can't ${v}.`,
        `我不会${z}。`,
        ["cannot"],
      ),
    ([n, p, v, ing, z]) =>
      fact(
        `${n}还没有学会${z}，表达没有这项能力。`,
        `${n} ___ ${v} yet.`,
        "can't",
        ["can", "is"],
        `${n} can't ${v} yet.`,
        `${n}还不会${z}。`,
        ["cannot"],
      ),
    ([n, p, v, ing, z]) =>
      fact(
        `我们还不会${z}，can't后用原形。`,
        `We can't ___ yet.`,
        v,
        [ing, `to ${v}`],
        `We can't ${v} yet.`,
        `我们还不会${z}。`,
      ),
  ],
  "选择一项想学的技能，说I can't…yet，再和家长定一个小练习。",
);
add(
  2,
  4,
  "小小技能调查员",
  "grammar.modals",
  ["grammar.modals"],
  "调查先问Can you…?，再按真实回答报告人物能做什么。can跟不同人物搭配都不加s。这里只练句子，真实对话可在生活任务里尝试。",
  [
    ["Can you cook?", "你会做饭吗？"],
    ["Mia can dance.", "Mia会跳舞。"],
    ["Sam can't skate yet.", "Sam还不会滑冰。"],
  ],
  [
    ["ask", "问"],
    ["friend", "朋友"],
    ["skill", "技能"],
  ],
  skills,
  [
    ([n, p, v, ing, z]) =>
      fact(
        `调查表显示${n}会${z}，填写can。`,
        `${n} ___ ${v} well.`,
        "can",
        ["can't", "is"],
        `${n} can ${v} well.`,
        `${n}${z}很熟练。`,
      ),
    ([n, p, v, ing, z]) =>
      fact(
        `调查表显示${n}和朋友都会${z}，can后用原形。`,
        `${n} and a friend can ___.`,
        v,
        [ing, `to ${v}`],
        `${n} and a friend can ${v}.`,
        `${n}和一个朋友都会${z}。`,
      ),
    ([n, p, v, ing, z]) =>
      fact(
        `老师问${n}会不会${z}；${n}回答自己会。`,
        `Can you ${v}, ${n}? Yes, ___ can.`,
        "I",
        ["he", "they"],
        `Can you ${v}, ${n}? Yes, I can.`,
        `你会${z}吗，${n}？我会。`,
      ),
  ],
  "问两位家人会做什么，再用姓名加can向另一位家人报告。",
);
const habits = [
  ["Ben", "He", "plays", "play", "playing", "football", "踢足球"],
  ["Amy", "She", "reads", "read", "reading", "a book", "读书"],
  ["Leo", "He", "washes", "wash", "washing", "the cups", "洗杯子"],
];
add(
  3,
  1,
  "他和她，每天做什么",
  "grammar.present-simple",
  ["tense.present-simple", "forms.third-person"],
  "讲经常做的事用一般现在时。he、she或一个人的姓名作主语，肯定句动词常用三单形式：play→plays、read→reads、wash→washes。",
  [
    ["Mia walks to school.", "Mia步行上学。"],
    ["He watches birds.", "他观察小鸟。"],
    ["She studies English.", "她学习英语。"],
  ],
  [
    ["every day", "每天"],
    ["play", "玩；参加运动"],
    ["wash", "洗"],
  ],
  habits,
  [
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `讲${n}每天的习惯。`,
        `${n} ___ ${o} every day.`,
        v,
        [b, ing],
        `${n} ${v} ${o} every day.`,
        `${n}每天${z}。`,
      ),
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `讲${n}放学后的经常活动。`,
        `${p} ___ ${o} after school.`,
        v,
        [b, ing],
        `${p} ${v} ${o} after school.`,
        `${p === "He" ? "他" : "她"}放学后${z}。`,
      ),
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `这是${n}周末常做的事。`,
        `${n} often ___ ${o} at weekends.`,
        v,
        [b, ing],
        `${n} often ${v} ${o} at weekends.`,
        `${n}周末经常${z}。`,
      ),
  ],
  "选择家里一位成员，用姓名加动词三单说一件常做的事。",
);
add(
  3,
  2,
  "Does带头来提问",
  "grammar.questions.yes-no",
  ["tense.present-simple", "sentence.yes-no"],
  "询问一个人经常做什么，可以用Does加人物加动词原形。Does已经标记三单，后面的动词不要再加s。",
  [
    ["Does Mia walk to school?", "Mia步行上学吗？"],
    ["Does he watch birds?", "他经常观察小鸟吗？"],
    ["When does she study English?", "她什么时候学英语？"],
  ],
  [
    ["does", "一般现在时三单助动词"],
    ["when", "什么时候"],
    ["after", "在……之后"],
  ],
  habits,
  [
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `询问${n}是不是每天${z}。`,
        `___ ${n} ${b} ${o} every day?`,
        "Does",
        ["Do", "Is"],
        `Does ${n} ${b} ${o} every day?`,
        `${n}每天${z}吗？`,
      ),
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `Does已经在前面，后面填动词原形。`,
        `Does ${p.toLowerCase()} ___ ${o} after school?`,
        b,
        [v, ing],
        `Does ${p.toLowerCase()} ${b} ${o} after school?`,
        `${p === "He" ? "他" : "她"}放学后${z}吗？`,
      ),
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `询问${n}通常什么时候${z}。`,
        `When ___ ${n} ${b} ${o}?`,
        "does",
        ["do", "is"],
        `When does ${n} ${b} ${o}?`,
        `${n}什么时候${z}？`,
      ),
  ],
  "用Does…?问家长关于另一位家人的一个日常习惯。",
);
add(
  3,
  3,
  "doesn't后，动词回原形",
  "grammar.sentence.negative",
  ["tense.present-simple", "sentence.negative"],
  "he、she或一个人的姓名作主语时，表示不常做某事用doesn't/does not加动词原形。不要同时写doesn't和动词三单。",
  [
    ["Mia doesn't walk to school.", "Mia不步行上学。"],
    ["He does not watch birds.", "他不观察小鸟。"],
    ["She doesn't study French.", "她不学法语。"],
  ],
  [
    ["doesn't", "不（一般现在时三单）"],
    ["usually", "通常"],
    ["evening", "晚上"],
  ],
  habits,
  [
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `说明${n}不在周一${z}。`,
        `${n} ___ ${b} ${o} on Mondays.`,
        "doesn't",
        ["don't", "isn't"],
        `${n} doesn't ${b} ${o} on Mondays.`,
        `${n}周一不${z}。`,
        ["does not"],
      ),
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `doesn't后用动词原形。`,
        `${p} doesn't ___ ${o} at school.`,
        b,
        [v, ing],
        `${p} doesn't ${b} ${o} at school.`,
        `${p === "He" ? "他" : "她"}不在学校${z}。`,
      ),
    ([n, p, v, b, ing, o, z]) =>
      fact(
        `说明${n}不在每天晚上${z}。`,
        `${n} does not ___ ${o} every evening.`,
        b,
        [v, ing],
        `${n} does not ${b} ${o} every evening.`,
        `${n}并不是每天晚上都${z}。`,
      ),
  ],
  "先说一位家人常做什么，再说一件他或她不常做的事。",
);
const routines = [
  ["Mia", "gets", "get", "up", "起床", "seven"],
  ["Ben", "has", "have", "breakfast", "吃早饭", "eight"],
  ["Amy", "goes", "go", "to school", "上学", "nine"],
];
add(
  3,
  4,
  "朋友的一天小档案",
  "grammar.present-simple",
  ["tense.present-simple", "grammar.prepositions"],
  "描述作息时，先说人物和活动，再说时间。整点前用at；问句里有Does时动词回原形。几点起床不是能力高低，没有统一优秀作息分数。",
  [
    ["Sam gets up at six.", "Sam六点起床。"],
    ["Lily has breakfast at seven.", "Lily七点吃早饭。"],
    ["Does Tom go to school at eight?", "Tom八点去学校吗？"],
  ],
  [
    ["breakfast", "早饭"],
    ["get up", "起床"],
    ["at", "在（几点）"],
  ],
  routines,
  [
    ([n, v, b, o, z, t]) =>
      fact(
        `记录${n}${clockZh(t)}点${z}的习惯。`,
        `${n} ___ ${o} at ${t}.`,
        v,
        [b, gerund(b)],
        `${n} ${v} ${o} at ${t}.`,
        `${n}${clockZh(t)}点${z}。`,
      ),
    ([n, v, b, o, z, t]) =>
      fact(
        `整点前用at，记录${n}的作息。`,
        `Every day, ${n} ${v} ${o} ___ ${t}.`,
        "at",
        ["on", "in"],
        `Every day, ${n} ${v} ${o} at ${t}.`,
        `${n}每天${clockZh(t)}点${z}。`,
      ),
    ([n, v, b, o, z, t]) =>
      fact(
        `询问${n}是不是${clockZh(t)}点${z}，Does后用原形。`,
        `Does ${n} ___ ${o} at ${t}?`,
        b,
        [v, gerund(b)],
        `Does ${n} ${b} ${o} at ${t}?`,
        `${n}${clockZh(t)}点${z}吗？`,
      ),
  ],
  "问一位家人一天中的两个活动时间，写下两句小记录。",
);
const pastSubjects = [
  ["I", "was", "我"],
  ["We", "were", "我们"],
  ["Ben", "was", "Ben"],
];
add(
  4,
  1,
  "昨天的was和were",
  "grammar.be.past",
  ["tense.past-simple", "grammar.be"],
  "描述过去的状态，I/he/she/it和单个人物常用was，you/we/they常用were。先确认说的是过去，再看主语。",
  [
    ["She was excited yesterday.", "她昨天很兴奋。"],
    ["They were quiet last night.", "他们昨晚很安静。"],
    ["You were busy on Sunday.", "你周日很忙。"],
  ],
  [
    ["yesterday", "昨天"],
    ["was", "过去的am/is"],
    ["were", "过去的are"],
  ],
  pastSubjects,
  [
    ([s, v, z]) =>
      fact(
        `描述${z}昨天的心情。`,
        `${s} ___ happy yesterday.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `${s} ${v} happy yesterday.`,
        `${z}昨天很开心。`,
      ),
    ([s, v, z]) =>
      fact(
        `描述${z}昨晚的状态。`,
        `${s} ___ tired last night.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `${s} ${v} tired last night.`,
        `${z}昨晚很累。`,
      ),
    ([s, v, z]) =>
      fact(
        `描述${z}上周五的状态。`,
        `${s} ___ ready last Friday.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `${s} ${v} ready last Friday.`,
        `${z}上周五准备好了。`,
      ),
  ],
  "回想昨天一件小事，用I was…说说当时的状态。",
);
const pastPlaces = [
  ["Mia", "was", "at the library", "在图书馆"],
  ["The children", "were", "in the garden", "在花园里"],
  ["You", "were", "at home", "在家"],
];
add(
  4,
  2,
  "上周末，你在哪里",
  "grammar.be.past",
  ["tense.past-simple", "grammar.prepositions"],
  "讲过去在什么地方，用was/were加地点。不要因为出现地点就忘记过去时间；地点介词按整个短语学习，如at home、in the garden。",
  [
    ["Sam was at the park.", "Sam当时在公园。"],
    ["We were in the classroom.", "我们当时在教室里。"],
    ["She was at school yesterday.", "她昨天在学校。"],
  ],
  [
    ["library", "图书馆"],
    ["garden", "花园"],
    ["home", "家"],
  ],
  pastPlaces,
  [
    ([s, v, p, z]) =>
      fact(
        `说${nameZh(s)}上周六${z}，填写过去的be。`,
        `${s} ___ ${p} last Saturday.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `${s} ${v} ${p} last Saturday.`,
        `${nameZh(s)}上周六${z}。`,
      ),
    ([s, v, p, z]) => {
      const subject =
        s === "The children" ? "the children" : s === "You" ? "you" : s;
      return fact(
        `说${nameZh(s)}昨天${z}，填写过去的be。`,
        `Yesterday, ${subject} ___ ${p}.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `Yesterday, ${subject} ${v} ${p}.`,
        `昨天，${nameZh(s)}${z}。`,
      );
    },
    ([s, v, p, z]) =>
      fact(
        `说${nameZh(s)}上周日早上${z}。`,
        `${s} ___ ${p} on Sunday morning.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `${s} ${v} ${p} on Sunday morning.`,
        `${nameZh(s)}上周日早上${z}。`,
      ),
  ],
  "和家长互相说说上周末去过哪里，不必去过远方才有故事。",
);
const pastPeople = [
  ["Ben", "he", "was"],
  ["Amy", "she", "was"],
  ["the boys", "they", "were"],
];
add(
  4,
  3,
  "Was和Were，问答接起来",
  "grammar.be.past",
  ["tense.past-simple", "sentence.yes-no"],
  "过去的be问句把Was/Were放前面。肯定回答用Yes, 人物代词was/were；否定回答用No, 人物代词wasn't/weren't，主语搭配不变。",
  [
    ["Was Lily busy? Yes, she was.", "Lily当时忙吗？是的。"],
    ["Were they late? No, they weren't.", "他们当时迟到了吗？没有。"],
    ["Was Sam at home? No, he wasn't.", "Sam当时在家吗？不在。"],
  ],
  [
    ["busy", "忙碌的"],
    ["late", "迟到的"],
    ["wasn't", "was not的缩写"],
  ],
  pastPeople,
  [
    ([n, p, v]) =>
      fact(
        `询问${n}昨天是否开心。`,
        `___ ${n} happy yesterday?`,
        v === "was" ? "Was" : "Were",
        [v === "was" ? "Were" : "Was", "Did"],
        `${v === "was" ? "Was" : "Were"} ${n} happy yesterday?`,
        `${n}昨天开心吗？`,
      ),
    ([n, p, v]) =>
      fact(
        `${n}昨天很累，补全肯定回答。`,
        `${v === "was" ? "Was" : "Were"} ${n} tired? Yes, ${p} ___.`,
        v,
        [v === "was" ? "were" : "was", "did"],
        `${v === "was" ? "Was" : "Were"} ${n} tired? Yes, ${p} ${v}.`,
        `${n}当时累吗？是的。`,
      ),
    ([n, p, v]) =>
      fact(
        `${n}当时没有迟到，补全否定回答。`,
        `${v === "was" ? "Was" : "Were"} ${n} late? No, ${p} ___.`,
        v === "was" ? "wasn't" : "weren't",
        [v, "didn't"],
        `${v === "was" ? "Was" : "Were"} ${n} late? No, ${p} ${v === "was" ? "wasn't" : "weren't"}.`,
        `${n}当时迟到了吗？没有。`,
        [v === "was" ? "was not" : "were not"],
      ),
  ],
  "和家长一问一答，说两件昨天的真实情况。",
);
add(
  4,
  4,
  "写一张周末小卡片",
  "grammar.be.past",
  ["tense.past-simple"],
  "过去的小记录可以交代时间、地点和感受。用was/were描述当时状态；如果换成动作动词，要另选合适的过去式，不能在was后直接接动作原形。",
  [
    ["I was at a museum on Sunday.", "我周日在一座博物馆。"],
    ["The rooms were quiet.", "房间里很安静。"],
    ["It was an interesting day.", "那是有趣的一天。"],
  ],
  [
    ["weekend", "周末"],
    ["quiet", "安静的"],
    ["interesting", "有趣的"],
  ],
  pastPlaces,
  [
    ([s, v, p, z]) =>
      fact(
        `周末卡片写${nameZh(s)}周六早上${z}。`,
        `${s} ___ ${p} on Saturday morning.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `${s} ${v} ${p} on Saturday morning.`,
        `${nameZh(s)}周六早上${z}。`,
      ),
    ([s, v, p, z]) =>
      fact(
        `周末卡片写${nameZh(s)}当天下午很兴奋。`,
        `${s} ___ excited that afternoon.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `${s} ${v} excited that afternoon.`,
        `${nameZh(s)}当天下午很兴奋。`,
      ),
    ([s, v, p, z]) =>
      fact(
        `周末卡片写${nameZh(s)}当时不累。`,
        `${s} ___ not tired then.`,
        v,
        [v === "was" ? "were" : "was", "be"],
        `${s} ${v} not tired then.`,
        `${nameZh(s)}那时不累。`,
      ),
  ],
  "写一张三句周末卡片：什么时候、在哪里、当时感觉怎样。",
);
const routines5 = [
  ["Mia", "walks", "walk", "步行上学", "to school"],
  ["Ben", "drinks", "drink", "喝水", "water"],
  ["Amy", "plays", "play", "在户外玩", "outside"],
];
add(
  5,
  1,
  "常常还是偶尔",
  "grammar.adverbs.frequency",
  ["grammar.frequency"],
  "always、usually、often、sometimes、never表达频率，通常放在实义动词前。频率反映实际习惯，不用always给孩子打优秀分。",
  [
    ["Sam often rides his bike.", "Sam经常骑自行车。"],
    ["Lily sometimes plays tennis.", "Lily有时打网球。"],
    ["I never swim alone.", "我从不独自游泳。"],
  ],
  [
    ["usually", "通常"],
    ["sometimes", "有时"],
    ["never", "从不"],
  ],
  routines5,
  [
    ([n, v, b, z, o]) =>
      fact(
        `调查表写${n}通常${z}，填写usually。`,
        `${n} ___ ${v} ${o}.`,
        "usually",
        ["never", "rarely"],
        `${n} usually ${v} ${o}.`,
        `${n}通常${z}。`,
      ),
    ([n, v, b, z, o]) =>
      fact(
        `调查表写${n}有时${z}，填写sometimes。`,
        `${n} ___ ${v} ${o} after school.`,
        "sometimes",
        ["always", "never"],
        `${n} sometimes ${v} ${o} after school.`,
        `${n}放学后有时${z}。`,
      ),
    ([n, v, b, z, o]) =>
      fact(
        `调查表写${n}经常${z}，填写often。`,
        `${n} ___ ${v} ${o} at weekends.`,
        "often",
        ["never", "rarely"],
        `${n} often ${v} ${o} at weekends.`,
        `${n}周末经常${z}。`,
      ),
  ],
  "用usually和sometimes记录自己两项真实习惯，不比较谁更优秀。",
);
const adjectives = [
  ["Ben", "He", "tired", "累"],
  ["Amy", "She", "ready", "准备好"],
  ["The players", "They", "quiet", "安静"],
];
add(
  5,
  2,
  "频率词放在哪里",
  "grammar.adverbs.frequency",
  ["grammar.frequency", "grammar.be"],
  "频率副词通常放在be动词后、实义动词前：is often tired，但often plays。通常位置不等于唯一可能位置，本课练中性表达。",
  [
    ["Mia is often busy.", "Mia经常很忙。"],
    ["They are usually helpful.", "他们通常很乐于助人。"],
    ["Tom often practises tennis.", "Tom经常练网球。"],
  ],
  [
    ["often", "经常"],
    ["ready", "准备好的"],
    ["player", "运动员；队员"],
  ],
  adjectives,
  [
    ([n, p, a, z]) =>
      fact(
        `${n}经常${z}，副词放在be之后，填is或are。`,
        `${n} ___ often ${a}.`,
        p === "They" ? "are" : "is",
        [p === "They" ? "is" : "are", "be"],
        `${n} ${p === "They" ? "are" : "is"} often ${a}.`,
        `${n}经常${z}。`,
      ),
    ([n, p, a, z]) =>
      fact(
        `表达${n}通常${z}，填写频率词usually。`,
        `${p} ${p === "They" ? "are" : "is"} ___ ${a}.`,
        "usually",
        ["never", "rarely"],
        `${p} ${p === "They" ? "are" : "is"} usually ${a}.`,
        `${p === "They" ? "他们" : p === "He" ? "他" : "她"}通常${z}。`,
      ),
    ([n, p, a, z]) =>
      fact(
        `记录显示${n}训练从不迟到，填写never。`,
        `${n} ${p === "They" ? "are" : "is"} ___ late for practice.`,
        "never",
        ["always", "often"],
        `${n} ${p === "They" ? "are" : "is"} never late for practice.`,
        `${n}训练从不迟到。`,
      ),
  ],
  "用一组be句和动作句描述习惯，观察频率词的位置。",
);
const degree = [
  ["Mia", "hungry", "饿"],
  ["Ben", "thirsty", "口渴"],
  ["Amy", "tired", "累"],
];
add(
  5,
  3,
  "very和too，意思不一样",
  "grammar.adverbs.degree",
  ["vocabulary.context"],
  "very表示程度高，不自动表示有问题；too在too tired to…这样的结构里表示过度，导致不能做某事。enough放在形容词后，表示足够。",
  [
    ["I am very happy.", "我非常开心。"],
    ["The bag is too heavy to carry.", "书包太重，提不动。"],
    ["He is tall enough to reach it.", "他够高，能够到它。"],
  ],
  [
    ["very", "非常"],
    ["too", "太；过于"],
    ["enough", "足够地"],
  ],
  degree,
  [
    ([n, a, z]) =>
      fact(
        `只说${n}非常${z}，不表示不能做什么，按给定中文填very。`,
        `${n} is ___ ${a} today.`,
        "very",
        ["never", "yesterday"],
        `${n} is very ${a} today.`,
        `${n}今天非常${z}。`,
      ),
    ([n, a, z]) =>
      fact(
        `本句说${n}太累，无法跑步，填写too。`,
        `${n} is ___ tired to run.`,
        "too",
        ["enough", "never"],
        `${n} is too tired to run.`,
        `${n}太累，跑不动了。`,
      ),
    ([n, a, z]) =>
      fact(
        `本句说${n}已经休息够，准备好出发，填写enough。`,
        `${n} is rested ___ to go.`,
        "enough",
        ["too", "very"],
        `${n} is rested enough to go.`,
        `${n}休息够了，可以出发。`,
      ),
  ],
  "和家长比较very tired与too tired to run，不用健康情况给自己贴标签。",
);
const health = [
  ["Ben", "He", "takes", "take", "a walk", "散步"],
  ["Amy", "She", "drinks", "drink", "water", "喝水"],
  ["The children", "They", "play", "play", "outside", "在户外玩"],
];
add(
  5,
  4,
  "读一张习惯调查表",
  "grammar.adverbs.frequency",
  ["grammar.frequency", "grammar.modals"],
  "读调查先分清“多常”和“多大程度”，再给温和建议。建议可以用could加动词原形；建议只是一个选择，对方可以决定是否采纳。",
  [
    ["Lily often walks with her family.", "Lily经常和家人散步。"],
    ["She is sometimes tired.", "她有时感到累。"],
    ["She could take a short break.", "她可以稍作休息。"],
  ],
  [
    ["habit", "习惯"],
    ["survey", "调查"],
    ["break", "休息"],
  ],
  health,
  [
    ([n, p, v, b, o, z]) =>
      fact(
        `调查显示${n}经常${z}，填写often。`,
        `${n} ___ ${v} ${o} after lunch.`,
        "often",
        ["never", "rarely"],
        `${n} often ${v} ${o} after lunch.`,
        `${n}午饭后经常${z}。`,
      ),
    ([n, p, v, b, o, z]) =>
      fact(
        `给${n}一个可选择的建议，could后用原形。`,
        `${p} could ___ ${o} with a friend.`,
        b,
        [`${b}s`, gerund(b)],
        `${p} could ${b} ${o} with a friend.`,
        `${p === "They" ? "他们" : p === "He" ? "他" : "她"}可以和朋友一起${z}。`,
      ),
    ([n, p, v, b, o, z]) =>
      fact(
        `调查说明${n}有时休息一下，填写sometimes。`,
        `${n} ___ ${p === "They" ? "take" : "takes"} a break.`,
        "sometimes",
        ["never", "always"],
        `${n} sometimes ${p === "They" ? "take" : "takes"} a break.`,
        `${n}有时休息一下。`,
      ),
  ],
  "看一位家人的习惯记录，先复述事实，再给一条可选择的温和建议。",
);
const experiences = [
  ["Ben", "he", "visited", "visit", "a museum", "参观博物馆"],
  ["Amy", "she", "made", "make", "a model", "做模型"],
  ["Leo", "he", "ridden", "ride", "a horse", "骑马"],
];
add(
  6,
  1,
  "Have you ever…，聊聊经历",
  "grammar.present-perfect",
  ["tense.present-perfect", "forms.past-participle"],
  "问到现在为止有没有某种经历，可以用Have you ever加过去分词。ever在这里表示曾经。常见变化有visit→visited、make→made、ride→ridden；不要把具体的yesterday接到这类现在完成时句子里。",
  [
    ["Have you ever seen snow?", "你曾见过雪吗？"],
    ["Has Lily ever eaten sushi?", "Lily曾吃过寿司吗？"],
    ["Have they ever flown a kite?", "他们曾放过风筝吗？"],
  ],
  [
    ["ever", "曾经"],
    ["experience", "经历"],
    ["ridden", "ride的过去分词"],
  ],
  experiences,
  [
    ([n, p, v, b, o, z]) =>
      fact(
        `询问对方到现在为止有没有${z}的经历，填写Have。`,
        `___ you ever ${v} ${o}?`,
        "Have",
        ["Has", "Are"],
        `Have you ever ${v} ${o}?`,
        `你曾经${z}吗？`,
      ),
    ([n, p, v, b, o, z]) =>
      fact(
        `询问${n}有没有${z}的经历，填写Has。`,
        `___ ${n} ever ${v} ${o}?`,
        "Has",
        ["Have", "Is"],
        `Has ${n} ever ${v} ${o}?`,
        `${n}曾经${z}吗？`,
      ),
    ([n, p, v, b, o, z]) =>
      fact(
        `Have后要用过去分词。`,
        `Have they ever ___ ${o}?`,
        v,
        [b, gerund(b)],
        `Have they ever ${v} ${o}?`,
        `他们曾经${z}吗？`,
      ),
  ],
  "选择一件愿意分享的小经历问家长Have you ever…?，不要求经历特别。",
);
add(
  6,
  2,
  "never，把没有的经历说清楚",
  "grammar.present-perfect",
  ["tense.present-perfect"],
  "have/has never加过去分词表示到现在为止从未有过某种经历。never本身是否定意思，不再加not。没有某种经历也很正常。",
  [
    ["I have never seen snow.", "我从未见过雪。"],
    ["Lily has never eaten sushi.", "Lily从未吃过寿司。"],
    ["We have never flown a plane.", "我们从未开过飞机。"],
  ],
  [
    ["never", "从未"],
    ["have", "现在完成时助动词"],
    ["has", "三单现在完成时助动词"],
  ],
  experiences,
  [
    ([n, p, v, b, o, z]) =>
      fact(
        `我到现在从未${z}，填写never。`,
        `I have ___ ${v} ${o}.`,
        "never",
        ["ever", "often"],
        `I have never ${v} ${o}.`,
        `我从未${z}。`,
      ),
    ([n, p, v, b, o, z]) =>
      fact(
        `${n}到现在从未${z}，填写has。`,
        `${n} ___ never ${v} ${o}.`,
        "has",
        ["have", "is"],
        `${n} has never ${v} ${o}.`,
        `${n}从未${z}。`,
      ),
    ([n, p, v, b, o, z]) =>
      fact(
        `我们到现在从未${z}，have后用过去分词。`,
        `We have never ___ ${o}.`,
        v,
        [b, gerund(b)],
        `We have never ${v} ${o}.`,
        `我们从未${z}。`,
      ),
  ],
  "用I have never…说一件还没做过的事，也可以选择不分享私人经历。",
);
const pastTrip = [
  ["Ben", "visited", "visit", "a museum", "参观博物馆", "visited"],
  ["Amy", "made", "make", "a model", "做模型", "made"],
  ["Leo", "rode", "ride", "a horse", "骑马", "ridden"],
];
add(
  6,
  3,
  "经历和具体过去时间",
  "grammar.present-perfect",
  ["tense.present-perfect", "tense.past-simple"],
  "Have you ever…?问到现在的经历。追问具体什么时候发生，则用一般过去时，如I saw it yesterday。这里学习两种时间视角，不靠一个时间词机械猜答案。",
  [
    ["Have you ever been to a zoo?", "你曾去过动物园吗？"],
    ["I went there last Sunday.", "我上周日去了那里。"],
    ["When did you go?", "你什么时候去的？"],
  ],
  [
    ["when", "什么时候"],
    ["last", "上一个的"],
    ["yesterday", "昨天"],
  ],
  pastTrip,
  [
    ([n, v, b, o, z, p]) =>
      fact(
        `记录${n}昨天已经完成的具体活动。`,
        `${n} ___ ${o} yesterday.`,
        v,
        [b, `has ${p}`],
        `${n} ${v} ${o} yesterday.`,
        `${n}昨天${z}。`,
      ),
    ([n, v, b, o, z]) =>
      fact(
        `追问${n}具体什么时候${z}，填一般过去时助动词。`,
        `When ___ ${n} ${b} ${o}?`,
        "did",
        ["has", "does"],
        `When did ${n} ${b} ${o}?`,
        `${n}是什么时候${z}的？`,
      ),
    ([n, v, b, o, z]) =>
      fact(
        `已经有did，后面动词回原形。`,
        `Did ${n} ___ ${o} last week?`,
        b,
        [v, gerund(b)],
        `Did ${n} ${b} ${o} last week?`,
        `${n}上周${z}了吗？`,
      ),
  ],
  "先问经历，再在对方愿意分享时用When did…?问具体时间。",
);
add(
  6,
  4,
  "一次友好的经历访谈",
  "grammar.present-perfect",
  ["tense.present-perfect", "sentence.yes-no"],
  "访谈经历先问Have/Has…ever…?，肯定回答用have/has，否定用haven't/hasn't。具体过去时间另用一般过去时；不要求透露隐私或证明经历。",
  [
    ["Have you ever seen a rainbow? Yes, I have.", "你见过彩虹吗？见过。"],
    ["Has Tom ever climbed a hill? No, he hasn't.", "Tom曾爬过山丘吗？没有。"],
    ["I saw a rainbow on Monday.", "我周一见过一道彩虹。"],
  ],
  [
    ["interview", "访谈"],
    ["share", "分享"],
    ["haven't", "have not的缩写"],
  ],
  experiences,
  [
    ([n, p, v, b, o, z]) =>
      fact(
        `${n}有过${z}的经历，完成肯定回答。`,
        `Has ${n} ever ${v} ${o}? Yes, ${p} ___.`,
        "has",
        ["have", "did"],
        `Has ${n} ever ${v} ${o}? Yes, ${p} has.`,
        `${n}曾经${z}吗？有过。`,
      ),
    ([n, p, v, b, o, z]) =>
      fact(
        `${n}没有${z}的经历，完成否定回答。`,
        `Has ${n} ever ${v} ${o}? No, ${p} ___.`,
        "hasn't",
        ["haven't", "didn't"],
        `Has ${n} ever ${v} ${o}? No, ${p} hasn't.`,
        `${n}曾经${z}吗？没有。`,
        ["has not"],
      ),
    ([n, p, v, b, o, z]) =>
      fact(
        `对方问你有没有${z}的经历，你回答自己有过。`,
        `Have you ever ${v} ${o}? Yes, I ___.`,
        "have",
        ["has", "did"],
        `Have you ever ${v} ${o}? Yes, I have.`,
        `你曾经${z}吗？有过。`,
      ),
  ],
  "访谈家长两种平常经历，允许跳过任何不想回答的问题。",
);
export default lessons;
