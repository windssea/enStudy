# GitHub提交与Cloudflare自动部署

目标仓库由用户指定为`https://github.com/windssea/enStudy.git`，主分支为`main`。后续由GitHub Actions构建并部署现有Cloudflare Pages前端与Pages Functions（Worker），继续绑定独立开发D1，不新建另一套Worker或生产资源。

## 已编写的工作流

`.github/workflows/cloudflare.yml`在main提交、PR和手动触发时运行类型检查、格式检查、单元检查、生产构建与Functions编译。当前本机27项单元检查通过。PR只检查。部署任务仅main运行，且需要仓库变量`CLOUDFLARE_DEPLOY_ENABLED=true`；未配置时明确跳过。

Actions固定到已核验的官方checkout/setup-node提交SHA，只有contents:read权限，不保留checkout凭据。部署串行，远程迁移失败即停止，随后上传dist和Functions并运行8项线上检查。CI通过Cloudflare API重新核对Pages与D1身份，不依赖本机忽略的资源回执。

## 配置自动部署

仓库Settings → Secrets and variables → Actions：

| 类型 | 名称 | 值或来源 |
| --- | --- | --- |
| Variable | CLOUDFLARE_ACCOUNT_ID | 已创建开发资源所属的32位账号ID |
| Secret | CLOUDFLARE_API_TOKEN | 本人在Cloudflare创建的受限Token |
| Variable | CLOUDFLARE_DEPLOY_ENABLED | Token配置完成后设为true |

Token仅限目标账号的Cloudflare Pages:Edit和D1:Edit；CI需要列资源、执行迁移和部署。不要把本机OAuth凭据复制到仓库，不要在聊天粘贴token。可直接在GitHub Secret页面填写，或通过`gh secret set CLOUDFLARE_API_TOKEN`交互输入。当前尚未配置CI Token，因此不能把首次CLI发布描述为GitHub自动部署已验收。

配置完毕后在Actions页手动运行工作流，或继续推送main。部署目标是`development.english-quest-dev.pages.dev`；代码主分支main仍发布到Cloudflare的development预览分支，不发布生产。

私有仓库的GitHub Actions也有账号套餐额度，超额行为按GitHub账号设置处理；工作流不购买额度或开通任何收费服务。

依据：[Cloudflare官方CI直传说明](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)、[GitHub Actions安全使用说明](https://docs.github.com/en/actions/reference/security/secure-use)。
