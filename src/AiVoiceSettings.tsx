import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AiConnectionSummary } from "../packages/contracts/index";
import { api } from "./api";
import { SecretField } from "./AccountSecurity";
import WavRecorder, { type VoiceClip } from "./WavRecorder";
import AiAudioPlayer from "./AiAudioPlayer";
import { announceAiSettings } from "./aiSettingsSignal";
interface Settings {
  text_connection_id: string | null;
  asr_connection_id: string | null;
  tts_connection_id: string | null;
  text_enabled: boolean;
  asr_enabled: boolean;
  tts_enabled: boolean;
  asr_model: string;
  tts_model: string;
  tts_voice: string;
  child_turns: number;
  child_audio_ms: number;
  family_audio_ms: number;
  child_tts_chars: number;
  family_tts_chars: number;
  version: number;
}
interface View {
  settings: Settings;
  capabilities: { asr: boolean; tts: boolean };
  usage: { turns: number; audio_ms: number; tts_chars: number };
}
export default function AiVoiceSettings({
  connections,
  available,
}: {
  connections: AiConnectionSummary[];
  available: boolean;
}) {
  const [view, setView] = useState<View | null>(null),
    [form, setForm] = useState<Settings | null>(null),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [textConsent, setTextConsent] = useState(false),
    [audioConsent, setAudioConsent] = useState(false),
    [clip, setClip] = useState<VoiceClip | null>(null),
    [audio, setAudio] = useState(""),
    [dirty, setDirty] = useState(false);
  const tests = useRef({ asr: crypto.randomUUID(), tts: crypto.randomUUID() });
  async function load() {
    const next = await api<View>("/ai/voice/settings");
    setView(next);
    setForm({
      ...next.settings,
      text_enabled: !!next.settings.text_enabled,
      asr_enabled: !!next.settings.asr_enabled,
      tts_enabled: !!next.settings.tts_enabled,
    });
    setDirty(false);
  }
  useEffect(() => {
    let live = true;
    void api<View>("/ai/voice/settings")
      .then((next) => {
        if (live) {
          setView(next);
          setForm({
            ...next.settings,
            text_enabled: !!next.settings.text_enabled,
            asr_enabled: !!next.settings.asr_enabled,
            tts_enabled: !!next.settings.tts_enabled,
          });
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (form) {
      setForm({ ...form, [key]: value });
      setDirty(true);
      setAudio("");
    }
  }
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "本次没有完成。");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    void action(async () => {
      await api("/ai/voice/settings", {
        ...form,
        textConsent,
        audioConsent,
        currentPassword: password,
      });
      announceAiSettings();
      await load();
      tests.current = { asr: crypto.randomUUID(), tts: crypto.randomUUID() };
      setTextConsent(false);
      setAudioConsent(false);
      setNotice("对话配置已保存。更改设置会结束原来的短对话。");
    });
  }
  function test(kind: "asr" | "tts") {
    void action(async () => {
      const result = await api<{
        pending?: boolean;
        text?: string;
        audioBase64?: string;
      }>(
        `/ai/voice/test/${kind}`,
        {
          clientRequestId: tests.current[kind],
          version: form!.version,
          currentPassword: password,
          ...(kind === "asr" ? { audioBase64: clip?.audioBase64 } : {}),
        },
        { timeoutMs: 25000 },
      );
      setAudio(result.audioBase64 ?? "");
      setNotice(
        result.pending
          ? "测试仍在处理中。再次点击会读取同一次请求。"
          : kind === "asr"
            ? `识别协议测试通过。请检查准确性：${result.text}`
            : "合成协议测试通过。请主动试听，检查声音和内容。",
      );
      // Refresh capability status without replacing unsaved form fields.
      setView(await api<View>("/ai/voice/settings"));
    });
  }
  return (
    <section className="voice-settings" aria-labelledby="voice-settings-title">
      <span className="eyebrow">轮流说一句</span>
      <h3 id="voice-settings-title">4. 角色对话与语音</h3>
      <p>
        文字对话、录音识别、AI合成声音可分别选择连接。先关闭开关保存配置，再主动测试音频，最后勾选同意并开启。
      </p>
      <div className="ai-privacy">
        <p>
          孩子确认发送的文字、当前场景和本段最多6轮内容会交给文字服务；主动识别时，整段录音会交给识别服务；合成时发送AI回复英文。请先查看各服务的数据政策与价格。
        </p>
        <p>
          原始录音不落库。对话加密暂存30分钟，转写和合成结果加密缓存5分钟，过期不可读取、后续访问时清理。已发出的请求或失败尝试仍可能计费，额度按尝试保守保留。实时通话和发音评分尚未提供。
        </p>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void action(load)}
          >
            刷新
          </button>
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!form && !error && <p role="status">正在读取语音配置…</p>}
      {form && view && (
        <>
          <p className="footnote">
            今天已预留/使用：{view.usage.turns}轮、识别
            {Math.ceil(view.usage.audio_ms / 1000)}秒、合成
            {view.usage.tts_chars}
            字符。同时受上方家庭总调用次数和用量单位约束；协议测试不等于教学质量或设备兼容验证。
          </p>
          <form className="profile-form" onSubmit={save}>
            <fieldset
              className="exercise-controls"
              disabled={busy || !available}
            >
              <div className="voice-config-grid">
                {(["text", "asr", "tts"] as const).map((kind) => (
                  <div className="voice-config" key={kind}>
                    <h4>
                      {kind === "text"
                        ? "短文字对话"
                        : kind === "asr"
                          ? "语音识别 ASR"
                          : "语音合成 TTS"}
                    </h4>
                    <label className="field">
                      连接
                      <select
                        value={form[`${kind}_connection_id`] ?? ""}
                        onChange={(e) =>
                          update(
                            `${kind}_connection_id`,
                            e.target.value || null,
                          )
                        }
                      >
                        <option value="">暂不选择</option>
                        {connections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {kind === "text" ? (
                      <p className="footnote">
                        使用连接上保存且已测试的文本模型。
                      </p>
                    ) : (
                      <>
                        <label className="field">
                          准确模型ID
                          <input
                            value={form[`${kind}_model`]}
                            maxLength={120}
                            onChange={(e) =>
                              update(`${kind}_model`, e.target.value)
                            }
                          />
                        </label>
                        {kind === "tts" && (
                          <label className="field">
                            声音ID
                            <input
                              value={form.tts_voice}
                              maxLength={80}
                              onChange={(e) =>
                                update("tts_voice", e.target.value)
                              }
                            />
                          </label>
                        )}
                        <p className="footnote">
                          {!dirty && view.capabilities[kind]
                            ? "当前音频协议已通过测试"
                            : "保存配置后测试此项能力"}
                        </p>
                      </>
                    )}
                    <label className="ai-checkbox">
                      <input
                        type="checkbox"
                        checked={form[`${kind}_enabled`]}
                        onChange={(e) =>
                          update(`${kind}_enabled`, e.target.checked)
                        }
                      />
                      为孩子开启此项能力
                    </label>
                  </div>
                ))}
              </div>
              <details>
                <summary>每天的对话与语音额度</summary>
                <div className="account-fields">
                  {(
                    [
                      ["child_turns", "每个孩子对话轮次", 1, 12, 1],
                      ["child_audio_ms", "每个孩子识别秒数", 20, 600, 1000],
                      [
                        "family_audio_ms",
                        "家庭识别秒数（含测试）",
                        20,
                        3600,
                        1000,
                      ],
                      ["child_tts_chars", "每个孩子合成字符", 200, 6000, 1],
                      [
                        "family_tts_chars",
                        "家庭合成字符（含测试）",
                        500,
                        20000,
                        1,
                      ],
                    ] as const
                  ).map(([key, label, min, max, scale]) => (
                    <label className="field" key={key}>
                      {label}
                      <input
                        type="number"
                        required
                        min={min}
                        max={max}
                        value={form[key] / scale}
                        onChange={(e) =>
                          update(key, Number(e.target.value) * scale)
                        }
                      />
                    </label>
                  ))}
                </div>
              </details>
              <label className="ai-checkbox">
                <input
                  type="checkbox"
                  checked={textConsent}
                  required={form.text_enabled}
                  onChange={(e) => setTextConsent(e.target.checked)}
                />
                我同意把确认发送的文字和本段对话交给所选文字服务处理，理解可能收费。
              </label>
              <label className="ai-checkbox">
                <input
                  type="checkbox"
                  checked={audioConsent}
                  required={form.asr_enabled || form.tts_enabled}
                  onChange={(e) => setAudioConsent(e.target.checked)}
                />
                我同意孩子主动上传录音供识别，并将AI回复交给合成服务，理解第三方处理与收费。
              </label>
              <SecretField
                label="当前家长登录密码（保存或测试时验证）"
                value={password}
                onChange={setPassword}
                disabled={busy}
              />
              <button className="primary" type="submit">
                保存对话与语音配置
              </button>
              <div className="voice-test">
                <h4>主动测试 · 会调用所选服务</h4>
                <WavRecorder
                  disabled={busy || dirty}
                  onClip={(next) => {
                    setClip(next);
                    tests.current.asr = crypto.randomUUID();
                  }}
                />
                <div className="voice-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      dirty || !clip || !form.asr_connection_id || !password
                    }
                    onClick={() => test("asr")}
                  >
                    上传录音并测试识别
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={dirty || !form.tts_connection_id || !password}
                    onClick={() => test("tts")}
                  >
                    测试合成固定英语短句
                  </button>
                </div>
                {dirty && (
                  <p className="footnote">
                    先保存修改，再测试。需要重做一次测试时，重新保存配置或重录音频。
                  </p>
                )}
              </div>
            </fieldset>
          </form>
          {audio && <AiAudioPlayer audioBase64={audio} />}
        </>
      )}
    </section>
  );
}
