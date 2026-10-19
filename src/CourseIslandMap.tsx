import { useMemo, useState } from "react";
import type { Catalog, CourseLesson } from "../packages/contracts/index";
import { courseMapStations } from "./courseMapModel";

export default function CourseIslandMap({
  units,
  lessons,
  completed,
  nextUnitId,
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
  onSelectUnit: (id: string) => void;
}) {
  const stations = useMemo(
    () => courseMapStations(units, lessons, completed),
    [units, lessons, completed],
  );
  const [selectedId, setSelectedId] = useState<string>();
  const selected =
    stations.find((s) => s.id === (selectedId ?? nextUnitId)) ?? stations[0];
  return (
    <section className="course-overview" aria-label="课程单元">
      <div className="course-unit-grid">
        {stations.map((station) => (
          <button
            key={station.id}
            className="course-unit"
            aria-pressed={selected?.id === station.id}
            onClick={() => {
              setSelectedId(station.id);
              onSelectUnit(station.id);
            }}
          >
            <span>单元 {station.number}</span>
            <strong>{station.title}</strong>
            <span>
              {station.practised}/{station.total} 课已练习
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="course-unit-detail">
          <div>
            <h3>{selected.title}</h3>
            <p>{selected.focus}</p>
          </div>
          {selected.next && (
            <button className="primary" onClick={() => onOpen(selected.next!)}>
              {selected.practised >= selected.total ? "重新学习" : "继续本单元"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
