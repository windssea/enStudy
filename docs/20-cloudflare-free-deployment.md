# Cloudflare免费优先部署与CLI操作

默认路线为Cloudflare Pages Direct Upload + Pages Functions + D1，所有资源放在独立开发环境。先用免费套餐与免费额度运行，不自动升级套餐，不创建R2/KV/Queues/DO或调用收费AI。2026-10-17已完成本人OAuth登录、独立开发资源创建、迁移和首次预览发布。

用户已确认新建独立开发环境，采用下列development preview命名。部署脚本在远程操作前校验JSONC配置，支持注释和尾逗号，遇到语法错误立即停止。首次Pages创建遇到8000000服务端错误，经列表确认不存在后重试成功；实际CLI列表使用`Project Name`字段，脚本已兼容并加入回归检查。

实际预览：https://development.english-quest-dev.pages.dev；首次部署ID：577aa3d4。D1 UUID为`28fdeae4-7ebe-409f-9beb-2766122fa159`，远程确认26张核心表和`0001_core.sql`迁移。GitHub Actions为后续自动部署入口，参见[GitHub部署手册](22-github-deployment.md)。

## 服务与免费边界

以下额度于2026-10-17核验，按账号共享而不是每个站点独享。

| 服务 | 当前方案 | 免费边界与处理 |
| --- | --- | --- |
| Pages静态内容 | 前端、目录、轻量自有素材 | 不经过Functions的静态请求免费；静态资源单文件≤25MiB；Free Git构建500次/月 |
| Pages Functions | `/api/*` | 与Workers Free共用每天100,000请求；超额不能继续保证动态服务 |
| D1 | 1个开发库，后续独立生产库 | 每天500万行读、10万行写；Free单库≤500MB、每账号最多10库、总存储5GB |
| 媒体 | 暂随Pages静态发布 | 按文件预算压缩、分级下载；不预先开通需要额外计费关系的存储 |
| R2 | 后续明确需要再评估 | 即使存在免费额度也不视为无限免费；当前无bucket创建脚本 |
| AI/邮件/域名 | 单独决定 | 不属于上述免费承诺；AI由家长BYOK，域名可先用pages.dev |

