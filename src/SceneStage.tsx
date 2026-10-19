import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CompanionContext } from "./CompanionContext";
import { companionInfo, type CompanionId } from "../packages/domain/companions";
import ToyPicture from "./ToyPicture";
import PaintedCompanion from "./PaintedCompanion";
import { clayArt } from "./clayArt";
import { useIllustrationPause } from "./useIllustrationPause";
export const MotionContext = createContext({ quiet: false, flat: false });
export function MotionShell({
  quiet,
  flat,
  children,
  companion = "fox",
  childView,
}: {
  quiet: boolean;
  flat: boolean;
  children: ReactNode;
  companion?: CompanionId;
  childView?: string;
}) {
  const preferences = useMemo(() => ({ quiet, flat }), [quiet, flat]);
  return (
    <CompanionContext.Provider value={companion}>
      <MotionContext.Provider value={preferences}>
        <div
          className={`app-shell${childView ? " child-shell" : ""}`}
          data-child-view={childView}
          data-quiet={quiet}
        >
          {children}
        </div>
      </MotionContext.Provider>
    </CompanionContext.Provider>
  );
}
export type SceneKind =
  | "words"
  | "workshop"
  | "sorting"
  | "garden"
  | "lesson"
  | "feedback"
  | "partner";
export type Reaction = "correct" | "hinted" | "incorrect" | "thinking";
const scripts: Record<
  Exclude<SceneKind, "feedback">,
  { action: string; lines: string[] }
> = {
  partner: {
    action: "和伙伴打招呼",
    lines: [
      "小伙伴准备好啦。",
      "Hello! 一起慢慢来。",
      "选好喜欢的伙伴，再回到课程探险吧。",
    ],
  },
  words: {
    action: "和小狐狸打招呼",
    lines: [
      "小狐狸橙橙准备好啦。",
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

export default function SceneStage({
  kind,
  reaction = "thinking",
  compact = false,
  animateReaction = true,
  simple = false,
}: {
  kind: SceneKind;
  reaction?: Reaction;
  compact?: boolean;
  animateReaction?: boolean;
  simple?: boolean;
}) {
  const { quiet, flat } = useContext(MotionContext),
    info = companionInfo(useContext(CompanionContext));
  const host = useRef<HTMLDivElement>(null),
    paused = useIllustrationPause(host, quiet || flat);
  const [pulse, setPulse] = useState(0),
    [playing, setPlaying] = useState(false),
    [gesture, setGesture] = useState("greet"),
    [message, setMessage] = useState("");
  const previous = useRef(reaction);
  useEffect(() => {
    const changed = previous.current !== reaction;
    previous.current = reaction;
    if (
      changed &&
      kind === "feedback" &&
      animateReaction &&
      reaction !== "thinking" &&
      !paused
    ) {
      setGesture(reaction === "incorrect" ? "sway" : "hop");
      setPulse((n) => n + 1);
      setPlaying(true);
    }
  }, [reaction, kind, animateReaction, paused]);
  useEffect(() => {
    if (paused) {
      setPlaying(false);
      return;
    }
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(false), 900);
    return () => clearTimeout(timer);
  }, [playing, pulse, paused]);
  const play = (action: string) => {
    setGesture(action);
    setPulse((n) => n + 1);
    setPlaying(!paused);
    setMessage(
      action === "hop"
        ? info.name + "轻轻跳一下。"
        : action === "sway"
          ? info.name + "左右摇一摇。"
          : info.name + "向你问好。一起慢慢来。",
    );
  };
  const script = kind === "feedback" ? null : scripts[kind];
  return (
    <div
      ref={host}
      className={`scene-stage illustrated-stage${compact ? " scene-stage--compact" : ""}`}
      data-kind={kind}
      data-paused={paused}
      data-play={playing && !paused}
      data-gesture={gesture}
    >
      <div className="scene-viewport painted-scene" aria-hidden="true">
        <img
          className="painted-backdrop"
          src={clayArt.nook.url}
          width={1536}
          height={1024}
          alt=""
          draggable={false}
        />
        <div key={pulse} className="painted-partner-layer">
          <PaintedCompanion />
        </div>
        {kind === "feedback" && reaction !== "thinking" && (
          <span className="painted-reaction">
            {reaction === "correct"
              ? "★"
              : reaction === "incorrect"
                ? "♡"
                : "✦"}
          </span>
        )}
      </div>
      {script && simple && (
        <button
          className="child-greet"
          onClick={() => play("greet")}
          aria-label={`和${info.name}打招呼`}
        >
          <ToyPicture kind="wave" />
          <span>你好！</span>
        </button>
      )}
      {script && !simple && (
        <div className="scene-controls">
          <div className="scene-actions">
            <button
              type="button"
              className="scene-play"
              onClick={() => play("greet")}
            >
              和{info.name}打招呼
            </button>
            <button
              type="button"
              className="scene-play"
              onClick={() => play("hop")}
            >
              跳一跳
            </button>
            <button
              type="button"
              className="scene-play"
              onClick={() => play("sway")}
            >
              摇一摇
            </button>
          </div>
          <p role="status">
            {message ||
              (kind === "words" || kind === "partner"
                ? info.name + "准备好啦。"
                : script.lines[0])}
          </p>
          <p className="companion-play-note">
            {paused
              ? "静态小伙伴也能陪你一起想一想。"
              : "点一次，伙伴做一个小动作。"}
            只是小互动，不会判题或增加学习进度。
          </p>
        </div>
      )}
    </div>
  );
}
