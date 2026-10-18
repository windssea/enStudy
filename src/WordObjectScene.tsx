import {
  Component,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WordCard } from "../packages/contracts/index";
import { MotionContext } from "./SceneStage";
import { isSpeechActive } from "./speechActivity";
import {
  wordObjectKind,
  wordObjectNote,
  type WordObjectKind,
} from "./wordObjects";
const WordObjectCanvas = lazy(() => import("./WordObjectCanvas"));

export function WordObjectFlat({ kind }: { kind: WordObjectKind }) {
  return (
    <svg viewBox="0 0 280 200" className="word-object-flat" aria-hidden="true">
      <ellipse cx="140" cy="178" rx="92" ry="12" fill="#dac7ac" />
      {kind === "apple" ? (
        <g>
          <path
            d="M140 69c-51-25-81 21-52 74 18 34 34 23 52 23s34 11 52-23c29-53-1-99-52-74Z"
            fill="#ee6d58"
          />
          <path
            d="m140 72 3-30"
            stroke="#986344"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <ellipse
            cx="162"
            cy="48"
            rx="22"
            ry="9"
            fill="#69be85"
            transform="rotate(-20 162 48)"
          />
        </g>
      ) : kind === "banana" ? (
        <g>
          <path d="M59 87q70 91 164-21c-4 80-105 138-164 21Z" fill="#ffd05a" />
          <path
            d="m60 85-4-9m167-10 3-12"
            stroke="#a67849"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </g>
      ) : kind === "book" ? (
        <g>
          <rect x="79" y="34" width="122" height="136" rx="12" fill="#4d7ebe" />
          <rect x="89" y="43" width="106" height="121" rx="8" fill="#fff2d1" />
          <rect x="84" y="33" width="109" height="123" rx="10" fill="#6c9fdb" />
          <circle cx="139" cy="82" r="23" fill="#ffd05a" />
        </g>
      ) : kind === "pencil" ? (
        <g transform="rotate(20 140 100)">
          <rect x="125" y="45" width="30" height="99" fill="#ffc954" />
          <rect x="124" y="30" width="32" height="17" rx="2" fill="#b0b9cb" />
          <rect x="125" y="15" width="30" height="19" rx="9" fill="#ed9e9e" />
          <path d="m125 144 15 29 15-29Z" fill="#dcb38b" />
          <path d="m135 164 5 9 5-9Z" fill="#35445a" />
        </g>
      ) : kind === "fish" ? (
        <g>
          <path d="m91 104-48-36q-14 35 0 70Z" fill="#ed8561" />
          <ellipse cx="146" cy="104" rx="67" ry="43" fill="#f5ad50" />
          <path d="m109 78 17-30q29 9 39 25" fill="#ed8561" />
          <ellipse cx="174" cy="95" rx="7" ry="9" fill="#27334b" />
          <circle cx="172" cy="92" r="2.5" fill="white" />
          <ellipse
            cx="128"
            cy="123"
            rx="22"
            ry="10"
            fill="#ed8561"
            transform="rotate(20 128 123)"
          />
        </g>
      ) : (
        <g>
          <rect x="71" y="50" width="138" height="115" rx="27" fill="#f28a3d" />
          <path
            d="M91 73h35"
            stroke="#ffc083"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode; onLost: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onLost();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function WordObjectScene({ word }: { word: WordCard }) {
  const kind = wordObjectKind(word),
    { quiet, flat } = useContext(MotionContext),
    host = useRef<HTMLDivElement>(null),
    previous = useRef(0);
  const [angle, setAngle] = useState(0),
    [moving, setMoving] = useState(false),
    [ready, setReady] = useState(false),
    [visible, setVisible] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
    [speaking, setSpeaking] = useState(isSpeechActive),
    [lost, setLost] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setReady(true);
      setVisible(true);
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
    const visibility = () => setHidden(document.hidden),
      speech = (event: Event) =>
        setSpeaking((event as CustomEvent<boolean>).detail);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("eq-speech-active", speech);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("eq-speech-active", speech);
    };
  }, []);
  const paused = quiet || flat || lost || hidden || speaking || !visible;
  useLayoutEffect(() => {
    const changed = previous.current !== angle;
    previous.current = angle;
    setMoving(false);
    if (paused || !changed) return;
    setMoving(true);
    const timer = setTimeout(() => setMoving(false), 740);
    return () => clearTimeout(timer);
  }, [angle, paused]);
  if (!kind) return null;
  const fallback = <WordObjectFlat kind={kind} />;
  return (
    <div ref={host} className="word-object-scene">
      <div className="word-object-viewport" aria-hidden="true">
        {flat || lost || !ready ? (
          fallback
        ) : (
          <Boundary fallback={fallback} onLost={() => setLost(true)}>
            <Suspense fallback={fallback}>
              <WordObjectCanvas
                kind={kind}
                angle={angle}
                paused={paused}
                moving={moving}
                onLost={() => setLost(true)}
              />
            </Suspense>
          </Boundary>
        )}
      </div>
      {!flat && !lost && (
        <div
          className="scene-actions"
          role="group"
          aria-label={`旋转${word.word}的粘土示意`}
        >
          <button
            type="button"
            className="text-button"
            onClick={() => setAngle((value) => value - Math.PI / 2)}
          >
            向左转
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setAngle(0)}
          >
            回到正面
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setAngle((value) => value + Math.PI / 2)}
          >
            向右转
          </button>
        </div>
      )}
      <p className="word-object-caption">
        {flat || lost ? "2D示意图 · " : "粘土词语角 · "}
        {wordObjectNote(kind)}
      </p>
    </div>
  );
}
