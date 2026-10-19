// Original constrained morphology practice. Five observable dimensions per
// topic; different phase slots are different contexts, not open communication.
// Spelling references are recorded in docs/72-reserved-word-forms.md.
const names = [
  "Poppy",
  "Arthur",
  "Esme",
  "Felix",
  "Clara",
  "Jasper",
  "Olive",
  "Miles",
  "Vera",
  "Theo",
  "Hazel",
  "Oscar",
];
const frames = new Map();
const row = (prompt, answer, candidates, rule, alternatives = []) => {
  const accepted = new Set(
    [answer, ...alternatives].map((v) => v.toLowerCase()),
  );
  const wrong = [...new Set(candidates)]
    .filter((v) => !accepted.has(v.toLowerCase()))
    .slice(0, 2);
  if (wrong.length !== 2)
    throw Error("Two distinct incorrect forms required: " + prompt);
  return { prompt, answer, wrong, rule, alternatives };
};
const pairs = (text) => text.split(";").map((s) => s.split(":"));
function spellingDimension(id, label, data, render) {
  if (data.length !== 12)
    throw Error("Twelve authored word entries required: " + id);
  // Extra authoring metadata is not emitted by the immutable v1 compiler.
  return [
    id,
    label,
    (i) => ({
      ...render(data[i], i),
      sourceWord: data[i][0],
      secondForm: data[i][1],
    }),
  ];
}
const nounGroups = [
  [
    "s",
    "通常加s，也留意元音加y",
    "panda:pandas;piano:pianos;radio:radios;zebra:zebras;donkey:donkeys;monkey:monkeys;day:days;key:keys;toy:toys;boy:boys;tray:trays;ray:rays",
  ],
  [
    "es",
    "这些词的复数加es",
    "dish:dishes;bench:benches;box:boxes;brush:brushes;watch:watches;fox:foxes;bus:buses;class:classes;glass:glasses;peach:peaches;church:churches;beach:beaches",
  ],
  [
    "consonant-y",
    "辅音字母加y，变y为ies",
    "pony:ponies;berry:berries;diary:diaries;factory:factories;baby:babies;city:cities;story:stories;family:families;party:parties;library:libraries;cherry:cherries;puppy:puppies",
  ],
  [
    "f-fe",
    "f或fe结尾的变化与例外",
    "thief:thieves;loaf:loaves;leaf:leaves;knife:knives;wife:wives;life:lives;wolf:wolves;shelf:shelves;half:halves;scarf:scarves;roof:roofs;cliff:cliffs",
  ],
  [
    "irregular",
    "不规则变化与单复数同形",
    "goose:geese;ox:oxen;child:children;man:men;woman:women;foot:feet;tooth:teeth;mouse:mice;person:people;sheep:sheep;deer:deer;fish:fish",
  ],
];
frames.set(
  "forms.noun-plural",
  nounGroups.map(([id, label, text]) =>
    spellingDimension(id, label, pairs(text), ([base, answer], i) => {
      const alternatives =
        base === "scarf"
          ? ["scarfs"]
          : base === "person"
            ? ["persons"]
            : base === "fish"
              ? ["fishes"]
              : [];
      const rule =
        id === "f-fe"
          ? `${base}的复数是${answer}。有些f/fe结尾改为ves，roof和cliff则直接加s；要逐词确认。`
          : id === "irregular"
            ? `${base}的常见复数是${answer}，不要一律加s。本题也接受列明的词典变体。`
            : `${base} → ${answer}。${label}。`;
      return row(
        `物品清单${names[i]}：这里不止一个${base}。填写${base}的复数：___。`,
        answer,
        [base, base + "s", base + "es", base.replace(/y$/, "ies"), base + "ed"],
        rule,
        alternatives,
      );
    }),
  ),
);
const thirdGroups = [
  [
    "s",
    "通常直接加s",
    "help:helps;visit:visits;open:opens;listen:listens;paint:paints;read:reads;climb:climbs;wait:waits;need:needs;want:wants;start:starts;finish:finishes",
  ],
  [
    "es",
    "这些词加es",
    "fix:fixes;mix:mixes;wash:washes;watch:watches;catch:catches;teach:teaches;push:pushes;pass:passes;miss:misses;brush:brushes;reach:reaches;touch:touches",
  ],
  [
    "consonant-y",
    "辅音加y，变y为ies",
    "reply:replies;dry:dries;carry:carries;study:studies;try:tries;cry:cries;tidy:tidies;copy:copies;worry:worries;hurry:hurries;fly:flies;empty:empties",
  ],
  [
    "vowel-y",
    "元音加y，保留y加s",
    "obey:obeys;delay:delays;play:plays;enjoy:enjoys;stay:stays;say:says;pay:pays;buy:buys;spray:sprays;display:displays;destroy:destroys;employ:employs",
  ],
  [
    "in-context",
    "在明确的单数主语后用词形",
    "have:has;do:does;go:goes;make:makes;take:takes;give:gives;write:writes;ride:rides;drive:drives;come:comes;see:sees;use:uses",
  ],
];
frames.set(
  "forms.third-person",
  thirdGroups.map(([id, label, text]) =>
    spellingDimension(id, label, pairs(text), ([base, answer], i) =>
      row(
        `${names[i]}的日常活动词卡：主语是一个人的姓名，用一般现在时肯定形式。动词${base}应变成___。（只填写词形）`,
        answer,
        [base, base + "s", base + "es", base + "ing", base + "ed"],
        `${base} → ${answer}。这里主语是一个人的姓名；have、do、go分别留意has、does、goes。`,
      ),
    ),
  ),
);
const ingGroups = [
  [
    "add-ing",
    "直接加ing",
    "paint:painting;read:reading;visit:visiting;wait:waiting;help:helping;cook:cooking;look:looking;climb:climbing;stand:standing;walk:walking;listen:listening;open:opening",
  ],
  [
    "drop-e",
    "去掉不发音的e再加ing",
    "shine:shining;drive:driving;make:making;take:taking;write:writing;ride:riding;dance:dancing;smile:smiling;move:moving;use:using;close:closing;come:coming",
  ],
  [
    "double",
    "这些单音节词双写末字母",
    "hop:hopping;rub:rubbing;run:running;swim:swimming;sit:sitting;stop:stopping;shop:shopping;plan:planning;clap:clapping;skip:skipping;get:getting;put:putting",
  ],
  [
    "keep-y",
    "保留y再加ing",
    "buy:buying;copy:copying;play:playing;enjoy:enjoying;stay:staying;say:saying;try:trying;carry:carrying;study:studying;cry:crying;fly:flying;hurry:hurrying",
  ],
  [
    "special",
    "ie变y与保留e的特例",
    "queue:queuing;dye:dyeing;see:seeing;flee:fleeing;agree:agreeing;free:freeing;tie:tying;lie:lying;die:dying;untie:untying;retie:retying;tiptoe:tiptoeing",
  ],
];
frames.set(
  "forms.ing",
  ingGroups.map(([id, label, text]) =>
    spellingDimension(id, label, pairs(text), ([base, answer], i) =>
      row(
        `${names[i]}在整理动作词卡。这张卡的原形是${base}，请填写它的-ing形式：___。`,
        answer,
        [
          base,
          base + "ing",
          base.replace(/e$/, "ing"),
          base + base.at(-1) + "ing",
          base + "s",
        ],
        `${base} → ${answer}。${id === "special" ? "ie结尾如tie改为tying；see、agree、dye等需保留e。queue的两种列明拼法均可。" : label + "，不要套用所有词都相同的规则。"}`,
        base === "queue" ? ["queueing"] : [],
      ),
    ),
  ),
);
const regularGroups = [
  [
    "add-ed",
    "直接加ed",
    "paint:painted;visit:visited;check:checked;fix:fixed;pack:packed;collect:collected;open:opened;listen:listened;clean:cleaned;help:helped;walk:walked;talk:talked",
  ],
  [
    "add-d",
    "以e结尾直接加d",
    "smile:smiled;dance:danced;close:closed;like:liked;live:lived;move:moved;save:saved;use:used;arrive:arrived;invite:invited;hope:hoped;change:changed",
  ],
  [
    "consonant-y",
    "辅音加y改成ied",
    "reply:replied;empty:emptied;carry:carried;study:studied;try:tried;cry:cried;tidy:tidied;copy:copied;worry:worried;hurry:hurried;dry:dried;fry:fried",
  ],
  [
    "double",
    "这些单音节词双写后加ed",
    "nod:nodded;grab:grabbed;stop:stopped;shop:shopped;plan:planned;clap:clapped;drop:dropped;skip:skipped;hop:hopped;rub:rubbed;chat:chatted;wrap:wrapped",
  ],
  [
    "no-change",
    "保留y或不双写末字母",
    "obey:obeyed;delay:delayed;play:played;enjoy:enjoyed;stay:stayed;spray:sprayed;look:looked;wait:waited;rain:rained;turn:turned;jump:jumped;ask:asked",
  ],
];
frames.set(
  "forms.regular-past",
  regularGroups.map(([id, label, text]) =>
    spellingDimension(id, label, pairs(text), ([base, answer], i) =>
      row(
        `${names[i]}的昨天记录：请将词卡${base}变为一般过去式：___。`,
        answer,
        [
          base,
          base + "ed",
          base + "d",
          base + base.at(-1) + "ed",
          base + "ing",
        ],
        `${base} → ${answer}。${label}。本题只考这张词卡的拼写，不凭-ed拼写判断发音。`,
      ),
    ),
  ),
);
// Twelve distinct lexical targets per dimension, with meaning constrained by
// the requested form. Alternatives are explicit; no automatic verb inference.
const irregular = pairs(
  "begin:began:begun;ring:rang:rung;break:broke:broken;sing:sang:sung;swim:swam:swum;write:wrote:written;choose:chose:chosen;drive:drove:driven;drink:drank:drunk;ride:rode:ridden;speak:spoke:spoken;fall:fell:fallen",
);
const irregularSame = pairs(
  "bring:brought:brought;catch:caught:caught;build:built:built;buy:bought:bought;teach:taught:taught;think:thought:thought;feel:felt:felt;keep:kept:kept;leave:left:left;lose:lost:lost;make:made:made;meet:met:met",
);
const irregularOther = pairs(
  "grow:grew:grown;throw:threw:thrown;fly:flew:flown;know:knew:known;draw:drew:drawn;blow:blew:blown;eat:ate:eaten;give:gave:given;take:took:taken;see:saw:seen;wear:wore:worn;forget:forgot:forgotten",
);
const sameSpelling = pairs(
  "cut:cut:cut;hit:hit:hit;put:put:put;hurt:hurt:hurt;let:let:let;set:set:set;shut:shut:shut;cost:cost:cost;spread:spread:spread;burst:burst:burst;split:split:split;read:read:read",
);
frames.set("forms.irregular-past", [
  spellingDimension(
    "changed-vowel",
    "与原形和过去分词分开",
    irregular,
    ([base, past, pp], i) =>
      row(
        `${names[i]}的过去词卡：${base}的一般过去式是___。`,
        past,
        [base, pp, base + "ed"],
        `${base} → ${past} → ${pp}。这里要一般过去式。`,
      ),
  ),
  spellingDimension(
    "same-past-participle",
    "过去式与过去分词同形",
    irregularSame,
    ([base, past], i) =>
      row(
        `在${names[i]}的词表中，把${base}改成一般过去式：___。`,
        past,
        [base, base + "ed", base + "ing"],
        `${base}的过去式是${past}，过去分词也拼作${past}。`,
      ),
  ),
  spellingDimension(
    "other-changes",
    "其他常见变化",
    irregularOther,
    ([base, past, pp], i) =>
      row(
        `${names[i]}正在回忆昨天。词卡${base}要用一般过去式：___。`,
        past,
        [base, pp, base + "ed"],
        `${base} → ${past} → ${pp}。不要把过去分词放在这里。`,
      ),
  ),
  spellingDimension(
    "same-spelling",
    "拼写相同的过去式",
    sameSpelling,
    ([base, past], i) =>
      row(
        `${names[i]}的过去词卡指定${base}${base === "cost" ? "（花费某金额）" : ""}这个词，不换词。填写它的过去式：___。`,
        past,
        [base + "ed", base + base.at(-1) + "ed", base + "ing"],
        `${base}的过去式拼作${past}。拼写相同不代表所有词的读音也相同；read的过去读音不同。${base === "cost" ? "这里是花费某金额；costed用于估算成本的另一含义。" : ""}`,
      ),
  ),
  spellingDimension(
    "after-did",
    "did或did not后恢复原形",
    irregularOther,
    ([base, past, pp], i) =>
      row(
        `${names[i]}的句框用了did not。括号给出过去式${past}，did not后还原为___。（填写对应原形）`,
        base,
        [past, pp, base + "ed"],
        `did已经表示过去，did not后用原形${base}；这一步不是再填过去式。`,
      ),
  ),
]);
frames.set("forms.past-participle", [
  spellingDimension(
    "three-forms",
    "区分三种词形",
    irregular,
    ([base, past, pp], i) =>
      row(
        `${names[i]}填第三格：${base} / ${past} / ___。（填过去分词）`,
        pp,
        [base, past, base + "ed"],
        `${base} → ${past} → ${pp}。这里填写第三格的过去分词。`,
      ),
  ),
  spellingDimension(
    "same-past",
    "与过去式拼写相同",
    irregularSame,
    ([base, past, pp], i) =>
      row(
        `${names[i]}的完成时词表指定${base}，填写过去分词：___。`,
        pp,
        [base, base + "ed", base + "ing"],
        `${base}的过去式与过去分词都拼作${past}，此题要的是过去分词。`,
      ),
  ),
  spellingDimension(
    "after-have",
    "have或has后的词形",
    irregularOther,
    ([base, past, pp], i) =>
      row(
        `${names[i]}的have/has句框需要${base}的过去分词：___。`,
        pp,
        [base, past, base + "ed"],
        `完成时中have或has后接过去分词${pp}，不用一般过去式${past}。`,
      ),
  ),
  spellingDimension(
    "same-spelling",
    "三种形式拼写相同",
    sameSpelling,
    ([base, , pp], i) =>
      row(
        `${names[i]}整理三形表，指定${base}${base === "cost" ? "（花费某金额）" : ""}的过去分词填写为___。`,
        pp,
        [base + "ed", base + base.at(-1) + "ed", base + "ing"],
        `${base}的过去分词拼作${pp}。拼写相同不等于读音相同。${base === "cost" ? "这里是花费某金额；估算成本的含义会用costed。" : ""}`,
      ),
  ),
  spellingDimension(
    "regular-participle",
    "规则动词的过去分词",
    regularGroups
      .flatMap(([, , text]) => pairs(text))
      .filter((_, i) => i % 5 === 0)
      .slice(0, 12),
    ([base, pp], i) =>
      row(
        `${names[i]}的have/has句框指定规则动词${base}，填过去分词：___。`,
        pp,
        [base, base + "ing", base + "s"],
        `${base}是规则动词，过去分词与过去式同形，均为${pp}。`,
      ),
  ),
]);
const compareGroups = [
  [
    "short",
    "短词的er与est",
    "small:smaller:smallest;tall:taller:tallest;short:shorter:shortest;long:longer:longest;young:younger:youngest;old:older:oldest;fast:faster:fastest;slow:slower:slowest;warm:warmer:warmest;cold:colder:coldest;strong:stronger:strongest;weak:weaker:weakest",
  ],
  [
    "e",
    "e结尾加r与st",
    "nice:nicer:nicest;large:larger:largest;wide:wider:widest;safe:safer:safest;late:later:latest;close:closer:closest;brave:braver:bravest;fine:finer:finest;rare:rarer:rarest;pale:paler:palest;rude:ruder:rudest;wise:wiser:wisest",
  ],
  [
    "y",
    "辅音加y改为ier与iest",
    "tidy:tidier:tidiest;lucky:luckier:luckiest;happy:happier:happiest;easy:easier:easiest;busy:busier:busiest;heavy:heavier:heaviest;funny:funnier:funniest;early:earlier:earliest;noisy:noisier:noisiest;sunny:sunnier:sunniest;dirty:dirtier:dirtiest;hungry:hungrier:hungriest",
  ],
  [
    "double-irregular",
    "双写与不规则变化",
    "wet:wetter:wettest;sad:sadder:saddest;big:bigger:biggest;hot:hotter:hottest;thin:thinner:thinnest;fat:fatter:fattest;mad:madder:maddest;red:redder:reddest;fit:fitter:fittest;good:better:best;bad:worse:worst;far:farther:farthest",
  ],
  [
    "more-most",
    "用more与most的长词",
    "beautiful:more beautiful:most beautiful;colourful:more colourful:most colourful;expensive:more expensive:most expensive;interesting:more interesting:most interesting;careful:more careful:most careful;helpful:more helpful:most helpful;important:more important:most important;difficult:more difficult:most difficult;comfortable:more comfortable:most comfortable;popular:more popular:most popular;dangerous:more dangerous:most dangerous;exciting:more exciting:most exciting",
  ],
];
frames.set(
  "forms.comparison",
  compareGroups.map(([id, label, text]) =>
    spellingDimension(id, label, pairs(text), ([base, comp, sup], i) => {
      const isSuper = i % 2 === 1,
        answer = isSuper ? sup : comp;
      const alternatives =
        base === "far"
          ? [isSuper ? "furthest" : "further"]
          : base === "colourful"
            ? [answer.replace("colour", "color")]
            : [];
      // Constrain old to things' ages; do not show the target spelling in the prompt.
      return row(
        `${names[i]}的比较词卡：${isSuper ? "一组至少三个，写最高级，不写the" : "比较两者，写比较级"}。指定${base}${base === "old" ? "（比较物品年代，不比较亲属长幼）" : ""}${id === "more-most" ? "（用more或most，不用-er/-est）" : ""}：___。`,
        answer,
        [base, isSuper ? comp : sup, base + "er", base + "est"],
        `${base} → ${comp} → ${sup}。${label}；本题指定${isSuper ? "最高级" : "比较级"}。`,
        alternatives,
      );
    }),
  ),
);
const derivedGroups = [
  [
    "un",
    "前缀un表示否定",
    "fair:unfair:不公平;kind:unkind:不友善;safe:unsafe:不安全;lucky:unlucky:不幸运;usual:unusual:不寻常;tidy:untidy:不整洁;healthy:unhealthy:不健康;happy:unhappy:不开心;friendly:unfriendly:不友好;comfortable:uncomfortable:不舒服;clear:unclear:不清楚;able:unable:不能够",
  ],
  [
    "re",
    "前缀re表示再次",
    "read:reread:重读;write:rewrite:重写;use:reuse:再次使用;do:redo:重做;paint:repaint:重新刷漆;build:rebuild:重建;start:restart:重新开始;play:replay:再次播放;open:reopen:重新打开;fill:refill:重新装满;pack:repack:重新打包;check:recheck:再次检查",
  ],
  [
    "person",
    "er结尾表示做事的人",
    "teach:teacher:教师;sing:singer:歌手;work:worker:工人;farm:farmer:农民;paint:painter:画家;read:reader:读者;write:writer:作家;drive:driver:驾驶员;dance:dancer:舞者;swim:swimmer:游泳者;run:runner:跑步者;bake:baker:烘焙师",
  ],
  [
    "ful-less",
    "ful与less的词义",
    "care:careful:小心的;help:helpful:有帮助的;hope:hopeful:满怀希望的;thank:thankful:感激的;use:useful:有用的;colour:colourful:多彩的;care:careless:粗心的;home:homeless:无家可归的;help:helpless:无助的;hope:hopeless:无望的;fear:fearless:无畏的;end:endless:无尽的",
  ],
  [
    "ly-ness",
    "ly与ness的词性和拼写",
    "quick:quickly:快速地;slow:slowly:缓慢地;quiet:quietly:安静地;loud:loudly:大声地;careful:carefully:小心地;happy:happily:快乐地;kind:kindness:善意;happy:happiness:快乐（名词）;dark:darkness:黑暗（名词）;sad:sadness:悲伤（名词）;fair:fairness:公平（名词）;weak:weakness:弱点（名词）",
  ],
];
frames.set(
  "forms.derivation",
  derivedGroups.map(([id, label, text]) =>
    spellingDimension(id, label, pairs(text), ([base, answer, meaning], i) =>
      row(
        `${names[i]}的词义卡：给${base}加本组词缀，组成表示“${meaning}”的词：___。（本组：${label}）`,
        answer,
        [
          base,
          base + "ing",
          base + "ed",
          id === "un" ? "re" + base : "un" + base,
        ],
        `${base} → ${answer}，这里表示“${meaning}”。${label}；词缀不能随意加到所有词上。`,
        answer === "colourful" ? ["colorful"] : [],
      ),
    ),
  ),
);
export default frames;
