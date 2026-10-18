# 2026年10月18日 v0.37 同步部署核验

用户再次说明额度恢复并要求同步推送后，本轮只对最新已提交的main启动一次工作流，没有重跑旧提交。应用提交为`2d3a6db27a300a291e2c719a74c95a680f5ee875`，本地HEAD与origin/main一致，版本v0.37.0。未提交的自然拼读开发保留在本地，没有混入发布。

[GitHub Actions运行39121867225](https://github.com/windssea/enStudy/actions/runs/39121867225)于北京时间2026年10月18日19:05:58启动。check成功：格式、385项单元检查、生产构建、Functions编译、本地数据库初始化与完整运行回归通过。回归共1142项（1100行PASS及基础42项），包含写作草稿、跨设备接续、家庭隔离及复习；AI和语音使用隔离模拟，不代表真实供应商或设备验收。

## 云端结果

北京时间19:13:03，Preview执行D1迁移时，Cloudflare API再次返回7500：账号免费每日行写入额度已超限，需要等到UTC午夜重置。待执行0034至0038没有完成，Pages静态资源和Functions上传没有执行。Production迁移、上传和两站新版线上验收均跳过。本轮没有第二次触发，没有付费升级、新建账号、数据库或定时重试。

失败后对现有两套D1执行只读SELECT，均确认最新迁移为`0033_household_member_lookup.sql`，B学期第四至第六单元课程数为0，`writing_drafts`表不存在。读取响应均为`changed_db=false`、`rows_written=0`。

| 环境 | 独立D1 | 实际发布状态 |
| --- | --- | --- |
| Preview | `28fdeae4-7ebe-409f-9beb-2766122fa159` | 仍v0.31.1，216课，迁移至0033 |
| Production | `bfbbf58a-56fc-4173-bfa4-81442a15e257` | 仍v0.31.1，216课，迁移至0033 |

Preview、Production及正式域名`enstudy.nanokid.win`重新读取health、课程目录和静态shell，均为`course-catalog-v9`、216课、`eq-shell-v1-d62821ae1b4b4288`，没有writingProtocol。注册仍关闭，账号登录与家庭协作开关保持原值。页面与只读接口可访问，不代表额度受限时可以保存学习记录。

根据本轮API的UTC午夜说明，下一次重置时间为北京时间2026年10月19日08:00；这只是额度重置时刻，不是本项目已安排的自动重试。历史automation仍为PAUSED。GitHub包含288核心课、写作工坊和较新的伙伴效果，云端尚未更新，不能把推送成功算作发布成功。

## 证据和后续

忽略目录artifacts保留`actions-v037-retry-check.log`、`actions-v037-retry-failed.log`、`actions-v037-retry-watch.log`、`d1-preview-v037-retry-after.json`、`d1-production-v037-retry-after.json`与`published-v037-retry-after.json`。记录以`[skip ci]`提交，避免文档提交重复触发同一额度失败。下次获准部署时仍应选择当时最新可发布main，保留独立D1，先Preview检查成功再Production同版本发布，不修改已应用迁移。
