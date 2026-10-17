"""Original draft patterns; not extracted textbook material or published lessons."""
import csv
from pathlib import Path

# title, topic suffix, then six lines: minimum grade | kind | frame | example | slot rule
GROUPS = [
('问候与礼貌','greetings', '''1|chunk|Hello, [name].|Hello, Mia.|称呼可替换；注意人名
1|chunk|Good morning, [name].|Good morning, Ben.|用于早晨；称呼可省略
1|chunk|Nice to meet you.|Nice to meet you.|用于初次相识等合适情景
1|frame|How are you? — I'm [feeling].|How are you? — I'm fine.|状态形容词与情景匹配
2|frame|Thank you for [noun phrase].|Thank you for your help.|for后接名词短语；动名词另教
1|chunk|You're welcome.|You're welcome.|回应感谢；接受语境合适的其他回应'''),
('介绍与个人信息','introductions', '''1|frame|My name is [name].|My name is Mia.|人名槽位
1|frame|What's your name?|What's your name?|问姓名；接受完整形式What is
1|frame|How old are you?|How old are you?|问年龄；第二人称搭配are
1|frame|I'm [number] years old.|I'm eight years old.|数字与year或years一致；一岁用year
2|frame|Where are you from?|Where are you from?|问来源；与居住地问法区分
2|frame|I live in [place].|I live in Hong Kong.|居住地；地点与介词按词条审核'''),
('描述与存在','descriptions', '''1|frame|This is [singular noun phrase].|This is my bag.|单数名词短语
2|frame|These are [plural noun phrase].|These are my books.|复数名词短语
3|frame|It looks [adjective].|It looks beautiful.|感官动词后接形容词
1|frame|What colour is [singular noun phrase]?|What colour is your bag?|单数搭配is；colour与color均可按变体配置
2|frame|There is [singular noun phrase] [place phrase].|There is a cat under the chair.|本课限定单数名词；不可数用法另教
2|frame|There are [plural noun phrase] [place phrase].|There are two cats under the chair.|复数名词短语'''),
('喜好与愿望','preferences', '''1|frame|I like [noun phrase].|I like apples.|名词短语；区分类别与特指
3|construction|I like [V-ing phrase].|I like reading stories.|此训练练动名词；不得全局否定like to do
3|frame|I'd like [noun phrase].|I'd like some juice.|名词短语；不多加to
3|construction|I'd like to [V-base phrase].|I'd like to read a story.|to后动词原形
2|frame|My favourite [category] is [noun phrase].|My favourite colour is blue.|类别与内容一致；接受favorite变体
4|construction|I enjoy [V-ing phrase].|I enjoy reading stories.|此义enjoy后用名词或动名词；不接to do'''),
('能力建议与规则','modals', '''2|construction|I can [V-base phrase].|I can swim.|can后动词原形
2|frame|Can you [V-base phrase]?|Can you swim?|一般疑问；与能力回答匹配
4|construction|You must [V-base phrase].|You must wear a seat belt.|义务；动词原形
4|construction|You mustn't [V-base phrase].|You mustn't run here.|禁止；不与不必混同
3|construction|You should [V-base phrase].|You should drink some water.|建议；动词原形
3|construction|You shouldn't [V-base phrase].|You shouldn't eat too much sugar.|否定建议；动词原形'''),
('请求与许可','requests', '''2|frame|Can I [V-base phrase]?|Can I open the window?|询问许可；说话者做动作
2|frame|Can you [V-base phrase], please?|Can you help me, please?|请求对方做动作
4|frame|Could you [V-base phrase], please?|Could you close the door, please?|礼貌请求；此处不按过去能力解释
3|frame|May I [V-base phrase]?|May I come in?|询问许可；动词原形
3|frame|Would you like [noun phrase]?|Would you like some water?|提供物品；接受合适回应
1|frame|Please [V-base phrase].|Please sit down.|祈使表达；主语通常省略'''),
('邀请与建议','suggestions', '''2|construction|Let's [V-base phrase].|Let's play football.|后接动词原形；不加to
3|construction|How about [V-ing phrase]?|How about playing football?|提活动建议时用动名词短语
3|frame|What about [noun phrase]?|What about a picnic?|名词短语建议；动名词也有合法用法
4|construction|Why don't we [V-base phrase]?|Why don't we play outside?|we后用动词原形
3|frame|Would you like to [V-base phrase]?|Would you like to join us?|邀请做事；to后原形
4|frame|Shall we [V-base phrase]?|Shall we go now?|共同建议；动词原形'''),
('动词接续','complements', '''3|construction|want to [V-base phrase]|I want to play outside.|to后动词原形；第三人称want词形另查
3|construction|need to [V-base phrase]|I need to finish my homework.|需要做事；to后原形
5|construction|decide to [V-base phrase]|We decided to visit the museum.|decide可变时态；to后原形
5|construction|hope to [V-base phrase]|I hope to see you soon.|to后原形；与hope that分句区分
4|construction|start to [V-base phrase] / start [V-ing phrase]|It started to rain.|此例两种接续均可；不能强判只有一项
4|construction|help [person] (to) [V-base phrase]|She helped me carry the box.|有to或无to均可；人称宾格与动词原形'''),
('介词与常用搭配','collocations', '''3|construction|be good at [noun / V-ing phrase]|I am good at swimming.|at后名词或动名词；be随主语变化
5|construction|be interested in [noun / V-ing phrase]|She is interested in drawing.|此义in后名词或动名词
6|construction|look forward to [noun / V-ing phrase]|I look forward to seeing you.|此处to是介词；后接名词或动名词
5|construction|spend [time] [V-ing phrase]|We spent an hour reading.|spend随时态变化；时间短语与动名词
4|construction|have fun [V-ing phrase]|We had fun making kites.|have随时态变化；活动用动名词
4|construction|Thank you for [V-ing phrase].|Thank you for helping me.|for是介词；活动用动名词'''),
('时间与频率','time', '''2|frame|It's time for [noun phrase].|It's time for lunch.|for后名词短语
2|construction|It's time to [V-base phrase].|It's time to go home.|to后动词原形
6|construction|It takes [person] [time] to [V-base phrase].|It takes me ten minutes to walk to school.|人称宾格；耗时；to后原形
2|frame|What time is it?|What time is it?|询问当前时刻
3|frame|What time do you [V-base phrase]?|What time do you get up?|询问日常活动时间；原形
3|frame|How often do you [V-base phrase]?|How often do you go swimming?|问频率；不与持续时长混同'''),
('比较与程度','comparison', '''5|construction|as [adjective] as [comparison target]|Mia is as tall as Ben.|形容词原级；比较对象合理
5|construction|not as [adjective] as [comparison target]|This bag is not as heavy as that one.|形容词原级；否定比较
4|construction|[comparative adjective] than [comparison target]|This box is bigger than that one.|形容词比较级；不叠加more bigger
6|construction|one of the [superlative adjective] [plural noun]|She is one of the tallest girls in our class.|最高级与复数名词；上下文范围明确
6|construction|too [adjective] to [V-base phrase]|The box is too heavy to lift.|过于以致不能；语义和施事关系需审核
6|construction|[adjective] enough to [V-base phrase]|The box is light enough to carry.|enough位于形容词后；词义合理'''),
('原因条件与衔接','connections', '''3|construction|[main clause] because [reason clause]|I stayed inside because it was raining.|此训练两完整分句；不用because与so双重连接同一关系
4|construction|[cause clause], so [result clause]|It was raining, so I stayed inside.|结果关系；分句与标点按任务规则
6|construction|If [present clause], [will clause].|If it rains, we will stay inside.|入门真实未来条件；if分句用现在表达未来
5|construction|When [past clause], [past main clause].|When I got home, I did my homework.|此训练过去顺序；不泛化为when只有此时态
5|construction|both [parallel phrase] and [parallel phrase]|I like both apples and oranges.|并列成分语法角色一致
6|construction|[adjective] + but + [contrasting adjective]|The bag is small but useful.|同一对象可成立的转折属性'''),
]

def main():
    target = Path(__file__).with_name('sentence-patterns.csv')
    with target.open('w',newline='',encoding='utf-8-sig') as handle:
        writer=csv.writer(handle)
        writer.writerow(['pattern_id','cluster','topic_id','grade_min','grade_max','kind','frame','example','slot_rule','status'])
        for title,suffix,block in GROUPS:
            lines=block.splitlines()
            assert len(lines)==6
            for i,line in enumerate(lines,1):
                grade,kind,frame,example,rule=line.split('|')
                writer.writerow([f'pattern.{suffix}.{i:02}',title,f'sentence.patterns.{suffix}',grade,6,kind,frame,example,rule,'draft'])
    print(f'Wrote {target}: 12 groups and 72 draft patterns.')

if __name__=='__main__':
    main()
