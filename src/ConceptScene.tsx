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
import type { ConceptSceneData } from "../packages/domain/concepts";
import { MotionContext } from "./SceneStage";
import { isSpeechActive } from "./speechActivity";
import { CONCEPT_MOTION_MS } from "./conceptMotion";
const ConceptCanvas = lazy(() => import("./ConceptCanvas"));
export function ConceptFlat({ data }: { data: ConceptSceneData }) {
  const x = (point: number) => 35 + point * 330;
  return (
    <svg viewBox="0 0 400 240" className="concept-flat" aria-hidden="true">
      <ellipse cx="200" cy="205" rx="176" ry="18" fill="#dce7f1" />
      {data.kind === "morph" ? (
        data.tiles.map((word, index) => (
          <g
            key={index}
            transform={`translate(${200 + (index - (data.tiles.length - 1) / 2) * 116} 120)`}
          >
            <rect
              x="-49"
              y="-48"
              width="98"
              height="86"
              rx="18"
              fill={
                data.tiles.length === 1
                  ? "#b7edcd"
                  : index
                    ? "#ffb293"
                    : "#a5d7e4"
              }
              stroke="#46566e"
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              y="2"
              fontSize="20"
              fontFamily="sans-serif"
              fontWeight="700"
              fill="#172b4d"
            >
              {word}
            </text>
          </g>
        ))
      ) : (
        <>
          <path
            d="M35 140H365"
            stroke="#697e9e"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path d={`M${x(0.6)} 48V155`} stroke="#247957" strokeWidth="3" />
          {[data.visual!.span, data.visual!.secondSpan]
            .filter((span): span is [number, number] => Boolean(span))
            .map((span, index) => (
              <path
                key={index}
                d={`M${x(span[0])} ${118 - index * 22}H${x(span[1])}`}
                stroke={index ? "#9c79cc" : "#9a6700"}
                strokeWidth="14"
                strokeLinecap="round"
              />
            ))}
          {data.visual!.repeat?.map((point, index) => (
            <circle key={index} cx={x(point)} cy="118" r="7" fill="#6240a4" />
          ))}
          {data.visual!.linkToNow && (
            <path
              d={`M${x(data.visual!.point)} 116H${x(0.6)}`}
              stroke="#6240a4"
              strokeWidth="6"
            />
          )}
          <circle
            cx={x(data.visual!.point)}
            cy="84"
            r="16"
            fill="#ee786e"
            stroke="#9d4027"
            strokeWidth="2"
          />
          {[
            { point: 0.16, label: "过去" },
            { point: 0.6, label: "现在" },
            { point: 0.94, label: "将来" },
          ].map(({ point, label }) => (
            <text
              key={label}
              x={x(point)}
              y="181"
              textAnchor="middle"
              fontSize="18"
              fontWeight="700"
              fill="#172b4d"
            >
              {label}
            </text>
          ))}
        </>
      )}
      {data.kind === "morph" &&
        Array.from({ length: data.tiles.length - 1 }, (_, index) => (
          <text
            key={`sign:${index}`}
            x={200 + (index - (data.tiles.length - 2) / 2) * 116}
            y="122"
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="#46566e"
          >
            {data.joiner}
          </text>
        ))}
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
export default function ConceptScene({
  data,
  revision,
}: {
  data: ConceptSceneData;
  revision: number;
}) {
  const { quiet, flat } = useContext(MotionContext);
  const host = useRef<HTMLDivElement>(null),
    previous = useRef(revision);
  const [visible, setVisible] = useState(false),
    [ready, setReady] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
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
  const paused = quiet || hidden || speaking || !visible || flat || lost;
  useLayoutEffect(() => {
    const changed = previous.current !== revision;
    previous.current = revision;
    setMoving(false);
    if (paused || !changed) return;
    setMoving(true);
    const timer = setTimeout(() => setMoving(false), CONCEPT_MOTION_MS);
    return () => clearTimeout(timer);
  }, [revision, paused]);
  const fallback = <ConceptFlat data={data} />;
  return (
    <div ref={host} className="concept-scene" data-paused={paused}>
      <div className="concept-viewport" aria-hidden="true">
        {flat || lost || !ready ? (
          fallback
        ) : (
          <Boundary fallback={fallback} onLost={() => setLost(true)}>
            <Suspense fallback={fallback}>
              <ConceptCanvas
                data={data}
                revision={revision}
                moving={moving && !paused}
                onLost={() => setLost(true)}
              />
            </Suspense>
          </Boundary>
        )}
      </div>
      <p className="footnote">
        {lost ? "已切换为2D示意图。" : flat ? "2D示意图 · " : "互动示意图 · "}
        {data.kind === "timeline"
          ? "圆点表示所看的时刻；线段和小点表示进行、重复或与现在的联系，不按真实时间比例。"
          : "词块会随着步骤变化；中间词块不一定是完整英文单词。"}
      </p>
    </div>
  );
}
