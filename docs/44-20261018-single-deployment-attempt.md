# 2026-10-18 唯一一次部署重试：CI失败，未发布

北京时间08:05按既定自动化开始核对仓库、GitHub Actions和线上状态。工作区干净，远程main为`50607cb`（v0.24、120节课）。预检发现旧线上验收脚本仍硬编码24节课，会误拒绝新版本；先提交`abddcb6`修正为核对当前构建的release、课程ID和版本，并增加单词模式、3D资源摘要及管理员接口检查。

08:08仅对当时最新main `abddcb6793b89ac83c30dcfc1025265358e734eb`执行一次`workflow_dispatch`。追踪同一个[Actions运行39081649590](https://github.com/windssea/enStudy/actions/runs/39081649590)至终态，没有重跑旧提交、重跑失败job或再次发起部署。

## 实际结果

| 部分 | 观察结果 |
| --- | --- |
| CI安装、格式、231项单元检查、构建、Functions编译、本地迁移 | 通过 |
| CI完整本地运行检查 | 在离线脚本中失败：`TypeError: fetch failed`，原因`UND_ERR_SOCKET: other side closed` |
| check job | `completed / failure`，08:12:31附近记录错误 |
| deploy job | `completed / skipped` |
| 远程D1迁移与Pages上传 | 本次均未执行；没有升级方案、新建Cloudflare账户或数据库 |
| 免费额度是否已恢复 | 本次没有进入远程迁移，无法据此判断 |
| 自动化`automation` | 已通过应用工具停用，状态`PAUSED`，配置文件复核一致 |

离线失败前，记录已通过九条离线答案同步、不重复增加独立进度和星星、复习阶段不晋级等检查。错误发生在执行本机CLI查询之后的读取阶段；后续清理请求仍成功，日志符合空闲HTTP连接被关闭的情况。没有把它改成忽略失败或放宽学习结果断言。

## 两站与正式域名复核

运行结束后重新读取健康检查与课程接口，均返回HTTP 200，注册保持关闭：

| 环境 | 地址 | 实际课程release | 实际课数 | 新单词题库 |
| --- | --- | --- | --- | --- |
| Preview | https://development.english-quest-dev.pages.dev | `course-foundations-v1` | 24 | 未提供新vocabulary元数据 |
| Production | https://english-quest-dev.pages.dev | `course-foundations-v1` | 24 | 未提供新vocabulary元数据 |
| Production正式域名 | https://enstudy.nanokid.win | `course-foundations-v1` | 24 | 未提供新vocabulary元数据 |

两套环境仍为此前的v0.8发布，独立D1配置不变。不能将main中已有120节课、单词特训和新3D组件解释为这些功能已经上线。新功能的线上课程、3D文件摘要及管理员接口验收未在本次部署后执行，因为本次没有新部署。

## 本地修复及后续边界

为验收脚本增加严格受限的连接恢复：仅对HTTP本机GET请求的`UND_ERR_SOCKET`重试一次，保留Cookie和超时信号；POST、远程地址、其他传输错误、HTTP 4xx/5xx均不重试。离线答题的丢响应、重放与独立证据断言保留。

新增四项连接恢复单元检查后，本地235项单元检查及37项真实workerd/D1离线运行检查通过，格式检查通过。本机读连接恢复已验证；GitHub/Linux上的修复效果尚未通过新的Actions运行验证。本次未触发第二次部署，未修改已应用迁移。后续发布应使用届时最新main，需要新的发布安排。
