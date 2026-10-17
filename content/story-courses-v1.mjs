// Original third-unit mini-lessons. Listening scripts are separate from the
// reading passage. Each of the nine tasks targets a different authored fact.
const lessons=[];
const rows=text=>text.trim().split("\n").map(line=>line.trim().split("|"));
function add(grade,index,title,audio,reading,grammar) {
  lessons.push({id:`P${grade}A-U03-L${index}`,unitId:`P${grade}A-U03`,grade,term:"A",unitNumber:3,unitLesson:index,order:8+index,title,subtitle:"听一句、找线索，再把句子说清楚",minutes:10,audio:rows(audio),reading:rows(reading),grammar:rows(grammar)});
}
add(1,1,"玩具屋开门啦",`
Ben has a kite.|Ben有什么？|一只风筝|一个球|一辆小汽车
Mia has three balls.|Mia有几个球？|三个|两个|四个
The toy car is red.|小汽车是什么颜色？|红色|蓝色|绿色
`, `
Lily has two dolls.|Lily有几个娃娃？|two|one|three
The dolls are on the bed.|娃娃在哪里？|on the bed|under the desk|in the box
Lily puts a hat on a doll.|Lily给娃娃戴了什么？|a hat|a bag|a coat
`, `
这里有两个盒子。|There are two ___.|boxes|box|boxs
介绍一个机器人。|This is a ___.|robot|robots|robotes
我们有四辆玩具车。|We have four ___.|cars|car|cares
`);
add(1,2,"收拾玩具小队",`
Tom puts a robot in a box.|Tom把什么放进盒子？|机器人|风筝|娃娃
There are five toy trains.|有几辆玩具火车？|五辆|两辆|三辆
The teddy bear is brown.|泰迪熊是什么颜色？|棕色|黄色|白色
`, `
Max has a toy boat.|Max有什么玩具？|a boat|a train|a plane
The boat is in a blue bag.|船在哪里？|in a blue bag|on a red chair|under a green bed
Max takes the bag to his room.|Max把包拿到哪里？|his room|the garden|the kitchen
`, `
这是一个玩具。|This is a ___.|toy|toys|toies
这里有六个球。|There are six ___.|balls|ball|balles
这些是三个盒子。|These are three ___.|boxes|box|boxs
`);
add(1,3,"玩具小展览",`
Anna has two toy buses.|Anna有几辆玩具公交车？|两辆|四辆|六辆
The robot is green.|机器人是什么颜色？|绿色|红色|蓝色
Leo likes the yellow kite.|Leo喜欢什么颜色的风筝？|黄色|白色|棕色
`, `
Sam brings three toy ducks.|Sam带来几个玩具鸭？|three|two|four
The ducks are on a table.|玩具鸭在哪里？|on a table|in a box|under a bed
Sam gives one duck to May.|Sam把一个玩具鸭给谁？|May|Ben|Tom
`, `
我有两把玩具刷子。|I have two toy ___.|brushes|brush|brushs
她有一架玩具飞机。|She has one toy ___.|plane|planes|planees
这些是五条玩具船。|These are five toy ___.|boats|boat|boates
`);
add(1,4,"分享让游戏更好玩",`
Nina gives a ball to Jack.|Nina把球给谁？|Jack|Mia|Ben
There are eight blocks.|有几个积木？|八个|五个|十个
The toy horse is white.|玩具马是什么颜色？|白色|黑色|绿色
`, `
Dan has four toy cars.|Dan有几辆玩具车？|four|two|six
He puts two cars in a bag.|Dan把几辆车放进包里？|two|one|three
He shares the other cars with Kim.|Dan和谁分享剩下的车？|Kim|Anna|Leo
`, `
这里有三个盘子。|There are three ___.|dishes|dish|dishs
我需要一个盒子。|I need one ___.|box|boxes|boxs
我们有七个玩具。|We have seven ___.|toys|toy|toies
`);
add(2,1,"窗边的小房间",`
There is a lamp on the desk.|书桌上有什么？|一盏灯|一台电视|一个花瓶
There are two chairs by the window.|窗边有几把椅子？|两把|三把|四把
The cat is under the bed.|猫在哪里？|床下|门后|桌上
`, `
Mia has a small bedroom.|Mia的卧室是怎样的？|small|very large|dark
There is a bookcase next to her bed.|床旁边有什么？|a bookcase|a sofa|a fridge
She reads in the room after dinner.|Mia晚饭后做什么？|reads|cooks|swims
`, `
房间里有一张沙发。|There ___ a sofa in the room.|is|are|am
厨房里有三个杯子。|There are three ___ in the kitchen.|cups|cup|cupps
门后有两只书包。|There ___ two bags behind the door.|are|is|am
`);
add(2,2,"参观小熊的家",`
There are four rooms in the house.|房子里有几个房间？|四个|两个|六个
The sofa is in the living room.|沙发在哪个房间？|客厅|厨房|浴室
There is a clock above the door.|门的上方有什么？|一个时钟|一张画|一面镜子
`, `
Ben shows Lily his kitchen.|Ben带Lily看哪个房间？|the kitchen|the bedroom|the bathroom
There are three plates on the table.|桌上有几个盘子？|three|two|five
Lily puts an apple on a plate.|Lily把什么放在盘子里？|an apple|a banana|an orange
`, `
墙上有一张图片。|There ___ a picture on the wall.|is|are|am
桌下有两把椅子。|There are two ___ under the table.|chairs|chair|chaires
客厅里有五盆植物。|There ___ five plants in the living room.|are|is|am
`);
add(2,3,"找一找小物品",`
The ball is behind the chair.|球在哪里？|椅子后面|床上|盒子里
There are six books on the shelf.|架子上有几本书？|六本|三本|九本
There is a mirror in the bathroom.|浴室里有什么？|一面镜子|一张床|一张书桌
`, `
Kim looks for her blue bag.|Kim在找什么？|her blue bag|her red hat|her green ball
The bag is beside the sofa.|包在哪里？|beside the sofa|under the bed|behind the fridge
There is a toy duck inside the bag.|包里有什么？|a toy duck|a toy horse|a toy cat
`, `
窗户旁边有一个柜子。|There ___ a cupboard by the window.|is|are|am
门口有四双鞋。|There are four pairs of ___ by the door.|shoes|shoe|shoees
花园里有三棵树。|There ___ three trees in the garden.|are|is|am
`);
add(2,4,"一起布置新家",`
We put a rug on the floor.|我们把地毯放在哪里？|地板上|桌子上|床底下
There are two cushions on the sofa.|沙发上有几个靠垫？|两个|四个|六个
The new lamp is yellow.|新灯是什么颜色？|黄色|红色|绿色
`, `
Tom and Dad move a desk into the study.|Tom和爸爸把书桌搬到哪里？|the study|the kitchen|the garden
They put the desk near a window.|书桌靠近什么？|a window|a bed|a fridge
Tom puts a plant on the desk.|Tom把什么放在书桌上？|a plant|a plate|a shoe
`, `
书房里有一台电脑。|There ___ a computer in the study.|is|are|am
墙上有两张照片。|There are two ___ on the wall.|photos|photo|photoes
餐厅里有六把椅子。|There ___ six chairs in the dining room.|are|is|am
`);
add(3,1,"认识爱好俱乐部",`
Mia reads comics every Friday.|Mia什么时候读漫画？|每周五|每天早晨|每周日
Ben plays chess after school.|Ben放学后做什么？|下国际象棋|游泳|跳舞
The music club meets on Tuesday.|音乐社团星期几活动？|星期二|星期四|星期六
`, `
Lily joins the art club because she likes drawing.|Lily为什么参加美术社团？|She likes drawing.|She likes swimming.|She likes running.
The club meets in Room Five every Wednesday.|社团在哪个房间活动？|Room Five|Room Three|Room Ten
Lily draws animals with her new friends.|Lily和新朋友画什么？|animals|buildings|maps
`, `
询问Ben是否喜欢唱歌。|___ Ben like singing?|Does|Do|Is
询问对方是否读漫画。|Do you ___ comics?|read|reads|reading
询问他们是否打网球。|___ they play tennis?|Do|Does|Are
`);
add(3,2,"做一次爱好调查",`
Jack swims twice a week.|Jack多久游泳一次？|每周两次|每天两次|每月一次
Anna likes taking photos.|Anna喜欢什么？|拍照|做饭|踢足球
The chess club starts at four.|国际象棋社团几点开始？|四点|三点|五点
`, `
Max asks his classmates about their hobbies.|Max向谁调查爱好？|his classmates|his neighbours|his cousins
Six children like cycling, and four like dancing.|有几个孩子喜欢骑自行车？|six|four|two
Max writes the results on a big poster.|Max把调查结果写在哪里？|on a poster|in a storybook|on a cup
`, `
询问Mia是否会在星期日绘画。|___ Mia draw on Sundays?|Does|Do|Are
询问这些男孩是否做模型。|Do the boys ___ models?|make|makes|making
询问你的朋友是否喜欢游泳，主语是单数。|___ your friend like swimming?|Does|Do|Am
`);
add(3,3,"选一个新爱好",`
Leo makes models on Saturdays.|Leo星期六做什么？|做模型|练唱歌|打羽毛球
May dances three times a week.|May每周跳几次舞？|三次|一次|五次
Tom does not like fishing.|Tom不喜欢什么？|钓鱼|阅读|跑步
`, `
Nina wants to try a new hobby after school.|Nina想在什么时候尝试新爱好？|after school|before breakfast|at midnight
She chooses gardening because she likes plants.|Nina选择了什么爱好？|gardening|skating|chess
Her first plant is a small tomato plant.|Nina的第一株植物是什么？|a tomato plant|a rose|a lemon tree
`, `
询问这些女孩是否喜欢园艺。|___ the girls like gardening?|Do|Does|Is
询问Sam是否常放风筝。|Does Sam ___ kites often?|fly|flies|flying
询问你的哥哥是否弹钢琴。|___ your brother play the piano?|Does|Do|Are
`);
add(3,4,"分享我们的调查",`
The reading club meets every Monday.|阅读社团星期几活动？|星期一|星期三|星期五
Kim plays badminton with her sister.|Kim和谁打羽毛球？|她的姐姐|她的哥哥|她的老师
Dan practises the piano every day.|Dan多久练一次钢琴？|每天|每周一次|每月一次
`, `
Our class makes a chart about weekend hobbies.|班里制作了关于什么的图表？|weekend hobbies|school lunches|favourite colours
Reading is the most popular hobby in our class.|班里最受欢迎的爱好是什么？|reading|dancing|fishing
We show the chart to our teacher on Friday.|大家星期几向老师展示图表？|Friday|Monday|Wednesday
`, `
询问孩子们是否经常去公园。|___ the children visit the park often?|Do|Does|Is
询问Lily是否在晚饭后绘画。|Does Lily ___ after dinner?|draw|draws|drawing
询问你的表亲是否收集邮票，主语是单数。|___ your cousin collect stamps?|Does|Do|Are
`);
add(4,1,"公园旅行的第一天",`
We visited a farm last Saturday.|我们上周六去了哪里？|农场|博物馆|海滩
Mia packed sandwiches in her bag.|Mia往包里装了什么？|三明治|苹果汁|饼干
The children travelled by bus.|孩子们乘什么交通工具？|公交车|火车|轮船
`, `
Ben visited a country park with his aunt yesterday.|Ben昨天和谁去了郊野公园？|his aunt|his uncle|his teacher
They followed a short path to a lake.|他们沿着小路走到了哪里？|a lake|a shop|a station
Ben sketched a duck before they returned home.|Ben在回家前画了什么？|a duck|a bus|a horse
`, `
说明我们昨天步行去了村子。|We ___ to the village yesterday.|walked|walk|walking
说明Mia上周打开了地图。|Mia ___ the map last week.|opened|open|opens
说明他们昨晚看了演出。|They ___ the show last night.|watched|watch|watches
`);
add(4,2,"旅行小帮手",`
Jack checked the tickets before the trip.|Jack出发前检查了什么？|车票|地图|雨伞
Anna carried a blue backpack.|Anna背的是什么颜色的背包？|蓝色|绿色|黄色
We stopped at a small village.|我们在哪里停下来？|一个小村庄|一个大机场|一座动物园
`, `
Lily planned a train trip with her family last week.|Lily一家上周计划乘什么旅行？|a train|a boat|a bus
She checked the time on the station board.|Lily在哪里查看时间？|the station board|a menu|a classroom wall
Her brother helped her carry the picnic basket.|谁帮Lily提野餐篮？|her brother|her sister|her cousin
`, `
说明Ben昨天关了窗。|Ben ___ the window yesterday.|closed|close|closes
说明我们上周二搬了箱子。|We ___ the boxes last Tuesday.|carried|carry|carrying
说明她上周计划了旅行。|She ___ the trip last week.|planned|plan|plans
`);
add(4,3,"雨天也有发现",`
It rained during our walk.|散步时天气怎样？|下雨了|下雪了|刮沙尘了
We waited inside a small cafe.|我们在哪里等候？|一家小咖啡馆|一座车站|一个帐篷
Tom photographed the old bridge.|Tom给什么拍了照？|一座旧桥|一座新塔|一艘大船
`, `
Max explored a seaside town with his dad on Sunday.|Max星期日和谁探索海边小镇？|his dad|his friend|his grandma
They sheltered in a bookshop when it rained.|下雨时他们躲进哪里？|a bookshop|a cinema|a hospital
Max purchased a postcard showing the town harbour.|Max买了什么？|a postcard|a toy boat|a hat
`, `
说明我们昨天参观了塔。|We ___ the tower yesterday.|visited|visit|visiting
说明Anna昨晚试了新食物。|Anna ___ new food last night.|tried|try|tries
说明那些孩子昨天帮了导游。|The children ___ the guide yesterday.|helped|help|helps
`);
add(4,4,"整理旅行时间线",`
We arrived at the museum at ten.|我们几点到达博物馆？|十点|九点|十一点
Mia collected three postcards.|Mia收集了几张明信片？|三张|五张|七张
The class returned home before dinner.|全班什么时候回家？|晚饭前|午饭前|早餐前
`, `
Kim recorded her journey in a small notebook.|Kim在哪里记录旅程？|a notebook|a poster|a newspaper
First, she described the market; next, she described the river.|Kim先描述了什么？|the market|the river|the station
Finally, she added a drawing of the bus to her last page.|Kim在最后一页画了什么？|the bus|a boat|a train
`, `
说明Sam昨天给植物浇了水。|Sam ___ the plants yesterday.|watered|water|waters
说明我们上周清理了海滩。|We ___ the beach last week.|cleaned|clean|cleaning
说明孩子们昨晚在等火车。这里只描述完成的一次等候，用规则过去式。|The children ___ for the train last night.|waited|wait|waits
`);
add(5,1,"昨天八点的森林",`
At eight yesterday, Ben was reading a map.|昨天八点Ben在做什么？|看地图|写信|踢球
Two foxes were running beside the river.|两只狐狸正在哪里跑？|河边|山顶|村里
It was raining when the team arrived.|队伍到达时天气怎样？|正在下雨|正在下雪|阳光灿烂
`, `
At nine last night, Mia was writing notes about the forest trip.|Mia昨晚九点在做什么？|writing notes|drawing a castle|playing chess
Her brother was drying the boots beside the door.|Mia的哥哥在哪里晾靴子？|beside the door|under a table|on a roof
Their parents were planning the next day's route at the kitchen table.|父母正在计划什么？|the next day's route|a birthday party|a football match
`, `
主语是单数，描述昨天七点正在发生的动作。|He ___ cooking at seven yesterday.|was|were|is
写出read的ing形式。|We were ___ when the lights went out.|reading|read|reads
描述他们昨天下午正在游泳。|They ___ swimming yesterday afternoon.|were|was|are
`);
add(5,2,"停电前后的小故事",`
Lily was washing a cup when the lights went out.|停电时Lily在做什么？|洗杯子|擦窗户|洗衣服
Dad was looking for a torch in the drawer.|爸爸在哪里找手电筒？|抽屉里|花园里|车库外
The children were sitting on the sofa.|孩子们正坐在哪里？|沙发上|楼梯上|地板上
`, `
At half past six yesterday, Tom was finishing a model ship in his room.|Tom昨天六点半在做什么？|finishing a model ship|washing a bike|packing a suitcase
His sister was holding a small lamp so that he could see the pieces.|谁拿着小灯？|his sister|his cousin|his uncle
Outside their window, a neighbour was checking the street lights.|邻居正在检查什么？|the street lights|the garden gate|a bus timetable
`, `
主语是复数，描述昨天九点的场景。|The girls ___ dancing at nine yesterday.|were|was|are
写出make的ing形式。|Ben was ___ a card when I called.|making|make|makes
描述她昨天十点正在写字。|She ___ writing at ten yesterday.|was|were|is
`);
add(5,3,"操场上的定格画面",`
At three yesterday, Kim was carrying a basket.|Kim昨天三点在搬什么？|一个篮子|一张桌子|一把椅子
The runners were waiting at the start line.|跑步的人正在哪里等候？|起跑线|校门口|图书馆
Our teacher was talking to the coach.|老师正在和谁说话？|教练|护士|司机
`, `
At four yesterday afternoon, Max was practising a new jump on the sports field.|Max昨天下午四点在练什么？|a new jump|a new song|a new dance
Two friends were watching him from a bench near the fence.|两位朋友正从哪里看他？|a bench|a classroom|a bus
Meanwhile, the coach was moving the equipment into a dry shed.|教练正把器材搬进哪里？|a dry shed|a swimming pool|a shop
`, `
描述昨天两点我正在画画。|I ___ drawing at two yesterday.|was|were|am
写出run的ing形式。|They were ___ when the whistle blew.|running|run|runs
描述我们昨天四点正在玩。|We ___ playing at four yesterday.|were|was|are
`);
add(5,4,"拼出同一刻的场景",`
Anna was watering the flowers at five.|Anna五点在做什么？|浇花|摘花|画花
The dog was sleeping under a tree.|狗正在哪里睡觉？|树下|门边|床上
Dan and Leo were fixing a broken bike.|Dan和Leo在修什么？|自行车|玩具车|电脑
`, `
At sunset yesterday, Nina was preparing sandwiches for a family picnic.|Nina昨天日落时在准备什么？|sandwiches|a birthday cake|a bowl of soup
Her cousin was filling water bottles beside the sink.|Nina的表亲正在哪里装水？|beside the sink|on the balcony|near the bus stop
While they were working, Grandma was checking the weather forecast on her tablet.|奶奶正在平板上查看什么？|the weather forecast|a train ticket|a shopping list
`, `
描述昨天六点孩子们正在吃东西。|The children ___ eating at six yesterday.|were|was|are
写出sit的ing形式。|Mia was ___ by the lake when I arrived.|sitting|sit|sits
描述昨晚正在下雨。|It ___ raining last night.|was|were|is
`);
add(6,1,"公园里的新变化",`
The town has planted ten new trees this year.|小镇今年新种了几棵树？|十棵|六棵|八棵
We repaired the park gate last Sunday.|我们上周日修了什么？|公园大门|木桥|长椅
Mia has already collected the empty bottles.|Mia已经收集了什么？|空瓶子|旧书|树叶
`, `
Our neighbourhood park has become greener since volunteers started a gardening project.|公园变得怎样？|greener|noisier|smaller
Last month, the volunteers replaced an old concrete path with a narrow wooden one.|志愿者上个月更换了什么？|an old path|a playground slide|a stone wall
Children have used the new path to reach the pond, but they still leave the reeds undisturbed.|新小路通往哪里？|the pond|the market|the library
`, `
谈到现在的经历，主语是She。|She ___ visited this park before.|has|have|did
具体时间是昨天，用go的一般过去式。|We ___ to the river yesterday.|went|gone|go
谈到现在为止已经完成的改变。|The town ___ built a new library.|has|have|did
`);
add(6,2,"图书角成长记",`
Our class has donated twenty books so far.|班里到现在捐了几本书？|二十本|十二本|十六本
Jack painted the bookshelf yesterday.|Jack昨天给什么刷了漆？|书架|书桌|门
Lily has never read this comic before.|Lily以前读过这本漫画吗？|从没读过|读过一次|读过两次
`, `
The reading corner has grown from one small shelf to three shelves full of books.|图书角现在有几个书架？|three|one|two
During the holidays, families donated stories and information books that their children no longer needed.|假期里谁捐了书？|families|bus drivers|shopkeepers
The class sorted the books by topic last Friday, so younger readers can now find an animal book more easily.|班里上周五按什么整理书？|topic|price|colour
`, `
主语是复数，谈到现在的改变。|The children ___ made new labels.|have|has|did
具体时间是上周，用finish的一般过去式。|Ben ___ the poster last week.|finished|finish|finishes
谈到现在为止已经完成的行动。|We ___ collected more books this term.|have|has|did
`);
add(6,3,"从旧照片找证据",`
The old bridge closed two years ago.|旧桥什么时候关闭？|两年前|去年|三年前
The village has opened a new bus route.|村里新开通了什么？|公交线路|火车站|机场
We have seen the exhibition twice.|我们看过几次展览？|两次|一次|三次
`, `
In an old photograph, the village square had a dusty road and a single street lamp.|旧照片里的广场有几盏路灯？|one|three|five
Since then, the council has added trees and benches without removing the large clock tower.|市政机构保留了哪座建筑？|the clock tower|the old station|the cinema
Last summer, local children interviewed their grandparents to find out how people once used the square.|孩子们去年夏天采访了谁？|their grandparents|their coaches|their neighbours
`, `
谈到现在的经历，has后用see的过去分词。|Kim has ___ this photo before.|seen|saw|see
具体时间是去年，用change的一般过去式。|They ___ the road last year.|changed|change|changes
谈到现在已经发生的改变。|The village ___ become quieter.|has|have|did
`);
add(6,4,"给未来写一张变化卡",`
Our team has saved fifty sheets of paper this week.|团队本周节省了几张纸？|五十张|十五张|四十张
Nina started the recycling project in March.|Nina在几月开始回收项目？|三月|五月|七月
We have not finished the survey yet.|调查完成了吗？|还没有|已经完成|上周完成了
`, `
Our class has reduced food waste since we began weighing the leftovers after lunch.|班里从称量剩饭后减少了什么？|food waste|reading time|sports equipment
We recorded the first week's results on a chart in April and compared them with this month's figures.|班里用什么记录第一周的结果？|a chart|a calendar|a map
The figures have fallen, but the class will keep checking because one good week does not prove a lasting change.|为什么还要继续检查？|One week does not prove a lasting change.|The chart has disappeared.|The class has stopped eating lunch.
`, `
主语是We，谈到现在为止的行动。|We ___ checked the results twice.|have|has|did
具体时间是昨天，用start的一般过去式。|Mia ___ a new chart yesterday.|started|start|starts
谈到现在为止已经完成的行动。|Our class ___ learned a useful lesson.|has|have|did
`);
export default lessons;
