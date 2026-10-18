import { useEffect, useState, type FormEvent } from "react";
import type { AiConnectionSummary } from "../packages/contracts/index";
import type { WritingReviewSettings } from "../packages/contracts/writingReview";
import { api } from "./api";
import { SecretField } from "./AccountSecurity";
import { announceAiSettings } from "./aiSettingsSignal";
export default function WritingAiSettings({
  connections,
  available,
}: {
  connections: AiConnectionSummary[];
  available: boolean;
}) {
  const [settings, setSettings] = useState<WritingReviewSettings | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [consent, setConsent] = useState(false),
    [password, setPassword] = useState("");
  useEffect(() => {
    let live = true;
    void api<{ settings: WritingReviewSettings }>("/ai/writing-settings")
      .then((r) => {
        if (live) setSettings(r.settings);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!settings || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/ai/writing-settings", {
        ...settings,
        consent,
        currentPassword: password,
      });
      setSettings(
        (await api<{ settings: WritingReviewSettings }>("/ai/writing-settings"))
          .settings,
      );
      setConsent(false);
      announceAiSettings();
      setNotice(
        "作品点评设置已确认保存。关闭只会停止新请求；已发出的请求可能计费。",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "没有确认保存，请重新读取设置。",
      );
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  const selected = connections.find((x) => x.id === settings?.connectionId);
  async function reload() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setSettings(
        (await api<{ settings: WritingReviewSettings }>("/ai/writing-settings"))
          .settings,
      );
      setConsent(false);
      setPassword("");
      setNotice("已重新读取保存设置，请核对后再修改。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "还没有读取到设置。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="writing-ai-settings"
      aria-labelledby="writing-ai-settings-title"
    >
      <h3 id="writing-ai-settings-title">作品的AI小建议（单独开启）</h3>
      <p>
        孩子主动选择后，仅发送已保存的一段正文及对应年级、任务提示。不发送作品标题、中文提纲、其他段落或昵称。建议不会自动改文、评分或记为掌握。
      </p>
      <p>
        与答题解释共用上方的家庭次数、孩子次数和用量上限。服务可能收费；结果加密保存，10分钟后不可读取，后续访问时清理。点评不进入家庭资料导出，服务商的保留政策由该服务决定。
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <button
        className="secondary"
        disabled={busy}
        onClick={() => void reload()}
      >
        重新读取已保存设置
      </button>
      {settings ? (
        <form onSubmit={(e) => void save(e)}>
          <fieldset disabled={busy}>
            <label className="field">
              作品点评使用的文本连接
              <select
                value={settings.connectionId ?? ""}
                onChange={(e) => {
                  setSettings({
                    ...settings,
                    connectionId: e.target.value || null,
                  });
                  setConsent(false);
                }}
              >
                <option value="">请选择已测试的文本连接</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                    {c.tested && c.approved
                      ? " · 已测试"
                      : " · 需测试/核对域名"}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <p>
                数据交给：<strong>{new URL(selected.baseUrl).host}</strong> ·{" "}
                <a href={selected.policyUrl} target="_blank" rel="noreferrer">
                  查看所选服务的数据政策
                </a>
              </p>
            )}
            <label className="ai-checkbox">
              <input
                type="checkbox"
                checked={settings.enabled}
                disabled={!available && !settings.enabled}
                onChange={(e) => {
                  setSettings({ ...settings, enabled: e.target.checked });
                  setConsent(false);
                }}
              />
              为本家庭孩子开启作品点评
            </label>
            <label className="ai-checkbox">
              <input
                type="checkbox"
                checked={consent}
                required={settings.enabled}
                onChange={(e) => setConsent(e.target.checked)}
              />
              我已阅读所选服务政策，同意所选段落及任务提示交给该服务处理，并理解可能收费。
            </label>
            <SecretField
              label="验证当前家长密码（作品点评设置）"
              value={password}
              onChange={setPassword}
              disabled={busy}
            />
            <button className="primary" disabled={busy}>
              {busy ? "正在确认…" : "保存作品点评设置"}
            </button>
          </fieldset>
        </form>
      ) : (
        !error && <p role="status">正在读取作品点评设置…</p>
      )}
      {!available && (
        <p>当前部署还未准备好AI加密配置；写作、自查和保存照常可用。</p>
      )}
    </section>
  );
}
