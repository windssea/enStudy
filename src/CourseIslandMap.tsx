import {
  Component,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Catalog, CourseLesson } from "../packages/contracts/index";
import { CompanionContext } from "./CompanionContext";
import { companionInfo } from "../packages/domain/companions";
import { courseMapStations } from "./courseMapModel";
import { mapTravelMs } from "./scene/mapRoute";
import FlatMap from "./FlatMap";
import { isSpeechActive } from "./speechActivity";

const CourseMapCanvas = lazy(() => import("./CourseMapCanvas"));
class MapBoundary extends Component<
  { fallback: ReactNode; onLost: () => void; children: ReactNode },
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

export default function CourseIslandMap({
  units,
  lessons,
  completed,
  nextUnitId,
  quiet,
  flat,
  onLost,
  onOpen,
  onSelectUnit,
}: {
  units: Catalog["units"];
  lessons: readonly CourseLesson[];
  completed: readonly { lessonId: string }[];
  nextUnitId?: string;
  quiet: boolean;
  flat: boolean;
  onLost: () => void;
  onOpen: (lesson: CourseLesson) => void;
  onSelectUnit: (unitId: string) => void;
}) {
  const stations = useMemo(
    () => courseMapStations(units, lessons, completed),
    [units, lessons, completed],
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [greet, setGreet] = useState(0),
    [turned, setTurned] = useState(false);
  const [playing, setPlaying] = useState(false),
    [action, setAction] = useState(0);
  const [visible, setVisible] = useState(false),
    [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(document.hidden),
    [speaking, setSpeaking] = useState(isSpeechActive);
  const viewport = useRef<HTMLDivElement>(null);
  const requestedIndex = stations.findIndex(
    (s) => s.id === (selectedId ?? nextUnitId) && s.next,
  );
  const selectedIndex =
    requestedIndex >= 0
      ? requestedIndex
      : Math.max(
          0,
          stations.findIndex((s) => s.next),
        );
  const station = stations[selectedIndex];
  // Catalogs with a future different unit count keep every DOM entry and use 2D.
  const illustrated = stations.length === 6;
  const paused =
    quiet || flat || hidden || !visible || speaking || !illustrated;
  const info = companionInfo(useContext(CompanionContext));
  useEffect(() => {
    const element = viewport.current;
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
    const speech = () => setSpeaking(isSpeechActive());
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("eq-speech-active", speech);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("eq-speech-active", speech);
    };
  }, []);
  useEffect(() => {
    if (paused) {
      setPlaying(false);
      return;
    }
    if (!action) return;
    const timer = setTimeout(() => setPlaying(false), mapTravelMs + 180);
    return () => clearTimeout(timer);
  }, [action, paused]);
  const activate = () => {
    setPlaying(!paused);
    setAction((n) => n + 1);
  };
  const select = (index: number) => {
    const next = stations[index];
    if (!next?.next || index === selectedIndex) return;
    setSelectedId(next.id);
    onSelectUnit(next.id);
    setTurned(false);
    activate();
  };
  const fallback = illustrated ? (
    <FlatMap turned={turned} selected={selectedIndex} stations={stations} />
  ) : (
    <div className="world-fallback">本学期的课程，请用下方站点选择。</div>
  );
  return (
    <div className="course-island-map" data-moving={!paused && playing}>
      <div className="world-scene course-map-viewport" ref={viewport}>
        {flat || !illustrated || !ready ? (
          fallback
        ) : (
          <MapBoundary fallback={fallback} onLost={onLost}>
            <Suspense fallback={fallback}>
              <CourseMapCanvas
                stations={stations}
                selected={selectedIndex}
                onSelect={select}
                quiet={paused}
                moving={!paused && playing}
                greet={greet}
                turned={turned}
                onLost={onLost}
              />
            </Suspense>
          </MapBoundary>
        )}
      </div>
      <div className="course-map-guide">
        <p>
          {flat || !illustrated
            ? "点下方站点，看看这个单元学什么。"
            : "点小岛或下方站点，看看这个单元学什么。"}
        </p>
        <div className="scene-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setTurned(false);
              setGreet((n) => n + 1);
              activate();
            }}
          >
            和{info.name}打个招呼
          </button>
          <button
            type="button"
            className="text-button"
            aria-pressed={turned}
            onClick={() => {
              setTurned((v) => !v);
              activate();
            }}
          >
            {turned ? "转回正面" : info.backAction}
          </button>
        </div>
      </div>
      <div
        className="course-map-stations"
        role="group"
        aria-label="本学期单元站点"
      >
        {stations.map((row, index) => (
          <button
            type="button"
            className="course-map-station"
            key={row.id}
            data-station={index % 6}
            aria-pressed={index === selectedIndex}
            aria-controls="course-map-selection"
            disabled={!row.next}
            onClick={() => select(index)}
          >
            <span className="course-map-number" aria-hidden="true">
              {row.number}
            </span>
            <span>
              <strong>
                第{row.number}站 · {row.title}
              </strong>
              <small>
                {row.total
                  ? `已练过 ${row.practised} / ${row.total} 课`
                  : "课程准备中"}
              </small>
            </span>
            <span className="course-map-selected">
              {index === selectedIndex ? "正在看" : "看看"}
            </span>
          </button>
        ))}
      </div>
      {station && (
        <section
          className="course-map-selection"
          id="course-map-selection"
          aria-labelledby="course-map-selection-heading"
        >
          <div role="status" aria-atomic="true">
            <p className="eyebrow">第{station.number}站 · 单元小目标</p>
            <h3 id="course-map-selection-heading">{station.title}</h3>
            <p>{station.task}</p>
            <p className="course-map-focus">
              <span>一起观察</span>
              <span>{station.focus}</span>
            </p>
          </div>
          {station.next && (
            <button
              type="button"
              className="secondary"
              onClick={() => onOpen(station.next!)}
            >
              {station.practised === station.total ? "再看看" : "打开课程"}：
              {station.next.title}
            </button>
          )}
        </section>
      )}
      <p className="course-map-note">
        逛小岛和伙伴互动不计分；完成练习后，才更新“已练过”的记录。
        {quiet || flat ? "当前使用静态画面。" : "小动作结束后，地图会停下来。"}
      </p>
    </div>
  );
}
