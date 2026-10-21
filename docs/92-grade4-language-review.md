# v0.65 四年级课程与时态题目审校

状态：已同步发布Preview、Production与正式域名，616项单元、完整运行及两站线上检查通过。

本次逐课检查四年级上下学期48课、200张讲解卡及432个课程练习，核对60个不规则动词的840个专题变体，并沿用原始模板与词表审查8个共享时态专题及3个过去式/过去分词专题的1320个变体。选择与填空共用同一事实时不能按两种独立情境计算。这是源内容与运行流程审校，不等同于学校教师签审或真实儿童教学效果验证，也未声称与某一版朗文教材逐页对应。

## 修订结果

22课更新元数据与讲解，44个课程练习、146个不规则动词变体、408个共享时态变体发布新版本，另有60个概念/选句变体改为直接选择，共658个修订变体，题量不因修订增加。四年级仍48课，每课9个任务；四个不规则动词专题仍为420组事实/840个变体。

| 问题 | 修订与边界 |
| --- | --- |
| 换成you后仍机械使用my homework/my promise等 | 8个动词的问句使用your；第一人称否定仍保留my，不做全局替换。come的情境改为班级聚会。 |
| 60个完成结构一律套用before lunch | 逐词编写60组带过去参照点和中文语境的例句，共120个选择/输入变体。grow放到去年秋天；know、feel、sit、stand、hold、wear等保留适当的持续时间，区分动作与状态。 |
| 开放填空只接受隐藏键选定的一个动词 | 在确实需要的课程输入题和408个共享时态变体中给出动词来源，如play、take、be、have；不把近义动词的选择误判为时态错误。 |
| taught me a knot搭配不够自然 | 改为Grandpa taught me how to tie a knot yesterday.，仍只填写teach的过去式。visit the model parade改为visit the model display。 |
| helped Ben with his bag与中文“提包”范围不一致 | 改为I helped Ben carry his bag.，讲明helped与后面的carry分属不同结构。 |
| 肯定和否定回答在同一例句中并列 | 肯定例句只展示Yes, he was.，规则说明否定回答对应另一个事实。 |
| 其他一致性与自然表达 | 驾车例句由Dad担任主语；长颈鹿B和相机C的示例名称与本课数据方向一致；一般过去时等候情境移除“正在”歧义；拼句别名修正句首大小写；finally的最后一步也接受lastly；狗绳故事写清归还给Tom。 |

过去分词保持拓展，不升级为四年级必修要求。保留read的/riːd/与/red/区别，get的英式got以及过去分词位置的美式gotten；过去式位置不接受gotten。12格时态对照的英文、几何和示范证据版本保持，仅把将来进行时中文译文改为自然的“我会在吃一个苹果”。

## 内容依据

