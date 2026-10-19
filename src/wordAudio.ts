import { acquireSpeech, releaseSpeech } from "./speechActivity";
import guides from "../public/content/child-guides.v1.json";
type AudioCallbacks = {
  ended: () => void;
  failed: (message: string) => void;
  stopped: () => void;
};
export type GuideId =
  | "home"
  | "map"
  | "words"
  | "topics"
  | "patterns"
  | "review"
  | "lesson"
  | "choice"
  | "input"
  | "order"
  | "sort"
  | "repair"
  | "evidence"
  | "saved"
  | "parent"
  | "start"
  | "phonics"
  | "workshops"
  | "writing"
  | "mistakes"
  | "offline"
  | "talk";
export function playWordAudio(url: string, callbacks: AudioCallbacks) {
  return playLocalAudio(url, callbacks, "phonics");
}
export function playGuideAudio(id: GuideId, callbacks: AudioCallbacks) {
  const clip = guides.items.find((row) => row.id === id);
  if (!clip) throw Error("这段提示正在准备，请家长帮忙。");
  return playLocalAudio(clip.url, callbacks, "guides");
}
function playLocalAudio(
  url: string,
  callbacks: {
    ended: () => void;
    failed: (message: string) => void;
    stopped: () => void;
  },
  folder: "phonics" | "guides",
) {
  if (document.hidden) throw Error("回到本页面后再播放，或使用文字辅助。");
  if (
    !new RegExp(
      `^/audio/${folder}/[a-f0-9]{24}\\.${folder === "guides" ? "mp3" : "wav"}$`,
    ).test(url)
  )
    throw Error("声音地址不匹配，请重新读取这道题。");
  document.dispatchEvent(new Event("eq-stop-speech"));
  const audio = new Audio(url),
    owner = Symbol("word-audio");
  let active = true;
  const clean = () => {
    if (!active) return false;
    active = false;
    clearTimeout(timer);
    audio.onended = null;
    audio.onerror = null;
    document.removeEventListener("eq-stop-speech", stop);
    document.removeEventListener("visibilitychange", hide);
    releaseSpeech(owner);
    return true;
  };
  const stop = () => {
    if (!clean()) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    callbacks.stopped();
  };
  const fail = () => {
    if (!clean()) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    callbacks.failed(
      folder === "guides"
        ? "提示音暂时没有播放，可以再点一次小喇叭。"
        : "整词声音没有完整播放，可重试或选择文字辅助。",
    );
  };
  const hide = () => {
    if (document.hidden) stop();
  };
  const timer = setTimeout(fail, folder === "guides" ? 25000 : 15000);
  document.addEventListener("eq-stop-speech", stop);
  document.addEventListener("visibilitychange", hide);
  audio.onended = () => {
    if (clean()) callbacks.ended();
  };
  audio.onerror = fail;
  acquireSpeech(owner);
  void audio.play().catch(fail);
  return { stop };
}
