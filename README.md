# 英语探险岛

面向小学P1–P6的英语学习网站，支持多家庭、多儿童、PC和平板。当前代码v0.11：React/TypeScript/Vite、Three.js/R3F、Hono Pages Functions与Cloudflare D1可运行，采用免费优先服务。云端仍为v0.8，单词特训、全站3D动效与受管理家庭账号尚未发布。

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

同家庭多成人邀请、全专题诊断与迁移、延迟测验、离线队列、AI/BYOK/语音、教材精确映射及完整288课仍在里程碑待办中。当前只需儿童昵称和年级，不需要真实姓名或生日；设备朗读不等同于AI语音对话。

## 检查和部署

```powershell
npm run check
npm run build
npm run check:functions
npm run verify:local
npm run verify:account
npm run verify:managed-accounts
npm run verify:course
npm run verify:topics
npm run verify:patterns
npm run verify:vocabulary
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
