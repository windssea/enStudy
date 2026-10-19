import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  AiConnectionSummary,
  AiSettingsView,
} from "../packages/contracts/index";
import { api } from "./api";
import { SecretField } from "./AccountSecurity";
import AiVoiceSettings from "./AiVoiceSettings";
import WritingAiSettings from "./WritingAiSettings";
import { announceAiSettings } from "./aiSettingsSignal";
import { connectionSupports } from "../packages/domain/aiConnections";
const blank = {
  adapter: "openai-chat" as AiConnectionSummary["adapter"],
  label: "",
  baseUrl: "",
  model: "",
  policyUrl: "",
  tokenParameter:
    "max_completion_tokens" as AiConnectionSummary["tokenParameter"],
  instructionRole: "system" as AiConnectionSummary["instructionRole"],
};
export default function AiSettings() {
  const [data, setData] = useState<AiSettingsView | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [form, setForm] = useState(blank),
    [editing, setEditing] = useState<AiConnectionSummary | null>(null),
    [key, setKey] = useState(""),
    [password, setPassword] = useState("");
  const [target, setTarget] = useState<{
      connection: AiConnectionSummary;
      action: "test" | "remove" | "storage";
      requestId: string;
    } | null>(null),
    [targetPassword, setTargetPassword] = useState("");
  const [settings, setSettings] = useState<AiSettingsView["settings"]>({
      connectionId: null,
      enabled: false,
      dailyCalls: 30,
      dailyUnits: 60000,
      childCalls: 10,
      version: 0,
    }),
    [consent, setConsent] = useState(false),
    [settingsPassword, setSettingsPassword] = useState("");
  const createId = useRef(crypto.randomUUID());
  async function load() {
    const next = await api<AiSettingsView>("/ai/connections");
    setData(next);
    setSettings(next.settings);
    setConsent(false);
  }
  useEffect(() => {
    let live = true;
    api<AiSettingsView>("/ai/connections")
      .then((next) => {
        if (live) {
          setData(next);
          setSettings(next.settings);
        }
      })
      .catch((error) => {
        if (live) setError(error.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      announceAiSettings();
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "暂时未保存成功。");
      try {
        await load();
      } catch {}
    } finally {
      setBusy(false);
      setPassword("");
      setSettingsPassword("");
      setTargetPassword("");
      setKey("");
    }
  }
  function update<K extends keyof typeof blank>(
    field: K,
    value: (typeof blank)[K],
  ) {
    setForm({ ...form, [field]: value });
    createId.current = crypto.randomUUID();
  }
  function saveConnection(event: FormEvent) {
    event.preventDefault();
    void action(async () => {
      await api(editing ? `/ai/connections/${editing.id}` : "/ai/connections", {
        ...form,
        apiKey: key,
        currentPassword: password,
        ...(editing
          ? { version: editing.version }
          : { clientRequestId: createId.current }),
      });
      setForm(blank);
      setEditing(null);
      createId.current = crypto.randomUUID();
      setNotice("连接已加密保存。更改配置后需要重新测试，并明确为孩子开启。");
    });
  }
  function executeTarget(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    void action(async () => {
      const result = await api<{ pending?: boolean; verified?: boolean }>(
        `/ai/connections/${target.connection.id}/${target.action}`,
        {
          version: target.connection.version,
          currentPassword: targetPassword,
          clientRequestId: target.requestId,
        },
        { timeoutMs: 25000 },
      );
      if (target.action === "storage" && result.verified !== true)
        throw new Error("密钥保存检查未通过，请刷新连接后重试。");
      setNotice(
        result.pending
          ? "测试仍在处理中，可继续读取本次测试结果。"
          : target.action === "test"
            ? "最小文本协议测试通过；尚未代表语音或教学质量已经验证。"
            : target.action === "storage"
              ? "密钥保存检查通过，此检查只验证站内加解密。"
              : "连接已移除，今天已使用的额度保留。",
      );
      if (!result.pending) setTarget(null);
    });
  }
  function saveSettings(event: FormEvent) {
    event.preventDefault();
    void action(async () => {
      await api("/ai/settings", {
        ...settings,
        consent,
        currentPassword: settingsPassword,
      });
      setNotice(
        settings.enabled
          ? "已为本家庭孩子开启AI辅助解释。"
          : "已停止新的AI调用；已发出的请求仍可能计费。",
      );
    });
  }
  return (
    <section className="card ai-settings" aria-labelledby="ai-settings-title">
      <span className="eyebrow">由家长选择的AI小帮手</span>
      <h2 id="ai-settings-title">连接自己的AI服务</h2>
      <p>
        标准课程、判题和复习不依赖AI。这里分别配置题目解释、作品建议和角色对话，下方各项独立同意；设备朗读与AI语音对话是不同能力。
      </p>
      {loading && <p role="status">正在读取AI设置…</p>}
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void action(load)}
          >
            刷新设置
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {data && (
        <p
          className={`notice${data.available ? " success" : ""}`}
          role="status"
        >
          {data.available
            ? "密钥加密已就绪。保存连接后先检查、测试，再选择为孩子开启的能力。"
            : "此站点尚未准备好密钥存储，请联系管理员。"}
        </p>
      )}
      {data && (
        <>
          <div className="ai-privacy">
            <strong>先了解题目解释的发送范围</strong>
            <p>
              题目解释会发送题目片段、年级、标准讲解和已保存的作答结果类型；不发送孩子昵称、账号、原始作答输入或完整学习历史。作品点评和角色对话的范围在各自设置中说明，服务商的数据保留与处理地区以其政策为准。
            </p>
            <p>
              网站服务端需要临时解密Key才能调用服务。短解释仅在10分钟内可重试读取，过期后不再返回，后续访问设置时清理缓存。角色对话的保留说明见下方语音设置。未知或取消请求不假定未收费。
            </p>
          </div>
          <h3>1. 保存连接</h3>
          <p className="footnote">
            已审核主机：{data.allowedHosts.join("、") || "暂无"}
            。新域名可以保存，但需部署者加入精确白名单后才能测试，不支持任意地址转发。
          </p>
          <form className="profile-form" onSubmit={saveConnection}>
            <fieldset
              className="exercise-controls"
              disabled={busy || !data.available}
            >
              <div className="account-fields">
                <label className="field">
                  连接类型
                  <select
                    value={form.adapter}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        adapter: e.target
                          .value as AiConnectionSummary["adapter"],
                        model:
                          e.target.value === "dashscope-chat"
                            ? "qwen3.8-flash"
                            : "",
                        baseUrl:
                          e.target.value === "dashscope-chat" &&
                          data.items.some((c) => c.adapter === "dashscope-asr")
                            ? new URL(
                                data.items.find(
                                  (c) => c.adapter === "dashscope-asr",
                                )!.baseUrl,
                              ).origin + "/compatible-mode/v1"
                            : "",
                        tokenParameter:
                          e.target.value === "dashscope-chat"
                            ? "max_tokens"
                            : "max_completion_tokens",
                        instructionRole: "system",
                      });
                      createId.current = crypto.randomUUID();
                    }}
                  >
                    <option value="openai-chat">
                      OpenAI兼容（文本 / ASR / TTS）
                    </option>
                    <option value="dashscope-asr">
                      阿里原生语音识别（Qwen-Audio ASR）
                    </option>
                    <option value="dashscope-chat">阿里文字对话（Qwen）</option>
                  </select>
                </label>
                <label className="field">
                  连接昵称
                  <input
                    required
                    maxLength={40}
                    value={form.label}
                    onChange={(e) => update("label", e.target.value)}
                    placeholder="例如：家庭英语助手"
                  />
                </label>
                {form.adapter !== "dashscope-asr" && (
                  <label className="field">
                    文本模型名称（仅语音连接可留空）
                    <input
                      maxLength={120}
                      value={form.model}
                      onChange={(e) => update("model", e.target.value)}
                      placeholder="填写服务商提供的准确模型ID"
                    />
                  </label>
                )}
                <label className="field">
                  {form.adapter === "dashscope-asr"
                    ? "阿里原生识别完整地址"
                    : "API根地址"}
                  <input
                    type="url"
                    required
                    maxLength={260}
                    value={form.baseUrl}
                    onChange={(e) => update("baseUrl", e.target.value)}
                    placeholder={
                      form.adapter === "dashscope-asr"
                        ? "https://工作空间域名/api/v1/services/aigc/multimodal-generation/generation"
                        : form.adapter === "dashscope-chat"
                          ? "https://工作空间域名/compatible-mode/v1"
                          : "https://服务商域名/v1"
                    }
                  />
                </label>
                <label className="field">
                  服务商数据政策链接
                  <input
                    type="url"
                    required
                    maxLength={400}
                    value={form.policyUrl}
                    onChange={(e) => update("policyUrl", e.target.value)}
                    placeholder="https://服务商域名/privacy"
                  />
                </label>
              </div>
              {form.adapter === "dashscope-asr" && (
                <p className="footnote">
                  保存后在下方“语音识别 ASR”选择此连接，填写
                  qwen-audio-3.1-asr-flash，再录音测试。
                  录音以Base64直接发送，无需公开音频链接；这条连接只把声音转成文字，对话与合成声音另行配置。
                </p>
              )}
              {form.adapter === "dashscope-chat" && (
                <p className="footnote">
                  已填入 qwen3.8-flash。使用 /compatible-mode/v1 根地址、system
                  与 max_tokens，关闭深度思考以适配简短互动。
                  若已保存阿里识别连接，只复制它的主机；Key需自行填写。先保存、测试文本，再分别选择用于解释、作品建议或短对话；此连接不合成声音。
                </p>
              )}
              <label className="field">
                {editing ? "新Key（留空保留现有Key）" : "API Key"}
                <input
                  type="password"
                  autoComplete="off"
                  required={!editing}
                  maxLength={512}
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    createId.current = crypto.randomUUID();
                  }}
                />
              </label>
              {form.adapter === "openai-chat" && (
                <details className="ai-advanced">
                  <summary>兼容参数</summary>
                  <div className="account-fields">
                    <label className="field">
                      输出限制参数
                      <select
                        value={form.tokenParameter}
                        onChange={(e) =>
                          update(
                            "tokenParameter",
                            e.target.value as typeof form.tokenParameter,
                          )
                        }
                      >
                        <option value="max_completion_tokens">
                          max_completion_tokens
                        </option>
                        <option value="max_tokens">
                          max_tokens（部分兼容服务）
                        </option>
                      </select>
                    </label>
                    <label className="field">
                      教学指令角色
                      <select
                        value={form.instructionRole}
                        onChange={(e) =>
                          update(
                            "instructionRole",
                            e.target.value as typeof form.instructionRole,
                          )
                        }
                      >
                        <option value="system">system（通用兼容）</option>
                        <option value="developer">
                          developer（服务商要求时）
                        </option>
                      </select>
                    </label>
                  </div>
                  <p className="footnote">
                    按服务商文档选择；不自动改参数并重复计费重试。
                  </p>
                </details>
              )}
              <SecretField
                label="当前家长登录密码"
                value={password}
                onChange={setPassword}
                disabled={busy}
              />
              <div className="profile-fields">
                <button className="primary" disabled={busy} type="submit">
                  {editing ? "保存修改并重新验证" : "加密保存连接"}
                </button>
                {editing && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setForm(blank);
                      setKey("");
                      setPassword("");
                    }}
                  >
                    取消编辑
                  </button>
                )}
              </div>
            </fieldset>
          </form>
          <h3>2. 测试连接</h3>
          <ul className="ai-connection-list">
            {data.items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <p>
                    {item.model} · Key末四位 {item.keySuffix}
                  </p>
                  <p className="footnote">
                    {item.baseUrl} ·{" "}
                    <a
                      href={item.policyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      阅读服务商数据政策（新窗口）
                    </a>
                  </p>
                  <p className="footnote">
                    {!item.approved
                      ? "域名待部署者验证"
                      : item.tested
                        ? "文本协议已验证"
                        : item.adapter === "dashscope-asr"
                          ? "在下方录音测试ASR"
                          : "需要测试"}{" "}
                    · 音频能力请在下方分别配置与测试
                  </p>
                </div>
                <div className="account-row-actions">
                  <button
                    className="secondary"
                    disabled={busy || !data.available}
                    onClick={() => {
                      setTarget({
                        connection: item,
                        action: "storage",
                        requestId: crypto.randomUUID(),
                      });
                      setTargetPassword("");
                    }}
                  >
                    检查密钥保存
                  </button>
                  <button
                    className="secondary"
                    disabled={
                      busy ||
                      !item.approved ||
                      !data.available ||
                      !connectionSupports(item.adapter, "text")
                    }
                    onClick={() => {
                      setTarget({
                        connection: item,
                        action: "test",
                        requestId: crypto.randomUUID(),
                      });
                      setTargetPassword("");
                    }}
                  >
                    测试文本
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(item);
                      setForm(item);
                      setKey("");
                      setPassword("");
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setTarget({
                        connection: item,
                        action: "remove",
                        requestId: crypto.randomUUID(),
                      });
                      setTargetPassword("");
                    }}
                  >
                    移除
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {target && (
            <form className="ai-target profile-form" onSubmit={executeTarget}>
              <h4>
                {target.action === "test"
                  ? "测试文本协议"
                  : target.action === "storage"
                    ? "检查密钥保存"
                    : "移除连接"}
                ：{target.connection.label}
              </h4>
              <p>
                {target.action === "test"
                  ? "会发送一条最小请求，使用你的供应商账户并计入家庭用量。重试本次结果不会重复调用。"
                  : target.action === "storage"
                    ? "只在站内确认这条连接的密钥能正确解密，不发送请求给服务商，不占用AI调用额度。"
                    : "会删除加密Key并停止使用这个连接；已经使用的今日额度不会清零。"}
              </p>
              <SecretField
                label="当前家长登录密码"
                value={targetPassword}
                onChange={setTargetPassword}
                disabled={busy}
              />
              <div className="profile-fields">
                <button className="primary" disabled={busy} type="submit">
                  {busy
                    ? "正在处理…"
                    : target.action === "test"
                      ? "测试或读取本次结果"
                      : target.action === "storage"
                        ? "确认检查密钥"
                        : "确认移除连接"}
                </button>
                <button
                  className="secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setTarget(null);
                    setTargetPassword("");
                  }}
                >
                  取消操作
                </button>
              </div>
            </form>
          )}
          <h3>3. 为孩子开启与设置额度</h3>
          <p className="footnote">
            今天（北京时间{data.day}）已预留/使用 {data.usage.calls} 次、
            {data.usage.units}{" "}
            用量单位。服务返回可靠用量时结算，否则保守保留预留；不是人民币账单或精确费用承诺。
          </p>
          <form className="profile-form" onSubmit={saveSettings}>
            <fieldset className="exercise-controls" disabled={busy}>
              <label className="field">
                用于辅助解释的连接
                <select
                  value={settings.connectionId ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      connectionId: e.target.value || null,
                    })
                  }
                >
                  <option value="">暂不选择</option>
                  {data.items
                    .filter((item) => connectionSupports(item.adapter, "text"))
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.label}
                        {item.tested ? " · 文本已测试" : " · 待测试"}
                      </option>
                    ))}
                </select>
              </label>
              <div className="account-fields">
                <label className="field">
                  家庭每天最多调用次数
                  <input
                    type="number"
                    required
                    min={1}
                    max={300}
                    value={settings.dailyCalls}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dailyCalls: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="field">
                  每个孩子每天最多解释与作品点评次数
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={settings.childCalls}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        childCalls: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="field">
                  家庭每日用量单位上限
                  <input
                    type="number"
                    required
                    min={1000}
                    max={1000000}
                    value={settings.dailyUnits}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dailyUnits: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label className="ai-checkbox">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, enabled: e.target.checked })
                  }
                />
                为本家庭孩子开启AI辅助解释
              </label>
              <label className="ai-checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required={settings.enabled}
                />
                我已阅读所选服务的数据政策，理解必要题目资料会交给该服务处理，也理解它可能收费。
              </label>
              <SecretField
                label="当前家长登录密码"
                value={settingsPassword}
                onChange={setSettingsPassword}
                disabled={busy}
              />
              <button className="primary" type="submit" disabled={busy}>
                保存AI开关与额度
              </button>
            </fieldset>
          </form>
          <WritingAiSettings
            connections={data.items}
            available={data.available}
            key={`writing:${data.items.map((c) => `${c.id}:${c.version}:${c.tested}`).join("|")}`}
          />
          <AiVoiceSettings
            key={data.items
              .map((item) => `${item.id}:${item.version}:${item.tested}`)
              .join("|")}
            connections={data.items}
            available={data.available}
          />
        </>
      )}
    </section>
  );
}
