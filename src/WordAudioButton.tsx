import { useEffect, useRef, useState } from "react";
import { playWordAudio } from "./wordAudio";
export default function WordAudioButton({
  url,
  label = "听完整单词",
}: {
  url: string;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const player = useRef<ReturnType<typeof playWordAudio> | null>(null),
    epoch = useRef(0);
  useEffect(() => {
    setPlaying(false);
    setError("");
    return () => {
      epoch.current++;
      player.current?.stop();
    };
  }, [url]);
  function play() {
    if (playing) {
      player.current?.stop();
      setPlaying(false);
      return;
    }
    setError("");
    const n = ++epoch.current;
    try {
      setPlaying(true);
      player.current = playWordAudio(url, {
        ended: () => {
          if (n === epoch.current) setPlaying(false);
        },
        stopped: () => {
          if (n === epoch.current) setPlaying(false);
        },
        failed: (message) => {
          if (n === epoch.current) {
            setPlaying(false);
            setError(message);
          }
        },
      });
    } catch (e) {
      setPlaying(false);
      setError(e instanceof Error ? e.message : "声音暂不可用。");
    }
  }
  return (
    <div className="word-audio">
      <button className="secondary" onClick={play}>
        {playing ? "停止播放" : label}
      </button>
      <small>英式合成整词 · 不做口语评分</small>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
