# 词形八专题专用材料 v0.49.0

本阶段为全部8个词形专题各新增60道受控文字任务，共480道。与已有18个语法/时态专题合并后，26个专题有1560道专用阶段材料。其余34专题仍待补齐；普通60专题7200变体与72固定句式题库保留，不能把本阶段描述为全部专题、完整错因诊断或教研审核完成。

## 教学范围

每个专题设5个明确可观察维度，每维12个词项或情景，分配为小尝试2、巩固4、应用2、回访4。一轮仍随机取5+10+5+三次5题，共35组不同家族。类型为30选择加30填写；不把一个选择题与同题填写重复计算为两组新材料。词卡需要认识原词与题目要求，部分拓展词超出低年级常用词表；它们不能替代按年级分级的图词和听说学习，后续需要词义支架与教师听审。

| 专题 | 五维范围 |
| --- | --- |
| 名词复数 | 通常加s及元音+y、加es、辅音+y、f/fe及例外、不规则及同形 |
| 第三人称单数 | s、es、辅音+y、元音+y、明确单数主语的常见特殊词及应用 |
| ing | 直接加、去不发音e、单音节双写、保留y、ie与保留e的特例 |
| 规则过去式 | ed、d、ied、单音节双写、不双写与保留y |
| 不规则过去式 | 三形区别、过去/分词同形、其他常见变化、拼写同形、did后原形 |
| 过去分词 | 三形区别、与过去式同形、have/has后词形、三形同拼写、规则动词分词 |
| 比较级最高级 | 短词、e结尾、辅音+y、双写及不规则、指定more/most的长词 |
| 前后缀 | un、re、er人物名词、ful/less、ly/ness |

材料严格指定所练词形或词义，接受scarves/scarfs、people/persons、fish/fishes、queuing/queueing、far的两组比较形式及列明美式拼写。cost限定“花费某金额”，不把估算成本含义的costed当作此义答案。old限定物品年代，不在题干展示older/oldest作为拼写提示。read的拼写同形不声称读音相同。本阶段不评分听辨、发音或自由表达，也不从一次错答推断唯一错误原因。

规则核对依据为[Cambridge拼写](https://dictionary.cambridge.org/us/grammar/british-grammar/plurals)、[动词基本形式](https://dictionary.cambridge.org/us/grammar/british-grammar/verbs-basic-forms)、[比较形式](https://dictionary.cambridge.org/grammar/british-grammar/comparison-adjectives-bigger-biggest-more-interesting)、[构词](https://dictionary.cambridge.org/grammar/british-grammar/word-formation_2)；变体参考[Cambridge scarf](https://dictionary.cambridge.org/us/dictionary/english/scarf)、[queueing](https://dictionary.cambridge.org/us/dictionary/english/queueing)、[Collins queueing](https://www.collinsdictionary.com/us/dictionary/english/queueing)、[fish](https://www.collinsdictionary.com/us/dictionary/english/fish)与[cost](https://www.collinsdictionary.com/us/dictionary/english/cost)。例句与词卡为项目原创，未复制教材题目。具体朗文版次仍未提供，不能声称与某版逐页对齐。

## 材料发布与旧计划

新增reserved-forms-v1，追加迁移0046，0001–0045保持不变。原18专题的内容、修订版本与editionId均不变。合并目录是发布索引，不把所有专题强绑为一个新edition；每个专题明确自己的editionId、revisionId与所需releases。新词形计划绑定新版本；已有NULL材料计划仍需显式选择采用，不改已开始的阶段、旧回执或日期。

创建、采用和开始阶段按专题检查发布状态，事务中仍复验。词形版本未迁移或已撤下时，不偷偷退回普通随机题；撤下词形版本不影响旧语法计划，撤下旧语法修订也不影响新词形计划。已开始会话仍遵循原有快照、授权与撤题限制。保留普通题库/复习/单题入口对专用阶段题的隔离。

示范映射纳入新增词形任务，既有实验台标准句与词项目标的历史别名继续生效。所有当前示范后仍可抽出每专题的完整35组不同材料；某维未见材料真正耗尽时仍停止评估，不重复计为新题。它们属于controlled-context证据，不承诺开放场景迁移。

## 当前验证

26项专题材料单元检查通过，包括14项新增词形检查：原内容及edition不变、8专题分池、480题各合法答案和选项边界、变体、cost含义、did原形及比较词不泄露答案。57项隔离workerd/D1检查通过，新增8专题各走完280次真实保存与推进及1/3/7日日期夹具，并验证两个版本独立撤题、未发布拒绝与旧流程不变。日期推进仅作用于内存测试家庭，不伪造真实学习记录。

本地全量、浏览器和生产体积证据见下文；完整CI及两站发布结果待补记。保持免费、现有独立D1、注册关闭和指定管理员不变；不调用真实AI供应商，不创建自动化。

本地509项单元/62文件、类型和生产构建通过。最终Worker 18,983,937字节，SHA256 fb659f10b69bdb4d1b921dbe4b99571ed5cc633871e6bc7ea7fc9c54d8fa9633，低于发布预算；本地0046已应用，0001–0045未改。首轮构建遇Windows临时文件占用并终止，确认退出后串行重跑通过，最终目录仍为288课，未发布中间输出。

页面验收后追加0047与reserved-forms-v2：480个家族仅修订儿童说明和卡片元数据，原0046与第一版仍可按版本恢复，不算新增480题。儿童说明按选择/填写改为直接指令；放大原词卡、方向箭头和目标标签，保留完整题干约束。did后的卡片显示题目给定的过去式而非正确原形，不额外泄露答案；小伙伴使用已生成的透明狐狸/小熊图，箭头只短暂移动一次，安静/静态/离屏/隐藏/播放声音时暂停，并遵循系统减少动效。题目提示朗读使用完整要求，实际中文混合英文的语音质量和Pad设备仍需听审。

修订后510项单元、类型、生产构建通过，原版与修订版的答案、家族和阶段一致性已核对。Worker最终19,376,398字节，SHA256 b2cd8dafb22a3c49fae330d49a3af954d0639b9a6d758ba42e758ee6a88cbeed。57项隔离运行通过，包括只发布0046而缺少当前修订时拒绝新词形计划。当前首版和修订必须同时发布，不能回退到旧儿童说明。旧语法材料仍独立检查发布状态。本地已应用0047，0001–0046保持不变。

内置浏览器在隔离内存家庭验证新卡片、drive→driving填写保存、刷新后原答和星星一致；768×1024及1024×768尺寸无横向溢出，“下一小步”按钮高84px，卡片箭头仅一次且离屏时data-paused=true。额外375窄屏发现输入框默认宽度溢出，增加明确100%宽度与最小宽度0，复验结果随后记录。这里是尺寸模拟与DOM证据，不代替真实Pad或语音质量验收。

375窄屏复验通过：根内容宽360px、scrollWidth360px，输入框与父级均298px；窗口已恢复，验收标签已关闭。证据artifacts/v049-word-form-child-card.png、v049-word-form-reviewed-feedback.png和v049-word-form-pad-restored.png，内置浏览器控制台无错误。
