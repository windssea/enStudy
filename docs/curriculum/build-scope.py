"""Produce the original scope matrix, not a publisher's textbook contents."""
import csv
from pathlib import Path

# title | grammar | vocabulary | phonics or word strategy | integrated language task
SCOPE = {
1: """你好新朋友|I am / You are|问候与姓名|字母名与常见音|听懂问候并介绍自己
我的书包|a / an; this is|文具与颜色|短元音a|读图识物并标注书包物品
玩具屋|单数与规则复数|玩具与数字1至10|短元音i|数一数并介绍玩具
我的家人|he / she; is|家庭与人物|短元音o|读家庭图并介绍一位家人
开心的一天|am / is / are|感受与状态|短元音e|听人物状态并用短句表达
动物伙伴|it; simple adjectives|常见动物|短元音u|从描述找动物并说特征
身体会说话|have; touch commands|身体部位|CVC拼合|听指令并描述自己
我喜欢的水果|I like / don't like|水果与味觉|CVC分解|看菜单表达喜好
我的教室|where; in / on / under|教室与位置|起始辅音|按指令摆放并说位置
一起动起来|can / can't|动作与运动|末尾辅音|听动作任务并说明能做什么
天气小记者|It is; weather|天气与衣物|初步词族|读天气卡并选衣物
我们的英语小展览|基础句型综合|全年主题复现|CVC混合复习|制作图文小册并口头介绍""",
2: """我的新朋友|主语代词与be复习|个人信息与爱好|长元音a_e|读名片并介绍朋友
我会做这些|can问句与回答|技能与活动|长元音i_e|做技能调查并报告
快乐的家|there is / there are|房间与家具|长元音o_e|读房屋图并描述房间
整理小能手|物主形容词my / your / his / her|衣物与所属|长元音u_e|听失物描述并认领
去动物园|has / have|动物身体特征|sh / ch|阅读动物卡并比较外形
野餐计划|some; like questions|食物与饮品|th有声与无声|按食物表表达需求
我的一天|简单现在时I / you|日常活动与时间|ee / ea|读作息图并讲述一天
一起上学|祈使与规则|学校活动与规则|ai / ay|听懂指令并制作班级规则
社区散步|where; next to / near|社区地点|oa / ow长元音|读简图并找到目的地
穿衣小助手|these / those|衣物与季节|oo常见发音|读衣物描述并挑选
好习惯|and / but简单连接|健康与卫生|辅音连缀st / sp|读习惯清单并表达选择
我的周末图鉴|能力与日常综合|周末主题复现|辅音连缀bl / cl|制作周末图鉴并讲述""",
3: """校园里的我们|be与have综合|校园与同伴|词族与拼读策略|读人物档案并完成介绍
一天的节奏|第三人称一般现在时|作息与时间|词尾s三种读音|听作息并描述朋友的一天
爱好俱乐部|do / does问句|爱好与频率|频率词拼写|调查爱好并整理结果
忙碌的现在|现在进行时肯定句|动作与场景|ing词形变化|读场景并说正在发生什么
寻找朋友|现在进行时问句|地点与活动|ng / nk|听线索定位人物
聪明购物|how much; want / would like|购物与钱币|数词拼写|读价格牌并完成购物对话
周末好安排|时间介词in / on / at|星期与活动|ow / ou双元音|阅读日程并安排周末
健康的小建议|should入门|身体不适与健康|ar / or|读简单建议并给出回应
去哪里玩|there be与方位综合|出行与公共地点|er / ir / ur|听路线并说明位置
一年四季|because简单原因|季节与天气|比较常见音形|读季节短文并解释喜好
小小厨房|可数与不可数入门|食材与烹饪|量词与高频词|读简易食谱并排序步骤
给朋友的邀请|现在时与问句综合|聚会与邀请|拼写检查策略|读邀请卡并写简短邀请""",
4: """新学期新目标|现在时综合与频率副词|学习习惯与目标|高频不规则词|读学习日志并制定计划
过去的周末|was / were|过去活动与感受|过去式ed读音|听周末经历并写短记录
有趣的旅行|一般过去时规则动词|旅行与交通|规则过去式拼写|读旅行故事并整理时间线
故事里的发现|一般过去时常见不规则动词|故事动作与地点|不规则动词词形|复述简短故事的主要事件
更高更快更好|比较级|尺寸与运动特征|er比较级词形|读资料比较两件事物
动物世界|最高级入门|动物与自然记录|est与拼写变化|读信息卡找纪录并表达
购物有办法|some / any与数量问句|商店与数量|复合词入门|比较购物清单并表达需求
节日与传统|过去时疑问和否定|节庆与活动|多音节切分|读节日经历并提问
问路小帮手|方向祈使与位置介词|道路与地标|方位词拼写|听问路并给简短指引
安全与规则|must / mustn't|安全与公共规则|常见词尾|读规则海报并制作提示
周末将要做什么|be going to|未来活动与准备|缩略形式识读|看计划表并描述打算
我的故事展|过去现在与计划综合|全年主题复现|上下文猜词入门|写一封包含经历和计划的短信""",
5: """我的成长手册|现在时与过去时对比|成长与个人经历|前缀un / re|读成长记录并描述变化
运动与健康|频率与程度副词|锻炼与健康选择|副词ly词形|读习惯调查并提出建议
那时正在发生|过去进行时入门|事件与动作|ing复习与词重音|根据图片描述过去场景
意外与帮助|when连接过去事件|帮助与意外|常见同形异义线索|阅读事件经过并整理因果
城市与乡村|比较级最高级综合|社区与环境|比较词与构词|比较生活环境并给理由
友好的建议|should / could建议|人际与情绪|情绪词语境|读求助便条并写回应
精彩的未来|will与going to|职业与未来|后缀er / or|听职业访谈并描述愿望
旅行计划师|交通时间与将来问句|旅行与安排|时间表达识读|读多张表格制定旅程
绿色行动|because / so / although入门|环保与资源|前后缀与词义|读环保短文并提行动方案
美食与文化|数量限定much / many / a few|食物与文化|可数词与词形|比较菜单并介绍一种食物
数字世界|情态动词与规则综合|网络与信息|常见复合词|读安全提示并说明选择
我的观点小报|连接词与段落组织|校园议题复现|关键词与查词策略|写有主题句和理由的短段落""",
6: """成为自主学习者|时态与问句诊断复习|学习策略与目标|词典与上下文策略|读学习建议并制定自评表
难忘的经历|现在完成时ever / never入门|经历与活动|过去分词常见词形|访谈经历并区分具体过去时间
生活里的变化|过去与现在完成表达入门|变化与发展|词缀与词性线索|读变化短文并归纳证据
好故事有线索|过去时与过去进行时综合|叙事与情绪|叙事连接词|阅读故事并写有顺序的片段
如果我们一起行动|if真实条件句入门|选择与结果|词义关系与搭配|读行动方案并预测结果
世界与文化|who / which关系表达入门|文化与人物|专名与陌生词策略|比较两篇短文并介绍人物事物
科学发现|被动表达理解入门|发明与材料|学科词构词|读简单说明并整理流程
媒体小侦探|事实意见与原因表达|媒体与信息|同义替换与指代|区分信息和观点并找依据
规划精彩旅程|时态情态与条件综合|旅行与预算|表格与缩略词|整合行程资料并写计划
讨论有办法|比较建议与礼貌表达|讨论与合作|语块与语气|倾听不同选择并给理由
我的英语项目|语法编辑与自我修订|主题研究与展示|拼写与词汇修订|阅读资料后完成多段引导作品
走向新的旅程|全学段综合迁移|小学主题复现|自主词汇复习策略|完成听读说写综合任务并制定后续计划""",
}

def main():
    target = Path(__file__).with_name('p1-p6-scope.csv')
    with target.open('w', newline='', encoding='utf-8-sig') as handle:
        writer = csv.writer(handle)
        writer.writerow(['unit_id','grade','term','unit_in_term','title','grammar_focus','vocabulary_theme','phonics_or_word_strategy','integrated_task','lesson_count','minimum_unit_items','mapping_status','content_status'])
        for grade, text in SCOPE.items():
            rows = text.splitlines()
            assert len(rows) == 12
            for index, row in enumerate(rows):
                title, grammar, vocabulary, phonics, task = row.split('|')
                term = 'A' if index < 6 else 'B'
                unit = index % 6 + 1
                writer.writerow([f'P{grade}{term}-U{unit:02}',grade,term,unit,title,grammar,vocabulary,phonics,task,4,36,'not_bound','planned'])
    print(f'Wrote {target}: 72 original planned units, 288 lessons, 2592 unit items; 240 phonics items planned separately.')

if __name__ == '__main__':
    main()
