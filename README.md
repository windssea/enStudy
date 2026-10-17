# 英语探险岛

面向小学P1–P6的英语学习网站，支持多家庭、多儿童、PC和平板。已进入M1开发：React/TypeScript/Vite、Three.js/R3F、Hono Pages Functions与Cloudflare D1可运行。独立开发环境已创建，采用免费优先服务。

[开发预览](https://development.english-quest-dev.pages.dev) 通过GitHub Actions发布。M1加入管理员登录（账号admin，密码使用用户指定值）、关闭注册、儿童档案管理与刷新续学；开发测试身份继续只限本机。验证与剩余范围见[M1进展](docs/23-next-phase-progress.md)。

GitHub Actions自动部署已启用：推送main后执行检查、D1迁移与Pages/Functions发布。首次完整[部署运行39008241021](https://github.com/windssea/enStudy/actions/runs/39008241021)通过，包含27项单元检查和8项线上检查。

## 运行开发版

```powershell
npm ci
npm run setup:local
npm run dev
```

打开 [本地开发页面](http://127.0.0.1:5173)，在家长空间登录admin，选择或创建儿童昵称档案，再体验启航练习与进度保存。本机仍有虚构测试档案入口。API运行于 [本地8788](http://127.0.0.1:8788/api/v1/health)。要求Node.js 22.12以上，当前验证版本24.19.0。

已实现：72单元/60专题/72句式的草稿目录，8道开发样题，服务端判题、提示记录、D1持久化、原子幂等提交、复习调度、跨家庭隔离，以及懒加载3D地图与2D切换。课程数量是首发生产目标，不代表288课与全题库已完成。

多账号管理、完整复习选题、离线队列、AI/BYOK/语音、教材精确映射及完整课件仍在里程碑待办中。当前只需儿童昵称和年级，不需要真实姓名或生日；AI密钥入口将在BYOK阶段实现。

## 检查和部署

```powershell
npm run check
npm run build
npm run check:functions
npm run verify:local
npm run verify:account
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

首发范围保持小学所有年级、多家庭账号、完整课程与专题体系。朗文系列、版次尚未指定，精确映射仍需核对；自主体系继续独立建设。尚未发布生产网站。
