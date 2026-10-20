import type { TimelineVisual } from "../packages/domain/concepts";

/** The same time coordinates are used for markers, spans and the present anchor. */
export default function TimelineDiagram({
  visual,
  label = "事件",
}: {
  visual: TimelineVisual;
  label?: string;
}) {
  const x = (point: number) => 32 + Math.max(0, Math.min(1, point)) * 496;
  const now = x(0.6);
  return (
    <svg
      viewBox="0 0 560 164"
      className="teaching-timeline"
      role="img"
      aria-label={`${label}的时间关系；现在为固定参照，横轴从过去指向将来，位置不代表真实时间比例。`}
    >
      <rect
        x="16"
        y="48"
        width={now - 16}
        height="62"
        rx="12"
        fill="var(--past-soft)"
      />
      <rect
        x={now}
        y="48"
        width={544 - now}
        height="62"
        rx="12"
        fill="var(--future-soft)"
      />
      <path
        d="M32 94H528l-10-7m10 7-10 7"
        fill="none"
        stroke="var(--timeline-rail)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[visual.span, visual.secondSpan]
        .filter((v): v is [number, number] => Boolean(v))
        .map((span, i) => (
          <g key={i}>
            <path
              d={`M${x(span[0])} ${69 - i * 17}H${x(span[1])}`}
              stroke={i ? "var(--violet)" : "var(--teal)"}
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d={`M${x(span[0])} ${60 - i * 17}v18m${x(span[1]) - x(span[0])} -18v18`}
              stroke={i ? "var(--violet)" : "var(--teal)"}
              strokeWidth="2"
            />
          </g>
        ))}
      {visual.repeat?.map((point, i) => (
        <circle key={i} cx={x(point)} cy="72" r="6" fill="var(--violet)" />
      ))}
      {visual.linkToNow && (
        <path
          d={`M${x(visual.point)} 72H${now}`}
          stroke="var(--violet)"
          strokeWidth="4"
          strokeDasharray="6 4"
        />
      )}
      <path d={`M${now} 28V117`} stroke="var(--teal)" strokeWidth="3" />
      <rect
        x={now - 28}
        y="5"
        width="56"
        height="28"
        rx="8"
        fill="var(--teal)"
      />
      <text
        x={now}
        y="24"
        textAnchor="middle"
        fill="white"
        fontSize="15"
        fontWeight="700"
      >
        现在
      </text>
      <g className="timeline-focus">
        <circle
          cx={x(visual.point)}
          cy="94"
          r="12"
          fill="var(--event)"
          stroke="white"
          strokeWidth="4"
        />
        <path
          d={`M${x(visual.point)} 109v12`}
          stroke="var(--event)"
          strokeWidth="2"
        />
      </g>
      <text x="42" y="148" fontSize="16" fill="var(--ink)" fontWeight="600">
        过去
      </text>
      <text
        x="514"
        y="148"
        textAnchor="end"
        fontSize="16"
        fill="var(--ink)"
        fontWeight="600"
      >
        将来
      </text>
    </svg>
  );
}
