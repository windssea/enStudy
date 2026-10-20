# v0.57 同一动作的时态对比

2026-10-20，用户要求围绕“吃一个苹果”，从一个明确时间参照点解释多种时态，不再只分散看单个时态。本阶段已同步Preview、Production与正式域名，实际证据见文末。

## 教学结构

情境固定“现在是今天15:00”，可切换昨天15:00、现在、明天15:00。每组同时展示一般、进行、完成、完成进行四行，共12种常见时态表达；动词高亮、中文意义、同一坐标的时间轴和苹果状态配套。可以展开三列完整总览，平板窄屏按时间组纵排。课程中的时态规律区复用同一组件，专题页位于分步练习之前，需要主动点击打开。

首组重点对比原创例句：I ate an apple at three yesterday. / At three yesterday, I was eating an apple. / By three yesterday, I had eaten an apple. / At three yesterday, I had been eating an apple for two minutes. 四句改变观察角度和情境，不声称一次已确定的历史事件同时处于互不相容的状态。

过去完成的参照点也在过去，事件结果在该参照点之前；过去进行的区间跨过参照点。完成进行的情境明确14:58开始、15:00还在吃，强调时长，不能画成“已经吃完”。现在一般式改用每天下午的习惯背景，不说明此刻是否在吃；现在完成例句不直接搭配yesterday。将来三点是设想，使用虚线与“设想画面”，不能当作已发生事实。示意轴不按真实时长比例，绿色区间边缘不是实际结束时刻。完成式不一律等于“吃完”，进行式也不一律表示当下；例外和适用范围放在有用的可展开说明内。

采用常见12格教学分类，不将其解释为英语有12套动词词尾；将来使用will结构。完成进行、将来进行和将来完成等标记“拓展”，本阶段不新增相应测评题库，不将查看解释记为掌握。

## 依据与原创内容

所有苹果例句、中文释义及界面文案为本项目原创。教学语义核对以下一手资料，仅归纳规则，不复制其例题：

- [British Council：Past perfect](https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/past-perfect)：过去参照点及完成/完成进行的关系。
- [British Council：Present perfect](https://africa.teachingenglish.org.uk/classroom/grammar/present-perfect)：已结束的特定过去时间与现在完成的区别。
- [Cambridge：Present perfect simple or continuous](https://dictionary.cambridge.org/uk/grammar/british-grammar/present-perfect-continuous)：完成结果与持续活动，包含仍在进行的用法。
- [Cambridge：Future perfect](https://dictionary.cambridge.org/us/dictionary/english/future-perfect)：从未来参照点回看结果或时长。

## 实现和证据保护

共享数据`packages/domain/tenseComparison.ts`定义版本1、12条原创情境、时态结构与几何关系。`TenseComparison`使用现有统一主题，`TenseComparisonDiagram`以SVG准确绘制两个不同的时间参照，不用生图绘制文字和数轴。

三张苹果状态图通过内置imagegen生成，采用同一苹果、盘子、视角和灯光。原PNG存于设计目录，WebP仅格式压缩并核对原尺寸与alpha，三图合计287972字节；登记于统一学习素材清单，精确路径进入现有离线白名单。提示和参考链见[ART_PROMPTS](../design-system/english-quest/ART_PROMPTS.md)。

有学习档案时，必须先成功调用`POST /api/v1/learning/tense-comparison/view`再披露相应4句；全12格总览另登记12句。接口校验固定版本和参照枚举，只用服务端例句生成哈希，忽略客户端替换文本或证据键，沿用原生家庭/儿童授权、来源校验和每日幂等示范表。切换档案或卸载会中止请求，不能让上个档案的异步结果重新显示。没有儿童档案时可作公开示范，不写个人记录。

示范不创建答题、课程完成、星星或复习卡；相同例句后续作答依旧走既有辅助证据检查。本阶段没有修改已应用迁移、旧课程/题目版本、分步计划或AI配置。新时态内容是版本化示范模块，不计为新增测评。

## 验收与发布

本地类型检查与561项单元测试通过（69文件），格式检查、构建和Worker打包通过。真实local workerd/D1的34项示范检查通过：新增8项覆盖匿名拒绝、版本和参照点校验、不可信来源、每组四句及总览的权威登记、重复打开幂等；保留原54例示范、奖励/进度不变与后续辅助证据检查。操作均使用可清理的专用测试档案，未使用真实孩子资料。

内置浏览器已在隔离内存D1登录并打开对比，切换过去/现在/将来、展开12格总览成功，登记成功后才显示对应例句。最终PC/平板/375px布局与12格总览通过，无横向溢出，四行配图（三种状态）均加载；控制台无错误或警告。GitHub Actions同步发布结果见下文。真实Pad与儿童试用、完整教研仍待完成。


## 实际发布结果

北京时间2026/10/20 17:31:45，[Actions 39399696949](https://github.com/windssea/enStudy/actions/runs/39399696949)成功发布818c55cde114fe6f4177d41d9eddf917953139ae至Preview 28966e26与Production 71130f6a，正式域名同版本。561项单元、1512项完整运行检查（59基础与1453条PASS）、两站各85项完整线上检查、三域名30项只读检查通过。两个现有D1仍至0049，无待用迁移；独立AI密钥与精确主机名单沿用，未升级免费计划或新建资源。

构建入口`/assets/index-CfaDWKUv.js`，SHA256 `ecc44a89642c06b8e191256eb408178e6c9520c82b6c799b199258472e2893c5`；时态模块`/assets/TenseComparison-DKM2o938.js`，SHA256 `69ded2c165507a44858fb174a18bed86e996b8e997d61d9db670a5b1a06963fd`；离线壳`eq-shell-v1-10b79379ad2beacd`，133资源、15388197字节，低于16777216上限。新Worker 19405435字节，SHA256 `a2f4e1962dd3875d787b17372559196e56bf55d610ba532fdd29f0db69a8f9ad`。三域名逐一核验入口、12条时态模块、九张注册图像及课程绑定。线上临时档案核验比较示范保存后已清理，不替代真实儿童使用研究。

证据在忽略目录：`actions-v057-complete.log`、`actions-v057-result.json`、`v057-published-public.json`、`v057-build-proof.json`、`concepts-v057.log`。本地截图`v057-tense-desktop.png`、`v057-tense-pad.png`、`v057-tense-375.png`。专用内存D1浏览器环境完成72项检查后已关闭；曾因15分钟自动关闭重建一次，非Cloudflare重试。

后续改变例句、时间含义或披露范围必须提升comparisonVersion，保留旧哈希证据，避免旧标签页登记新句却显示旧句。本阶段仅提供同一动作的12种常见表达，不将其视为新增测评题库或完整英语时态教研已完成。

正式域名浏览器已核验新版入口、四种过去表达、将来四个设想标记和12格总览；对比行图片加载完成后才保存最终截图，布局无横向溢出、控制台无错误/警告。使用无儿童档案的公开浏览状态，未作答或登记真实孩子示范。正式站截图`v057-production-tense.png`；本阶段样式与语义约束另见[对比页规范](../design-system/english-quest/pages/tense-comparison.md)。