依据：[Pages Functions价格](https://developers.cloudflare.com/pages/functions/pricing/)、[Pages限制](https://developers.cloudflare.com/pages/platform/limits/)、[D1价格](https://developers.cloudflare.com/d1/platform/pricing/)、[D1限制](https://developers.cloudflare.com/d1/platform/limits/)、[R2价格](https://developers.cloudflare.com/r2/pricing/)。这些是额度事实，不是永久免费或固定可支持人数的保证。已有付费账号也可能仍有固定费用，脚本不会修改账号套餐。

## 环境和资源命名

| 环境 | Pages | D1 | 身份与数据 |
| --- | --- | --- | --- |
| local | Wrangler本机模拟 | `.wrangler/state` | 两个虚构家庭；APP_STAGE=local且ALLOW_DEV_AUTH=true并仅loopback才可用 |
| development preview | english-quest-dev | english-quest-dev-db | APP_STAGE=preview、ALLOW_DEV_AUTH=false；M1允许admin登录后管理儿童档案和保存进度，注册关闭 |
| production | M1后单独建立 | 独立生产库 | 不与preview混绑；正式成人认证、Secret、备份与验收先完成 |

名字在`cloudflare.project.json`声明，可在首次创建前修改。`wrangler.jsonc`初始D1 UUID全零仅用于本地；远程provision成功后写入真实非秘密ID。`.cloudflare/resources.local.json`保存账号/项目/库的绑定回执，不存token并被Git忽略。

## 推荐CLI流程

在项目根目录执行，使用锁定的本地Wrangler，不依赖全局安装。

```powershell
npm ci
npm run cf:plan
npm run cf:whoami
```

未登录时，在自己的终端完成浏览器授权：

```powershell
npx wrangler login
```

随后选择目标账号的非秘密Account ID，确认该账号采用所需套餐与资源空间：

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = '替换为自己的32位AccountID'
npm run cf:whoami
npm run cf:provision -- --apply
npm run build
npm run cf:deploy:preview -- --apply
```

不要把示例中文占位值直接提交给Wrangler；脚本会检查32位格式。不要把API token写到tracked文件或聊天。OAuth凭据由Wrangler在其本机凭据存储中管理；CI后续使用最小权限的受保护Secret环境变量。

`cf:provision`不带`--apply`只输出计划。带标记后按顺序：确认账号和登录→列D1→创建或核对受管理的开发库→立即记录库ID→列Pages→创建Direct Upload项目→重新读取验证→更新根配置与回执。已存在同名但不属于本checkout记录的资源会停止；确实要复用须自行核对后显式传`--reuse-existing`，或者先修改资源名。

资源创建中断后先运行`d1 list --json`与`pages project list --json`核对，不重复盲建。脚本保留已知库ID；未知结果需要核对再复用。免费保护在账号已有10个D1库时拒绝新增，不尝试升级套餐。

预览发布按顺序：核对账号/库/项目回执→验证开发身份开关关闭→远程迁移→上传dist与Functions至development分支。迁移失败即停止，不继续发布新前端。注意Pages的CLI自动读取根`wrangler.jsonc`，本项目不向`pages deploy`传不受支持的`--config`参数。

## 手动CLI等价操作

自动脚本是默认入口，下面用于排查和理解，数据库UUID必须使用实际返回值：

```powershell
npx wrangler d1 list --json
npx wrangler d1 create english-quest-dev-db
npx wrangler pages project list --json
npx wrangler pages project create english-quest-dev --production-branch main
# 将实际D1 UUID写入wrangler.jsonc，保持preview与开发身份关闭
npx wrangler d1 migrations apply DB --remote
npm run build
npx wrangler pages deploy dist --project-name english-quest-dev --branch development
```

上面是说明性顺序；如果库或Pages已经存在，先核对、复用而不是重复执行create。账号下资源创建或发布均不代表完整应用已上线，预览写入默认仍关闭。

## 控制台和Git两种替代模式

控制台模式：创建D1并复制ID→创建Pages项目→绑定DB→分别设置Preview/Production变量→构建并通过Wrangler上传包含Functions的应用。不能只把dist拖拽到控制台而假设仓库里的Functions也会自动部署。

Git集成模式：先选择私有或合适的仓库与生产分支；构建命令`npm ci && npm run build`，输出`dist`，根目录为本项目。配置独立预览DB和变量；用受保护流水线在发布前运行迁移。该模式会消耗Pages构建额度且会触发自动发布，须避免每次内容编辑都无节制触发构建。首期选择Direct Upload；两类项目接入方式的迁移限制上线前再次核对，不能任意在现有项目上切换。

## 免费额度的工程控制

- `_routes.json`只把`/api/*`送入Functions，目录JSON、图片、JS/CSS均走静态路径；页面切换不查询整张答题表。
- D1保存摘要和必要事件，媒体不进SQL；查询带家庭/孩子条件及索引，监测实际rows_read/rows_written而非只数请求。
- 不做每题AI调用；标准题本地资产和服务端规则判定。对话另有BYOK配额，不把免费平台额度当成免费模型额度。
- 手工起步每天检查Cloudflare用量，70%额度时减少非必要统计和预生成；90%时停止新增高耗请求并保留明确失败状态。正式自动告警在后续运营任务实现，当前没有伪造已启用的告警。
- 数据库容量350MB开始清理规划与导出演练，425MB限制新增长入口；不能自动删除学习记录换空间，也不能到限额时悄悄转付费。

100名日活、每人10题只是估算场景，物理写量包含事件、调度、奖励、断言和索引。M0远程仅有部署与冒烟流量，没有真实用户压测结论，不能据本地速度保证可承载人数。

## 发布验证与回退

远程发布后应获取实际deployment URL，检查`/api/v1/health`显示preview且开发身份不可用；请求`POST /api/v1/dev/session`必须403，进度API必须401，目录与静态资产正常。再验证DB绑定、迁移、真实认证及跨家庭测试；M0不开放线上学习记录。

前端回退用Pages上一个成功部署版本；SQL使用向前修复迁移，不删除已确认事件。D1 Free当前Time Travel窗口7天；需要更长备份时可由受控本地/CI任务执行`wrangler d1 export DB --remote --output ...`，输出放受保护且Git忽略位置，演练恢复和删除账本。M0没有自动每日备份，生产发布前须实现备份与删除流程。

下一步账号动作是本人运行Wrangler登录与设置目标Account ID；没有账号授权前，本地开发、构建与测试均可继续。
