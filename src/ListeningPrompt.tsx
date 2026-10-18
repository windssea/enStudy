import { useEffect, useRef, useState } from "react";
import type { LearningSession } from "../packages/contracts/index";
import { api } from "./api";
import { playLocalEnglish } from "./deviceSpeech";
import { playWordAudio } from "./wordAudio";
type InputState = NonNullable<LearningSession["listening"]>;
export default function ListeningPrompt({
  session,
  disabled,
  answered,
  onState,
  local = false,
}: {
  session: LearningSession;
  disabled: boolean;
  answered: boolean;
  onState: (state: InputState) => void;
  local?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "playing" | "ended">("idle"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const speech = useRef<ReturnType<typeof playLocalEnglish> | null>(null),
    generation = useRef(0),
    request = useRef<AbortController | null>(null),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      generation.current++;
      speech.current?.stop();
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (disabled) {
      generation.current++;
      speech.current?.stop();
      request.current?.abort();
      setPhase("idle");
    }
  }, [disabled]);
  function play() {
    setError("");
    const current = ++generation.current;
    if (phase === "playing") {
      speech.current?.stop();
      setPhase("idle");
      return;
    }
    try {
      const playAudio = session.exercise.audioUrl
        ? playWordAudio
        : playLocalEnglish;
      speech.current = playAudio(
        session.exercise.audioUrl ?? session.exercise.audioText!,
        {
          ended: () => {
            if (live.current && current === generation.current)
              setPhase("ended");
          },
          failed: (message) => {
            if (live.current && current === generation.current) {
              setPhase("idle");
              setError(message);
            }
          },
          stopped: () => {
            if (live.current && current === generation.current)
              setPhase("idle");
          },
        },
      );
      setPhase("playing");
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : "声音暂不可用，请用文字辅助。");
    }
  }
  async function save(mode: "heard" | "text") {
    if (disabled || saving || answered || !session.leaseId) return;
    if (mode === "heard" && phase !== "ended") return;
    if (mode === "text") {
      generation.current++;
      speech.current?.stop();
      setPhase("idle");
    }
    if (local) {
      onState({
        heard: mode === "heard" || !!session.listening?.heard,
        textSupport: mode === "text" || !!session.listening?.textSupport,
      });
      return;
    }
    const controller = new AbortController(),
      current = generation.current;
    request.current = controller;
    setSaving(true);
    setError("");
    try {
      const state = await api<InputState>(
        `/sessions/${session.id}/listening`,
        { assignmentId: session.assignmentId, leaseId: session.leaseId, mode },
        { signal: controller.signal },
      );
      if (live.current && current === generation.current) onState(state);
    } catch (e) {
      if (live.current && current === generation.current)
        setError(e instanceof Error ? e.message : "状态未保存，请重试。");
    } finally {
      if (request.current === controller) request.current = null;
      if (live.current) setSaving(false);
    }
  }
  const state = session.listening ?? { heard: false, textSupport: false };
  return (
    <section className="listening-prompt" aria-label="本题英语声音">
      <div className="listening-heading">
        <span
          className="listening-speaker"
          data-playing={phase === "playing"}
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48">
            <path
              d="M6 18h9l11-9v30L15 30H6ZM32 16q9 8 0 16m6-23q15 15 0 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <strong>
            {session.exercise.audioUrl
              ? "先听整词，再想一想"
              : "先听一句，再想一想"}
          </strong>
          <p>
            {session.exercise.audioUrl ? "英式合成整词" : "本机合成语音"} ·
            可重播，不计速度
          </p>
        </div>
      </div>
      <div className="voice-actions">
        <button
          type="button"
          className="primary"
          disabled={disabled || saving}
          onClick={play}
          aria-label={
            phase === "playing"
              ? "停止本题英语声音"
              : "播放本题英语声音，不显示原文"
          }
        >
          {phase === "playing" ? "停止声音" : "播放 / 再听一次"}
        </button>
        {!state.heard && !answered && (
          <button
            type="button"
            className="secondary"
            disabled={disabled || saving || phase !== "ended"}
            onClick={() => void save("heard")}
          >
            听到了，可以作答
          </button>
        )}
      </div>
      <p role="status">
        {saving
          ? "正在保存听音状态…"
          : state.textSupport
            ? "已开启文字辅助，本题不记独立听辨证据。"
            : state.heard
              ? "已确认听到，可以选择答案。"
              : phase === "playing"
                ? "声音播放中。停止或切到后台不会记作听到。"
                : phase === "ended"
                  ? "声音播完啦。你听到了吗？确认后再选答案。"
                  : "还没确认听到。播放后可以确认，听不到也能改用文字辅助。"}
      </p>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {state.textSupport ? (
        <div className="listening-transcript">
          <small>文字辅助 · 本题英文</small>
          <p lang="en">{session.exercise.audioText}</p>
        </div>
      ) : (
        <button
          type="button"
          className="text-button"
          disabled={disabled || saving || answered}
          onClick={() => void save("text")}
        >
          听不到 / 需要文字辅助
        </button>
      )}
      <p className="footnote">
        {local
          ? "本机听音状态随答案暂存，联网同步后才会确认。离线声音是否可用取决于设备；听不到可用文字辅助。"
          : "没听清也没关系，可以重播或看文字。文字辅助会单独记录。"}
      </p>
    </section>
  );
}
