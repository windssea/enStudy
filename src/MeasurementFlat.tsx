import {
  measurementColour,
  measurementRatio,
  type MeasurementVisual,
} from "../packages/domain/measurements";
export default function MeasurementFlat({
  data,
  selected,
  tiles,
  joiner,
}: {
  data: MeasurementVisual;
  selected?: string;
  tiles: string[];
  joiner: string;
}) {
  return (
    <svg viewBox="0 0 400 240" className="concept-flat" aria-hidden="true">
      <ellipse cx="200" cy="207" rx="178" ry="18" fill="#dce7f1" />
      {tiles.map((word, index) => (
        <text
          key={index}
          x={200 + (index - (tiles.length - 1) / 2) * 112}
          y="30"
          textAnchor="middle"
          fontSize="21"
          fontWeight="700"
          fill="#172b4d"
        >
          {word}
        </text>
      ))}
      {Array.from({ length: tiles.length - 1 }, (_, index) => (
        <text
          key={`join:${index}`}
          x={200 + (index - (tiles.length - 2) / 2) * 112}
          y="30"
          textAnchor="middle"
          fontSize="16"
          fill="#46566e"
        >
          {joiner}
        </text>
      ))}
      {data.items.map((item, index) => {
        const x =
          200 +
          (index - (data.items.length - 1) / 2) *
            (data.items.length === 2 ? 150 : 118);
        const ratio = measurementRatio(data, item.value),
          h = ratio * (data.kind === "tower" ? 135 : 75),
          w = data.kind === "bridge" ? ratio * 100 : 66;
        const active = item.id === selected,
          colour = measurementColour(index, data.items.length);
        return (
          <g key={item.id} data-measurement={item.id}>
            {data.kind === "bridge" ? (
              <>
                <rect
                  x={x - w / 2}
                  y="105"
                  width={w}
                  height="69"
                  rx="6"
                  fill={colour}
                  stroke={active ? "#2557d6" : "#46566e"}
                  strokeWidth={active ? 4 : 2}
                />
                <path
                  d={`M${x - w / 2 + 5} 111V168M${x + w / 2 - 5} 111V168`}
                  stroke="#172b4d"
                  strokeWidth="3"
                />
              </>
            ) : (
              <>
                <rect
                  x={x - w / 2}
                  y={190 - h}
                  width={w}
                  height={h}
                  rx="4"
                  fill={colour}
                  stroke={active ? "#2557d6" : "#46566e"}
                  strokeWidth={active ? 4 : 2}
                />
                {data.kind === "tower" ? (
                  <path
                    d={`M${x - 16} ${190 - h + 15}h10m12 0h10M${x - 16} ${190 - h + 35}h10m12 0h10`}
                    stroke="#172b4d"
                    strokeWidth="5"
                  />
                ) : (
                  <path
                    d={`M${x - w / 2 + 4} ${190 - h + 7}h${w - 8}M${x - w / 2 + 4} 183h${w - 8}`}
                    stroke="white"
                    strokeWidth="4"
                  />
                )}
              </>
            )}
            <text
              x={x}
              y="224"
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fill="#172b4d"
            >
              {index + 1} · {item.value}
              {data.unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
