import { useMemo, useState } from "react";
import type { Catalog, CourseLesson } from "../packages/contracts/index";
import { courseMapStations } from "./courseMapModel";
import { lessonCover } from "./lessonScenes";
import LearningIcon from "./LearningIcon";

export default function CoursePicker({
  units,
  lessons,
  completed,
  nextUnitId,
  resume,
  onOpen,
  onSelectUnit,
}: {
  units: Catalog["units"];
  lessons: readonly CourseLesson[];
  completed: readonly { lessonId: string }[];
  nextUnitId?: string;
  resume?: {
    lessonId: string;
    position: number;
    total?: number;
    saved: boolean;
    takeover: boolean;
    busy: boolean;
    onResume: () => void;
  };
  onOpen: (lesson: CourseLesson) => void;
  onSelectUnit: (id: string) => void;
}) {
  const unitList = useMemo(
    () => courseMapStations(units, lessons, completed),
    [units, lessons, completed],
  );
  const [selectedId, setSelectedId] = useState<string>();
  const selected =
    unitList.find((u) => u.id === (selectedId ?? nextUnitId)) ?? unitList[0];
  const done = new Set(completed.map((row) => row.lessonId));
  const selectedLessons = lessons
    .filter((l) => l.unitId === selected?.id)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const resumeLesson = selectedLessons.find((l) => l.id === resume?.lessonId);
  const resumeNumber = resumeLesson
    ? (resumeLesson.unitLesson ?? selectedLessons.indexOf(resumeLesson) + 1)
    : undefined;
  return (
    <div className="course-picker">
      <label className="course-unit-select">
        选择单元
        <select
          aria-label="选择课程单元"
          value={selected?.id ?? ""}
          onChange={(event) => {
            setSelectedId(event.target.value);
            onSelectUnit(event.target.value);
          }}
        >
          {unitList.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {String(unit.number).padStart(2, "0")} · {unit.title}
            </option>
          ))}
        </select>
      </label>
      <nav className="course-unit-list" aria-label="课程单元">
        <h2 className="course-unit-list-title">选择单元</h2>
        {unitList.map((unit) => (
          <button
            key={unit.id}
            className="course-unit-choice"
            aria-pressed={selected?.id === unit.id}
            aria-controls="selected-unit-lessons"
            onClick={() => {
              setSelectedId(unit.id);
              onSelectUnit(unit.id);
            }}
          >
            <span className="unit-number">
              <span className="visually-hidden">单元</span>
              {String(unit.number).padStart(2, "0")}
            </span>
            <strong>{unit.title}</strong>
            <span className="unit-progress">
              {unit.practised}/{unit.total} 已练习
            </span>
          </button>
        ))}
      </nav>
      <section
        id="selected-unit-lessons"
        className="selected-unit"
        data-unit-id={selected?.id}
        aria-labelledby="selected-unit-title"
      >
        <header className="selected-unit-heading">
          <h2 id="selected-unit-title">
            {selected ? `单元 ${selected.number} · ${selected.title}` : "课程"}
          </h2>
          {selected && (
            <span>
              {selected.practised}/{selected.total} 课已练习
            </span>
          )}
        </header>
        {resume && resumeLesson && (
          <section className="course-resume" aria-label="本单元上次练习">
            <div>
              <h3>
                第{resumeNumber}课 · {resumeLesson.title}
              </h3>
              <p>
                第{resume.position}/{resume.total ?? resumeLesson.itemCount}题
                {resume.saved && " · 作答已保存"}
              </p>
            </div>
            <button
              className="primary"
              onClick={resume.onResume}
              disabled={resume.busy}
            >
              {resume.takeover ? "接续" : "继续"}第{resumeNumber}课
              <LearningIcon kind="arrow" />
            </button>
          </section>
        )}
        <div className="lesson-choice-grid">
          {selectedLessons.map((lesson, index) => {
            const cover = lessonCover(lesson),
              practised = done.has(lesson.id);
            return (
              <button
                className="lesson-choice"
                data-illustrated={Boolean(cover)}
                key={lesson.id}
                onClick={() => onOpen(lesson)}
                aria-label={`${lesson.title}，${practised ? "已完成练习，可重新学习" : `约${lesson.minutes}分钟`}`}
              >
                {cover && (
                  <div className="lesson-cover" data-art-style={cover.styleId}>
                    <img
                      src={cover.url}
                      width={cover.width}
                      height={cover.height}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <div className="lesson-choice-copy">
                  <span className="lesson-choice-meta">
                    <span>第{lesson.unitLesson ?? index + 1}课</span>
                    <span>
                      {practised ? "已练习" : `${lesson.minutes} 分钟`}
                    </span>
                  </span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.subtitle}</p>
                  <span className="lesson-choice-action">
                    {practised ? "重新学习" : "学习这一课"}
                    <LearningIcon kind="arrow" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {!selectedLessons.length && (
          <p className="empty-state">这个单元的课程正在准备。</p>
        )}
      </section>
    </div>
  );
}
