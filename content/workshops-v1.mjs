// Original controlled classification and editing tasks; no textbook mapping.
const banks = [];
function bank(id, title, grade, skill, rule, groups, repairs) {
  banks.push({ id, title, grade, skill, rule, groups: groups.map(([label, text]) => ({label, cards:text.split(";")})), repairs:repairs.trim().split("\n").map(line => { const [target, sentence, replacement, meaning] = line.trim().split("|"); return { target:Number(target), sentence, replacement, meaning }; }) });
}
bank("articles", "a和an的声音分篮", 1, "grammar.articles", "按词开头的音选a或an；这里的词按常见英语发音分类，不能只看字母。", [
  ["前面用a · 辅音开头", "book;kite;ball;toy"], ["前面用an · 元音开头", "apple;orange;eraser;umbrella"]
], `
0|This is [an] book.|a|这是一本书。
1|I have [an] kite.|a|我有一只风筝。
2|It is [an] ball.|a|这是一个球。
3|She has [an] toy.|a|她有一个玩具。
4|This is [a] apple.|an|这是一个苹果。
5|He has [a] orange.|an|他有一个橙子。
6|It is [a] eraser.|an|这是一块橡皮。
7|I need [a] umbrella.|an|我需要一把雨伞。
`);
bank("plurals", "复数词尾小工厂", 1, "morphology.noun.plural", "这里按常见复数规则分拣：加s、加es、辅音字母加y变ies，或记住不规则形式。toy和day里的y前是元音字母，直接加s。", [
  ["直接加-s", "book;toy;day;key"], ["加-es", "box;bus;watch;dish"], ["y变成-ies", "baby;city;story;party"], ["不规则变化", "child;mouse;man;foot"]
], `
0|I have two [book].|books|我有两本书。
1|There are three [toy] here.|toys|这里有三个玩具。
4|We need four [box].|boxes|我们需要四个盒子。
5|Two [bus] are outside.|buses|外面有两辆公交车。
8|The two [baby] are asleep.|babies|这两个婴儿睡着了。
10|I read three [story].|stories|我读了三个故事。
12|Five [child] are playing.|children|五个孩子在玩。
15|My two [foot] are cold.|feet|我的双脚很冷。
`);
bank("be", "主语和be找伙伴", 1, "grammar.be.present", "现在时里，I配am；单数的he、she、it或一个名字配is；you、we、they和复数主语配are。", [
  ["空格用am", "I ___ happy.;I ___ seven.;I ___ ready.;I ___ hungry."], ["空格用is", "She ___ here.;He ___ kind.;It ___ red.;Ben ___ tired."], ["空格用are", "We ___ friends.;They ___ ready.;You ___ kind.;The cats ___ small."]
], `
0|I [is] happy.|am|我很开心。
1|I [are] seven.|am|我七岁。
4|She [are] here.|is|她在这里。
5|He [am] kind.|is|他很友善。
6|It [are] red.|is|它是红色的。
8|We [is] friends.|are|我们是朋友。
9|They [am] ready.|are|他们准备好了。
10|You [is] kind.|are|你很友善。
`);
bank("there-be", "房间里有几个", 2, "grammar.there-be.present", "介绍眼前场景，单数可数名词用There is，复数可数名词用There are。本组只练可数物品。", [
  ["用There is", "one lamp;a desk;one bed;a chair"], ["用There are", "two lamps;three desks;four beds;five chairs"]
], `
0|There [are] one lamp here.|is|这里有一盏灯。
1|There [are] a desk in the room.|is|房间里有一张书桌。
2|There [are] one bed upstairs.|is|楼上有一张床。
3|There [are] a chair by the door.|is|门边有一把椅子。
4|There [is] two lamps here.|are|这里有两盏灯。
5|There [is] three desks in the room.|are|房间里有三张书桌。
6|There [is] four beds upstairs.|are|楼上有四张床。
7|There [is] five chairs by the door.|are|门边有五把椅子。
`);
bank("third-person", "动词三单变形", 3, "morphology.verb.third-person", "一般现在时肯定句里，he、she、it等第三人称单数主语通常让动词变形。本组分直接加s、加es、辅音字母加y变ies。", [
  ["直接加-s", "play;read;walk;like"], ["加-es", "watch;wash;go;fix"], ["y变成-ies", "study;carry;try;cry"]
], `
0|She [play] tennis every day.|plays|她每天打网球。
1|He [read] after dinner.|reads|他晚饭后阅读。
4|Ben [watch] birds on Sundays.|watches|本每逢星期日观鸟。
5|She [wash] her hands before lunch.|washes|她午饭前洗手。
6|He [go] to the park on Saturdays.|goes|他每逢星期六去公园。
8|Mia [study] English after school.|studies|米娅放学后学英语。
9|He [carry] a bag every morning.|carries|他每天早晨提一个包。
10|She [try] a new game each week.|tries|她每周尝试一种新游戏。
`);
bank("ing", "ing词尾变形", 3, "morphology.verb.ing", "本组常见动词分为直接加ing、去末尾不发音e再加ing，或双写末尾辅音再加ing；不要把双写规则套到所有动词。", [
  ["直接加-ing", "play;read;walk;help"], ["去末尾e再加-ing", "make;ride;write;dance"], ["双写末尾辅音再加-ing", "run;swim;sit;stop"]
], `
0|The children are [play] outside.|playing|孩子们正在外面玩。
1|She is [read] a story now.|reading|她现在正在读故事。
4|He is [make] a paper boat.|making|他正在做纸船。
5|Mia is [ride] a bike now.|riding|米娅现在正在骑自行车。
6|I am [write] a card.|writing|我正在写卡片。
8|The dog is [run] in the park.|running|狗正在公园里跑。
9|They are [swim] in the pool.|swimming|他们正在泳池里游泳。
10|Ben is [sit] by the window.|sitting|本正坐在窗边。
`);
bank("now-or-usually", "习惯还是此刻", 3, "grammar.present-contrast", "读完整句子：经常、每天发生的习惯通常用一般现在时；此刻正在进行的动作通常用现在进行时。只用这些有明确情境的句子作对比。", [
  ["日常习惯", "She reads every evening.;We play on Saturdays.;He walks to school every day.;They swim on Sundays."], ["此刻正在进行", "She is reading now.;We are playing at the moment.;Look! He is walking.;Listen! They are singing."]
], `
0|She [read] every evening.|reads|她每天晚上阅读。
1|We [are playing] on Saturdays.|play|我们每逢星期六玩耍。
2|He [walk] to school every day.|walks|他每天步行上学。
3|They [are swimming] on Sundays.|swim|他们每逢星期日游泳。
4|She is [read] now.|reading|她现在正在阅读。
5|We are [play] at the moment.|playing|我们此刻正在玩。
6|Look! He is [walk].|walking|看！他正在走路。
7|Listen! They are [sing].|singing|听！他们正在唱歌。
`);
bank("regular-past", "规则过去式变形", 4, "morphology.verb.regular-past", "本组规则过去式分加ed、末尾e后加d、辅音字母加y变ied和双写末尾辅音再加ed。学规则也要注意适用的词。", [
  ["直接加-ed", "play;look;wash;help"], ["末尾e后加-d", "love;close;move;use"], ["y变成-ied", "study;carry;try;cry"], ["双写末尾辅音再加-ed", "stop;plan;clap;drop"]
], `
0|We [play] chess yesterday.|played|我们昨天下了国际象棋。
1|He [look] at the map last night.|looked|他昨晚看了地图。
4|She [love] the show yesterday.|loved|她很喜欢昨天的演出。
5|Ben [close] the door a minute ago.|closed|本一分钟前关了门。
8|Mia [study] English yesterday.|studied|米娅昨天学了英语。
9|He [carry] the boxes last Monday.|carried|他上周一搬了这些箱子。
12|The bus [stop] here yesterday.|stopped|公交车昨天在这里停了。
13|We [plan] the trip last week.|planned|我们上周计划了旅行。
`);
bank("irregular-past", "原形和过去式", 4, "morphology.verb.irregular-past", "go/went、eat/ate、see/saw、take/took是不规则变化，不能直接加ed。本组先认原形与过去式，再放进过去的句子。", [
  ["动词原形", "go;eat;see;take"], ["动词过去式", "went;ate;saw;took"]
], `
0|We [go] to the zoo yesterday.|went|我们昨天去了动物园。
1|She [eat] a pear last night.|ate|她昨晚吃了一个梨。
2|He [see] a bird a minute ago.|saw|他一分钟前看见一只鸟。
3|I [take] a photo yesterday.|took|我昨天拍了一张照片。
4|Ben [goed] home last night.|went|本昨晚回家了。
5|We [eated] lunch at noon yesterday.|ate|我们昨天中午吃了午饭。
6|Mia [seed] a rainbow yesterday.|saw|米娅昨天看见了彩虹。
7|They [taked] the bus last Monday.|took|他们上周一乘了公交车。
`);
bank("comparison", "比较级变形阶梯", 5, "morphology.adjective.comparison", "本组比较级分常见短词加er、辅音字母加y变ier和长词前加more；这里不泛化到所有词，也不处理可能有两种合法比较形式的词。", [
  ["直接加-er", "tall;short;old;fast"], ["y变成-ier", "happy;heavy;easy;busy"], ["前面加more", "careful;beautiful;interesting;expensive"]
], `
0|Ben is [tall] than Mia.|taller|本比米娅高。
1|This pencil is [short] than that one.|shorter|这支铅笔比那支短。
4|She is [happy] today than yesterday.|happier|她今天比昨天开心。
5|This bag is [heavy] than mine.|heavier|这个包比我的重。
6|This game is [easy] than that one.|easier|这个游戏比那个容易。
8|He is [careful] than before.|more careful|他比以前更仔细。
9|This garden is [beautiful] than that one.|more beautiful|这个花园比那个美丽。
10|This story is [interesting] than that one.|more interesting|这个故事比那个有趣。
`);
bank("modals", "能力、建议和规则", 5, "grammar.modals", "can表达能做某事，should常表达建议，must可以表达必须遵守的规则。卡片给出明确意图；can/should/must后接动词原形。", [
  ["表达能力 · can", "I know how to swim.;She is able to ride a bike.;He knows how to draw.;They are able to sing."], ["提出建议 · should", "It is a good idea to rest.;I advise you to drink water.;It would be better to ask for help.;My suggestion is to go to bed early."], ["必须遵守 · must", "The rule requires a helmet.;This rule requires everyone to stop.;The sign says it is compulsory to wear a seat belt.;The club rules require quiet voices."]
], `
0|I can [swims].|swim|我会游泳。
1|She can [rides] a bike.|ride|她会骑自行车。
4|You should [rests].|rest|你应该休息。
5|He should [drinks] water.|drink|他应该喝水。
6|We should [asks] for help.|ask|我们应该求助。
8|You must [wears] a helmet.|wear|你必须戴头盔。
9|Everyone must [stops] here.|stop|每个人都必须在这里停下。
10|We must [wears] seat belts.|wear|我们必须系安全带。
`);
bank("perfect-or-past", "经历和明确过去", 6, "grammar.present-perfect.intro", "这里用现在完成时谈到现在为止的经历，用一般过去时说明yesterday、last week等明确的过去时间。现在完成时中have/has后要用过去分词。", [
  ["到现在为止的经历", "I have seen a rainbow before.;She has visited the museum twice.;Have you ever eaten mangoes?;We have never been to that park."], ["明确过去时间的事件", "I saw a rainbow yesterday.;She visited the museum last week.;We ate mangoes yesterday.;He went to the park last Sunday."]
], `
0|I have [saw] a rainbow before.|seen|我以前见过彩虹。
1|She has [visit] the museum twice.|visited|她参观过这家博物馆两次。
2|Have you ever [ate] mangoes?|eaten|你吃过芒果吗？
3|We have never [was] to that park.|been|我们从没去过那个公园。
4|I [have seen] a rainbow yesterday.|saw|我昨天看见了彩虹。
5|She [has visited] the museum last week.|visited|她上周参观了博物馆。
6|We [have eaten] mangoes yesterday.|ate|我们昨天吃了芒果。
7|He [has gone] to the park last Sunday.|went|他上周日去了公园。
`);
export default banks;
