import { useEffect, useRef, useState } from "react";
import { acquireSpeech, releaseSpeech } from "./speechActivity";
export default function AiAudioPlayer({
  audioBase64,
  mime = "audio/mpeg",
}: {
  audioBase64: string;
  mime?: string;
}) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false),
    audio = useRef<HTMLAudioElement>(null),
    token = useRef(Symbol("AI-audio")),
    initiating = useRef(false);
  useEffect(() => {
    const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0)),
      next = URL.createObjectURL(new Blob([bytes], { type: mime }));
    setUrl(next);
    setFailed(false);
    const stop = () => {
        if (!initiating.current) {
          audio.current?.pause();
          releaseSpeech(token.current);
        }
      },
      hide = () => {
        if (document.hidden) stop();
      };
    document.addEventListener("eq-stop-speech", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      audio.current?.pause();
      releaseSpeech(token.current);
      URL.revokeObjectURL(next);
      document.removeEventListener("eq-stop-speech", stop);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [audioBase64, mime]);
  return (
    <div className="ai-audio">
      <small>AI合成声音 · 点击播放</small>
      <audio
        ref={audio}
        controls
        src={url}
        onPlay={() => {
          initiating.current = true;
          document.dispatchEvent(new Event("eq-stop-speech"));
          initiating.current = false;
          acquireSpeech(token.current);
        }}
        onPause={() => releaseSpeech(token.current)}
        onEnded={() => releaseSpeech(token.current)}
        onError={() => setFailed(true)}
        aria-label="AI合成的英文回复"
      />
      {failed && (
        <p role="status">这段音频无法播放，请阅读文字或使用设备朗读。</p>
      )}
    </div>
  );
}
