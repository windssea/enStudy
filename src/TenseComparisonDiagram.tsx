import {
  comparisonGeometry,
  referenceLabels,
  type TenseComparisonRow,
} from "../packages/domain/tenseComparison";
export default function TenseComparisonDiagram({
  row,
}: {
  row: TenseComparisonRow;
}) {
  const g = comparisonGeometry(row.reference, row.aspect),
    duration = row.aspect === "perfect-continuous";
  const label = g.habit
    ? "重复的习惯，不限定现在是否在吃"
    : row.aspect === "simple"
      ? "整次事件"
      : row.aspect === "perfect"
        ? "先吃完，再到参照点"
        : duration
          ? "此前已持续两分钟，情境中仍在进行"
          : "参照点处正在进行";
  return (
    <svg
      className="tense-comparison-diagram"
      viewBox="0 0 500 130"
      role="img"
      aria-label={`${referenceLabels[row.reference]}：${label}。${g.predicted ? "这是对将来的预测。" : ""}横轴为示意，不按真实时间比例。`}
    >
      <path
        d="M20 84H478l-8-6m8 6-8 6"
        fill="none"
        stroke="var(--timeline-rail)"
        strokeWidth="2"
      />
      {g.now !== g.anchor && (
        <>
          <path d={`M${g.now} 26V96`} stroke="var(--teal)" strokeWidth="2" />
          <text
            x={g.now}
            y="20"
            textAnchor="middle"
            fill="var(--teal)"
            fontSize="14"
          >
            现在
          </text>
        </>
      )}
      <path d={`M${g.anchor} 30V96`} stroke="var(--primary)" strokeWidth="3" />
      <text
        x={g.anchor}
        y="20"
        textAnchor="middle"
        fill="var(--primary)"
        fontSize="14"
        fontWeight="700"
      >
        {row.reference === "present"
          ? "现在 15:00"
          : row.reference === "past"
            ? "昨天 15:00"
            : "明天 15:00"}
      </text>
      <g data-predicted={g.predicted}>
        {g.habit ? (
          [65, 155, 240, 345, 445].map((x) => (
            <circle key={x} cx={x} cy="65" r="6" fill="var(--violet)" />
          ))
        ) : row.aspect === "simple" ? (
          <circle
            cx={g.anchor}
            cy="84"
            r="9"
            fill={g.predicted ? "var(--surface)" : "var(--event)"}
            stroke="var(--event)"
            strokeWidth="3"
          />
        ) : (
          <>
            <path
              d={`M${g.start} 65H${g.end}`}
              stroke="var(--teal)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={g.predicted ? "8 5" : undefined}
            />
            {row.aspect === "perfect" && (
              <>
                <circle cx={g.end} cy="65" r="6" fill="var(--teal)" />
                <path
                  d={`M${g.end + 5} 65H${g.anchor - 5}l-5-4m5 4-5 4`}
                  fill="none"
                  stroke="var(--violet)"
                  strokeWidth="2"
                />
              </>
            )}
            {duration && (
              <>
                <path
                  d={`M${g.start} 43H${g.anchor}`}
                  stroke="var(--violet)"
                  strokeWidth="2"
                />
                <text
                  x={(g.start + g.anchor) / 2}
                  y="37"
                  textAnchor="middle"
                  fill="var(--violet)"
                  fontSize="13"
                >
                  已持续 2 分钟
                </text>
              </>
            )}
          </>
        )}
      </g>
      <text x="20" y="120" fill="var(--muted)" fontSize="14">
        较早
      </text>
      <text x="478" y="120" textAnchor="end" fill="var(--muted)" fontSize="14">
        较晚
      </text>
    </svg>
  );
}
