import { useEffect, useRef, useState } from "react";
import {
  conversationScenes,
  type DialogueReply,
} from "../packages/domain/conversations";
import { api } from "./api";
import SpeechButton from "./SpeechButton";
import WavRecorder, { type VoiceClip } from "./WavRecorder";
import AiAudioPlayer from "./AiAudioPlayer";
interface Options {
  enabled: boolean;
  asr: boolean;
  tts: boolean;
  version: number;
  active: { id: string; sceneId: string } | null;
  limits: { turns: number; audioSeconds: number };
}
interface Turn {
  id: string;
  user: string;
  assistant: DialogueReply;
}
interface Conversation {
  id: string;
  sceneId: string;
  turns: Turn[];
  turnCount: number;
  expiresAt: number;
}
export default function ConversationPlayground({
  onBack,
  onParent,
}: {
  onBack: () => void;
  onParent: () => void;
}) {
  const [options, setOptions] = useState<Options | null>(null),
    [sceneId, setSceneId] = useState("likes"),
    [conversation, setConversation] = useState<Conversation | null>(null),
    [text, setText] = useState(""),
    [clip, setClip] = useState<VoiceClip | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [audio, setAudio] = useState<{ turn: string; data: string } | null>(null),
    [recorderKey, setRecorderKey] = useState(0),
    [uncertain, setUncertain] = useState(false);
  const epoch = useRef(0),
    flight = useRef<AbortController | null>(null),
    pending = useRef<{
      path: string;
      body: Record<string, unknown>;
      kind: "turn" | "transcribe" | "speech";
    } | null>(null),
    startId = useRef(crypto.randomUUID()),
    identityChanged = useRef(false);
  const scene = conversationScenes.find(
    (s) => s.id === (conversation?.sceneId ?? sceneId),
  )!;
  async function refresh(current: number) {
    const next = await api<Options>("/learning/conversation-options");
    if (current !== epoch.current) return;
    setOptions(next);
    if (next.enabled && next.active) {
      const saved = await api<Conversation>(
        `/learning/conversations/${next.active.id}`,
      );
      if (current !== epoch.current) return;
      setConversation(saved);
      setSceneId(saved.sceneId);
      const previous = pending.current;
      if (
        previous &&
        (!previous.path.includes(`/conversations/${saved.id}/`) ||
          (previous.kind === "turn" &&
            saved.turnCount > Number(previous.body.expectedTurn)))
      ) {
        pending.current = null;
        setUncertain(false);
        if (previous.kind === "turn") setText("");
      }
    } else {
      setConversation(null);
      pending.current = null;
      setUncertain(false);
    }
  }
  useEffect(() => {
    const current = ++epoch.current;
    void refresh(current).catch((e) => {
      if (epoch.current === current) setError(e.message);
    });
    const stop = () => {
      epoch.current++;
      flight.current?.abort();
      document.dispatchEvent(new Event("eq-stop-speech"));
      setBusy(false);
      setAudio(null);
      setClip(null);
      setRecorderKey((k) => k + 1);
    };
    const changed = () => {
      stop();
      pending.current = null;
      setUncertain(false);
      setConversation(null);
      setText("");
      void refresh(epoch.current).catch((e) => setError(e.message));
    };
    const hidden = () => {
      if (document.hidden) stop();
      else if (!identityChanged.current)
        void refresh(epoch.current).catch((e) => setError(e.message));
    };
    const settings =
        "BroadcastChannel" in window
          ? new BroadcastChannel("eq-ai-settings")
          : null,
      identity =
        "BroadcastChannel" in window
          ? new BroadcastChannel("eq-family-identity")
          : null;
    if (settings) settings.onmessage = changed;
    if (identity)
      identity.onmessage = () => {
        identityChanged.current = true;
        stop();
        setConversation(null);
        setOptions(null);
        setText("");
        pending.current = null;
        setError("档案已切换，请返回地图重新进入小剧场。");
      };
    document.addEventListener("eq-ai-settings", changed);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      epoch.current++;
      flight.current?.abort();
      document.dispatchEvent(new Event("eq-stop-speech"));
      settings?.close();
      identity?.close();
      document.removeEventListener("eq-ai-settings", changed);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  async function task(
    work: (current: number, signal: AbortSignal) => Promise<void>,
  ) {
    if (flight.current || identityChanged.current) return;
    const current = epoch.current,
      controller = new AbortController();
    flight.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work(current, controller.signal);
    } catch (e) {
      if (current === epoch.current) {
        setError(e instanceof Error ? e.message : "本次没有完成。");
        setUncertain(!!pending.current);
      }
    } finally {
      if (flight.current === controller) flight.current = null;
      if (current === epoch.current) setBusy(false);
    }
  }
  function open() {
    void task(async (current, signal) => {
      const value = await api<{ id: string }>(
        "/learning/conversations",
        { clientRequestId: startId.current, sceneId },
        { signal },
      );
      const saved = await api<Conversation>(
        `/learning/conversations/${value.id}`,
        undefined,
        { signal },
      );
      if (current === epoch.current) {
        setConversation(saved);
        setText("");
        startId.current = crypto.randomUUID();
      }
    });
  }
  function perform(request: NonNullable<typeof pending.current>) {
    pending.current = request;
    setUncertain(true);
    void task(async (current, signal) => {
      const result = await api<{
        pending?: boolean;
        text?: string;
        audioBase64?: string;
      }>(request.path, request.body, { signal, timeoutMs: 25000 });
      if (current !== epoch.current) return;
      if (result.pending) {
        setNotice("这次仍在处理中，稍后点“读取本次结果”。不会自动重发。");
        return;
      }
      if (request.kind === "turn" && conversation) {
        const saved = await api<Conversation>(
          `/learning/conversations/${conversation.id}`,
          undefined,
          { signal },
        );
        if (current !== epoch.current) return;
        setConversation(saved);
        setText("");
        setClip(null);
        setRecorderKey((k) => k + 1);
        setAudio(null);
      } else if (request.kind === "transcribe") {
        setText(result.text ?? "");
        setNotice("先检查和修改识别文字，再点发送。识别文字尚未发给对话服务。");
      } else if (result.audioBase64)
        setAudio({
          turn: String(request.body.turnId),
          data: result.audioBase64,
        });
      pending.current = null;
      setUncertain(false);
    });
  }
  function close() {
    if (!conversation) return;
    void task(async (current, signal) => {
      await api(
        `/learning/conversations/${conversation.id}/close`,
        {},
        { signal },
      );
      if (current !== epoch.current) return;
      document.dispatchEvent(new Event("eq-stop-speech"));
      setConversation(null);
      setText("");
      setAudio(null);
      setClip(null);
      setRecorderKey((k) => k + 1);
      pending.current = null;
      setUncertain(false);
      startId.current = crypto.randomUUID();
      await refresh(current);
    });
  }
  const locked =
    busy || uncertain || !conversation || conversation.turnCount >= 6;
  return (
    <section className="talk-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">ENGLISH LITTLE THEATRE</span>
          <h1>英语小剧场</h1>
          <p>扮演森林朋友，一次练一句。这里不评分，也不增加掌握度。</p>
        </div>
        <button className="secondary" onClick={onBack}>
          返回探险地图
        </button>
      </div>
      {!conversation && (
        <div className="talk-scenes">
          {conversationScenes.map((s) => (
            <button
              key={s.id}
              className={`talk-scene ${sceneId === s.id ? "selected" : ""}`}
              aria-pressed={sceneId === s.id}
              disabled={busy}
              onClick={() => {
                setSceneId(s.id);
                startId.current = crypto.randomUUID();
                setText("");
              }}
            >
              <span>P{s.grade} · 角色表达</span>
              <strong>{s.title}</strong>
              <small lang="en">{s.promptEnglish}</small>
            </button>
          ))}
        </div>
      )}
      <div className="talk-layout">
        <section className="card talk-stage">
          <span className="eyebrow">
            {scene.title} ·{" "}
            {conversation ? `${conversation.turnCount}/6轮` : "先试试示范句"}
          </span>
          <h2 lang="en">{scene.promptEnglish}</h2>
          <p>{scene.promptChinese}</p>
          <SpeechButton text={scene.promptEnglish} label="听问题 · 设备朗读" />
          <div className="talk-history" aria-live="polite">
            {conversation?.turns.map((t) => (
              <div className="talk-turn" key={t.id}>
                <div className="talk-bubble learner">
                  <small>我说</small>
                  <p lang="en">{t.user}</p>
                </div>
                <div className="talk-bubble">
                  <small>AI角色伙伴 · 回复需要判断</small>
                  <p lang="en">{t.assistant.replyEnglish}</p>
                  <p>{t.assistant.meaningChinese}</p>
                  <p className="talk-hint">试一试：{t.assistant.hintChinese}</p>
                  <div className="voice-actions">
                    <SpeechButton
                      text={t.assistant.replyEnglish}
                      label="设备朗读"
                    />
                    {options?.tts && (
                      <button
                        className="secondary"
                        disabled={busy || uncertain}
                        onClick={() =>
                          perform({
                            path: `/learning/conversations/${conversation.id}/speech`,
                            body: {
                              clientRequestId: crypto.randomUUID(),
                              turnId: t.id,
                            },
                            kind: "speech",
                          })
                        }
                      >
                        生成AI声音 · 消耗额度
                      </button>
                    )}
                  </div>
                  {audio?.turn === t.id && (
                    <AiAudioPlayer audioBase64={audio.data} />
                  )}
                </div>
              </div>
            ))}
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {busy && <p role="status">正在处理本次请求…</p>}
          {uncertain && (
            <div className="notice">
              <p>
                本次结果待确认。已发出的请求仍可能计费，可以读取同一次结果或结束本段。
              </p>
              <button
                className="secondary"
                disabled={busy || !pending.current}
                onClick={() => pending.current && perform(pending.current)}
              >
                读取本次结果
              </button>
            </div>
          )}
          <div className="talk-starters">
            <p>选择一句，或写自己的虚构故事：</p>
            {scene.starters.map((s) => (
              <button
                className="soft-button"
                key={s}
                disabled={busy || uncertain}
                onClick={() => setText(s)}
                lang="en"
              >
                {s}
              </button>
            ))}
          </div>
          {conversation && options?.asr && conversation.turnCount < 6 && (
            <>
              <WavRecorder
                key={recorderKey}
                disabled={locked}
                onClip={setClip}
              />
              <button
                className="secondary"
                disabled={locked || !clip}
                onClick={() =>
                  perform({
                    path: `/learning/conversations/${conversation.id}/transcribe`,
                    body: {
                      clientRequestId: crypto.randomUUID(),
                      audioBase64: clip!.audioBase64,
                    },
                    kind: "transcribe",
                  })
                }
              >
                把这段录音交给AI识别
              </button>
            </>
          )}
          <label className="field">
            {conversation ? "确认要发送的文字" : "我的练习句（不会自动发送）"}
            <textarea
              value={text}
              disabled={busy || uncertain}
              maxLength={320}
              rows={3}
              onChange={(e) => setText(e.target.value)}
              placeholder="不用说真实姓名、学校、联系方式或住址。"
            />
          </label>
          <div className="voice-actions">
            {conversation ? (
              <>
                <button
                  className="primary"
                  disabled={locked || !text.trim()}
                  onClick={() =>
                    perform({
                      path: `/learning/conversations/${conversation.id}/turn`,
                      body: {
                        clientRequestId: crypto.randomUUID(),
                        expectedTurn: conversation.turnCount,
                        text: text.trim(),
                      },
                      kind: "turn",
                    })
                  }
                >
                  发送这句话
                </button>
                <button className="secondary" disabled={busy} onClick={close}>
                  结束并清除本段
                </button>
              </>
            ) : (
              <>
                <SpeechButton
                  text={text || scene.starters[0]}
                  label="听示范 · 设备朗读"
                />
                <button
                  className="primary"
                  disabled={
                    busy || !options?.enabled || identityChanged.current
                  }
                  onClick={open}
                >
                  开始AI短对话
                </button>
              </>
            )}
          </div>
          {conversation?.turnCount === 6 && (
            <p className="notice">
              6轮小练习完成啦。先休息一下，结束本段后再选新场景。
            </p>
          )}
        </section>
        <aside className="card talk-guide">
          <h3>说一句，就是一小步</h3>
          <ol>
            <li>先听问题，选一句练习。</li>
            <li>可以打字；开启语音后也能录音。</li>
            <li>识别后先检查文字，再发送。</li>
            <li>听回复，练一种新的表达。</li>
          </ol>
          <p>
            AI可能理解错或说错。可以请家长一起检查，课程判题和复习仍按标准题库进行。
          </p>
          <p>
            麦克风只在主动点击录音后申请。离开页面或切到后台会停止录音。服务可能收费，调用不会自动重试。
          </p>
          {!options?.enabled && (
            <>
              <p>家长尚未开启此功能时，也可以用这里的示范句练习。</p>
              <button className="secondary" onClick={onParent}>
                到家长空间设置AI
              </button>
            </>
          )}
          <p className="footnote">
            一段最多6轮，暂存30分钟。AI语音为合成声音；设备朗读使用浏览器能力，不是AI语音服务。暂不提供实时通话或发音分数。
          </p>
        </aside>
      </div>
    </section>
  );
}
