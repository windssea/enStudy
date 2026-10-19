# 阿里原生短录音识别 v0.50.0

依据用户选定的 `qwen-audio-3.1-asr-flash` 和 DashScope 原生同步请求接入。该连接只做 ASR；文本对话与 TTS 使用各自连接。已同步上线并完成下述CI与云端保存检查，不能把模拟测试当作真实阿里服务已可用。

## 配置流程

家长空间 → 家长设置 → 保存连接：选择“阿里原生语音识别（Qwen-Audio ASR）”，填写自己的完整 generation 地址、连接昵称、API Key 和数据政策链接，验证家长密码后加密保存。无需填写文本模型或 OpenAI 兼容参数。连接类型修改会清空表单中的旧地址和文本模型，保存仍需家长主动提交。

下方“角色对话与语音”的“语音识别 ASR”选择此连接，会填入 `qwen-audio-3.1-asr-flash` 并关闭该项开关。先保存，再录音、自己听、主动上传测试，最后勾选第三方音频处理说明并为孩子开启。新连接不会自动开启家庭 AI；对话还需独立配置并测试文本模型。语音识别不能作为发音评分或语音合成使用，实时全双工通话仍未实现。

用户提供的工作空间主机保留在部署配置中，不写入公开仓库或前端预设。BaseURL 示例使用 `https://工作空间域名/api/v1/services/aigc/multimodal-generation/generation`；实际地址需从用户自己的阿里控制台取得，不能直接照抄占位符。

## 请求和边界

复用现有 `ai_connections.adapter` 字段，旧连接仍为 `openai-chat`，新增 `dashscope-asr`；不需要改动任何已应用迁移。所有新旧连接继续使用独立环境主密钥、家庭与连接 ID 的 AES-GCM 附加认证、家长密码复验、版本 CAS 与跨家庭授权。

服务端发送完整原生端点，`Authorization: Bearer …`、JSON 与 `X-DashScope-SSE: disable`，消息为 `input.messages[].content[].input_audio.data`，格式为 `data:audio/wav;base64,…`，参数 `format=wav`、`sample_rate="16000"`。复用站内 16kHz 单声道 PCM WAV、0.25–20秒验证，不创建公开录音地址或新存储资源。

识别读取 `output.text` 或 `output.output.sentence.text`，不按 OpenAI choices 解析；保留320字符上限、8KiB响应上限、20秒超时、重定向阻止、密钥回显过滤、儿童内容检查与每日预算。上游错误原文不回传；失败或未知结果不会自动重发。同一个请求重放读取加密回执，不重复计用量。原始录音不落库，结果继续遵循现有短期加密缓存和访问时清理机制。

原生连接不能出现在文本解释、作品点评、文字对话或 TTS 选项；服务端同样拒绝这些用途，包含关闭状态下的错误能力配置。编辑连接会使旧音频测试回执失效。这里只支持用户选择的 Qwen-Audio 原生短录音协议，不能据此声称兼容所有阿里模型或所有语音服务。

## 部署

新增 Actions Secret `CLOUDFLARE_AI_HOST_ALLOWLIST`，由现有工作流只传入部署步骤；值为逗号分隔的完整精确主机名，保留 `api.openai.com` 并加入用户选定的工作空间主机。不是阿里 API Key，不使用通配域名，也不放入 `VITE_*`。部署验证原账户、Pages 项目、分支与独立 D1 后，仅 PATCH 所选环境的 `AI_HOST_ALLOWLIST` 加密绑定与摘要标记；不改主密钥、其他环境或家庭开关。相同配置保留，未知写入结果停止，不盲目重试。

Cloudflare 免费资源、注册关闭和指定管理员不变。API Key 由用户直接在站内家长页面填写，不通过聊天、GitHub明文变量、提交或前端构建传递。

## 验证记录

