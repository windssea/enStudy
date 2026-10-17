// Original sense-specific entries and controlled example contexts.
// Grade is a suggested entry point, not a Longman edition alignment.
const themes = [];
function theme(id, grade, title, description, source) {
  const words = source
    .trim()
    .split("\n")
    .map((line) => {
      const [word, meaning, cloze, variants] = line.trim().split("|");
      return {
        id: `${id}.${word.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        word,
        meaning,
        cloze,
        alternatives: variants ? variants.split(";") : [],
      };
    });
  themes.push({ id, grade, title, description, words });
}
theme(
  "animals",
  1,
  "动物朋友",
  "从身边的动物开始，认出词，也说说它们的特点。",
  `
cat|猫|The ___ says meow.
dog|狗|The ___ says woof.
bird|鸟|A ___ has feathers and wings.
fish|鱼|The ___ swims with fins.
rabbit|兔子|The ___ has long ears.
horse|马|The farmer rides a ___.
cow|奶牛|The ___ gives us milk.
sheep|绵羊|The ___ has thick wool.
duck|鸭子|The ___ says quack.
frog|青蛙|The green ___ jumps into the pond.
tiger|老虎|The ___ has black stripes.
lion|狮子|The ___ has a large mane.
elephant|大象|The ___ has a long trunk.
monkey|猴子|The ___ climbs the tree.
panda|熊猫|The ___ eats bamboo.
bear|熊|The large ___ has thick fur.
snake|蛇|The ___ has no legs.
turtle|龟|The ___ has a hard shell.
giraffe|长颈鹿|The ___ has a very long neck.
zebra|斑马|The ___ has black and white stripes.
`,
);
theme(
  "school",
  1,
  "我的小书包",
  "找找教室和书包里的东西。",
  `
book|书|I opened a ___ and read a story.
pencil|铅笔|I write with a ___ and can erase it.
pen|钢笔|This ___ uses ink.
ruler|尺子|Use a ___ to draw a straight line.
eraser|橡皮|Use an ___ to remove pencil marks.
bag|包|I put my books in my ___.
desk|书桌|My books are on my writing ___.
chair|椅子|Please sit on the ___.
paper|纸|I drew on a piece of ___.
computer|电脑|I type on the ___ to save my work.
clock|钟|The ___ on the wall shows the time.
board|黑板或白板|The teacher writes on the classroom ___.
school|学校|We learn and play at ___.
classroom|教室|Our class learns in this ___.
teacher|教师|Our ___ helps us learn.
student|学生|Each ___ has a notebook.
notebook|笔记本|I wrote notes in my ___.
crayon|蜡笔|I coloured the sun with a yellow ___.
glue|胶水|Use ___ to stick the paper together.
scissors|剪刀|Use ___ to cut the paper.
`,
);
theme(
  "colours-shapes",
  1,
  "颜色和形状",
  "观察颜色、形状和简单图案。",
  `
red|红色的|The ripe strawberry is ___.
blue|蓝色的|The clear sky looks ___.
green|绿色的|The fresh grass is ___.
yellow|黄色的|The lemon is ___.
orange|橙色的|This carrot is ___.
purple|紫色的|We painted the grapes ___.
pink|粉色的|We mixed red and white paint; it became ___.
black|黑色的|The night sky is very ___.
white|白色的|The fresh snow is ___.
brown|棕色的|The chocolate is ___.
grey|灰色的|The cloudy sky looks ___.|gray
circle|圆形|Draw a round ___ with no corners.
square|正方形|A ___ has four equal sides and four right angles.
triangle|三角形|A ___ has three sides.
rectangle|长方形|This ___ has four right angles, two long sides and two short sides.
oval|椭圆形|The shape of this egg is an ___.
star|星形|Draw a five-pointed ___ on the card.
heart|心形|She drew a ___ to show love.
line|线|Use a ruler to draw a straight ___.
dot|点|Put a small ___ above the letter i.
`,
);
theme(
  "food",
  2,
  "餐桌与水果",
  "从食物的名称读到简单餐桌表达。",
  `
apple|苹果|I ate a red ___ from the tree.
banana|香蕉|The monkey is eating a yellow ___.
grape|葡萄|A small purple ___ grew on the vine.
pear|梨|She ate a green ___ after lunch.
peach|桃子|This ___ has soft skin and a stone inside.
lemon|柠檬|The yellow ___ tastes sour.
mango|芒果|We cut a sweet yellow ___ for dessert.
carrot|胡萝卜|The rabbit ate an orange ___.
potato|土豆|Dad baked a ___ for dinner.
tomato|番茄|We put a red ___ in the salad.
onion|洋葱|Mum cut an ___ and her eyes watered.
rice|米饭|We eat ___ with chopsticks.
bread|面包|We made a sandwich with two slices of ___.
milk|牛奶|The cow gives us ___.
water|水|I drink ___ when I am thirsty.
juice|果汁|We squeezed the fruit to make ___.
egg|鸡蛋|The hen laid an ___.
cheese|奶酪|We put yellow ___ in the sandwich.
soup|汤|We eat hot ___ with a spoon.
noodles|面条|These long ___ are in my bowl.
`,
);
theme(
  "family",
  2,
  "家人与身边的人",
  "认识家庭称呼和日常人物关系。",
  `
father|父亲|My ___ is my dad.
mother|母亲|My ___ is my mum.
brother|兄弟|My parents' son is my ___.
sister|姐妹|My parents' daughter is my ___.
grandfather|祖父或外祖父|My parent's father is my ___.
grandmother|祖母或外祖母|My parent's mother is my ___.
uncle|叔伯舅等男性长辈|My mother's brother is my ___.
aunt|姑姨婶等女性长辈|My father's sister is my ___.
cousin|堂表兄弟姐妹|My aunt's child is my ___.
parent|父母中的一位|A mother or father is a ___.
son|儿子|He is his parents' ___.
daughter|女儿|She is her parents' ___.
husband|丈夫|Her married male partner is her ___.
wife|妻子|His married female partner is his ___.
family|家庭|My parents and I are a ___.
child|儿童|An eight-year-old person is a ___.
baby|婴儿|The little ___ cannot walk yet.
adult|成年人|Please ask an ___ for help.
relative|亲属|My aunt is a ___ of mine.
neighbour|邻居|The person living next door is my ___.|neighbor
`,
);
theme(
  "body",
  2,
  "身体小词典",
  "用单词描述身体部位。",
  `
head|头|Put your hat on your ___.
hand|手|Raise your ___ to ask a question.
foot|脚|I wear a shoe on each ___.
eye|眼睛|I see with each ___.
ear|耳朵|I hear with each ___.
nose|鼻子|I smell flowers with my ___.
mouth|嘴|I eat food with my ___.
arm|手臂|My elbow is part of my ___.
leg|腿|My knee is part of my ___.
hair|头发|I comb my ___ every morning.
face|脸|I wash my ___ before bed.
tooth|牙齿|The dentist checks each ___.
neck|脖子|My scarf goes around my ___.
shoulder|肩膀|My arm joins my body at my ___.
knee|膝盖|My ___ bends in the middle of my leg.
elbow|肘部|My ___ bends in the middle of my arm.
finger|手指|I point with one ___.
thumb|拇指|The short thick digit on my hand is my ___.
back|背部|I carry my backpack on my ___.
stomach|胃部|Food goes into my ___ after I swallow.
`,
);
theme(
  "home",
  3,
  "家里的每一天",
  "描述房间、家具和家中物品。",
  `
house|房屋|My family lives in a ___.
flat|公寓|We live in a ___ on the fifth floor.
bedroom|卧室|I sleep in my ___.
bathroom|浴室|I take a shower in the ___.
kitchen|厨房|We cook in the ___.
garden|花园|Flowers grow in our ___.
door|门|Open the ___ so we can enter.
window|窗户|I can see outside through the ___.
wall|墙|We hung a picture on the ___.
floor|地板|Please sweep the ___ under our feet.
ceiling|天花板|The light hangs from the ___.
bed|床|I lie on my ___ to sleep.
sofa|沙发|Three people can sit on this ___.
table|桌子|We eat dinner at the ___.
lamp|台灯|I turn on the ___ to read at night.
mirror|镜子|I can see my face in the ___.
fridge|冰箱|We keep milk cold in the ___.
cooker|炉灶|We heat the pan on the ___.
blanket|毯子|This soft ___ keeps me warm in bed.
pillow|枕头|I rest my head on a ___.
`,
);
theme(
  "clothes",
  3,
  "衣橱里的发现",
  "认清衣物名称与常见复数形式。",
  `
coat|外套|I put on my warm ___ in winter.
shirt|衬衫|This ___ has a collar and buttons.
T-shirt|T恤衫|My summer ___ has short sleeves.
shorts|短裤|These ___ cover only the top of my legs.
trousers|长裤|These ___ cover both legs down to my ankles.
skirt|裙子|This ___ hangs from my waist.
dress|连衣裙|This ___ is one piece from the shoulders down.
socks|袜子|I wear ___ inside my shoes.
shoes|鞋|I put ___ on my feet to go outside.
hat|帽子|My wide-brimmed ___ keeps the sun off my face.
cap|鸭舌帽|My baseball ___ has a peak at the front.
scarf|围巾|I wrap a ___ around my neck.
gloves|手套|I wear ___ to keep my hands warm.
boots|靴子|These ___ cover my ankles and keep my feet dry.
jacket|夹克|I wear a light ___ over my shirt.
jumper|套头毛衣|This knitted ___ keeps me warm.
belt|腰带|A ___ holds my trousers at my waist.
tie|领带|He wears a ___ around his shirt collar.
uniform|制服|All the students wear the same school ___.
raincoat|雨衣|I put on a ___ to stay dry in the rain.
`,
);
theme(
  "actions",
  3,
  "动作小能手",
  "把动词用进真正的动作情景。",
  `
run|跑|I can ___ fast around the track.
walk|走|We ___ slowly along the path.
jump|跳|I can ___ over the small puddle.
swim|游泳|We ___ in the pool.
sing|唱歌|The children ___ a song together.
dance|跳舞|We move to the music when we ___.
read|阅读|I ___ a story before bed.
write|写|I ___ a letter with my pen.
draw|画线条画|I ___ a picture with my pencil.
paint|用颜料绘画|I ___ with a brush and colourful paints.
cook|烹饪|We ___ dinner in the kitchen.
wash|洗|I ___ my hands with soap.
clean|打扫|We ___ the classroom with brooms and cloths.
open|打开|Please ___ the closed door.
close|关上|Please ___ the open window.
carry|携带|I ___ my bag to school.
push|推|Use your hands to ___ the door away from you.
pull|拉|Use your hands to ___ the door towards you.
climb|攀爬|We ___ up the safe climbing frame.
throw|投掷|I ___ the ball to my friend.
`,
);
theme(
  "places",
  4,
  "城市探索",
  "在地图和生活中认出不同地点。",
  `
park|公园|We play on the grass in the ___.
library|图书馆|We borrow books from the ___.
museum|博物馆|Old objects are displayed in the ___.
hospital|医院|Doctors care for patients in the ___.
restaurant|餐馆|We order a meal in the ___.
supermarket|超市|We buy groceries at the ___.
bakery|面包店|Fresh bread is sold at the ___.
cinema|电影院|We watch films at the ___.
station|车站|We wait for the train at the ___.
airport|机场|We catch a plane at the ___.
bridge|桥|We cross the river on a ___.
street|街道|The shops stand along this ___.
square|广场|People meet in the town ___.
playground|游乐场|Children use the swings in the ___.
stadium|体育场|Thousands of fans watch the match in the ___.
factory|工厂|Products are made in this ___.
office|办公室|She works at a desk in an ___.
market|市场|We buy fresh vegetables at the ___.
harbour|港口|Boats are sheltered in the ___.|harbor
post office|邮局|We send letters at the ___.
`,
);
theme(
  "nature",
  4,
  "走进大自然",
  "学习自然景物和天气词汇。",
  `
sun|太阳|The ___ gives us daylight.
moon|月亮|The ___ shines in the night sky.
cloud|云|A white ___ floats across the sky.
rain|雨|The ___ makes the ground wet.
snow|雪|White ___ covers the ground in winter.
wind|风|The ___ blows my hat away.
tree|树|The ___ has a trunk and branches.
flower|花|A bee lands on the ___.
river|河流|The ___ flows towards the sea.
mountain|山|We climbed a high ___.
sea|海|The ship sails across the ___.
lake|湖|The still ___ is surrounded by land.
forest|森林|Many trees grow together in a ___.
island|岛|The ___ is surrounded by water.
beach|海滩|We build sandcastles on the ___.
valley|山谷|The river runs through the ___ between the hills.
rock|岩石|This hard ___ came from the mountain.
leaf|叶子|A green ___ grows on the branch.
root|根|The plant takes in water through each ___.
seed|种子|We plant a ___ and watch it grow.
`,
);
theme(
  "time",
  4,
  "时间与日程",
  "读懂日历、时间和日常安排。",
  `
morning|早晨|We eat breakfast in the ___.
afternoon|下午|The hours after noon are in the ___.
evening|傍晚|We eat dinner in the ___.
night|夜晚|It is dark outside at ___.
today|今天|The day we are living now is ___.
tomorrow|明天|The day after today is ___.
yesterday|昨天|The day before today was ___.
week|周|A ___ has seven days.
month|月|A year has twelve periods called months; each is a ___.
year|年|A ___ usually has 365 days.
Monday|星期一|The day after Sunday is ___.
Tuesday|星期二|The day after Monday is ___.
Wednesday|星期三|The day after Tuesday is ___.
Thursday|星期四|The day after Wednesday is ___.
Friday|星期五|The day after Thursday is ___.
Saturday|星期六|The day after Friday is ___.
Sunday|星期日|The day after Saturday is ___.
minute|分钟|A ___ has sixty seconds.
hour|小时|An ___ has sixty minutes.
calendar|日历|We check the dates on a ___.
`,
);
theme(
  "feelings",
  5,
  "心情与性格",
  "用更准确的词表达感受。",
  `
happy|开心的|I feel ___ when I see my friends.
sad|难过的|She feels ___ because she lost her favourite toy.
angry|生气的|He feels ___ about the unfair rule.
tired|疲倦的|After the long walk, I feel ___.
hungry|饥饿的|I want food because I am ___.
thirsty|口渴的|I want water because I am ___.
excited|兴奋的|We feel ___ about the class trip.
worried|担心的|I feel ___ because I cannot find my key.
surprised|惊讶的|The unexpected gift made me feel ___.
proud|自豪的|She feels ___ of her hard work.
calm|平静的|I feel ___ after sitting quietly.
nervous|紧张的|He feels ___ before speaking on stage.
lonely|孤独的|She feels ___ when she has nobody to talk to.
brave|勇敢的|The ___ child tried again despite feeling afraid.
kind|友善的|A ___ person cares about others.
patient|有耐心的|A ___ person can wait calmly.
honest|诚实的|An ___ person tells the truth.
polite|有礼貌的|A ___ person says please and thank you.
friendly|友好的|The ___ girl smiles and welcomes new classmates.
confident|自信的|He feels ___ because he has practised well.
`,
);
theme(
  "travel",
  5,
  "出行小计划",
  "认识出行工具和旅途用品。",
  `
bus|公交车|We take the ___ along the city route.
train|火车|The ___ runs on railway tracks.
plane|飞机|The ___ flies through the sky.
boat|小船|We row a ___ on the lake.
ship|轮船|The large ___ carries people across the sea.
bicycle|自行车|I pedal my ___ along the cycle path.
taxi|出租车|We pay the driver for a ride in a ___.
tram|有轨电车|The city ___ runs on street rails.
ferry|渡轮|We take a ___ across the harbour.
ticket|票|You need a ___ to enter the train.
passport|护照|A ___ identifies you when you travel abroad.
map|地图|A ___ shows where places are.
compass|指南针|A ___ helps us find north.
suitcase|行李箱|I pack my clothes in a ___.
backpack|双肩背包|I carry my ___ on both shoulders.
journey|旅程|The long ___ took us across the country.
platform|站台|We wait on the ___ beside the train track.
passenger|乘客|Each ___ sits inside the vehicle.
driver|司机|The ___ controls the bus.
destination|目的地|The place we are travelling to is our ___.
`,
);
theme(
  "learning",
  5,
  "学习与兴趣",
  "在课堂与兴趣活动中使用词汇。",
  `
science|科学|We study plants and materials in ___.
history|历史|We learn about the past in ___.
geography|地理|We learn about places and landscapes in ___.
music|音乐|We sing and play instruments in ___.
art|美术|We draw and paint in ___.
maths|数学|We work with numbers in ___.|math
English|英语|We are learning to speak and write ___.
language|语言|English is a ___.
question|问题|Raise your hand to ask a ___.
answer|答案|Write your ___ below the question.
homework|家庭作业|I finish my ___ after school.
project|项目|Our class is making a model for a science ___.
experiment|实验|We test our idea with a safe ___.
lesson|课|The teacher explains a new idea in this ___.
practice|练习|Regular ___ helps us improve.
exercise|练习题|Complete the grammar ___ on this page.
dictionary|词典|Look up the meaning in a ___.
sentence|句子|A ___ expresses a complete thought.
paragraph|段落|Several related sentences form a ___.
information|信息|The notice gives us useful ___ about the trip.
`,
);
theme(
  "environment",
  6,
  "地球小卫士",
  "讨论环境、资源与日常选择。",
  `
environment|环境|Plants and animals depend on a healthy ___.
pollution|污染|Smoke and dirty waste can cause ___.
recycle|回收再利用|We ___ used paper to make new products.
reuse|重复使用|We ___ this bag instead of throwing it away.
reduce|减少|We try to ___ the amount of rubbish we make.
protect|保护|We ___ the forest from damage.
energy|能源|We need ___ to power lights and machines.
electricity|电|The lamp needs ___ to work.
plastic|塑料|This bottle is made of ___.
metal|金属|This steel spoon is made of ___.
glass|玻璃|The transparent jar is made of ___.
rubbish|垃圾|Put the ___ in the bin.
waste|浪费|Do not ___ clean water by leaving the tap running.
resource|资源|Water is an important natural ___.
habitat|栖息地|A forest can be the natural ___ of an animal.
wildlife|野生动物|The reserve protects birds and other ___.
climate|气候|The usual weather pattern of a region is its ___.
temperature|温度|A thermometer measures ___.
drought|干旱|A long period without enough rain can cause a ___.
flood|洪水|A ___ covers normally dry land with water.
`,
);
theme(
  "community",
  6,
  "社区与合作",
  "认识社会角色，学会合作与表达。",
  `
community|社区|The people living in our area form a ___.
volunteer|志愿者|A ___ helps without expecting payment.
charity|慈善机构|The ___ collects money to help people in need.
neighbourhood|街区|We clean the streets in our ___.|neighborhood
citizen|公民|A ___ is a legal member of a country.
nurse|护士|The ___ cares for patients alongside doctors.
doctor|医生|A ___ examines patients and treats illnesses.
firefighter|消防员|A ___ helps put out fires.
police officer|警察|A ___ helps enforce the law and keep people safe.
farmer|农民|A ___ grows crops and raises animals.
baker|面包师|A ___ makes bread and cakes.
scientist|科学家|A ___ investigates questions using evidence.
engineer|工程师|An ___ designs and builds useful systems.
artist|艺术家|An ___ creates pictures or other works of art.
team|团队|A ___ works together towards a shared goal.
cooperate|合作|We ___ by sharing tasks and helping one another.
respect|尊重|We ___ others by listening and treating them fairly.
responsibility|责任|Looking after our class pet is a shared ___.
decision|决定|We discuss our options before making a ___.
opinion|观点|You can share your ___ and explain your reasons.
`,
);
theme(
  "describing",
  6,
  "更准确地描述",
  "用形容词比较事物、解释想法。",
  `
beautiful|美丽的|The colourful garden is ___.
comfortable|舒适的|The soft chair feels ___.
convenient|方便的|A shop near our home is ___ for daily shopping.
dangerous|危险的|Playing on a busy road is ___.
difficult|困难的|This challenging puzzle is ___.
easy|容易的|The simple task is ___ to finish.
expensive|昂贵的|The watch costs a lot of money; it is ___.
cheap|便宜的|This pencil costs very little; it is ___.
important|重要的|Clean drinking water is ___ for everyone.
interesting|有趣的|The story holds my attention because it is ___.
necessary|必要的|A ticket is ___ to enter this show.
possible|可能的|If it can happen, it is ___.
impossible|不可能的|If it cannot happen, it is ___.
similar|相似的|The two pictures look almost the same; they are ___.
different|不同的|The two designs are not the same; they are ___.
useful|有用的|A tool that helps us do a job is ___.
careful|小心的|A ___ person pays attention to avoid mistakes.
careless|粗心的|A ___ person may forget to check the work.
successful|成功的|The plan worked well; it was ___.
valuable|有价值的|The old letter is ___ to our family.
`,
);
export default themes;
