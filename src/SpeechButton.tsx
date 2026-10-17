import { useEffect, useRef, useState } from "react";
import { acquireSpeech, releaseSpeech } from "./speechActivity";

export default function SpeechButton({
  text,
  label = "听一听",
}: {
  text: string;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const owner = useRef(Symbol("speech"));
  useEffect(() => {
    const stop = () => {
      generation.current++;
      setPlaying(false);
      if (releaseSpeech(owner.current) && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
      if (timer.current) clearTimeout(timer.current);
    };
    document.addEventListener("eq-stop-speech", stop);
    return () => {
      generation.current++;
      document.removeEventListener("eq-stop-speech", stop);
      if (timer.current) clearTimeout(timer.current);
      if (releaseSpeech(owner.current) && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    };
  }, []);
  const play = () => {
    setError("");
    if (!("speechSynthesis" in window)) {
      setError("这台设备暂不支持朗读，可以看着文字跟读。");
      return;
    }
    const wasPlaying = playing;
    document.dispatchEvent(new Event("eq-stop-speech"));
    window.speechSynthesis.cancel();
    if (wasPlaying) return;
    const current = generation.current;
    const voices = window.speechSynthesis.getVoices();
    const english =
      voices.find((v) => v.lang === "en-GB") ??
      voices.find((v) => /^en[-_]/i.test(v.lang));
    if (voices.length && !english) {
      setError("设备中没有可用的英语声音，可以先看文字练习。");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = english?.lang ?? "en-GB";
    if (english) utterance.voice = english;
    utterance.rate = 0.82;
    utterance.onend = () => {
      if (current !== generation.current) return;
      setPlaying(false);
      releaseSpeech(owner.current);
      if (timer.current) clearTimeout(timer.current);
    };
    utterance.onerror = (event) => {
      if (current !== generation.current) return;
      setPlaying(false);
      releaseSpeech(owner.current);
      if (!["interrupted", "canceled"].includes(event.error))
        setError("朗读暂时没有完成，可以看着文字跟读。");
      if (timer.current) clearTimeout(timer.current);
    };
    setPlaying(true);
    acquireSpeech(owner.current);
    timer.current = setTimeout(() => {
      if (current !== generation.current) return;
      window.speechSynthesis.cancel();
      setPlaying(false);
      releaseSpeech(owner.current);
      setError("声音暂时没有响应，可以先看文字练习。");
    }, 15000);
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      generation.current++;
      releaseSpeech(owner.current);
      setPlaying(false);
      if (timer.current) clearTimeout(timer.current);
      setError("朗读暂时没有响应，可以看着文字跟读。");
    }
  };
  return (
    <span className="speech-control">
      <button
        className="speech-button"
        type="button"
        aria-label={`${playing ? "停止朗读" : "朗读"}：${text}`}
        aria-pressed={playing}
        onClick={play}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4 9 4 0 5-4v14l-5-4H4Zm12-1q5 4 0 8m3-11q7 7 0 14" />
        </svg>
        {playing ? "停止" : label}
      </button>
      {error && (
        <span className="speech-error" role="status">
          {error}
        </span>
      )}
    </span>
  );
}
