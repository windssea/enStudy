# 资料与事实核验

核验日期为2026-10-17。以下优先使用官方产品文档、项目仓库与课程文件。动态额度、协议和仓库状态在实际实施时再次核对；不依据附件里的推荐直接决定架构。

## 一手资料

| 资料 | 本方案使用的事实与边界 |
| --- | --- |
| [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) | Pages可执行后端逻辑；不代表任意Node程序都无需适配 |
| [Pages绑定](https://developers.cloudflare.com/pages/functions/bindings/) | D1/R2等绑定；DO须独立Worker部署再绑定 |
| [Pages路由](https://developers.cloudflare.com/pages/functions/routing/) | API路由与静态资源范围配置 |
| [D1价格](https://developers.cloudflare.com/d1/platform/pricing/) | 行读写与索引对计费的影响、免费配额 |
| [D1限制](https://developers.cloudflare.com/d1/platform/limits/) | 免费单库500MB、付费单库10GB与账户限制 |
| [D1数据库API](https://developers.cloudflare.com/d1/worker-api/d1-database/) | batch事务设计的接口依据；CAS断言组合仍需验证 |
| [Workers价格](https://developers.cloudflare.com/workers/platform/pricing/) | 付费方案起点与CPU/请求计费，非本产品固定报价 |
| [Better Auth数据库](https://better-auth.com/docs/concepts/database) | 官方数据库/适配概念；实际D1与Pages组合需样片验证 |
| [R3F性能指南](https://r3f.docs.pmnd.rs/advanced/scaling-performance) | 按需渲染、资源复用等；帧率仍要实测 |
| [MDN麦克风授权](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) | 安全上下文与权限要求 |
| [MDN录音格式探测](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static) | 格式运行时检查，不能假设各浏览器相同 |
| [W3C拖动替代](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | 拖拽需单指替代，界面同时提供键盘操作 |
| [香港教育局英语课程文件](https://www.edb.gov.hk/en/curriculum-development/kla/eng-edu/curriculum-documents.html) | 已有2025年小学英语课程指南，规划不只参考旧版2017文件 |
| [Pearson小学电子教材](https://www.pearson.com.hk/en_GB/learning-and-teaching-resources/e-learning/primary-longman-elect-e-textbook.html) | 小学产品范围与功能参考，不能推出某版逐课目录 |
| [Pearson第二版资源入口](https://plet2e-eng-pri.pearson.com.hk/6a/) | Primary Longman Elect Second Edition存在；登录资源不擅自访问 |
| [间隔与提取学习综述](https://doi.org/10.1038/s44159-022-00089-1) | 学习原则依据；不是首发具体间隔参数的临床式保证 |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | 后续可选调度实现，不直接代表完整语法教学模型 |

## 附件中三个仓库的复核

| 仓库 | 当前可确认 | 本项目结论 |
| --- | --- | --- |
| [Tutor and Professor](https://github.com/helberjf/tutor-professor) | 仓库描述使用Next.js/FastAPI，含儿童英语、生成课程与间隔复习方向 | 参考功能拆分；不能据描述认定多家庭隔离与教学正确性已验证 |
| [LEGO Grammar](https://github.com/SparkZou/lego-grammar) | 以单词积木/车厢隐喻进行儿童语法交互 | 参考拼句体验，持久化、BYOK和全课程另行设计 |
| [FoxQuiz](https://github.com/leomuf/foxquiz) | 当前仓库描述面向10–18岁，采用Google ADK/Cloud Run方向 | 不沿用附件“明确适合三～四年级”的结论；借鉴生成与校验分离 |

此轮是仓库页面与文档复核，未运行三个项目，也未完成逐文件许可证与安全审计。决定借鉴交互思路，不复制代码；若后续引入源码，须单独核实具体commit、LICENSE、依赖、素材及分发条件，不能把README中的许可证声明直接视作全部资产授权。

## 设计资料

使用本地 ui-ux-pro-max 查询：`children education playful learning`与收窄后的`educational app gamification`，均命中Claymorphism；销售落地页布局未采纳。`dragging movements`返回明确的拖动替代规则；threejs查询支持性能预算与输入兼容提醒，react查询支持异步错误处理。主设计规范结合儿童学习场景制定，不将数据库搜索建议当作产品事实。
