# Preview与Production同步发布

2026-10-17用户要求同步发布Production。沿用同一Pages项目`english-quest-dev`；项目名含dev不影响Cloudflare对Production环境的判定。生产分支main，预览分支development。

| 环境 | 地址 | APP_STAGE | D1 |
| --- | --- | --- | --- |
| Preview | https://development.english-quest-dev.pages.dev | preview | english-quest-dev-db |
| Production | https://english-quest-dev.pages.dev | production | english-quest-prod-db |
| 正式域名 | https://enstudy.nanokid.win | production | 与Production相同 |

正式域名已在Pages项目的域名列表核实，未新增域名或修改DNS。生产D1 UUID为`bfbbf58a-56fc-4173-bfa4-81442a15e257`；开发库UUID为`28fdeae4-7ebe-409f-9beb-2766122fa159`。生产不复制开发儿童档案、答题、会话或AI配置。首次迁移创建相同的初始admin账号和用户指定密码，两个环境此后各自保存数据。

## 自动发布流程

推送main后，`.github/workflows/cloudflare.yml`依次执行检查、构建、预览迁移/发布/9项公开检查，然后生产迁移/发布/9项公开检查。两个环境使用同一任务构建的dist和同一提交的Functions源码，生产步骤不重新运行构建。预览失败则不继续生产。

仓库Variable `CLOUDFLARE_DEPLOY_ENABLED=true`启用发布任务，`CLOUDFLARE_PRODUCTION_DEPLOY_ENABLED=true`启用生产步骤。现有账号级Pages与D1 Token可同时操作两个库，不增加付费服务或权限类型。关闭生产开关只停止后续生产发布，不删除现有站点或数据库。

Wrangler顶层配置继续用于本机和预览，`env.production`显式覆盖生产vars与DB。所有远程环境均`ALLOW_DEV_AUTH=false`且注册关闭。`deploymentTarget`拒绝缺失的生产配置、开发身份开启、错误APP_STAGE、错误库名/ID，以及生产与预览库ID相同的情况。

## CLI与验证

```powershell
# 已创建资源；以下为维护入口，不应盲目重建
npm run cf:provision:production -- --apply
npm run cf:deploy:production -- --apply
npm run verify:production
node scripts/smoke-remote.mjs https://enstudy.nanokid.win production
npm run verify:isolation
```

CLI使用指定Account ID。生产迁移带`--env production`；Pages发布带`--branch main`，由Pages选择生产配置。Pages deploy不接受Workers式`--env`参数。

`verify:isolation`检查两个站点的JS构建一致、两个环境均可登录、生产Token无法在预览使用，以及生产创建的临时儿童档案在预览不可见。结束时移除该测试档案并退出测试会话。账号完整流程仍可分别通过`smoke-account.mjs`执行，测试脚本不输出密码或Cookie。

## 发布证据

2026-10-17，提交`0f101d1`通过[Actions运行39009786446](https://github.com/windssea/enStudy/actions/runs/39009786446)。Preview部署`9587973c`、Production部署`7a960567`均成功，分别通过9项公开检查；32项单元检查及原学习/账号本地接口检查也全部通过。

正式域名`enstudy.nanokid.win`另外通过9项公开检查和23项真实账号检查，确认生产APP_STAGE、admin登录、Cookie保护、儿童档案CRUD、进度保存、刷新恢复与退出撤销。6项环境隔离检查全部通过；所有本轮临时测试档案及其学习数据均已移除。没有复制或删除既有儿童档案与答题数据。

Production指Cloudflare发布环境，完整课程、专题、复习、BYOK、语音与实机验收继续按总体目标推进；不能把Production部署成功解释为全部学习功能已完成。

依据：[Pages环境配置与分支选择](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)、[Pages绑定](https://developers.cloudflare.com/pages/functions/bindings/)。
