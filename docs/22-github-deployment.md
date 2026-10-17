# GitHub提交与Cloudflare自动部署

目标仓库由用户指定为`https://github.com/windssea/enStudy.git`，主分支为`main`。后续由GitHub Actions构建并部署现有Cloudflare Pages前端与Pages Functions（Worker），继续绑定独立开发D1，不新建另一套Worker或生产资源。

## 已编写的工作流

`.github/workflows/cloudflare.yml`在main提交、PR和手动触发时运行类型检查、格式检查、单元检查、生产构建与Functions编译。当前本机27项单元检查通过。PR只检查。部署任务仅main运行，且需要仓库变量`CLOUDFLARE_DEPLOY_ENABLED=true`；未配置时明确跳过。

Actions固定到已核验的官方checkout/setup-node提交SHA，只有contents:read权限，不保留checkout凭据。Token仅传给凭据检查和Wrangler部署步骤，npm安装与构建不接收Token。部署串行，远程迁移失败即停止，随后上传dist和Functions并运行8项线上检查。CI通过Cloudflare API重新核对Pages与D1身份，不依赖本机忽略的资源回执。

## 配置自动部署

仓库Settings → Secrets and variables → Actions：

| 类型 | 名称 | 值或来源 |
| --- | --- | --- |
| Variable | CLOUDFLARE_ACCOUNT_ID | `4430e72dda309478d832370e6f8f9d81`，已核验开发资源所属账号；不是密钥 |
| Secret | CLOUDFLARE_API_TOKEN | 本人在Cloudflare创建的受限Token |
| Variable | CLOUDFLARE_DEPLOY_ENABLED | Token配置完成后设为true |

Token仅限目标账号的Cloudflare Pages:Edit和D1:Edit；CI需要列资源、执行迁移和部署。不要把本机OAuth凭据复制到仓库，不要在聊天粘贴token。可直接在GitHub Secret页面填写，或通过`gh secret set CLOUDFLARE_API_TOKEN`交互输入。当前尚未配置CI Token，因此不能把首次CLI发布描述为GitHub自动部署已验收。

## 创建Token的具体步骤

1. 登录[Cloudflare个人API Tokens](https://dash.cloudflare.com/profile/api-tokens)，选择Create Token → Custom token → Get started。这里使用个人自定义Token。
2. 名称填写`enStudy GitHub Deploy`，Permissions添加两行：`Account / Cloudflare Pages / Edit`和`Account / D1 / Edit`。前者发布Pages与Functions，后者执行D1迁移。不要选择宽泛的Worker模板来代替这两行。
3. Account Resources选择Include → Specific account，只选上述Account ID对应账号。这是账号级Pages/D1权限，不能把它理解为只允许当前一个项目；部署脚本另行限制项目名与库ID。
4. Continue to summary → Create Token。Token只显示一次，复制后直接存入GitHub Secret；可根据自己的维护计划设置有效期。
5. 打开[enStudy的Actions Secrets](https://github.com/windssea/enStudy/settings/secrets/actions)，New repository secret，Name填`CLOUDFLARE_API_TOKEN`，Secret粘贴刚创建的值，Add secret。不要把Token填到Variables标签。
6. 打开[Actions Variables](https://github.com/windssea/enStudy/settings/variables/actions)，创建上表两个Variable。GitHub的Secret和Variable是不同存储位置；本工作流从vars读取账号ID与部署开关。

如果使用账号拥有的Token入口，界面权限名可能显示`Pages Write`与`D1 Write`；上面的个人Token入口对应`Cloudflare Pages Edit`与`D1 Edit`。以官方权限列表和实际界面为准。

## 首次运行与结果核对

打开[Actions工作流](https://github.com/windssea/enStudy/actions/workflows/cloudflare.yml)，选择Run workflow，分支main。`check`与`deploy`都应成功；deploy显示Skipped通常是部署开关未设为字符串`true`。修改变量不会自动触发新运行，需手动Run workflow或再次push。

已登录GitHub CLI时，也可以执行以下命令；这里只包含非秘密值：

```powershell
gh variable set CLOUDFLARE_ACCOUNT_ID --repo windssea/enStudy --body 4430e72dda309478d832370e6f8f9d81
gh variable set CLOUDFLARE_DEPLOY_ENABLED --repo windssea/enStudy --body true
gh workflow run cloudflare.yml --repo windssea/enStudy --ref main
gh run list --repo windssea/enStudy --workflow cloudflare.yml --limit 3
```

Missing CLOUDFLARE_API_TOKEN：核对Secret名称和存储层级；Authentication error或权限拒绝：核对Token有效期、目标账号以及两项Edit权限；资源身份不匹配：先核对wrangler.jsonc和实际D1 UUID，不通过新建数据库绕过检查。

配置完毕后在Actions页手动运行工作流，或继续推送main。部署目标是`development.english-quest-dev.pages.dev`；代码主分支main仍发布到Cloudflare的development预览分支，不发布生产。

私有仓库的GitHub Actions也有账号套餐额度，超额行为按GitHub账号设置处理；工作流不购买额度或开通任何收费服务。

依据：[Cloudflare官方CI直传说明](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)、[Token创建说明](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)、[权限名称列表](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)、[GitHub Secrets说明](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)、[GitHub Actions安全使用说明](https://docs.github.com/en/actions/reference/security/secure-use)。
