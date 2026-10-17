# 英语学习网站设计文档导航

版本：0.13，日期：2026-10-17。工作名称为“英语探险岛 / English Quest”。课程、随机专题与固定句式已分阶段上线；单词特训、3D动效、家庭账号、跨设备续学及BYOK文本辅助已本地实现，云端仍受D1每日免费写入额度阻挡，真机验收待完成。用户选择保持免费，已安排10月18日08:05重试最新main发布，本地继续开发。产品仍覆盖P1–P6、60专题与72句式；设计目标不等于已实现功能。

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
