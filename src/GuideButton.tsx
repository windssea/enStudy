import { useEffect, useRef, useState } from "react";
import { playGuideAudio, type ChildGuideId } from "./wordAudio";
import LearningIcon from "./LearningIcon";
export default function GuideButton({ id }: { id: ChildGuideId }) {
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const player = useRef<{ stop: () => void } | null>(null),
    epoch = useRef(0);
  useEffect(() => {
    setPlaying(false);
    setError("");
    return () => {
      epoch.current++;
      player.current?.stop();
    };
  }, [id]);
  function toggle() {
    if (playing) {
      player.current?.stop();
      return;
    }
    const n = ++epoch.current;
    setError("");
    setPlaying(true);
    try {
      player.current = playGuideAudio(id, {
        ended: () => {
          if (n === epoch.current) setPlaying(false);
        },
        stopped: () => {
          if (n === epoch.current) setPlaying(false);
        },
        failed: (m) => {
          if (n === epoch.current) {
            setPlaying(false);
            setError(m);
          }
        },
      });
    } catch {
      setPlaying(false);
      setError("声音暂不可用，请重试或请家长帮忙。");
    }
  }
  return (
    <span className="child-guide">
      <button
        className="guide-button"
        aria-label={playing ? "停止操作提示" : "听操作提示"}
        aria-pressed={playing}
        onClick={toggle}
      >
        <LearningIcon kind="speaker" />
        <span>{playing ? "停止提示" : "听提示"}</span>
      </button>
      {error && <span role="status">{error}</span>}
    </span>
  );
}
