# M0开发基线验证记录

日期：2026-10-17。当前交付是开发底座与代表性学习闭环，完整公开首发仍按P1–P6课程、60专题和72句式目标推进。

## 已有证据

| 项目 | 命令或依据 | 实际结果 |
| --- | --- | --- |
| 依赖与编译 | package-lock.json、npm run build | TypeScript检查与Vite生产构建通过；React19.3.1、R3F9.8.2、Three0.186.1、Wrangler4.151.1 |
| 前端体积 | Vite构建输出 | 主JS约77KB gzip、CSS约3.6KB、独立World chunk约242KB gzip；3D不进入首屏主包 |
| 本地数据库 | npm run setup:local | Wrangler本机D1创建26张核心表并写入两个虚构家庭、四个档案与8道样题；未创建远程资源 |
| 纯逻辑与CLI保护 | npm run check | 27项通过，覆盖复习、日期/夏令时、开发身份边界、私有答案、判题、无apply不变更配置、缺账号拒绝创建、JSONC兼容与损坏配置提前拒绝，以及实际Wrangler Pages列表格式 |
| Functions产物 | npm run check:functions | 独立服务端Worker编译通过，已随Pages预览部署 |
| HTTP与真实D1 | npm run verify:local | 本地workerd上23项检查通过：创建会话、跨家庭读写拒绝、并发幂等、提示证据、调度保存、Origin与撤销；还包括Vite私有答案/服务端源码/开发变量访问阻断与空JSON对象类型拒绝 |
| 内容覆盖 | 构建脚本与HTTP读取 | 72单元、60专题、72句式草稿目录数量正确，未将私有答案写入静态目录 |
| 文档与设计 | py -3 tools/validate-design-pack.py | 原设计包43项检查继续运行；排除node_modules等外部依赖目录 |
| CLI计划 | npm run cf:plan | 明确仅D1和Pages创建，不创建R2/KV/Queues/DO，不切套餐；无apply只输出计划 |
| Cloudflare资源 | Wrangler whoami、provision与deploy | 本人OAuth登录成功；独立开发Pages和D1创建，首次部署577aa3d4成功 |
| 远程数据库 | wrangler d1 execute DB --remote | 26张核心表、0001_core.sql迁移记录已核对；未写入真实儿童数据 |
| 线上检查 | npm run verify:remote | 8项通过：React入口、CSP、preview健康、身份与AI关闭、DB绑定、开发登录403、匿名进度401和课程目录 |
| 本地Git | git status、git check-ignore | 依赖/本地数据/凭据/历史zip被忽略；后续推送与CI结果另以GitHub记录为准 |
| GitHub CI | Actions运行39008040271 | GitHub托管运行器检查成功：安装、格式、27项检查、构建、Functions编译；部署因开关关闭跳过，Token待配置 |

HTTP验证会在虚构测试档案增加少量记录，重跑按前后差值验证，不清空已有学习数据。每次并发提交的同一assignment只产生一次事件与奖励；提示状态来自服务端，不相信客户端声称未用提示。

开发源码使用Prettier统一排版，`npm run format:check`可复核。开发HTTP服务仅绑定127.0.0.1，不暴露到局域网；要在真实平板测试时需另行配置可受控访问的预览环境。

## 仍需完成

1. GitHub Actions工作流已编写；配置受限Cloudflare API Token并完成首次CI运行后，才能宣称自动部署已验收。现有预览为CLI首次发布。
2. 本机Tabbit稳定CLI仍以exit1且无诊断输出结束，未取得可操作的浏览器自动化会话。页面已通过HTTP并提交到Codex预览面板，但没有取得截图或真实点击证据；不能据此宣称视觉、触控或WebGL实机验收已通过。
3. 正式成人认证、跨设备/刷新恢复、完整复习选题、离线同步、BYOK、语音和内容生产按M1–M5继续。
4. 当前3D模块原始体积约914KB，构建产生chunk体积提醒。已独立懒加载，后续须真实设备分析、资源拆分和内存/发热评测，不以调高警告阈值代替优化。
5. 本地及远程D1基础结构均已核验。远程负载、账号共享额度容量、备份恢复与生产合规仍无验收结论。

本记录区分“已实现”“已本地验证”“尚未远程/实机验证”。没有把草稿目录、模拟账号或成功构建解释为正式生产发布。
