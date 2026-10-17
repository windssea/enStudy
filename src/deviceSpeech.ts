import { acquireSpeech, releaseSpeech } from "./speechActivity";
export function playLocalEnglish(
  text: string,
  callbacks: {
    ended: () => void;
    failed: (message: string) => void;
    stopped: () => void;
  },
) {
  if (document.hidden)
    throw new Error("回到本页面后再播放声音，或使用文字辅助。");
  if (
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  )
    throw new Error("设备暂不支持英语朗读，可以使用文字辅助。");
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.localService && /^en(?:[-_]|$)/i.test(v.lang));
  const voice = voices.find((v) => /^en[-_]GB$/i.test(v.lang)) ?? voices[0];
  if (!voice)
    throw new Error(
      "还没有可用的本机英语声音。可稍后重试，或选择文字辅助继续。",
    );
  document.dispatchEvent(new Event("eq-stop-speech"));
  const token = Symbol("local-listening"),
    utterance = new SpeechSynthesisUtterance(text);
  let active = true;
  const clean = () => {
    if (!active) return false;
    active = false;
    clearTimeout(timer);
    utterance.onend = null;
    utterance.onerror = null;
    document.removeEventListener("eq-stop-speech", stop);
    document.removeEventListener("visibilitychange", hide);
    return true;
  };
  const stop = () => {
    if (!clean()) return;
    if (releaseSpeech(token)) window.speechSynthesis.cancel();
    callbacks.stopped();
  };
  const hide = () => {
    if (document.hidden) stop();
  };
  const timer = setTimeout(() => {
    if (!clean()) return;
    if (releaseSpeech(token)) window.speechSynthesis.cancel();
    callbacks.failed("声音没有完整播放。请检查设备声音，重试或用文字辅助。");
  }, 45000);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = 0.82;
  utterance.onend = () => {
    if (!clean()) return;
    releaseSpeech(token);
    callbacks.ended();
  };
  utterance.onerror = () => {
    if (!clean()) return;
    releaseSpeech(token);
    callbacks.failed("声音没有完成，未记录为听到。可以重播或选择文字辅助。");
  };
  document.addEventListener("eq-stop-speech", stop);
  document.addEventListener("visibilitychange", hide);
  acquireSpeech(token);
  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    stop();
    throw new Error("设备没有开始朗读，可以重试或使用文字辅助。");
  }
  return { stop };
}
