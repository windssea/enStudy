import { useEffect, useState, type RefObject } from "react";
import { isSpeechActive } from "./speechActivity";
export function useIllustrationPause(
  host: RefObject<HTMLElement | null>,
  quiet: boolean,
) {
  const [visible, setVisible] = useState(false),
    [hidden, setHidden] = useState(
      typeof document !== "undefined" ? document.hidden : false,
    ),
    [speaking, setSpeaking] = useState(isSpeechActive);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [host]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden),
      speech = () => setSpeaking(isSpeechActive());
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("eq-speech-active", speech);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("eq-speech-active", speech);
    };
  }, []);
  return quiet || hidden || speaking || !visible;
}
