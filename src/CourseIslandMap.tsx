import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Catalog, CourseLesson } from "../packages/contracts/index";
import { CompanionContext } from "./CompanionContext";
import { companionInfo } from "../packages/domain/companions";
import { courseMapStations } from "./courseMapModel";
import FlatMap from "./FlatMap";
import PaintedCompanion from "./PaintedCompanion";
import { clayArt } from "./clayArt";
import { useIllustrationPause } from "./useIllustrationPause";
const stops = [
  [14, 73],
  [38, 57],
  [66, 57],
  [57, 36],
  [72, 24],
  [90, 16],
];
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
  const [selectedId, setSelectedId] = useState<string>(),
    [failed, setFailed] = useState(false),
    [pulse, setPulse] = useState(0),
    [playing, setPlaying] = useState(false);
  const viewport = useRef<HTMLDivElement>(null),
    paused = useIllustrationPause(viewport, quiet || flat);
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
  const station = stations[selectedIndex],
    info = companionInfo(useContext(CompanionContext));
  useEffect(() => {
    if (paused) {
      setPlaying(false);
      return;
    }
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(false), 900);
    return () => clearTimeout(timer);
  }, [playing, pulse, paused]);
  const activate = () => {
    setPulse((n) => n + 1);
    setPlaying(!paused);
  };
  const select = (index: number) => {
    const next = stations[index];
    if (!next?.next || index === selectedIndex) return;
    setSelectedId(next.id);
    onSelectUnit(next.id);
    activate();
  };
  const point = stops[selectedIndex] ?? stops[0];
  return (
    <div
      className="course-island-map painted-course-map"
      data-moving={!paused && playing}
      data-paused={paused}
    >
      <div
        className="world-scene course-map-viewport painted-map-viewport"
        ref={viewport}
      >
        {failed ? (
          <FlatMap
            selected={selectedIndex}
            stations={stations}
            showPartner={false}
          />
        ) : (
          <img
            className="painted-map-background"
            src={clayArt.island.url}
            width={1536}
            height={1024}
            alt=""
            draggable={false}
            onError={() => {
              setFailed(true);
              onLost();
            }}
          />
        )}
        {!failed && stations.length === 6 && (
          <>
            <div
              className="painted-map-partner"
              style={{
                left: point[0] + "%",
                top: (point[1] < 50 ? point[1] + 23 : point[1] - 23) + "%",
              }}
              aria-hidden="true"
            >
              <div key={pulse} className="painted-map-hop">
                <PaintedCompanion />
              </div>
            </div>
            <div
              className="painted-map-stops"
              role="group"
              aria-label="图片地图上的六个单元站点"
            >
              {stations.map((row, i) => (
                <button
                  type="button"
                  key={row.id}
                  className="painted-map-stop"
                  style={{ left: stops[i][0] + "%", top: stops[i][1] + "%" }}
                  disabled={!row.next}
                  aria-pressed={i === selectedIndex}
                  aria-controls="course-map-selection"
                  aria-label={`第${row.number}站：${row.title}`}
                  onClick={() => select(i)}
                >
                  <span aria-hidden="true">{row.number}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="course-map-guide">
        <p>点小岛上的大圆点，看看这一站学什么。</p>
        <button type="button" className="scene-play" onClick={activate}>
          和{info.name}打招呼
        </button>
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
        {quiet || flat ? "当前使用静态画面。" : "点击后短暂移动，随后停下来。"}
      </p>
    </div>
  );
}
