# 线上BYOK密钥配置 v0.48.0

v0.47发布后，两个环境的家长AI连接接口均返回available:false，Cloudflare没有AI加密Secret。已有文本解释、语音和单段写作建议代码因此无法在线保存供应商Key。本阶段完成部署侧加密配置和可独立验证的保存检查，不改变家长授权、供应商审批或儿童AI开关。

## 部署与恢复

Windows初始化脚本scripts/prepare-cloud-ai.ps1为现有Preview和Production各生成32字节随机主密钥；Windows DPAPI CurrentUser保护的备份写在忽略目录.cloudflare/ai-keystores.dpapi.local.json。备份仅能在同一Windows用户上下文解开，应另行做好该用户及设备的恢复保障。脚本不会输出明文或覆盖已有仓库Secret；初始化不是轮换工具。没有恢复旧密钥时，既有密文不能靠重新生成密钥恢复。

初始化确认后用-UploadGitHub通过标准输入保存GitHub Secret CLOUDFLARE_AI_KEYSTORES，并设置变量CLOUDFLARE_AI_KEYSTORES_REQUIRED=true。该Secret只进入部署步骤，不能进入Vite、dist或公开内容。GitHub工作流先检查资源归属和Worker体积，再向所选Pages环境写入AI_KEYRING、AI_ACTIVE_KEY_ID和一个配置指纹标记，均为secret_text，然后迁移并部署。正式环境仍在预览检查通过后部署同一构建。

重复部署仅检查已知标记和Secret元数据，匹配则复用，不重写。项目、分支或D1不匹配，既有密钥未知或不同，缺少必需GitHub Secret时停止；PATCH结果未知不自动重放。不同密钥环轮换、旧密钥退役和灾难恢复演练仍待专门实现。保留原环境变量和D1绑定；不升级方案、不新增数据库、不修改0001–0045迁移。

Cloudflare官方说明[Secret加密且设置后不能读取](https://developers.cloudflare.com/pages/functions/bindings/#secrets)，本实现使用[项目PATCH的secret_text环境绑定](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/edit/)，更新方式与锁定Wrangler版本的pages secret bulk一致。检查的是元数据和真实部署后的站内加解密，不声称能从管理API读回Secret。

## 家长检查与协议

健康接口增加aiConfigurationProtocol:1和aiKeyStoreAvailable布尔值；原aiEnabled:false表示默认不自动启用，不代表某家庭的实时设置。家长连接列表的available反映相同就绪状态。UI区分未配置与已就绪，新增“检查密钥保存”。

POST /api/v1/ai/connections/:id/storage要求当前家庭owner、当前密码和连接version。站内解密AES-GCM及家庭/连接/密钥ID绑定，重新确认权限和密文版本；只返回verified:true和version。无出站请求，不记录已测试供应商，不改变设置、连接版本、能力、学习进度或AI预算。密码复验照常进入现有验证限速记录，因此并非零数据库写入。匿名/儿童拒绝，跨家庭404，旧版本409，错误密码401，损坏密文503。

“检查密钥保存”仅确认加解密。随后“测试连接”会向受审批的供应商发起最小请求，可能计费；家长确认供应商、模型和隐私政策，测试成功并独立开启所需能力后孩子才可使用。真实供应商Key未提供，实际教学输出、供应商语音协议与麦克风/Pad验收仍待完成。默认审批域名维持api.openai.com，其余主机保持待审批，不为本次检查放宽网络策略。

## 验证与发布

部署配置14项单元与48项隔离workerd/D1 AI检查通过：独立密钥、严格格式、资源身份、选定环境写入、重复复用、未知配置拒绝和未知PATCH结果恢复；保存检查无供应商请求、状态不变、密码/版本/儿童/跨家庭限制及损坏密文拒绝。隔离测试只访问本机模拟服务。完整单元、CI、浏览器及两站实际发布证据见下文同步发布记录。

本地495项单元（61文件）、类型、格式、生产构建及Functions检查通过；Worker 18,583,750字节，SHA256 0fb6da474aea544c59365e977abbee2cabee32edf71d9323d0b02e04628eee61。内置浏览器用本机虚构连接走通保存、密码确认、检查成功；未测试供应商或启用任何能力。独立密钥备份已生成且DPAPI可重新读取，GitHub Secret与必需变量已配置，实际Pages配置与发布均已完成，结果见下文。

## 2026年10月19日同步发布与线上核验

[Actions 39234125516](https://github.com/windssea/enStudy/actions/runs/39234125516)成功部署应用提交58ec5033f88e0d2f769c5d6ad5f806e01875c796。检查北京时间17:59:14–18:08:43，部署18:08:45–18:10:56。495项单元/61文件、1424项完整运行（48项基础检查与1376条PASS）、Preview与Production各57项线上检查通过。Worker两次部署均为18,583,750字节，SHA256 0fb6da474aea544c59365e977abbee2cabee32edf71d9323d0b02e04628eee61。

预览7a97ebd0，正式7156c758。两个环境各自安装了3个加密Secret绑定，两套现有D1均无新迁移，保持至0045。主入口/assets/index-CCQRCYEJ.js，SHA256 a8c09ad0380ee79d7ac9d3208278faab4487c97eecf2cc6f8dac5f4a60cda56e；离线壳eq-shell-v1-22e6c9c46cd01656、122文件。

北京时间20:23–20:25补充线上验证：两站各创建一条未选择、未测试的随机虚构连接，密码确认的storage接口均返回verified:true和版本0；检查前后完整连接列表、设置和AI预算完全一致，未调用test接口或供应商。仅移除本次临时连接并撤销测试登录，原连接、开关和用量保持一致，共22项。正常移除连接可能推进空选择设置的版本号，不能将清理声称为零数据库写入。

三个地址各6项、共18项只读检查通过：阶段、加密就绪、注册关闭、开发身份关闭、入口SHA256、插画清单与离线壳均与构建一致。另以本机受保护备份在内存解开密钥，扫描286个构建文件未发现任一环境的主密钥材料，未输出明文。原狐狸/小熊及插画场景保留，Preview/Production发布检查仍校验四张图片完整哈希。

本机浏览器已验证保存、密码检查成功和清理；768×1024尺寸无横向溢出且已恢复窗口。正式域名家长界面的就绪提示已核验。证据在忽略目录artifacts/v048-*.log及v048-*-ai-*.png。未提供真实供应商Key，不能据此宣称真实供应商文本、语音、教学质量或Pad实机已经验收。注册和指定管理员不变，免费方案不变。
