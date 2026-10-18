import {
  Component,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PhonicsWord } from "../packages/contracts/phonics";
import { phonicsGroupLabel } from "../packages/domain/phonics";
import { MotionContext } from "./SceneStage";
import { isSpeechActive } from "./speechActivity";
import WordAudioButton from "./WordAudioButton";
const Canvas = lazy(() => import("./PhonicsCanvas"));
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p>3D暂不可用，下方字母标记仍可使用。</p>
    ) : (
      this.props.children
    );
  }
}
export default function PhonicsWorkbench({
  word,
  kind,
}: {
  word: PhonicsWord;
  kind: "sound" | "meaning";
}) {
  const { quiet, flat } = useContext(MotionContext),
    host = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0),
    [folded, setFolded] = useState(false),
    [visible, setVisible] = useState(false),
    [ready, setReady] = useState(false),
    [hidden, setHidden] = useState(false),
    [speaking, setSpeaking] = useState(isSpeechActive),
    [lost, setLost] = useState(false),
    [moving, setMoving] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setReady(true);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const hide = () => setHidden(document.hidden),
      speech = (e: Event) => setSpeaking((e as CustomEvent<boolean>).detail);
    hide();
    document.addEventListener("visibilitychange", hide);
    document.addEventListener("eq-speech-active", speech);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      document.removeEventListener("eq-speech-active", speech);
    };
  }, []);
  useEffect(() => {
    if (quiet || !visible || hidden || speaking) {
      setMoving(false);
      return;
    }
    setMoving(true);
    const timer = setTimeout(() => setMoving(false), 650);
    return () => clearTimeout(timer);
  }, [folded, selected, quiet, visible, hidden, speaking]);
  const group = word.groups[selected] ?? [],
    label = phonicsGroupLabel(word, group);
  return (
    <section className="phonics-workbench" aria-label="字母对应示范">
      <div className="phonics-canvas" ref={host}>
        {!flat && !lost && ready ? (
          <Boundary>
            <Suspense fallback={<p>正在准备粘土词块…</p>}>
              <Canvas
                word={word}
                selected={selected}
                folded={folded}
                moving={moving}
                onLost={() => setLost(true)}
              />
            </Suspense>
          </Boundary>
        ) : (
          <p className="phonics-flat-note">
            {word.word} · {word.meaning}
          </p>
        )}
      </div>
      <div
        className="phonics-letter-row"
        data-group={selected % 4}
        lang="en"
        aria-label="按原拼写排列的字母块"
      >
        {word.tiles.map((tile, i) => (
          <span key={i} data-selected={group.includes(i)}>
            {tile}
          </span>
        ))}
      </div>
      <p className="phonics-group-status" role="status">
        {kind === "meaning" ? "词义块" : "音—字母标记"} {selected + 1}/
        {word.groups.length}：<strong lang="en">{label}</strong>
        {kind === "sound" && group.length > 1
          ? " · 这些字母共同对应本词的一个音。"
          : ""}
      </p>
      <div
        className="phonics-group-buttons"
        aria-label={kind === "meaning" ? "选择词义块" : "选择音与字母标记"}
      >
        {word.groups.map((g, i) => (
          <button
            className="secondary"
            key={i}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <span lang="en">{phonicsGroupLabel(word, g)}</span>
            <small>
              {kind === "meaning" ? `词块${i + 1}` : `标记${i + 1}`}
            </small>
          </button>
        ))}
      </div>
      <div className="phonics-controls">
        <WordAudioButton key={word.id} url={word.audioUrl} />
        <button className="secondary" onClick={() => setFolded((v) => !v)}>
          {folded ? "分开观察词块" : "合在一起看拼写"}
        </button>
      </div>
      <p>
        {kind === "meaning"
          ? "这里数有意义的小词，不是音素或音节。"
          : "字母下的标记帮你看对应关系；播放的是完整单词，不是逐个纯音素录音。"}
        点标记和移动词块都不计成绩。
      </p>
    </section>
  );
}
