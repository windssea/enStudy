# 阶段完成后同步 Cloudflare

后续 v0.45 儿童界面已按本规则在 2026年10月19日15:22 完成同步，[运行39214309814](https://github.com/windssea/enStudy/actions/runs/39214309814)成功，两站各56项线上检查通过，正式域名同步；完整结果见[儿童界面发布记录](68-picture-led-child-interface.md)。下文保留v0.44历史结果。

2026年10月19日用户要求恢复按阶段同步部署。此前受免费D1额度限制，仅本地开发并以[skip ci]推送；从本次起，已完成并验证的阶段使用正常main提交触发现有GitHub Actions，不能继续默认跳过部署。

## 发布规则

1. 完成一个可验收阶段，运行对应测试、构建及必要的浏览器检查，记录已实现范围与剩余事项。开发中的中间保存不作为阶段发布。
2. 将阶段提交推送main，不添加[skip ci]。使用仓库既有cloudflare.yml：格式、单元、构建、Functions及本地运行回归通过后，核对现有资源并执行Preview独立D1迁移及Pages/Functions发布。
3. Preview线上检查通过，才对Production独立D1执行必要迁移并发布同一构建，再执行Production线上检查。两站沿用原账户、项目和数据库，保持免费，不新建资源或启用付费。
4. 跟踪同一次Actions运行到成功或失败，不重跑旧提交。遇额度限制时停止反复重试，分别记录Preview与Production的迁移、上传和验收结果，不能把GitHub提交算作发布。
5. 发布后补充真实运行、版本、线上地址与验证结果。仅此类文档补记使用[skip ci]，避免相同版本重复迁移/上传。保留历史阶段记录，不改已应用迁移。

当前两个仓库变量CLOUDFLARE_DEPLOY_ENABLED与CLOUDFLARE_PRODUCTION_DEPLOY_ENABLED均为true，API Token保留在GitHub Actions Secret中。工作流按部署任务串行发布两站；不启用新的定时自动化。

## 本次范围

本次同步v0.44.0及此前尚未上线阶段：288节核心课、自然拼读、写作与可选AI建议、六站粘土地图、错题小本和18专题1080道专用材料。应用内容提交89e8b45，本地460项单元与1390项运行检查通过。0001–0044保持不可变；云端实际应用进度和发布结果以本页后续核验记录为准。

用户注册保持关闭，指定管理员凭据不改；AI与语音的真实供应商、教研、Pad实机与完整产品门槛仍待验，本次上线不表示这些门槛已通过。

## 2026年10月19日发布结果

[GitHub Actions 39207059008](https://github.com/windssea/enStudy/actions/runs/39207059008)由正常main推送触发，发布提交9780df6a6314a669277564c0f2256a09c16ca0d8，应用内容对应89e8b45、v0.44.0。北京时间13:55:40启动，14:07:36完成，check与deploy均成功。未重跑旧提交，没有额度失败、付费升级或新建资源。

CI通过57文件460项单元、格式、构建、Functions编译、本地初始化与1390项运行检查（48项基础加1342行PASS，包含56项错题与32项专用材料专项）。同一deploy任务先发布并验收Preview，再发布并验收Production，两站各54项线上检查通过。

| 环境 | 独立D1 | 部署与验证结果 |
| --- | --- | --- |
| [Preview](https://development.english-quest-dev.pages.dev/) | 28fdeae4-7ebe-409f-9beb-2766122fa159 | 0034–0044全部成功，14a86cd2部署；14:06:44线上检查完成 |
| [Production](https://english-quest-dev.pages.dev/) | bfbbf58a-56fc-4173-bfa4-81442a15e257 | 0034–0044全部成功，913156db部署；14:07:34线上检查完成 |
| [正式域名](https://enstudy.nanokid.win/) | 同Production | 课程、静态壳和主入口字节与两站一致；粘土模型校验及浏览器渲染通过 |

两站和正式域名均为course-catalog-v12、288节课、eq-shell-v1-bf34245d4f9b4c34，主入口/assets/index-DxGUMxaV.js，SHA256为b97903018a57a17043afca3e2ae517fa4ab6fa6071c999bff22cf1b27a5c177c。writingReview、phonics、mistake、trainingMaterial等当前接口协议可用，注册仍关闭。

发布后补充24项功能检查（每站12项）：以现有管理员登录，创建仅用于验收的儿童档案，确认五维摘要、专用材料根版本和当前修订题可分配；保存一份错误答案，快照保留该原答与原回执，错题小本包含对应事件，主动打开讲解成功。两个临时档案均已移除，验收登录已撤销；没有读取其他儿童作答或调用真实AI供应商。

另有20项只读检查覆盖三个域名的课程、接口协议、CSP、相同静态壳与主文件、匿名账号/材料/错题访问拒绝，以及正式域名狐狸和皮卡丘模型的二进制哈希。内置浏览器实测正式域名六站地图已渲染，控制台无错误；截图artifacts/v044-production-clay-map.png。此为PC代表场景，Pad真机、完整听审、供应商联调与教研仍待完成。

证据保存在忽略目录artifacts：actions-v044-stage-complete.log、actions-v044-stage-watch.log及.exit、v044-published-public.json/.log、v044-published-functional.json/.log。补充检查脚本也在该目录，不含Cloudflare Token。仅发布记录补记以[skip ci]推送；下一阶段正常推送继续触发部署。

## v0.46发布中间状态

0045在Preview已应用。aa1c2ae的Actions 39227996119通过全部检查并发布Preview 17535059，但首次媒体校验失败后停止，Production仍为此前v0.45/0044。62个媒体后续复查一致，Preview另12项实际功能验收通过。压缩Functions修复与证据见[69阶段记录](69-picture-word-learning.md)；将与下一插画阶段一起继续正常main发布，保持两站独立D1，不改应用迁移、不升级资源。
