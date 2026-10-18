# 英语学习网站设计文档导航

最新发布核验：2026年10月18日19:13，对v0.37 main的CI完整通过，但Cloudflare仍返回D1每日写入额度7500。Preview未上传，Production跳过，两站及正式域名仍v0.31.1/216课/0033；详见[本轮发布核验](59-20261018-v037-deployment-attempt.md)。

开发进度：v0.38.0新增[拼读小路](60-phonics-word-audio-and-clay-workbench.md)，六站120练习词240任务、25独立示范和145段英式合成整词，粘土字母标记、无空格拼写与共用复习/跨设备记录。402项单元、61项新专项和1203项完整本地回归通过；核心288课与写作工坊保留，完整音素体系、声音听审、AI点评、教研及真机验收仍待完成。云端仍v0.31.1/216课/0033，本阶段不再触发受限部署。

线上基线版本：0.31.1，日期：2026-10-18。工作名称为“英语探险岛 / English Quest”。当前216/288节微课，包含各年级完整A学期核心练习与B学期前三单元；360词条支持认词义、听词辨义、拼写、语境和混合练习。17个实验台提供54个可选3D教学示范，含2D替代和示范记录。另有家长7/30日报告与本机离线练习。v0.31.1已同步发布至Preview、Production及正式域名，新增定向家庭邀请、成员权限和显式家庭切换，见[阶段与发布记录52](52-household-invitations-and-roles.md)。保留皮卡丘与狐狸双伙伴，保持免费、关闭注册和独立D1，历史定时自动化仍停用。完整媒体、剩余72课、教学审核及PC/iPad实机质量待完成。设计目标不等于已实现功能。

