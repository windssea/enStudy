import type { ConceptSceneData } from "../packages/domain/concepts";
import MeasurementFlat from "./MeasurementFlat";
import SpatialFlat from "./SpatialFlat";
import TimelineDiagram from "./TimelineDiagram";
import TimelineStory from "./TimelineStory";
export function ConceptFlat({
  data,
  selectedMeasurement,
}: {
  data: ConceptSceneData;
  selectedMeasurement?: string;
}) {
  if (data.kind === "spatial")
    return <SpatialFlat data={data.spatial} placed={data.placed} />;
  if (data.measurement)
    return (
      <MeasurementFlat
        data={data.measurement}
        selected={selectedMeasurement}
        tiles={data.tiles}
        joiner={data.joiner}
      />
    );
  if (data.kind === "timeline") return <TimelineDiagram visual={data.visual} />;
  return (
    <svg viewBox="0 0 400 240" className="concept-flat" aria-hidden="true">
      <ellipse cx="200" cy="205" rx="176" ry="18" fill="#dce7f1" />
      {data.tiles.map((word, index) => (
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
      ))}
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
export default function ConceptScene({
  data,
  revision,
  selectedMeasurement,
  context,
}: {
  data: ConceptSceneData;
  revision: number;
  selectedMeasurement?: string;
  context?: { labId: string; caseId: string };
}) {
  return (
    <div
      className="concept-scene illustrated-concept"
      data-timeline={data.kind === "timeline"}
    >
      {data.kind === "timeline" && context && <TimelineStory {...context} />}
      <div
        className="concept-viewport"
        aria-hidden={data.kind === "timeline" ? undefined : true}
      >
        <ConceptFlat
          key={revision}
          data={data}
          selectedMeasurement={selectedMeasurement}
        />
      </div>
      <details className="concept-diagram-key">
        <summary>图例</summary>
        <p>
          互动示意图 ·{" "}
          {data.kind === "spatial"
            ? "小球、桌子和开口盒子的关系与文字对应；轻点步骤观察，不用拖动。"
            : data.measurement
              ? "编号和下方物品对应；点击按钮观察。只在同组内按同一比例比较尺寸，视角不改变数字。"
              : data.kind === "timeline"
                ? "圆点表示所看的时刻；线段和小点表示进行、重复或与现在的联系，不按真实时间比例。"
                : "词块会随着步骤变化；中间词块不一定是完整英文单词。"}
        </p>
      </details>
    </div>
  );
}
