// Original constrained practice for each of the 72 catalogued frames.
// Context groups/variants are practice, not independent transfer-test items.
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
  "Nora",
  "Alex",
  "Lucy",
  "Noah",
  "Emma",
  "Ryan",
  "Zoe",
  "Owen",
];
const places = [
  "Hong Kong",
  "London",
  "Beijing",
  "Shanghai",
  "Guangzhou",
  "Shenzhen",
  "Chengdu",
  "Nanjing",
  "Wuhan",
  "Hangzhou",
  "Suzhou",
  "Tianjin",
  "Dalian",
  "Qingdao",
  "Xiamen",
  "Fuzhou",
  "Ningbo",
  "Wuxi",
  "Jinan",
  "Changsha",
];
const nouns = [
  ["my bag", "my bags", "我的书包"],
  ["a book", "two books", "一本书"],
  ["a pencil", "two pencils", "一支铅笔"],
  ["a kite", "two kites", "一只风筝"],
  ["a toy", "two toys", "一个玩具"],
  ["a cup", "two cups", "一个杯子"],
  ["a box", "two boxes", "一个盒子"],
  ["a card", "two cards", "一张卡片"],
  ["a hat", "two hats", "一顶帽子"],
  ["a pen", "two pens", "一支钢笔"],
  ["a ball", "two balls", "一个球"],
  ["a bike", "two bikes", "一辆自行车"],
  ["a chair", "two chairs", "一把椅子"],
  ["a ruler", "two rulers", "一把尺子"],
  ["a clock", "two clocks", "一个钟"],
  ["a flower", "two flowers", "一朵花"],
  ["an apple", "two apples", "一个苹果"],
  ["an orange", "two oranges", "一个橙子"],
  ["an egg", "two eggs", "一个鸡蛋"],
  ["an umbrella", "two umbrellas", "一把伞"],
];
// base phrase, -ing phrase, Chinese meaning
const actions = [
  ["read a story", "reading a story", "读一个故事"],
  ["draw a picture", "drawing a picture", "画一幅画"],
  ["make a kite", "making a kite", "做一只风筝"],
  ["write a letter", "writing a letter", "写一封信"],
  ["play football", "playing football", "踢足球"],
  ["drink some water", "drinking some water", "喝一点水"],
  ["wash the cups", "washing the cups", "洗杯子"],
  ["clean the room", "cleaning the room", "打扫房间"],
  ["do the homework", "doing the homework", "做作业"],
  ["take a photo", "taking a photo", "拍一张照片"],
  ["build a model", "building a model", "搭一个模型"],
  ["paint a picture", "painting a picture", "画一幅彩图"],
  ["play chess", "playing chess", "下国际象棋"],
  ["learn English", "learning English", "学英语"],
  ["watch the birds", "watching the birds", "观察鸟儿"],
  ["feed the ducks", "feeding the ducks", "喂鸭子"],
  ["water the plants", "watering the plants", "给植物浇水"],
  ["visit the museum", "visiting the museum", "参观博物馆"],
  ["open the window", "opening the window", "打开窗户"],
  ["close the door", "closing the door", "关上门"],
];
const feelings = [
  ["fine", "很好"],
  ["happy", "开心"],
  ["tired", "疲倦"],
  ["excited", "兴奋"],
  ["sad", "难过"],
  ["hungry", "饿了"],
  ["thirsty", "渴了"],
  ["sleepy", "困了"],
  ["ready", "准备好了"],
  ["busy", "忙碌"],
  ["well", "身体不错"],
  ["cold", "冷"],
  ["warm", "暖和"],
  ["nervous", "紧张"],
  ["proud", "自豪"],
  ["calm", "平静"],
  ["relaxed", "放松"],
  ["cheerful", "愉快"],
  ["worried", "担心"],
  ["surprised", "惊讶"],
];
const gifts = [
  ["your help", "你的帮助"],
  ["the book", "这本书"],
  ["the card", "这张卡片"],
  ["the gift", "这份礼物"],
  ["your time", "你的时间"],
  ["the flowers", "这些花"],
  ["the invitation", "这份邀请"],
  ["the cake", "这个蛋糕"],
  ["the picture", "这幅画"],
  ["the pencil", "这支铅笔"],
  ["the story", "这个故事"],
  ["your advice", "你的建议"],
  ["the photo", "这张照片"],
  ["the toy", "这个玩具"],
  ["the kite", "这只风筝"],
  ["the apple", "这个苹果"],
  ["the ruler", "这把尺子"],
  ["the map", "这张地图"],
  ["the notebook", "这本笔记本"],
  ["the umbrella", "这把伞"],
];
const likes = [
  ["apples", "苹果"],
  ["oranges", "橙子"],
  ["bananas", "香蕉"],
  ["grapes", "葡萄"],
  ["pears", "梨"],
  ["peaches", "桃子"],
  ["mangoes", "芒果"],
  ["strawberries", "草莓"],
  ["cherries", "樱桃"],
  ["lemons", "柠檬"],
  ["cats", "猫"],
  ["dogs", "狗"],
  ["birds", "鸟"],
  ["rabbits", "兔子"],
  ["stories", "故事"],
  ["books", "书"],
  ["flowers", "花"],
  ["kites", "风筝"],
  ["toys", "玩具"],
  ["puzzles", "拼图"],
];
const offers = [
  ["some water", "一点水"],
  ["some juice", "一点果汁"],
  ["some milk", "一点牛奶"],
  ["some bread", "一点面包"],
  ["some rice", "一点米饭"],
  ["a sandwich", "一个三明治"],
  ["an apple", "一个苹果"],
  ["an orange", "一个橙子"],
  ["a banana", "一根香蕉"],
  ["a pear", "一个梨"],
  ["a book", "一本书"],
  ["a pencil", "一支铅笔"],
  ["a ruler", "一把尺子"],
  ["an eraser", "一块橡皮"],
  ["a card", "一张卡片"],
  ["a toy", "一个玩具"],
  ["a kite", "一只风筝"],
  ["a flower", "一朵花"],
  ["a biscuit", "一块饼干"],
  ["a peach", "一个桃子"],
];
const favourites = [
  ["colour", "blue", "颜色", "蓝色"],
  ["animal", "panda", "动物", "熊猫"],
  ["sport", "football", "运动", "足球"],
  ["subject", "English", "学科", "英语"],
  ["fruit", "apple", "水果", "苹果"],
  ["day", "Sunday", "日子", "星期日"],
  ["season", "spring", "季节", "春天"],
  ["month", "May", "月份", "五月"],
  ["drink", "milk", "饮料", "牛奶"],
  ["food", "rice", "食物", "米饭"],
  ["colour", "green", "颜色", "绿色"],
  ["animal", "rabbit", "动物", "兔子"],
  ["sport", "swimming", "运动", "游泳"],
  ["subject", "art", "学科", "美术"],
  ["fruit", "orange", "水果", "橙子"],
  ["day", "Saturday", "日子", "星期六"],
  ["season", "summer", "季节", "夏天"],
  ["month", "June", "月份", "六月"],
  ["drink", "water", "饮料", "水"],
  ["food", "bread", "食物", "面包"],
];
const safety = [
  ["wash your hands", "洗手"],
  ["wear a seat belt", "系安全带"],
  ["listen to the teacher", "听老师讲"],
  ["wait for the green light", "等绿灯"],
  ["keep the room clean", "保持房间干净"],
  ["walk in the library", "在图书馆步行"],
  ["be kind to others", "善待他人"],
  ["put your toys away", "收好玩具"],
  ["follow the rules", "遵守规则"],
  ["wear a helmet", "戴头盔"],
  ["close the gate", "关上大门"],
  ["stay with your group", "和小组待在一起"],
  ["take turns", "轮流来"],
  ["keep your voice down", "降低音量"],
  ["look both ways", "看道路两侧"],
  ["hold the handrail", "扶好扶手"],
  ["leave the path clear", "保持通道畅通"],
  ["return the books", "还书"],
  ["pick up your litter", "捡起自己的垃圾"],
  ["ask an adult for help", "向成人求助"],
];
const forbidden = [
  ["run near the pool", "在泳池边跑"],
  ["touch the hot pan", "碰热锅"],
  ["cross on a red light", "闯红灯"],
  ["push your classmates", "推同学"],
  ["play with matches", "玩火柴"],
  ["shout in the library", "在图书馆喊叫"],
  ["drop litter", "乱扔垃圾"],
  ["climb over the fence", "翻越围栏"],
  ["play on the stairs", "在楼梯上玩"],
  ["open the emergency door", "打开紧急出口门"],
  ["lean out of the window", "把身体探出窗外"],
  ["touch the broken glass", "碰碎玻璃"],
  ["run across the road", "跑过马路"],
  ["pick the flowers", "摘花"],
  ["feed the animals", "喂动物"],
  ["write on the wall", "在墙上写字"],
  ["block the doorway", "堵住门口"],
  ["throw stones", "扔石头"],
  ["leave your group", "离开小组"],
  ["touch the wet paint", "碰未干的油漆"],
];
const plans = [
  ["a picnic", "一次野餐"],
  ["a game", "一个游戏"],
  ["a walk", "一次散步"],
  ["a story", "一个故事"],
  ["a trip", "一次旅行"],
  ["a puzzle", "一个拼图"],
  ["a song", "一首歌"],
  ["a visit to the zoo", "一次动物园之行"],
  ["a bike ride", "一次骑车活动"],
  ["a drawing activity", "一次绘画活动"],
  ["a board game", "一个棋盘游戏"],
  ["a puppet show", "一场木偶表演"],
  ["a science project", "一个科学项目"],
  ["a book club", "一个读书会"],
  ["a class party", "一次班级聚会"],
  ["a football match", "一场足球赛"],
  ["a swimming lesson", "一节游泳课"],
  ["a nature walk", "一次自然观察散步"],
  ["a craft activity", "一次手工活动"],
  ["a museum trip", "一次博物馆之行"],
];
const adjectives = [
  ["small", "smaller", "小"],
  ["big", "bigger", "大"],
  ["light", "lighter", "轻"],
  ["heavy", "heavier", "重"],
  ["long", "longer", "长"],
  ["short", "shorter", "短"],
  ["clean", "cleaner", "干净"],
  ["bright", "brighter", "明亮"],
  ["warm", "warmer", "暖和"],
  ["cold", "colder", "冷"],
  ["new", "newer", "新"],
  ["old", "older", "旧"],
  ["strong", "stronger", "结实"],
  ["soft", "softer", "柔软"],
  ["hard", "harder", "硬"],
  ["thick", "thicker", "厚"],
  ["thin", "thinner", "薄"],
  ["wide", "wider", "宽"],
  ["narrow", "narrower", "窄"],
  ["nice", "nicer", "好看"],
];
const best = [
  ["tallest", "girls", "最高的女孩"],
  ["tallest", "boys", "最高的男孩"],
  ["kindest", "people", "最友善的人"],
  ["fastest", "runners", "最快的跑步者"],
  ["strongest", "players", "最强壮的队员"],
  ["youngest", "children", "最年幼的孩子"],
  ["oldest", "trees", "最古老的树"],
  ["biggest", "rooms", "最大的房间"],
  ["smallest", "boxes", "最小的盒子"],
  ["longest", "rivers", "最长的河"],
  ["shortest", "stories", "最短的故事"],
  ["brightest", "stars", "最亮的星星"],
  ["quietest", "rooms", "最安静的房间"],
  ["cleanest", "parks", "最干净的公园"],
  ["warmest", "coats", "最暖和的外套"],
  ["coldest", "days", "最冷的日子"],
  ["newest", "books", "最新的书"],
  ["oldest", "buildings", "最古老的建筑"],
  ["strongest", "teams", "最强的队伍"],
  ["nicest", "pictures", "最好看的图片"],
];
const limits = [
  ["box", "heavy", "lift", "盒子太重而搬不动"],
  ["bag", "heavy", "carry", "包太重而拿不动"],
  ["shelf", "high", "reach", "架子太高而够不着"],
  ["pan", "hot", "touch", "锅太热而碰不得"],
  ["box", "big", "move", "盒子太大而移不动"],
  ["door", "heavy", "push", "门太重而推不动"],
  ["toy", "small", "see clearly", "玩具太小而看不清"],
  ["bag", "large", "fit here", "包太大而放不进这里"],
  ["soup", "hot", "drink", "汤太热而喝不了"],
  ["room", "dark", "read in", "房间太暗而没法在里面读书"],
];
const enough = [
  ["box", "light", "carry", "盒子够轻，可以拿"],
  ["bag", "small", "fit here", "包够小，可以放进这里"],
  ["shelf", "low", "reach", "架子够低，可以够到"],
  ["pan", "cool", "touch", "锅够凉，可以碰"],
  ["door", "light", "push", "门够轻，可以推"],
  ["toy", "big", "see clearly", "玩具够大，可以看清"],
  ["room", "bright", "read in", "房间够亮，可以在里面读书"],
  ["soup", "cool", "drink", "汤够凉，可以喝"],
  ["box", "small", "move", "盒子够小，可以搬动"],
  ["bag", "large", "hold my books", "包够大，可以装我的书"],
];
limits.push(
  ["table", "heavy", "move", "桌子太重而移不动"],
  ["stone", "heavy", "lift", "石头太重而举不动"],
  ["cup", "hot", "drink from", "杯子太热而没法用来喝水"],
  ["ceiling", "high", "reach", "天花板太高而够不到"],
  ["suitcase", "heavy", "carry", "行李箱太重而拿不动"],
  ["print", "small", "read", "印字太小而看不清"],
  ["gap", "wide", "jump over", "间隙太宽而跳不过"],
  ["doorway", "narrow", "walk through", "门口太窄而走不过"],
  ["question", "hard", "answer", "问题太难而回答不了"],
  ["noise", "loud", "ignore", "声音太大而无法忽视"],
);
enough.push(
  ["table", "light", "move", "桌子够轻，可以移开"],
  ["stone", "small", "lift", "石头够小，可以举起"],
  ["cup", "cool", "drink from", "杯子够凉，可以用来喝水"],
  ["suitcase", "light", "carry", "行李箱够轻，可以提"],
  ["print", "large", "read", "印字够大，可以看清"],
  ["gap", "narrow", "jump over", "间隙够窄，可以跳过"],
  ["doorway", "wide", "walk through", "门口够宽，可以走过"],
  ["question", "easy", "answer", "问题够简单，可以回答"],
  ["light", "bright", "see by", "光线够亮，可以看清"],
  ["bridge", "strong", "cross", "桥够结实，可以通过"],
);
const meals = [
  "breakfast",
  "lunch",
  "dinner",
  "tea",
  "school",
  "bed",
  "a break",
  "a game",
  "a story",
  "a walk",
  "music",
  "art",
  "PE",
  "assembly",
  "homework",
  "practice",
  "a picnic",
  "a lesson",
  "a meeting",
  "the show",
];
const causes = [
  ["it was raining", "I stayed inside", "因为下雨，我待在室内"],
  ["I was tired", "I went to bed early", "因为累了，我早睡"],
  ["I was hungry", "I ate a sandwich", "因为饿了，我吃了三明治"],
  ["it was cold", "I wore a coat", "因为冷，我穿了外套"],
  ["the bus was late", "I walked to school", "因为公交晚点，我步行上学"],
  ["I had a test", "I studied at home", "因为有测验，我在家学习"],
  ["the sun was bright", "I wore a hat", "因为阳光强，我戴了帽子"],
  ["the floor was wet", "I walked slowly", "因为地面湿，我慢慢走"],
  ["my bag was heavy", "I asked for help", "因为包很重，我求助"],
  ["I was thirsty", "I drank some water", "因为渴，我喝了点水"],
  ["my hands were dirty", "I washed them", "因为手脏了，我洗了手"],
  ["I lost my pen", "I borrowed one", "因为丢了笔，我借了一支"],
  ["I had free time", "I read a story", "因为有空，我读了故事"],
  ["the door was open", "I closed it", "因为门开着，我关了门"],
  ["my friend was sad", "I made a card", "因为朋友难过，我做了卡片"],
  ["the room was messy", "I tidied it", "因为房间乱，我收拾了它"],
  ["the library was closed", "I went home", "因为图书馆关门，我回家了"],
  ["it was sunny", "I played outside", "因为天晴，我在外面玩"],
  ["I needed a ruler", "I opened my bag", "因为需要尺子，我打开了包"],
  ["the plants were dry", "I watered them", "因为植物缺水，我浇了水"],
];
const conditions = [
  ["it rains", "we will stay inside", "如果下雨，我们会待在室内"],
  ["it is sunny", "we will play outside", "如果天晴，我们会在外面玩"],
  ["I have time", "I will read a story", "如果有空，我会读故事"],
  ["you need help", "I will help you", "如果你需要帮助，我会帮你"],
  ["we finish early", "we will play a game", "如果早点完成，我们会玩游戏"],
  ["it is cold", "I will wear a coat", "如果冷，我会穿外套"],
  ["I am thirsty", "I will drink water", "如果渴，我会喝水"],
  ["the bus is late", "we will walk", "如果公交晚点，我们会步行"],
  ["you come", "I will be happy", "如果你来，我会开心"],
  ["the shop is open", "we will buy some bread", "如果商店开门，我们会买面包"],
  ["I find your pen", "I will return it", "如果找到你的笔，我会归还"],
  ["it snows", "we will make a snowman", "如果下雪，我们会堆雪人"],
  ["the room is dark", "I will turn on the light", "如果房间暗，我会开灯"],
  ["we leave now", "we will arrive early", "如果现在走，我们会早到"],
  ["you practise", "you will improve", "如果你练习，你会进步"],
  ["I see Mia", "I will say hello", "如果见到Mia，我会问好"],
  ["the bag is heavy", "I will ask for help", "如果包重，我会求助"],
  ["the plants are dry", "I will water them", "如果植物缺水，我会浇水"],
  ["we have a picnic", "I will bring fruit", "如果去野餐，我会带水果"],
  ["I finish my homework", "I will draw a picture", "如果做完作业，我会画画"],
];
const sequence = [
  ["I got home", "I did my homework", "我到家时做了作业"],
  ["I arrived at school", "I met my friends", "我到学校时见到了朋友"],
  ["the rain stopped", "we went outside", "雨停后我们出了门"],
  ["the bell rang", "we opened our books", "铃响时我们打开了书"],
  ["I saw Mia", "I said hello", "看到Mia时我打了招呼"],
  ["the bus arrived", "we got on", "公交到站时我们上了车"],
  ["I finished lunch", "I washed my hands", "午饭后我洗了手"],
  ["the lesson ended", "we packed our bags", "下课时我们收了书包"],
  ["I opened the box", "I found a toy", "打开盒子时我发现了玩具"],
  ["I heard the music", "I smiled", "听到音乐时我笑了"],
  ["we reached the park", "we had a picnic", "到公园时我们野餐了"],
  ["I lost my key", "I asked for help", "丢钥匙时我求助了"],
  ["Mia called", "I answered the phone", "Mia打电话时我接了电话"],
  ["it got dark", "we went home", "天黑时我们回家了"],
  ["I woke up", "I got dressed", "醒来时我穿了衣服"],
  ["I found the book", "I put it away", "找到书时我收好了它"],
  ["the game started", "we cheered", "比赛开始时我们欢呼了"],
  ["I saw the wet floor", "I walked slowly", "看见湿地面时我慢慢走"],
  ["the shop opened", "we went inside", "商店开门时我们进去了"],
  ["I finished the picture", "I showed it to Dad", "画完时我给爸爸看了画"],
];
const parallels = [
  ["apples", "oranges"],
  ["cats", "dogs"],
  ["books", "stories"],
  ["football", "swimming"],
  ["red", "blue"],
  ["pears", "grapes"],
  ["milk", "juice"],
  ["art", "music"],
  ["kites", "puzzles"],
  ["spring", "summer"],
  ["birds", "rabbits"],
  ["chess", "tennis"],
  ["bread", "rice"],
  ["reading", "drawing"],
  ["mangoes", "peaches"],
  ["green", "yellow"],
  ["flowers", "trees"],
  ["Monday", "Friday"],
  ["science", "English"],
  ["snow", "rain"],
];
const contrasts = [
  ["bag", "small", "useful", "包虽小但有用"],
  ["book", "old", "interesting", "书虽旧但有趣"],
  ["box", "heavy", "strong", "盒子虽重但结实"],
  ["room", "small", "bright", "房间虽小但明亮"],
  ["puzzle", "hard", "fun", "拼图虽难但有趣"],
  ["coat", "old", "warm", "外套虽旧但暖和"],
  ["toy", "simple", "fun", "玩具虽简单但有趣"],
  ["story", "short", "interesting", "故事虽短但有趣"],
  ["bike", "old", "safe", "自行车虽旧但安全"],
  ["chair", "hard", "strong", "椅子虽硬但结实"],
  ["bag", "large", "light", "包虽大但轻"],
  ["classroom", "small", "clean", "教室虽小但干净"],
  ["game", "long", "exciting", "游戏虽长但刺激"],
  ["apple", "small", "sweet", "苹果虽小但甜"],
  ["hat", "old", "nice", "帽子虽旧但好看"],
  ["cup", "small", "useful", "杯子虽小但有用"],
  ["pen", "cheap", "good", "笔虽便宜但好用"],
  ["picture", "simple", "beautiful", "图虽简单但美"],
  ["garden", "small", "beautiful", "花园虽小但美"],
  ["model", "small", "detailed", "模型虽小但精细"],
];
const make = (cloze, answer, wrong, meaning, options = {}) => ({
  cloze,
  answer,
  wrong,
  meaning,
  sentence: cloze.replace("___", answer),
  ...options,
});
const definitions = new Map();
const register = (cluster, builders) =>
  builders.forEach((build, index) =>
    definitions.set(
      `pattern.${cluster}.${String(index + 1).padStart(2, "0")}`,
      build,
    ),
  );