最终529项单元/64文件、类型与构建通过；其中15项新增连接与部署检查包括主机规范、非法域名拒绝、部署环境隔离、保留其他绑定、未知PATCH结果恢复与原生路径/适配器匹配。79项隔离 workerd/D1 语音检查通过，比原有59项新增20项：真实适配器发送JSON和完整Base64、两种结果结构、家长/儿童回执重放、原生与独立文本连接组合、无效文本/TTS能力、版本失效、错误/重定向/超大/回显拒绝和家庭隔离。全部使用本地模拟供应商，没有调用阿里服务或消耗真实 AI 用量。

Worker为19,378,428字节，SHA256 `be98eb5109eee12654f2626346600fa93f762a3cc8fe1b5c973148a1fdf245fe`。完整本地运行1475项（54基础加1421项PASS）通过，包含79项语音专项；格式检查通过，286个构建文件不含两个环境主密钥材料和用户私有主机。真实 Key 可用性、阿里处理地区/保留政策、儿童语音质量与Pad实机麦克风仍需用户配置后的实际验收。

内置浏览器已验类型选择后隐藏文本模型/兼容参数、显示完整原生地址标签与后续步骤。PC内容宽1265/scrollWidth1265；768×1024为753/753；375×812为360/360，无横向溢出，控制台无错误。仅修改未保存表单，无API Key和真实上游请求；截图 `artifacts/v050-native-asr-form.png`，窗口已复原、临时验收标签已关闭。UI/UX Pro Max定向检索helper text返回文字重排与重要文字完整性规则，沿用家长页面已有视觉系统和明确标签；不据此声称已通过儿童或Pad实机研究。

2026-10-19 21:57，[运行39262770304](https://github.com/windssea/enStudy/actions/runs/39262770304)完整成功，将955356a发布至Preview 7f4474c2与Production 960f776d，D1仍至0047、无待用迁移；两环境主密钥retained，精确主机配置成功。529单元、1475完整CI运行、两站各73线上检查通过。新增22项云端站内保存检查验证原生适配器、精确白名单、加密解密、拒绝错误文本测试、预算不变与清理；未发送供应商请求，两个临时连接与登录均清理。删除临时空选连接可能使空设置版本前进，家庭开关与原有连接保持。

另18项只读检查确认三个域名主文件、离线壳、图资源及加密就绪一致。主入口/assets/index-BbNIrNoj.js，SHA256 34341a400ac4a28ffd976fe3dd0970548c7a425cc886df78547860ad95f416e4，壳eq-shell-v1-96d75fd7bf175770、122资产。证据artifacts/actions-v050-complete.log、v050-published-public.log/.json/.exit、v050-online-storage.log/.exit和v050-native-storage-result.json。此阶段上线基础设施与适配器，不等于用户真实Key已保存或家庭AI已开启。

## 静态发布检查

v0.49的Production部署成功后，一次静态DataExport模块校验未通过；随后原源码完整73项复验通过，但首次失败未保存响应细节，不能确定根因。本阶段仅对哈希命名JS模块的GET增加最多6次、间隔2.5秒的传播等待，最终仍严格检查HTTP状态、MIME和SHA256。不重试有副作用请求，不把持久错误变成通过；4项单元覆盖立即成功、404/HTML后正确字节、持续错误JS及持续503。

## 官方依据

- [阿里非实时语音识别](https://help.aliyun.com/en/model-studio/non-realtime-speech-recognition-user-guide)：用户所选模型、原生请求、识别文本字段和Base64输入。
- [阿里原生短录音SDK参数](https://help.aliyun.com/en/model-studio/fun-asr-flash-recorded-speech-recognition-android-sdk)：`input_audio.data` 接收 WAV Base64 Data URI。
- [Cloudflare Pages项目更新](https://developers.cloudflare.com/api/typescript/resources/pages/subresources/projects/methods/edit/)：PATCH环境设置，仅显式置null才删除环境变量。

上述页面于2026-10-19核对。文档描述的供应商能力不等于本项目已通过真实账号调用。
