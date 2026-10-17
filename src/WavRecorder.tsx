import { useEffect, useRef, useState } from "react";
import { pcmWav, voiceBase64, wavDuration } from "../packages/domain/voice";
import { acquireSpeech, releaseSpeech } from "./speechActivity";
export interface VoiceClip {
  audioBase64: string;
  milliseconds: number;
}
export default function WavRecorder({
  onClip,
  disabled = false,
}: {
  onClip: (clip: VoiceClip | null) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "permission" | "recording">(
      "idle",
    ),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState(""),
    [preview, setPreview] = useState("");
  const active = useRef<{
      context: AudioContext;
      stream: MediaStream | null;
      node: AudioWorkletNode | null;
      timer: ReturnType<typeof setInterval> | null;
      chunks: Float32Array[];
      frames: number;
      token: symbol;
    } | null>(null),
    generation = useRef(0),
    previewRef = useRef(""),
    callback = useRef(onClip),
    player = useRef<HTMLAudioElement>(null),
    playback = useRef(Symbol("record-preview")),
    initiating = useRef(false);
  callback.current = onClip;
  function cleanup() {
    const current = active.current;
    active.current = null;
    if (!current) return;
    if (current.timer) clearInterval(current.timer);
    if (current.node) {
      current.node.port.onmessage = null;
      current.node.disconnect();
    }
    current.stream?.getTracks().forEach((t) => t.stop());
    void current.context.close().catch(() => {});
    releaseSpeech(current.token);
  }
  function discard(update = true) {
    generation.current++;
    cleanup();
    player.current?.pause();
    releaseSpeech(playback.current);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    if (update) {
      setState("idle");
      setPreview("");
      callback.current(null);
    }
  }
  useEffect(() => {
    const stop = () => {
        if (!initiating.current) {
          if (active.current) discard();
          else {
            player.current?.pause();
            releaseSpeech(playback.current);
          }
        }
      },
      hide = () => {
        if (document.hidden) discard();
      };
    document.addEventListener("eq-stop-speech", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("eq-stop-speech", stop);
      document.removeEventListener("visibilitychange", hide);
      discard(false);
    };
  }, []);
  async function start() {
    document.dispatchEvent(new Event("eq-stop-speech"));
    discard();
    setError("");
    setSeconds(0);
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      !window.AudioContext ||
      !window.AudioWorkletNode
    ) {
      setError("当前设备无法录音，可以直接打字或选择示范句。");
      return;
    }
    const turn = ++generation.current;
    setState("permission");
    let context: AudioContext;
    try {
      context = new AudioContext();
    } catch {
      setState("idle");
      setError("录音设备暂未就绪，可以先打字练习。");
      return;
    }
    const current = {
      context,
      stream: null as MediaStream | null,
      node: null as AudioWorkletNode | null,
      timer: null as ReturnType<typeof setInterval> | null,
      chunks: [] as Float32Array[],
      frames: 0,
      token: Symbol("capture"),
    };
    active.current = current;
    try {
      // Resume inside the click gesture, before awaiting browser permission.
      await context.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      if (turn !== generation.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      current.stream = stream;
      await context.audioWorklet.addModule("/audio/capture-worklet.js");
      if (turn !== generation.current) return;
      const node = new AudioWorkletNode(context, "quest-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      current.node = node;
      node.port.onmessage = (
        event: MessageEvent<{ samples?: Float32Array; done?: boolean }>,
      ) => {
        if (turn !== generation.current) return;
        if (event.data.samples) {
          const remaining = Math.max(
              0,
              context.sampleRate * 20 - current.frames,
            ),
            chunk = event.data.samples.subarray(0, remaining);
          current.chunks.push(chunk);
          current.frames += chunk.length;
        }
        if (event.data.done) {
          const samples = new Float32Array(current.frames);
          let at = 0;
          for (const chunk of current.chunks) {
            samples.set(chunk, at);
            at += chunk.length;
          }
          cleanup();
          generation.current++;
          setState("idle");
          try {
            const bytes = pcmWav(samples, context.sampleRate),
              milliseconds = wavDuration(bytes);
            const url = URL.createObjectURL(
              new Blob([bytes as BlobPart], { type: "audio/wav" }),
            );
            previewRef.current = url;
            setPreview(url);
            callback.current({ audioBase64: voiceBase64(bytes), milliseconds });
          } catch {
            setError("录音太短或无法处理，请录0.25至20秒，或直接打字。");
          }
        }
      };
      context
        .createMediaStreamSource(stream)
        .connect(node)
        .connect(context.destination);
      acquireSpeech(current.token);
      setState("recording");
      const began = performance.now();
      current.timer = setInterval(() => {
        setSeconds(
          Math.min(20, Math.floor((performance.now() - began) / 1000)),
        );
        if (performance.now() - began > 22000) {
          discard();
          setError("录音已停止，请重录或直接打字。");
        }
      }, 200);
    } catch {
      if (turn !== generation.current) return;
      discard();
      setError(
        "没有取得麦克风权限或设备暂不支持。可以在浏览器设置中允许，也可以直接打字。",
      );
    }
  }
  return (
    <div className="voice-recorder">
      <p className="footnote">
        先录音、自己听，再决定是否交给AI识别。最多20秒。
      </p>
      <div className="voice-actions">
        {state === "idle" ? (
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            onClick={() => void start()}
          >
            录一句英语
          </button>
        ) : (
          <>
            {state === "recording" && (
              <button
                type="button"
                className="primary"
                onClick={() => active.current?.node?.port.postMessage("stop")}
              >
                录好了 · 停止
              </button>
            )}
            <button
              type="button"
              className="secondary"
              onClick={() => discard()}
            >
              取消录音
            </button>
          </>
        )}
        {(preview || state !== "idle") && (
          <span role="status">
            {state === "permission"
              ? "等待麦克风授权…"
              : state === "recording"
                ? `正在录音 ${seconds}/20秒`
                : "录音只在此页面，尚未上传"}
          </span>
        )}
      </div>
      {preview && (
        <>
          <audio
            ref={player}
            controls
            src={preview}
            onPlay={() => {
              initiating.current = true;
              document.dispatchEvent(new Event("eq-stop-speech"));
              initiating.current = false;
              acquireSpeech(playback.current);
            }}
            onPause={() => releaseSpeech(playback.current)}
            onEnded={() => releaseSpeech(playback.current)}
            aria-label="刚录制的英语"
          />
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => discard()}
          >
            删除这段录音
          </button>
        </>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
