import {
  Component,
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isSpeechActive } from "./speechActivity";

const SceneCanvas = lazy(() => import("./SceneCanvas"));
export const MotionContext = createContext({ quiet: false, flat: false });
export function MotionShell({
  quiet,
  flat,
  children,
}: {
  quiet: boolean;
  flat: boolean;
  children: ReactNode;
}) {
  const preferences = useMemo(() => ({ quiet, flat }), [quiet, flat]);
  return (
    <MotionContext.Provider value={preferences}>
      <div className="app-shell" data-quiet={quiet}>
        {children}
      </div>
    </MotionContext.Provider>
  );
}
export type SceneKind =
  "words" | "workshop" | "sorting" | "garden" | "lesson" | "feedback";
export type Reaction = "correct" | "hinted" | "incorrect" | "thinking";
const scripts: Record<
  Exclude<SceneKind, "feedback">,
  { action: string; lines: string[] }
> = {
  words: {
    action: "和词语伙伴打招呼",
    lines: [
      "词语伙伴准备好啦。",
      "Hello! 今天也一起认识新单词。",
      "把单词放进句子，意思就更清楚了。",
    ],
  },
  workshop: {
    action: "搭一次句子积木",
    lines: [
      "小词块，可以搭出大想法。",
      "I + like + cats. 小词块搭好啦！",
      "换一个词，就能说出新的想法。",
    ],
  },
  sorting: {
    action: "看看卡片落篮的动画",
    lines: [
      "先选卡片，再选篮子。分类可以慢慢想。",
      "卡片落进篮子啦。这是动画演示，不会判题或增加进度。",
      "真正放对了吗？等完成一题后，再看保存的结果。",
    ],
  },
  garden: {
    action: "给小芽浇一滴水",
    lines: [
      "像照顾小芽一样，隔几天再想一想。",
      "小芽喝到水啦。接下来，去复习一个记忆吧。",
      "浇水是小互动，完成复习才会更新学习记录。",
    ],
  },
  lesson: {
    action: "和探险伙伴击个掌",
    lines: [
      "先找规律，再试一试。",
      "准备好啦，我们一起慢慢来。",
      "不急着答题，先把例句读明白。",
    ],
  },
};

function FlatScene({
  kind,
  reaction,
}: {
  kind: SceneKind;
  reaction: Reaction;
}) {
  return (
    <svg className="scene-flat" viewBox="0 0 320 230" aria-hidden="true">
      <ellipse cx="160" cy="202" rx="123" ry="18" fill="#d0dfed" />
      <path d="M35 183Q160 124 285 183L277 202H43Z" fill="#bde4cf" />
      <rect
        x="62"
        y="74"
        width="104"
        height="110"
        rx="43"
        fill="#ffd166"
        stroke="#edbd59"
        strokeWidth="4"
      />
      <path
        d="M69 83Q103 44 146 83"
        fill="#bde4cf"
        stroke="#449e79"
        strokeWidth="8"
      />
      <circle cx="94" cy="116" r="6" fill="#172b4d" />
      <circle cx="135" cy="116" r="6" fill="#172b4d" />
      <path
        d={reaction === "incorrect" ? "M101 144h26" : "M101 139q14 17 27 0"}
        fill="none"
        stroke="#172b4d"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M70 161l-18-13m104 13 18-22"
        stroke="#ffd166"
        strokeWidth="18"
        strokeLinecap="round"
      />
      {kind === "sorting" ? (
        <g>
          <path
            d="M185 161h42l-5 35h-32Z"
            fill="#ffd166"
            stroke="#916c46"
            strokeWidth="3"
          />
          <path
            d="M233 161h42l-5 35h-32Z"
            fill="#a5d7e4"
            stroke="#2557d6"
            strokeWidth="3"
          />
          <rect
            x="211"
            y="104"
            width="39"
            height="43"
            rx="7"
            fill="#a4dcc0"
            stroke="#449e79"
            strokeWidth="3"
          />
        </g>
      ) : kind === "garden" ? (
        <g stroke="#449e79" strokeWidth="6" fill="#74c79c">
          <path d="M225 181v-55" />
          <ellipse
            cx="212"
            cy="130"
            rx="20"
            ry="10"
            transform="rotate(30 212 130)"
          />
          <ellipse
            cx="239"
            cy="115"
            rx="22"
            ry="11"
            transform="rotate(-30 239 115)"
          />
          <path d="M201 174h49l-8 25h-33Z" fill="#ee9b86" />
        </g>
      ) : (
        <g transform="rotate(9 228 134)">
          <rect
            x="188"
            y="83"
            width="72"
            height="102"
            rx="15"
            fill={kind === "words" ? "#ef9f87" : "#a5d7e4"}
            stroke="white"
            strokeWidth="5"
          />
          <text
            x="224"
            y="145"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontWeight="700"
            fontSize="34"
            fill="#172b4d"
          >
            {kind === "feedback"
              ? reaction === "correct"
                ? "✓"
                : "…"
              : kind === "words"
                ? "Aa"
                : "I"}
          </text>
        </g>
      )}
    </svg>
  );
}

class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onLost: () => void },
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

export default function SceneStage({
  kind,
  reaction = "thinking",
  compact = false,
  animateReaction = true,
}: {
  kind: SceneKind;
  reaction?: Reaction;
  compact?: boolean;
  animateReaction?: boolean;
}) {
  const { quiet, flat } = useContext(MotionContext);
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [speaking, setSpeaking] = useState(isSpeechActive);
  const [lost, setLost] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [reacting, setReacting] = useState(false);
  const lastReaction = useRef(reaction);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setReady(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    const speech = (event: Event) =>
      setSpeaking((event as CustomEvent<boolean>).detail);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("eq-speech-active", speech);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("eq-speech-active", speech);
    };
  }, []);
  // Feedback only moves after a persisted server receipt changes its state.
  useEffect(() => {
    setReacting(false);
    const changed = lastReaction.current !== reaction;
    lastReaction.current = reaction;
    if (
      !changed ||
      !animateReaction ||
      kind !== "feedback" ||
      reaction === "thinking" ||
      quiet ||
      !visible ||
      hidden ||
      speaking
    ) {
      return;
    }
    setReacting(true);
    const timer = setTimeout(() => setReacting(false), 900);
    return () => clearTimeout(timer);
  }, [kind, reaction, animateReaction, quiet, visible, hidden, speaking]);
  const paused = quiet || hidden || !visible || speaking;
  const fallback = <FlatScene kind={kind} reaction={reaction} />;
  const script = kind === "feedback" ? null : scripts[kind];
  return (
    <div
      ref={host}
      className={`scene-stage${compact ? " scene-stage--compact" : ""}`}
      data-kind={kind}
      data-paused={paused}
    >
      <div className="scene-viewport" aria-hidden="true">
        {flat || lost || !ready ? (
          fallback
        ) : (
          <SceneBoundary fallback={fallback} onLost={() => setLost(true)}>
            <Suspense fallback={fallback}>
              <SceneCanvas
                kind={kind}
                reaction={reaction}
                pulse={pulse}
                paused={paused}
                moving={kind !== "feedback" || reacting}
                onLost={() => setLost(true)}
              />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      {script && (
        <div className="scene-controls">
          <button
            type="button"
            className="scene-play"
            onClick={() => setPulse((n) => n + 1)}
          >
            {script.action}
            <span aria-hidden="true"> ↗</span>
          </button>
          <p role="status">{script.lines[pulse % script.lines.length]}</p>
        </div>
      )}
      {lost && <span className="scene-mode-note">已切换为 2D 小伙伴</span>}
    </div>
  );
}
