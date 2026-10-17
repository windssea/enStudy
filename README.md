# 英语探险岛

面向小学P1–P6的英语学习网站，支持多家庭、多儿童、PC和平板。当前代码v0.18.1：React/TypeScript/Vite、Three.js/R3F、Hono Pages Functions与Cloudflare D1可运行，采用免费优先服务。课程72/288节，覆盖各年级前三个单元；前48节以文字核心为主，新24节混合听句、阅读找线索与受控语法。云端仍为v0.8，后续本地阶段尚未发布。

[开发预览](https://development.english-quest-dev.pages.dev) 通过GitHub Actions发布。M1加入管理员登录（账号admin，密码使用用户指定值）、关闭注册、儿童档案管理与刷新续学；开发测试身份继续只限本机。验证与剩余范围见[M1进展](docs/23-next-phase-progress.md)。

Production地址为[enstudy.nanokid.win](https://enstudy.nanokid.win)及[Pages正式地址](https://english-quest-dev.pages.dev)。main通过预览检查后同步发布Production，两个环境使用独立D1，详见[同步发布说明](docs/24-production-deployment.md)。

GitHub Actions自动部署已启用：推送main后执行检查、D1迁移与Pages/Functions发布。首次完整[部署运行39008241021](https://github.com/windssea/enStudy/actions/runs/39008241021)通过，包含27项单元检查和8项线上检查。

## 运行开发版

```powershell
npm ci
npm run setup:local
npm run dev
```

打开 [本地开发页面](http://127.0.0.1:5173)，在家长空间登录admin，选择或创建儿童昵称档案，再体验启航练习与进度保存。本机仍有虚构测试档案入口。API运行于 [本地8788](http://127.0.0.1:8788/api/v1/health)。要求Node.js 22.12以上，当前验证版本24.19.0。

已实现：24节原创语法与表达微课（每年级4节）、216个课内练习变体（71个句子家族）、到期复习选题、9步课程与完成记录；另有72单元/60专题/72句式草稿目录和8道启航练习。服务端判题、提示记录、D1持久化、原子幂等、跨家庭隔离、懒加载3D地图及2D切换继续可用。课程阶段说明见[v0.6进展与限制](docs/25-learning-course-progress.md)。

v0.7进一步开放全部60专题的文字练习题库：每专题60组题干、120个选择/填写变体，共7200变体。每轮随机5/10/20题，同轮题组去重、近期避重、选项打乱并保存本轮快照。详见[随机题库与验证](docs/26-random-topic-banks.md)。音形及口语专题目前提供文字准备，未提供听辨或录音评分。

v0.8为72条固定句式逐条接入独立随机题库，每条40情境×选择/填写/组句3种形式=120变体，新增8640变体。支持5/10/20题、句子去重、近期避重、合法接续与缩写、刷新续练和分句式复习。详见[句式练习与验证](docs/27-random-pattern-banks.md)。

v0.9新增单词特训，已开发并通过本地检查，尚未上线：360词条、六个年级段18主题，词卡释义/例句/点按朗读，词义、拼写、语境或混合随机练习；每轮5/10/20题，按词条和模式保存证据与复习，显示真实已练及到期数量。本次发布受Cloudflare D1每日免费写入额度阻挡，两站仍为v0.8；可在[本机单词特训](http://127.0.0.1:5173/#words)体验。详见[验证与发布状态](docs/28-vocabulary-training.md)。

v0.10把3D扩展到单词、句式、专题、微课、复习和答题：共享探险伙伴、词卡与苹果、词块拼合、小芽浇水、答对后短彩纸，以及页面入场和词块吸附。支持全站2D/3D与安静模式，后台、离屏和朗读暂停。64项单元检查与本机33项基础冒烟通过，浏览器和iPad视觉验收仍待完成。可在[本机页面](http://127.0.0.1:5173)体验；发布仍受D1额度阻挡，详见[动效与3D记录](docs/29-motion-and-3d.md)。

v0.11新增管理员创建家庭账号、停用/恢复、重设临时密码，以及家长自行改密。新账号首次登录须先改密；停用与改密撤销所有旧设备，保留学习记录。注册仍关闭，默认管理员未更改。68项单元检查和本机170项HTTP回归通过，详见[账号管理进展](docs/30-managed-family-accounts.md)。用户已选择保持免费，本地继续开发，已安排北京时间10月18日08:05对最新main重试部署。

v0.12加入显式跨设备续学：其他设备先读取只读进度，点击接续才换发权限；旧设备不能提交新答案、提示或下一步。题目顺序、已保存提示与回执保留，并处理同页草稿、并发接续、档案切换和旧响应。76项单元检查及本机206项HTTP回归通过，详见[续学记录](docs/31-device-session-handover.md)；真机和云端验证待完成。

v0.13加入家长自带AI文本服务：加密保存Key、域名白名单、文本协议测试、明确同意、家庭与孩子每日额度，孩子保存答案后可请求中文解释及英文例句。106项单元与246项本机运行检查通过；真实供应商、PC/iPad界面和生产主密钥配置待验证。可在[本机家长空间](http://127.0.0.1:5173/#parent)配置，详见[AI文本记录与配置](docs/32-ai-text-assistance.md)。

v0.14为60专题加入分步计划：5题小尝试、10题巩固、5题应用和第1/3/7天回访，题池隔离、全部分配历史避重、逾期合并及暂停任务显式恢复。复习花园与家长报告可查看计划。114项单元检查与275项本地运行检查通过，真实界面与教学质量待验；见[分步训练记录](docs/33-topic-training-journeys.md)，可在[本机专题中心](http://127.0.0.1:5173/#topics)体验。

v0.15新增六年级段第二单元24课、216任务（213句子家族），示范和练习分离；当天已看示范的正确答案单独记录，隔天独立提取仍可复习晋级。追加v2目标版本、历史任务恢复和混合来源复习，避免复制旧题库成员表。120项单元与297项本机运行检查通过；详见[课程扩展与示范证据](docs/34-course-expansion-and-exposure.md)，可在[本机地图](http://127.0.0.1:5173/#map)进入第二单元。

v0.16新增[英语小剧场](http://127.0.0.1:5173/#talk)：P1–P6六个角色场景、最多6轮短对话，以及录音试听→主动识别→文字确认→对话→AI合成声音。家长分别配置与测试文字/ASR/TTS连接，独立同意和音频额度；对话及结果加密暂存，原录音不落库。144项单元检查及356项本地运行检查通过（其中59项为新增隔离语音检查）；真实服务商、PC/iPad录音播放与实时通话仍待验，见[语音实现与边界](docs/35-ai-dialogue-and-voice.md)。今天不发布云端，沿用明早免费重试安排。

v0.17新增[分类与句子修正工坊](http://127.0.0.1:5173/#workshops)：12组、288个卡片组合和96句修正，随机5/10/20题，逐项核对、按能力分开的复习、语义相同答案幂等、跨题型示范证据，以及落卡进篮的3D演示和2D替代。152项单元与412项本地运行检查通过，实际遍历384项结构化任务的纯判题，12工坊各完成5题真实流程；见[工坊实现与验证](docs/36-interactive-workshops.md)。组合复用目标词，不等于384个独立知识点；实际PC/iPad视觉与触控验收待完成。

v0.18新增各年级第三单元24课/216个不同任务，以及现有360词条的听词辨义（共1440项词汇任务）。听音需确认或明确使用文字辅助，辅助记录不可撤回；阅读需选原文线索和答案，新增拼句接受已声明的时间短语前置。164项单元与449项本地运行检查通过；24课216题已实际保存，真实声音与PC/iPad操作仍待验，详见[听辨、阅读与课程记录](docs/37-listening-and-evidence-reading.md)。可从[本机地图](http://127.0.0.1:5173/#map)进入第三单元，或在[单词特训](http://127.0.0.1:5173/#words)选择听词辨义。

v0.18.1根据“配色不够活泼、引导混乱”的反馈调整本地界面：暖白底、明黄单词岛和珊瑚/薄荷/紫色主题卡片；单词页改为选主题→准备挑战→小练习，默认认词义5题，其他练法与词卡按需展开。选中后直接显示准备页，返回保留筛选与恢复焦点；主导航增加用途说明，答题时保持所属栏目高亮，复习返回复习花园。164项既有单元检查、生产构建、三个页面状态静态渲染及色彩对比度数值检查通过；浏览器连接仍不可用，真实PC/iPad布局、缩放和焦点操作待验。详见[单词页设计](design-system/english-quest/pages/word-training.md)。

同家庭多成人邀请、全面错因诊断与开放场景迁移、专用评估内容、离线队列、AI出题与实时语音、教材精确映射及剩余216课仍在里程碑待办中。当前只需儿童昵称和年级，不需要真实姓名或生日；设备朗读不等同于AI语音对话。

## 检查和部署

```powershell
npm run check
npm run build
npm run check:functions
npm run verify:local
npm run verify:account
npm run verify:managed-accounts
npm run verify:ownership
npm run verify:course
npm run verify:course-expansion
npm run verify:voice
npm run verify:workshops
npm run verify:listening-reading
npm run verify:topics
npm run verify:training
npm run verify:patterns
npm run verify:vocabulary
npm run verify:ai
npm run cf:plan
```

`verify:local`需要dev服务运行，只操作虚构本地档案。`npm run verify:remote`检查已部署的开发预览。CLI操作见 [免费部署手册](docs/20-cloudflare-free-deployment.md)；GitHub提交和自动部署见 [GitHub部署手册](docs/22-github-deployment.md)。不会自动开通收费服务。

## 开发资料

- [当前开发执行计划](docs/19-development-plan.md)
- [Cloudflare免费部署与CLI操作](docs/20-cloudflare-free-deployment.md)
- [M0验证记录和剩余范围](docs/21-m0-verification.md)
- [分里程碑待办](docs/development/backlog.csv)
- [完整设计文档](docs/README.md)
- [原HTML概念稿](prototype/index.html)，保留用于设计对照

首发范围保持小学所有年级、多家庭账号、完整课程与专题体系。朗文系列、版次尚未指定，精确映射仍需核对；自主体系继续独立建设。Production环境已经发布，完整产品的功能与实机验收仍在推进。
