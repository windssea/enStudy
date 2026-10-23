import { useId, useState, type CSSProperties } from "react";
import {
  comparisonRowsFor,
  comparisonSentence,
  timeReferences,
  type TimeAspect,
  type TimeReference,
} from "../packages/domain/tenseComparison";
import art from "../public/content/learning-art.v1.json";

const timeNames = { past: "过去", present: "现在", future: "未来" };
const timeDetails = {
  past: "昨天 15:00",
  present: "今天 15:00",
  future: "明天 15:00",
};
const positions = { past: 0, present: 50, future: 100 };
const aspects: { value: TimeAspect; label: string }[] = [
  { value: "simple", label: "一般" },
  { value: "continuous", label: "进行" },
  { value: "perfect", label: "完成" },
  { value: "perfect-continuous", label: "完成进行 · 拓展" },
];

/** Regions represent yesterday/today/tomorrow, not elapsed time or mastery. */
export function timelineReference(position: number): TimeReference {
  return position < 25 ? "past" : position > 75 ? "future" : "present";
}

export default function TenseTimelineGame() {
  const id = useId();
  const [position, setPosition] = useState(50);
  const [aspect, setAspect] = useState<TimeAspect>("continuous");
  const [visited, setVisited] = useState<TimeReference[]>(["present"]);
  const reference = timelineReference(position);
  const row = comparisonRowsFor(reference).find(
    (item) => item.aspect === aspect,
  )!;
  const character = art.assets["tense-apple-child"];
  const rail = art.assets["tense-timeline"];

  function move(next: number) {
    setPosition(next);
    const nextReference = timelineReference(next);
    setVisited((previous) =>
      previous.includes(nextReference)
        ? previous
        : [...previous, nextReference],
    );
  }

  return (
    <section className="tense-game" aria-labelledby={`${id}-title`}>
      <header className="tense-game-heading">
        <div>
          <h3 id={`${id}-title`}>拖一拖，穿越时间</h3>
          <p id={`${id}-help`}>
            左右拖动吃苹果的小人，看看英文怎么变。也可以点时间按钮，或用方向键移动。
          </p>
        </div>
        <span className="tense-game-progress">
          {visited.length === 3
            ? "三个时间都探索过啦"
            : `已探索 ${visited.length} / 3 个时间`}
        </span>
      </header>
      <div
        className="tense-game-aspects"
        role="group"
        aria-label="选择动作视角"
      >
        {aspects.map((item) => (
          <button
            key={item.value}
            className="secondary"
            aria-pressed={aspect === item.value}
            onClick={() => setAspect(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="tense-game-stage"
        style={
          { "--tense-character": `url("${character.url}")` } as CSSProperties
        }
      >
        <div className="tense-game-zones" aria-hidden="true">
          {timeReferences.map((key) => (
            <span key={key} data-active={reference === key}>
              {timeNames[key]}
            </span>
          ))}
        </div>
        <img
          className="tense-game-rail"
          src={rail.url}
          width={rail.width}
          height={rail.height}
          alt=""
          draggable={false}
        />
        <input
          className="tense-game-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          value={position}
          aria-label="拖动吃苹果的小人选择时间"
          aria-describedby={`${id}-help`}
          aria-valuetext={`${timeNames[reference]}，${row.name}：${comparisonSentence(row)}`}
          onChange={(event) => move(Number(event.currentTarget.value))}
        />
      </div>
      <div className="tense-game-times" role="group" aria-label="移动到时间点">
        {timeReferences.map((key) => (
          <button
            key={key}
            className="secondary"
            aria-pressed={reference === key}
            onClick={() => move(positions[key])}
          >
            <strong>{timeNames[key]}</strong>
            <span>{timeDetails[key]}</span>
          </button>
        ))}
      </div>
      <div className="tense-game-result" aria-live="polite" aria-atomic="true">
        <div className="tense-game-result-heading">
          <strong>{row.name}</strong>
          {reference === "future" && <span>设想画面 · 还没有发生</span>}
        </div>
        <p lang="en">
          {row.before}
          <strong>{row.verb}</strong>
          {row.after}
        </p>
        <p>{row.translation}</p>
        <p className="tense-game-focus">{row.focus}</p>
        {aspect === "simple" && reference === "present" && (
          <p>这里说的是“每天下午吃”的习惯，不能据此判断此刻是否在吃。</p>
        )}
        {(aspect === "perfect" || aspect === "perfect-continuous") && (
          <p>{row.explanation}</p>
        )}
      </div>
      <p className="tense-game-note">
        现在固定为今天下午 3
        点；小人标记观察的时间，姿势只示意吃苹果这个动作。时间轴不按真实时长比例。
      </p>
    </section>
  );
}
