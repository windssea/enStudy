import { useEffect, useRef, useState } from "react";
import { playGuideAudio, type ChildGuideId } from "./wordAudio";
import ToyPicture from "./ToyPicture";
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
      setError("请再点一次小喇叭，或者请家长帮忙。");
    }
  }
  return (
    <span className="child-guide">
      <button
        className="guide-button"
        aria-label={playing ? "停止玩法提示" : "听一听，怎么玩"}
        aria-pressed={playing}
        onClick={toggle}
      >
        <ToyPicture kind="speaker" />
        <span>{playing ? "停一下" : "听我说"}</span>
      </button>
      {error && <span role="status">{error}</span>}
    </span>
  );
}
