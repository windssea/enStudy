# API 契约与错误处理

v0.16角色对话/语音的已实现路径见[实际接口表](35-ai-dialogue-and-voice.md#接口与协议)，使用`/learning/conversations`和`/ai/voice`；下表中的`/voice/turns`与实时会话是目标草案，未对外提供。

v0.17的`POST /sessions`新增互斥选择器workshopId，题目新增sort/repair与结构化数组作答；`/progress`新增modality，已保存回执可含逐项details/correctedSentence。见[实际判题与兼容约束](36-interactive-workshops.md#判题与历史兼容)。

能显示新题型的网页发送`X-EQ-Player-Version: 2`；旧页面遇到新题型收到409/PLAYER_UPDATE_REQUIRED，刷新后续用冻结任务，不把未知题型作为空白表单返回。

统一前缀 `/api/v1`，JSON UTF-8，Cookie 同源会话，所有修改操作验证 Origin/CSRF。成人认证相关端点交由已选认证库，业务接口禁止接受客户端声称的 adult_id 作为权限依据。这里定义核心开发契约，不是已实现 API。

## 端点

| 方法与路径 | 身份 | 输入与关键行为 |
| --- | --- | --- |
| GET `/me` | 成人或儿童 | 返回当前权限范围和最少档案，儿童不返回成人邮箱 |
| POST `/households` | 已验证成人 | 建家庭；原子建立 owner |
| GET/POST `/children` | 成人成员/编辑权限 | 读取家庭档案或创建；grade 1–6 |
| PATCH `/children/:id` | 成人 | 修改目标、时区；不能改变所属家庭 |
| POST `/children/:id/grants` | 最近重新验证成人 | 颁发受限儿童设备会话，token 仅 Cookie |
| DELETE `/grants/:id` | 成人 | 立即撤销设备授权 |
| GET `/curriculum?grade=3&term=A` | 当前学习身份 | 仅已发布 release，答案字段永不返回 |
| POST `/sessions` | 儿童 grant 或成人指定孩子 | mode、timeBudget、release；服务端生成题目 assignment |
| GET `/sessions/:id` | 同一孩子 | 返回当前位置、已确认结果和待作答公开字段 |
| POST `/sessions/:id/items/:assignmentId/hints` | 同一孩子 | 服务端记录提示层级，再返回下一条提示；请求幂等 |
| POST `/sessions/:id/items/:assignmentId/reveal` | 同一孩子 | 记录已看答案后返回讲解，取消该assignment独立证据资格 |
| POST `/attempts` | 同一孩子及活动 lease | 幂等提交首答，服务器判题/奖励/复习 |
| POST `/sync` | 同一孩子 | 最多 20 个事件按序处理，逐项收据，跨项不承诺全有或全无 |
| GET `/review/today` | 同一孩子 | 到期摘要、小轮推荐，不暴露别人的状态 |
| GET `/training/topics?category=tense&grade=4` | 学习身份 | 已发布专题目录、建议年级与先修，不含答案 |
| GET `/training/topics/:id` | 学习身份 | 公开目标、层级和当前孩子推荐入口 |
| GET `/sentence-patterns?topicId=sentence.patterns.suggestions&grade=4` | 学习身份 | 已发布句式目录；按主题、交际功能和建议年级筛选 |
| GET `/sentence-patterns/:id` | 学习身份 | 教学句式卡、槽位、场景和接受变体；不返回诊断或结测答案 |
| POST `/training/runs` | 同一孩子 | topicId、mode、timeBudget、requestId；服务端创建诊断/训练/复测与活动会话 |
| GET `/training/runs/:id` | 同一孩子 | 恢复阶段、已确认结果和当前位置 |
| GET `/reports/:childId/training` | 成人成员 | 具体错因、专题当轮表现、延迟复测与待补技能 |
| GET `/reports/:childId?range=7d` | 成人成员 | 汇总统计、样本数、建议和延迟表现 |
| PUT `/children/:id/curriculum` | 成人 | 自主路径或已审核教材映射 |
| GET/POST `/ai/connections` | 最近验证成人 | 列表只含掩码；创建 key 为 write-only |
| PATCH/DELETE `/ai/connections/:id` | 最近验证成人 | 替换 key 或撤销，不返回旧 key |
| POST `/ai/connections/:id/test` | 成人 | 逐项小额探测，显示可能有供应商费用 |
| POST `/ai/explain` | 允许 AI 的儿童 | attemptId、requestId；只用该孩子作答上下文 |
| POST `/voice/turns` | 允许语音的儿童 | 短音频与任务；或文本替代；单轮流转 |
| POST `/voice/realtime-sessions` | R2 能力开关 | 已验证供应商短期凭证/代理策略，首发默认关闭 |
| POST `/exports` | 最近验证成人 | 异步生成 JSON/CSV；短期授权下载 |
| POST `/deletions` | 最近验证 owner | 删除孩子或家庭，幂等任务与进度 |

家庭邀请、内容编辑发布、恢复和审计接口在对应功能切片补全契约，遵循相同权限与幂等规则。

专题run的mode为`diagnostic/practice/retest`，层级由服务器根据已发布策略推进；客户端不能自报达标。题目响应包含`trainingRunId`和阶段，但答题统一调用`POST /attempts`。专题入口不另发奖励或独立晋级，同一event/assignment的重试返回原收据。

## 创建会话

```json
{
  "mode": "today",
  "timeBudgetMinutes": 10,
  "clientRequestId": "e37ad392-86ae-411b-98d2-cd5f1d3b52c1"
}
```

儿童身份由 grant 确定，无需前端发送 household_id；成人代建必须另传有权访问的 child_id。返回 `sessionId`、`leaseId`、`contentRelease`、`items[]` 和 `expiresAt`。item 含公开题干、选项、媒体与 assignmentId，不含正确答案。在线题目不能允许先拉答案再提交。

## 提交答题

```json
{
  "eventId": "18cda228-251f-4843-aabb-540c07e59320",
  "sessionId": "session_01",
  "leaseId": "lease_01",
  "assignmentId": "assignment_04",
  "answer": {"tokenIds": ["they", "are", "ready"]},
  "hintLevel": 0,
  "durationMs": 8200,
  "clientOccurredAt": "2026-10-17T08:10:00Z"
}
```

返回：

```json
{
  "data": {
    "receiptId": "receipt_04",
    "eventId": "18cda228-251f-4843-aabb-540c07e59320",
    "serverSequence": 42,
    "outcome": "correct",
    "independentEvidence": true,
    "feedback": "They 和 are 是一组伙伴。",
    "nextReviewAt": "2026-10-18T00:00:00+08:00",
    "rewardDelta": 1,
    "syncState": "confirmed"
  },
  "requestId": "req_04"
}
```

同一 eventId 相同 payload 重试，返回同一 receipt；eventId 相同但内容不同返回 409 `IDEMPOTENCY_MISMATCH`。不同 eventId 对同一 assignment 的重复首答返回已有记录，不重新记分。提示次数由服务器提示端点/已签名活动状态核对，客户端 hintLevel 只作报告线索，不能成为独立证据唯一依据。

离线练习包可能让设备持有校验资料，因此标记 `evidenceSource=offline_unverified`：允许练习与复习建议，不用于高可信独立掌握晋级；服务端后续在线变式确认。避免把“离线有答案”当成与服务端盲判完全相同的证据。

## AI 流式协议

文本解释支持 SSE，但儿童解释首发采用“先生成并校验完整短文本，再发送 verified 事件”，不把未过滤 token 直接展示。事件包含 `status`、`verified`、`usage`、`done`；断连取消上游并结算已发生用量，不自动重复发起计费请求。

## 错误契约

```json
{
  "error": {
    "code": "AI_PROVIDER_UNAVAILABLE",
    "message": "讲解伙伴暂时没连上，先看这条提示。",
    "retryable": true,
    "details": {"fallback": "curated_explanation"}
  },
  "requestId": "req_05"
}
```

| HTTP | 错误码示例 | 客户端行为 |
| --- | --- | --- |
| 400/422 | VALIDATION_ERROR、UNSUPPORTED_AUDIO | 定位字段或改为文字 |
| 401 | SESSION_EXPIRED | 保留待同步事件，交由成人恢复会话 |
| 403 | PARENT_REQUIRED、CONSENT_REQUIRED | 不重试越权；回到安全页面 |
| 404 | RESOURCE_NOT_FOUND | 不暴露记录属于哪个家庭 |
| 409 | VERSION_CONFLICT、LEASE_REPLACED | 刷新状态或提示接管；事件 ID 保持不变 |
| 413 | AUDIO_TOO_LARGE | 丢弃未上传大音频，可缩短重录 |
| 429 | DAILY_BUDGET_REACHED | 显示当天额度已用完，回到基础课程 |
| 502/504 | PROVIDER_PROTOCOL_ERROR、AI_TIMEOUT | 使用审核过的讲解，不阻塞答题保存 |

业务 API 默认最多 64 KB JSON，sync 最多 256 KB，录音最多 20 秒且 2 MB，图像上传首发关闭。重试仅限幂等学习请求，指数退避加抖动，最多 3 次；AI 请求由服务端 requestId 查状态后决定，禁止盲重试。
