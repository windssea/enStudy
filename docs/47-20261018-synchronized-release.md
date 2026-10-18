# 2026-10-18 额度恢复后的同步发布

用户确认Cloudflare额度恢复，并要求继续同步推送。沿用现有免费方案、Pages项目和Preview/Production独立D1，没有升级、重建数据库或恢复已停用的定时自动化。

## 发布过程

| GitHub运行 | 提交 | 实际结果 |
| --- | --- | --- |
| [39090004612](https://github.com/windssea/enStudy/actions/runs/39090004612) | `8d0376d` | CI完整检查通过；Preview迁移至0027并发布v0.26成功；账号验收脚本的重复Cookie问题令后续Production步骤跳过 |
| [39090512760](https://github.com/windssea/enStudy/actions/runs/39090512760) | `c813f65` | check与deploy均success；两站发布及各20项线上检查通过；北京时间10:38完成 |

首次运行没有遇到D1每日额度错误，Preview的后续迁移已成功执行。线上功能版本已到v0.26，但Production在首轮结束时仍为v0.8，不能把首轮的Preview成功说成两站同步成功。

## 验收脚本修复

服务器登录先发送清除旧会话的Cookie，再设置同名新Cookie。原验收脚本把两条同名Cookie都拼进请求，令服务器读取到空值。按浏览器同名Cookie覆盖规则维护的Cookie jar能正常登录；此次未做真实浏览器登录验收。本次未修改登录接口或降低权限要求。

新增同源、根路径Cookie响应归并函数，保留最后设置的值、处理空值删除、剥离响应属性并保留值中的等号。3项回归检查通过，总计254项单元检查及格式检查通过。修复后的Preview 20项线上检查通过，包括管理员身份、账号列表和四个3D模块摘要。

Preview另完成10项补充真实D1检查：第六单元听句使用明确的文字辅助后提交并恢复回执，单词拼写成绩与词汇进度保存，按比例比较示范的权威数据及不增加答题数，随后删除临时档案并撤销验证会话。没有使用真实儿童数据，也未验证实际发声或GPU显示。

## 最终状态

第二次运行的254项单元检查、706项完整本地workerd/D1检查、生产构建及Functions编译均通过。Preview确认无待执行迁移，Production的剩余迁移执行至0027成功；未改写任何已应用迁移，未遇免费额度限制。

| 环境 | 地址 | 版本与内容 | D1 |
| --- | --- | --- | --- |
| Preview | https://development.english-quest-dev.pages.dev | v0.26 / course-catalog-v6 / 144课 / 360词 / 1440词汇任务 | 28fdeae4-7ebe-409f-9beb-2766122fa159，至0027 |
| Production | https://english-quest-dev.pages.dev | 同上 | bfbbf58a-56fc-4173-bfa4-81442a15e257，至0027 |
| 正式域名 | https://enstudy.nanokid.win | 同上，production环境 | 同Production |

本次Git提交为`c813f654d8f65addac5ee2eb37f7c8a20c78a84c`。Preview发布实例为`53b3c1cc`，Production为`a9a1e02d`；两个实例使用同一应用构建。注册保持关闭，管理员账号和密码未改变，开发身份线上禁用，离线协议为1。

CI分别对Preview和Production执行20项线上验收，正式域名另执行20项：当前课程清单、词汇模式、离线静态清单、四个3D模块的SHA-256摘要、CSP、未登录拒绝及管理员登录/账号列表/退出均通过。

Production也完成与Preview相同的10项功能保存检查，两站共20项补充检查。6项隔离检查通过：应用构建一致、两站管理员可登录、Production会话不能用于Preview、Production临时档案只在Production可见。所有临时档案及其学习记录已删除，验证会话已撤销。

当前144/288节为核心课程范围，不代表全学段、真实AI供应商、实时语音、PC/iPad的GPU/触控/声音或浏览器离线体验已经验收。CI和API探测不能替代这些真机检查。发布记录以`[skip ci]`单独推送，不为纯文档再部署一次；后续应用代码经main工作流正常检查与同步发布。