const capital = (text) => text[0].toUpperCase() + text.slice(1);
const firstWord = (text) => text.split(" ")[0];
const verbTask = (prefix, a, suffix = ".", meaning = "", options = {}) => {
  const [base, ...rest] = a[0].split(" ");
  return make(
    `${prefix}___ ${rest.join(" ")}${suffix}`,
    base,
    [base + "s", a[1].split(" ")[0]],
    meaning,
    options,
  );
};
const ingTask = (prefix, a, suffix = ".", meaning = "", options = {}) => {
  const [word, ...rest] = a[1].split(" ");
  return make(
    `${prefix}___ ${rest.join(" ")}${suffix}`,
    word,
    [firstWord(a[0]), firstWord(a[0]) + "s"],
    meaning,
    options,
  );
};
register("greetings", [
  (v) =>
    make(
      `___, ${v.name}.`,
      "Hello",
      ["Goodbye", "Sorry"],
      `见面向${v.name}说你好`,
    ),
  (v) =>
    make(
      `Good ___, ${v.name}.`,
      "morning",
      ["night", "goodbye"],
      `早晨向${v.name}问好`,
      { occasion: "早晨见面" },
    ),
  (v) =>
    make(
      `${v.index < 20 ? `I'm ${v.name}.` : `My name is ${v.name}.`} Nice to ___ you.`,
      "meet",
      ["meeting", "meets"],
      `先介绍自己叫${v.name}，再说很高兴认识你`,
    ),
  (v) =>
    make(
      "How are you? I'm ___.",
      v.feeling[0],
      ["is", "are"],
      `回答状态：我${v.feeling[1]}`,
    ),
  (v) =>
    make(
      `Thank you ___ ${v.gift[0]}.`,
      "for",
      ["at", "on"],
      `感谢${v.gift[1]}`,
    ),
  (v) =>
    make(
      `Thank you${v.index < 20 ? "" : " for your help"}, ${v.name}. You're ___.`,
      "welcome",
      ["welcomes", "welcomed"],
      `对方向${v.name}道谢，${v.name}回答不客气`,
    ),
]);
register("introductions", [
  (v) =>
    make(
      `My name ___ ${v.name}.`,
      "is",
      ["am", "are"],
      `介绍自己的名字叫${v.name}`,
    ),
  (v) =>
    make(
      `What ___ your name? ${v.index < 20 ? `My name is ${v.name}.` : `I'm ${v.name}.`}`,
      "is",
      ["am", "are"],
      `询问姓名，对方回答叫${v.name}`,
    ),
  (v) =>
    make(
      `How old ___ you? ${v.index < 20 ? "I'm" : "I am"} ${v.age} ${v.age === "one" ? "year" : "years"} old.`,
      "are",
      ["is", "am"],
      `询问年龄，对方回答${v.age}岁`,
    ),
  (v) =>
    make(
      `I'm ${v.age} ___ old.`,
      v.age === "one" ? "year" : "years",
      v.age === "one" ? ["years", "year's"] : ["year", "year's"],
      `介绍年龄：${v.age}岁`,
    ),
  (v) =>
    make(
      `Where are you ___? ${v.index < 20 ? "I am from" : "I come from"} ${v.place}.`,
      "from",
      ["to", "at"],
      `问来自哪里，对方回答来自${v.place}；不是问现居地`,
    ),
  (v) =>
    make(`I live ___ ${v.place}.`, "in", ["on", "at"], `说明住在${v.place}`),
]);
register("descriptions", [
  (v) =>
    make(
      `This ___ ${v.noun[0]}.`,
      "is",
      ["are", "am"],
      `介绍单个物品：这是${v.noun[2]}`,
    ),
  (v) =>
    make(
      `These ___ ${v.noun[1]}.`,
      "are",
      ["is", "am"],
      `介绍复数物品，使用${v.noun[1]}`,
    ),
  (v) =>
    make(
      `It looks ___.`,
      v.adjective[0],
      [v.adjective[1], "nicely"],
      `描述它看起来${v.adjective[2]}；按原级句框填写`,
    ),
  (v) =>
    make(
      `What colour ___ ${v.noun[0]}?`,
      "is",
      ["are", "am"],
      `问${v.noun[2]}的颜色`,
    ),
  (v) =>
    make(
      `There ___ ${v.noun[0]} on the desk.`,
      "is",
      ["are", "am"],
      `说桌上有${v.noun[2]}`,
    ),
  (v) =>
    make(
      `There ___ ${v.noun[1]} on the desk.`,
      "are",
      ["is", "am"],
      `说桌上有${v.noun[1]}`,
    ),
]);
register("preferences", [
  (v) =>
    make(
      `I ___ ${v.like[0]}.`,
      "like",
      ["likes", "liking"],
      `表达喜欢${v.like[1]}`,
    ),
  (v) =>
    ingTask("I like ", v.action, ".", `使用动名词句框说喜欢${v.action[2]}`),
  (v) =>
    make(
      `I would ___ ${v.offer[0]}.`,
      "like",
      ["likes", "liking"],
      `表达想要${v.offer[1]}，后面接名词`,
    ),
  (v) => verbTask("I would like to ", v.action, ".", `表达想${v.action[2]}`),
  (v) =>
    make(
      `My favourite ${v.favourite[0]} ___ ${v.favourite[1]}.`,
      "is",
      ["are", "am"],
      `我最喜欢的${v.favourite[2]}是${v.favourite[3]}`,
    ),
  (v) => ingTask("I enjoy ", v.action, ".", `表达享受${v.action[2]}`),
]);
register("modals", [
  (v) => verbTask("I can ", v.action, ".", `说自己会${v.action[2]}`),
  (v) => verbTask("Can you ", v.action, "?", `问对方会不会${v.action[2]}`),
  (v) =>
    make(
      `You ___ ${v.safety[0]}.`,
      "must",
      ["mustn't", "musts"],
      `现场规定：你必须${v.safety[1]}`,
    ),
  (v) =>
    make(
      `You ___ ${v.forbidden[0]}.`,
      "mustn't",
      ["must", "musts"],
      `警示牌：禁止${v.forbidden[1]}`,
      { alternatives: ["must not"] },
    ),
  (v) =>
    make(
      `You ___ ${v.safety[0]}.`,
      "should",
      ["shouldn't", "shoulds"],
      `给建议：你应该${v.safety[1]}`,
    ),
  (v) =>
    make(
      `You ___ ${v.forbidden[0]}.`,
      "shouldn't",
      ["should", "shoulds"],
      `给建议：你不应该${v.forbidden[1]}`,
      { alternatives: ["should not"] },
    ),
]);
register("requests", [
  (v) =>
    verbTask(
      "Can I ",
      v.action,
      "?",
      `由我做动作，向对方询问能否${v.action[2]}`,
    ),
  (v) => verbTask("Can you ", v.action, ", please?", `请对方${v.action[2]}`),
  (v) =>
    verbTask(
      "Could you ",
      v.action,
      ", please?",
      `更礼貌地请对方${v.action[2]}，本题不是过去能力`,
    ),
  (v) => verbTask("May I ", v.action, "?", `礼貌询问我能否${v.action[2]}`),
  (v) =>
    make(
      `Would you ___ ${v.offer[0]}?`,
      "like",
      ["likes", "liking"],
      `向对方提供${v.offer[1]}`,
    ),
  (v) => verbTask("Please ", v.action, ".", `用祈使句请对方${v.action[2]}`),
]);
register("suggestions", [
  (v) => verbTask("Let's ", v.action, ".", `邀请一起${v.action[2]}`),
  (v) => ingTask("How about ", v.action, "?", `提议${v.action[2]}怎么样`),
  (v) =>
    make(
      `What ___ ${v.plan[0]}?`,
      "about",
      ["to", "for"],
      `提议${v.plan[1]}怎么样`,
    ),
  (v) => verbTask("Why don't we ", v.action, "?", `建议我们一起${v.action[2]}`),
  (v) =>
    verbTask("Would you like to ", v.action, "?", `邀请对方${v.action[2]}`),
  (v) => verbTask("Shall we ", v.action, "?", `提出共同${v.action[2]}的建议`),
]);
register("complements", [
  (v) => verbTask("I want to ", v.action, ".", `我想${v.action[2]}`),
  (v) => verbTask("I need to ", v.action, ".", `我需要${v.action[2]}`),
  (v) =>
    verbTask("We decided to ", v.action, ".", `我们决定了要${v.action[2]}`),
  (v) => verbTask("I hope to ", v.action, ".", `我希望${v.action[2]}`),
  (v) =>
    make(
      "I started ___.",
      v.index % 2 ? v.action[1] : `to ${v.action[0]}`,
      [firstWord(v.action[0]) + "s", "to " + v.action[1]],
      `我开始${v.action[2]}；两种接续都接受`,
      {
        alternatives: [v.index % 2 ? `to ${v.action[0]}` : v.action[1]],
        orderAlternatives: [
          `I started ${v.index % 2 ? `to ${v.action[0]}` : v.action[1]}.`,
        ],
      },
    ),
  (v) =>
    make(
      `I helped ${v.name} ___.`,
      v.action[0],
      [firstWord(v.action[0]) + "s", v.action[1]],
      `我帮${v.name}${v.action[2]}；有无to都可`,
      {
        alternatives: [`to ${v.action[0]}`],
        orderAlternatives: [`I helped ${v.name} to ${v.action[0]}.`],
      },
    ),
]);
register("collocations", [
  (v) => ingTask("I am good at ", v.action, ".", `我擅长${v.action[2]}`),
  (v) =>
    ingTask("I am interested in ", v.action, ".", `我对${v.action[2]}感兴趣`),
  (v) =>
    ingTask(
      "I look forward to ",
      v.action,
      ".",
      `我期待${v.action[2]}；这里to是介词`,
    ),
  (v) =>
    ingTask(
      `I spent ${v.time} `,
      v.action,
      ".",
      `我花了${v.time}的时间${v.action[2]}`,
    ),
  (v) => ingTask("I had fun ", v.action, ".", `我${v.action[2]}时很开心`),
  (v) => ingTask("Thank you for ", v.action, ".", `感谢你${v.action[2]}`),
]);
register("time", [
  (v) =>
    make(
      `It's time ___ ${v.meal}.`,
      "for",
      ["at", "on"],
      `该到${v.meal}的时间了，名词前用for`,
    ),
  (v) => verbTask("It's time to ", v.action, ".", `该${v.action[2]}了`),
  (v) =>
    make(
      `It takes ___ ${v.time} to ${v.action[0]}.`,
      "me",
      ["I", "my"],
      `我${v.action[2]}要花${v.time}`,
    ),
  (v) =>
    make(
      `What ___ is it? ${v.index < 20 ? "It's" : "It is"} ${v.clock}.`,
      "time",
      ["many", "old"],
      `询问现在几点，回答时间为${v.clock}`,
    ),
  (v) =>
    verbTask(
      "What time do you ",
      v.action,
      "?",
      `问对方通常几点${v.action[2]}`,
    ),
  (v) =>
    verbTask(
      "How often do you ",
      v.action,
      "?",
      `问对方多久${v.action[2]}一次`,
    ),
]);
register("comparison", [
  (v) =>
    make(
      `This bag is as ___ as that one.`,
      v.adjective[0],
      [v.adjective[1], "more " + v.adjective[0]],
      `两个包同样${v.adjective[2]}`,
    ),
  (v) =>
    make(
      `This bag is not as ___ as that one.`,
      v.adjective[0],
      [v.adjective[1], "more " + v.adjective[0]],
      `这个包不如那个包${v.adjective[2]}`,
    ),
  (v) =>
    make(
      `This bag is ___ than that one.`,
      v.adjective[1],
      [v.adjective[0], "more " + v.adjective[1]],
      `这个包比那个包更${v.adjective[2]}`,
    ),
  (v) =>
    make(
      `This is one of the ___ ${v.best[1]} in the group.`,
      v.best[0],
      ["more " + v.best[0], "most " + v.best[0]],
      `在任务指定的这一组对象中，这是${v.best[2]}之一；名词用复数`,
    ),
  (v) =>
    make(
      `The ${v.limit[0]} is ___ ${v.limit[1]} to ${v.limit[2]}.`,
      "too",
      ["enough", "many"],
      v.limit[3],
    ),
  (v) =>
    make(
      `The ${v.enough[0]} is ${v.enough[1]} ___ to ${v.enough[2]}.`,
      "enough",
      ["too", "many"],
      v.enough[3],
    ),
]);
register("connections", [
  (v) =>
    make(
      `${v.cause[1]} ___ ${v.cause[0]}.`,
      "because",
      ["so", "but"],
      v.cause[2],
    ),
  (v) =>
    make(
      `${capital(v.cause[0])}, ___ ${v.cause[1]}.`,
      "so",
      ["because", "or"],
      v.cause[2],
    ),
  (v) =>
    make(
      `___ ${v.condition[0]}, ${v.condition[1]}.`,
      "If",
      ["Because of", "Despite"],
      v.condition[2],
    ),
  (v) =>
    make(
      `___ ${v.sequence[0]}, ${v.sequence[1]}.`,
      "When",
      ["Because of", "During"],
      v.sequence[2],
    ),
  (v) =>
    make(
      `I like both ${v.parallel[0]} ___ ${v.parallel[1]}.`,
      "and",
      ["or", "but"],
      `表达两者都喜欢：${v.parallel.join("和")}`,
    ),
  (v) =>
    make(
      `The ${v.contrast[0]} is ${v.contrast[1]} ___ ${v.contrast[2]}.`,
      "but",
      ["because", "so"],
      v.contrast[3],
    ),
]);
const ages = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];
export function buildPatternFacts(pattern) {
  const build = definitions.get(pattern.pattern_id);
  if (!build) throw new Error(`Missing frame ${pattern.pattern_id}`);
  return Array.from({ length: 40 }, (_, index) => {
    const k = index % 20;
    const scene = index < 20 ? "校园英语活动" : "社区亲子英语活动";
    const v = {
      index,
      name: names[k],
      place: places[k],
      noun: nouns[k],
      action: actions[k],
      feeling: feelings[k],
      gift: gifts[k],
      like: likes[k],
      offer: offers[k],
      favourite: favourites[k],
      safety: safety[k],
      forbidden: forbidden[k],
      plan: plans[k],
      adjective: adjectives[k],
      best: best[k],
      limit: limits[k],
      enough: enough[k],
      cause: causes[k],
      condition: conditions[k],
      sequence: sequence[k],
      parallel: parallels[k],
      contrast: contrasts[k],
      age: ages[k],
      clock: k < 12 ? `${ages[k]} o'clock` : `half past ${ages[k - 12]}`,
      time: ["five minutes", "ten minutes", "half an hour", "an hour"][k % 4],
      meal: meals[k],
    };
    const fact = build(v);
    return {
      ...fact,
      context: `${scene}中，${v.name}正在完成一张表达任务卡。${fact.occasion ? fact.occasion + "。" : ""}目标：${fact.meaning}。请按任务要求练习。`,
      rule: pattern.slot_rule,
    };
  });
}
export const patternIds = Array.from(definitions.keys());
