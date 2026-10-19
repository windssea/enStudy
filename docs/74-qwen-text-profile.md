# Qwen 文字对话预设 v0.51.0

用户选定 `qwen3.8-flash` 作为文字对话模型。依据阿里官方兼容接口与深度思考文档增加 `dashscope-chat` 连接预设；ASR继续使用独立的 `qwen-audio-3.1-asr-flash`，TTS尚未选定，默认保持关闭。本阶段不替用户保存真实Key或开启家庭AI。

## 使用与实现

家长保存连接时选择“阿里文字对话（Qwen）”，自动填入模型名、system和max_tokens；如果本家庭已保存阿里原生ASR连接，仅复制它的主机并把路径改为 `/compatible-mode/v1`，不读取或复制任何API Key。没有现有ASR连接时地址留空，由家长填写；不能使用原生generation端点作为文字BaseURL。

服务端向 `/compatible-mode/v1/chat/completions` 发送原有有界JSON教学提示、`stream:false`、`max_tokens` 与显式 `enable_thinking:false`。该模型默认开启思考模式；本产品采用非思考简短互动，避免短输出额度被思考内容占用或非流式不兼容。不给其他OpenAI兼容服务添加阿里专用参数，不做失败后换协议重试，不发送思考链给孩子。

继续保存、最小文本测试、明确选择能力和同意的流程。该文字连接可独立用于题目解释、作品建议或短对话；UI及服务端均拒绝把它用于ASR/TTS，即使开关为关闭状态也拒绝错误类型配置。共享的能力规则同时供家长页面、语音配置与服务端使用，旧未标注类型连接保留原OpenAI兼容行为。

复用已有adapter字段和已验证环境主密钥，无新迁移、数据库或账户。既有精确主机白名单同时覆盖原生ASR路径与兼容文字路径；不会新增通配权限。保存/编辑仍需家庭管理员密码与版本校验，测试和对话继续受预算、授权、幂等回执、内容过滤及短期加密缓存约束。编辑连接后需重新测试。

## 本地验证

539项单元/65文件和类型通过，包含9组能力映射与默认兼容及根路径检查。48项AI、49项写作AI和87项语音专项，共184项隔离运行通过，全部为本地模拟服务。新增8项覆盖预设保存、准确路径/模型/参数、关闭思考、错误音频类型、独立测试同意、儿童真实路由与重复回执；模拟Qwen服务会拒绝缺少 `enable_thinking:false` 或错误token参数的请求，不以任意假成功掩盖协议问题。

构建与Worker通过：19,379,057字节，SHA256 `2bdcda5adc6971304be4eaa8bafb62fc3666f536479ea630834a4af603ed25d3`。浏览器、完整CI和云端同步结果随后补记；不能把本地兼容测试等同于真实阿里账号、模型权限、回复或声音质量已验收。

内置浏览器已验选择阿里文字连接后自动填入准确模型名、显示compatible-mode根路径与非思考说明；此时未保存连接或真实Key。768×1024内容753/scroll753、1024×768为1009/1009、375×812为360/360，无横向溢出，控制台无错误，窗口已复原且验收标签关闭。证据artifacts/v051-qwen-text-preset.png。286个构建文件不含两个环境主密钥材料与私有工作空间主机，格式和差异检查通过。真实Pad和供应商效果另验。

## 新界面目标

用户将整体方向改为现代、大方、专业、产品级，并明确不要卡通化低龄化。[现代学习界面规则](../design-system/english-quest/pages/modern-learning-workspace.md)现覆盖旧玩具/卡通规范。当前阶段完成AI配置和发布，随后独立改造首页、导航和播放器；并未把旧线上插画描述为现代化改造完成。保留清楚中文、可选声音、足够触控尺寸、可恢复进度与真实反馈。

## 官方依据

- [qwen3.8-flash模型信息](https://help.aliyun.com/zh/model-studio/qwen3-8-flash)：准确模型ID与文本输出能力。
- [深度思考](https://help.aliyun.com/zh/model-studio/deep-thinking)：混合思考模型、默认开启及显式关闭方式。
- [OpenAI兼容调用](https://help.aliyun.com/en/model-studio/compatibility-of-openai-with-dashscope)：Chat Completions协议与max_tokens。
- [阿里产品调用入口](https://help.aliyun.com/en/model-studio/what-is-model-studio)：工作空间主机及compatible-mode/v1根路径。

2026-10-19核对；工作空间地址仍为用户自己的私有部署配置，不在公开示例中硬编码。