词形逐项核对[Cambridge不规则动词表](https://dictionary.cambridge.org/grammar/british-grammar/irregular-verbs)，词形与时态的区别参考[动词基本形式](https://dictionary.cambridge.org/grammar/british-grammar/verbs-basic-forms)，英美get差异参考[Get](https://dictionary.cambridge.org/us/grammar/british-grammar/get)。did后的动词原形核对[British Council儿童过去时问句](https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-practice/past-simple-questions)，完成时参照关系参考[过去完成时](https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/past-perfect)。本项目例句与中文均为原创，不复制来源练习。British Council完整不规则词表页面本次抓取超时，未将它冒充为已完整读取的依据。

## 版本与学习记录

新增0054_grade4_language_review.sql和0055_grade4_tense_concepts.sql，只INSERT内容版本、课程元数据、题目和发布索引。57份历史内容与0001–0053迁移以固定SHA256回归校验；0052、0053未改写。原v2词形提示保存在grade4-tense-release.cues-v2.json，供历史题目版本继续读取。

课程当前目录为course-catalog-v14，专题目录为topic-catalog-v5。新题目沿用原ID、family、skill和modality，不将微调文案算作未见知识；历史v1/v2作答继续使用对应的原始题干和答案。新课程讲解用原课程ID发布递增版本，未重置课程进度、复习日期或成绩。修订题只绑定真实的grade4-language-review-v1发布记录，不能用目录标签代替D1版本就绪检查。

新增题库与作者源文件继续被开发服务器禁止直接读取；线上回归核对它们及新迁移不会作为静态资源公开。不新增依赖、云资源或账号，保持现有免费方案、关闭注册和现有AI设置。

## 本地验证

隔离内存D1从0001顺序应用至0055，逐条比对迁移前29936条题目行、628条课程行，共30564条历史记录保持相同。首轮隔离应用捕获早期课程缺少unitNumber导致的无效SQL值，已从课程ID推导单元号并加入生成断言；修订前未向真实开发库或云端应用0054。

616项单元/78文件验证新旧题目索引、原答案兼容、词形区分、明确参照点、开放填空范围与SQL值完整性；构建、类型、格式和Worker打包通过。52项隔离专项检查实际分配与提交keep、grow、know、taught、play及共享时态题，并验证现有复习策略、四专题随机/接续任务和示范辅助规则。

内置浏览器使用独立内存库中的虚构四年级档案，核对1280×900与768×1024：完成时的中文语境与英文参照点一起显示，无横向溢出；felt、broken实际提交正确，刷新保留保存结果；课程第二张展示I helped Ben carry his bag.。浏览器无错误/警告。没有将真实儿童档案用于这些验证。

Worker为22469211字节，SHA256 779db6200af06360c7c7fb260563e7a17ac1613d42710e158b03319be075a413，低于24MiB预算。证据位于忽略目录artifacts/check-v065-release.log、runtime-grade4-v065-release.log、v065-migration-history.json、v065-browser.json与v065-perfect-*、v065-reviewed-lesson-pad.png。完整CI及实际部署结果如下。

首轮Actions 39554721195在完整回归的课程来源断言处停止，尚未进入deploy，两套云端D1未应用0054。该断言仍只接受历史发布来源；现已在三个受影响课程组核对当前题目ID、冻结版本、真实发布者和发布状态，并拒绝目录标签、旧版本和复制的成员关系。616项单元通过，三个课程组648个当前题目版本的本地只读来源核对通过；之后只运行包含此修订的最新main，不重跑旧提交。

后续复核发现两组时态对比题的60个“选时态/选含义/选句子”变体也被机械生成为输入题。新增0055为这些ID发布choice/recognition版本，使用原同题族的三个可见选项，原输入版本与原作答记录继续保留；实际动词填空的controlled-production不变，两组各60个题族及120个变体统计保持。未把选择题当作自主表达能力证据。检查中的Actions 39556035468在deploy前主动取消，以合入该题型修订，未向云端应用迁移。

0055在独立内存D1中应用前后核对31195条既有题目/课程行，全部保持；52项专项流程实际验证概念题三个选项可见且正确答案可保存。0054与0055均已顺序应用到日常本地开发库，未修改真实儿童记录。


## 实际部署

北京时间2026/10/21 14:55:26，[Actions 39557192967](https://github.com/windssea/enStudy/actions/runs/39557192967)成功发布2cf619fbbfbe1dba2780d9626d332fc80b07e88a至Preview 48478e58与Production e3c04785，正式域名同版本。两套独立D1均应用新增0054与0055；现有免费资源与AI密钥配置保持，旧迁移未修改。日常开发库也已应用相同0054与0055。

616项单元/78文件、1592完整运行（63基础+1529条PASS）、双站各100线上与三域名87只读检查通过。两站实际分配新taught例句与四专题任务，课程目录和新题目版本均已迁移可用；只读检查核对全部48课、64专题统计、素材指纹和私有文件不公开。正式站浏览器以无儿童档案的游客查看修订讲解卡，未提交真实儿童答案。

入口/assets/index-CGF3Pl_l.js SHA256 75c2e4f3e187e3a2c16fb205ea7e5068d295a24b2d8d2e47cd3108e42884d5c1；时态对照模块/assets/TenseComparison-BjIWM6AZ.js SHA256 38092e32dd655d4a6ce135909267db44c6022282efab0ff0fe927ab1cd139b15。Worker 22469211字节，SHA256 779db6200af06360c7c7fb260563e7a17ac1613d42710e158b03319be075a413。缓存壳eq-shell-v1-5c03d89b6a6fa7c9共137资源、15428737字节，低于16MiB预算。

证据在忽略目录artifacts/actions-v065-result.json、actions-v065-complete.log、v065-published-public.json、v065-published-browser.json与v065-published-lesson.png。真实教师签审、儿童与实体Pad验证仍待完成，不能将源内容审校和自动化通过视为长期教学效果证明。
