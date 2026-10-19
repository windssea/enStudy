import type { ConceptSceneData } from "../packages/domain/concepts";
import MeasurementFlat from "./MeasurementFlat";
import SpatialFlat from "./SpatialFlat";
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
export default function ConceptScene({
  data,
  revision,
  selectedMeasurement,
}: {
  data: ConceptSceneData;
  revision: number;
  selectedMeasurement?: string;
}) {
  return (
    <div className="concept-scene illustrated-concept">
      <div className="concept-viewport" aria-hidden="true">
        <ConceptFlat data={data} selectedMeasurement={selectedMeasurement} />
      </div>
      <p className="footnote">
        互动示意图 ·{" "}
        {data.kind === "spatial"
          ? "小球、桌子和开口盒子的关系与文字对应；轻点步骤观察，不用拖动。"
          : data.measurement
            ? "编号和下方物品对应；点击按钮观察。只在同组内按同一比例比较尺寸，视角不改变数字。"
            : data.kind === "timeline"
              ? "圆点表示所看的时刻；线段和小点表示进行、重复或与现在的联系，不按真实时间比例。"
              : "词块会随着步骤变化；中间词块不一定是完整英文单词。"}
      </p>
    </div>
  );
}