| 顺序 | 文档 | 解决的问题 |
| --- | --- | --- |
| 1 | [方案评估与建议](00-proposal.md) | 推荐架构、范围、取舍和立项结论 |
| 2 | [产品需求](01-product-requirements.md) | 用户、目标、功能优先级和验收条件 |
| 3 | [全学段课程体系](02-curriculum.md) | P1–P6 学习路径、语言能力、内容规模 |
| 4 | [复习与掌握模型](03-review-engine.md) | 如何安排复习、避免刷分、恢复积压 |
| 5 | [用户流程与页面设计](04-experience.md) | 信息架构、关键页面、异常路径 |
| 6 | [界面设计系统](../design-system/english-quest/MASTER.md) | 色彩、字体、动效、响应式和组件规范 |
| 7 | [技术架构](05-architecture.md) | Pages、API、D1、R2 和客户端分工 |
| 8 | [数据模型](06-data-model.md) | 家庭隔离、内容版本、事件与进度 |
| 9 | [接口契约](07-api-contract.md) | 登录、学习、同步、AI 和错误处理 |
| 10 | [AI 与语音接入](08-ai-and-voice.md) | BYOK、能力探测、语音降级和质量控制 |
| 11 | [隐私与安全](09-security-and-privacy.md) | 儿童模式、密钥、越权、防滥用和删除 |
| 12 | [内容生产与教材映射](10-content-operations.md) | 原创题库、朗文映射、审核与版权边界 |
| 13 | [实施计划与成本](11-delivery-plan.md) | 工作量、阶段、依赖、运营费用和风险 |
| 14 | [验收与测试计划](12-validation.md) | 正确性、安全性、教学和设备验证 |
| 15 | [决策记录与待确认项](13-decisions.md) | 已定决策、技术验证项和外部依赖 |
| 16 | [资料与事实核验](14-references.md) | 一手资料、日期、旧方案校正 |
| 17 | [需求追踪矩阵](15-traceability.md) | 每项原始需求对应设计和交付门槛 |
| 18 | [交付检查记录](16-delivery-check.md) | 本次文档与概念稿实际验证结果 |
| 19 | [专题特训设计](17-topic-training.md) | 语法、时态、单词变形等专题的分层训练与复测 |
| 20 | [固定句式与常用表达](18-sentence-patterns.md) | 12主题72句式，固定部分、槽位、变体和情景迁移 |
| 21 | [开发执行计划](19-development-plan.md) | 当前代码范围、M0–M5顺序与本地命令 |
| 22 | [Cloudflare免费部署与CLI](20-cloudflare-free-deployment.md) | 免费边界、建资源、迁移、预览发布、控制台与Git替代模式 |
| 23 | [M0验证记录](21-m0-verification.md) | 实际构建与运行证据，远程和实机未完成项 |
| 24 | [GitHub部署手册](22-github-deployment.md) | 仓库、Actions检查、Secret配置与自动部署 |
| 25 | [M1阶段进展](23-next-phase-progress.md) | 关闭注册、admin登录、儿童档案、刷新续学与下一阶段范围 |
| 26 | [Production同步发布](24-production-deployment.md) | Preview和Production同版本发布、正式域名与独立D1 |
| 27 | [v0.6课程与复习进展](25-learning-course-progress.md) | 24节原创微课、专题初步练习、到期复习与完成记录 |
| 28 | [v0.7随机专题题库](26-random-topic-banks.md) | 每专题120变体、随机抽取、近期避重与展示快照 |
| 29 | [v0.8随机固定句式](27-random-pattern-banks.md) | 72句式各120变体、选择填写组句与精确句式抽取 |
| 30 | [v0.9独立单词特训](28-vocabulary-training.md) | 360词条18主题、四种练法、词卡与真实进度统计 |
| 31 | [v0.10动效与3D](29-motion-and-3d.md) | 共享伙伴、学习场景、词块拼合、反馈与暂停策略 |
| 32 | [v0.11受管理家庭账号](30-managed-family-accounts.md) | 管理员创建、停用恢复、临时改密、会话撤销与真实隔离 |
| 33 | [v0.12跨设备续学](31-device-session-handover.md) | 显式接续、旧设备拦截、并发版本与本页草稿恢复 |
| 34 | [v0.13 BYOK文本辅助](32-ai-text-assistance.md) | 加密连接、家长同意、原子预算、题后解释与真实验证边界 |
| 35 | [v0.14分步专题](33-topic-training-journeys.md) | 分池小尝试与巩固、受控应用、延迟回访、逾期合并及暂停续学 |
| 36 | [v0.15课程与示范证据](34-course-expansion-and-exposure.md) | 48课、示范分离、目标版本、混合复习与历史计数边界 |
| 37 | [v0.16角色对话与轮流语音](35-ai-dialogue-and-voice.md) | 六场景、录音确认、独立ASR/TTS、加密短缓存与实际额度 |
| 38 | [v0.17分类与句子修正工坊](36-interactive-workshops.md) | 结构化判题、12组384任务、逐项反馈、能力标签和3D落卡演示 |
| 39 | [v0.18听辨、阅读与第三单元](37-listening-and-evidence-reading.md) | 72课、听音确认/文字辅助、阅读依据、听词辨义及播放器兼容 |
| 40 | [v0.19专题与句式分步入口](38-guided-training-centres.md) | 8类与12场景、当前任务、中文句框、返回状态和示例证据 |
| 41 | [v0.20时态与词形实验台](39-time-and-word-form-labs.md) | 16专题48示范、时间线与词块3D、2D替代和跨题型示范记录 |
| 42 | [v0.21第四单元与儿童引导](40-fourth-unit-and-clearer-navigation.md) | 96课、216混合任务、版本保留、鲜明主题色与单词快速开始 |
| 43 | [v0.22家长学习报告](41-guardian-learning-reports.md) | 7/30自然日、跨入口与题型统计、辅助证据、复习提醒及家庭隔离 |
| 44 | [v0.23本机离线练习](42-offline-practice-and-confirmation.md) | 公共页面缓存、七题型加密队列、逐题确认、显式重新授权与非独立证据 |
| 45 | [v0.24第五单元与课内3D入口](43-fifth-unit-scenarios-and-lesson-labs.md) | 120课、24节新情景课、216任务、比较级条件句与跨题型辅助记录 |
| 46 | [10月18日单次发布失败记录](44-20261018-single-deployment-attempt.md) | CI本机连接失败、deploy跳过、两站仍v0.8、自动化已停用 |
| 47 | [v0.25实物比较场景](45-measured-comparison-scenes.md) | 塔高、桥宽、书薄的3D/2D比例与DOM观察及辅助证据 |
| 48 | [v0.26第六单元与历史示范记录](46-sixth-unit-and-historical-demonstrations.md) | 六个年级24课216任务与旧示范对新增题目的保护 |
| 49 | [10月18日同步发布v0.26](47-20261018-synchronized-release.md) | 修复验收Cookie、两站至0027、正式域名及功能和隔离核验 |
| 50 | [v0.27粘土伙伴与B学期起点](48-clay-guide-and-next-term.md) | Blender源模型、棚灯与缓存、原创卡通角色、168课与学期引导 |
| 51 | [v0.28粘土词语角与B第二单元](49-word-study-and-b-term-unit-two.md) | 192课、词义匹配的六种模型、词卡示范与独立记忆衔接 |
| 52 | [v0.29皮卡丘与档案伙伴](50-pikachu-and-saved-companions.md) | 皮卡丘GLB、可编辑模型、双角色降级与儿童偏好保存 |
| 53 | [v0.30位置实验与第三单元](51-position-lab-and-third-term-unit.md) | 216课、粘土位置关系、中文语法对照与示范证据 |
| 54 | [v0.31家庭邀请与权限](52-household-invitations-and-roles.md) | 已有账号邀请、成员管理、家庭上下文与两步兼容发布 |
| 55 | [v0.32合作与第四单元](53-cooperation-term-unit-and-home-activities.md) | 24课216任务、中文家庭小活动和语义边界 |
| 56 | [v0.33表情与粘土伙伴](54-expressive-clay-partners.md) | 弯耳领巾模型、短动作、材质与资源验证 |
| 57 | [v0.34贴面闭眼](55-surface-safe-cartoon-blinks.md) | 独立闭眼曲线、局部遮蔽、缓存与拓扑验证 |
| 58 | [v0.35第五单元与同步](56-practical-term-unit-and-revision.md) | 264课、实用表达、追加版本接受自然语序与部署核验 |
| 59 | [v0.36最终核心单元](57-final-core-unit-and-continued-review.md) | 288核心课、后续复习与数量不能替代完整教学交付 |
| 60 | [v0.37保存写作作品](58-saved-writing-workshop.md) | 六个年级的配文与多段草稿、冲突保护和私有生命周期 |
| 61 | [10月18日v0.37同步核验](59-20261018-v037-deployment-attempt.md) | 最新main的CI通过、D1额度拒绝及两站实际状态 |
| 62 | [v0.38拼读与整词声音](60-phonics-word-audio-and-clay-workbench.md) | 六站240任务、粘土字母标记、真实静态音频、共用证据与复习 |

配套资料：

- [P1–P6 的 72 个原创主题单元](curriculum/p1-p6-scope.csv)
- [8类60个专题特训矩阵](curriculum/topic-training-scope.csv)
- [12主题72条固定句式目录](curriculum/sentence-patterns.csv)
- [原创示范课和题目契约](examples/lesson.schema-example.json)
- [教材映射模板](examples/textbook-mapping.csv)
- [D1 核心表结构草案](specs/schema.sql)
- [复习算法参考实现](specs/review-reference.mjs)
- [界面概念稿说明](../prototype/README.md)
- [开发里程碑待办](development/backlog.csv)

这些资料以仓库文件交付，方便后续版本管理。CSV、SQL 和算法参考均为开发起点，不能替代生产系统的审核、迁移和端到端验证。
